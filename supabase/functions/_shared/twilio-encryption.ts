/**
 * Twilio Auth Token Encryption Utilities
 * 
 * Handles encryption and decryption of Twilio auth tokens.
 * Uses AES-256-GCM encryption with the TWILIO_ENCRYPTION_KEY environment variable.
 * 
 * SECURITY NOTES:
 * - Auth tokens are NEVER logged, even masked
 * - Decryption only happens server-side in edge functions
 * - Encryption key must be 32 bytes (256 bits) in hex format
 */

const ALGORITHM = 'AES-GCM';
const KEY_LENGTH = 256;
const IV_LENGTH = 12; // 96 bits is recommended for GCM
const TAG_LENGTH = 128; // 128 bits for authentication tag

/**
 * Get the encryption key from environment variable
 */
function getEncryptionKey(): Uint8Array {
  const keyHex = Deno.env.get('TWILIO_ENCRYPTION_KEY');
  
  if (!keyHex) {
    console.error('[TWILIO-ENCRYPTION] TWILIO_ENCRYPTION_KEY environment variable not set');
    throw new Error('Encryption key not configured');
  }
  
  // Convert hex string to Uint8Array (32 bytes = 64 hex chars)
  if (keyHex.length !== 64) {
    throw new Error('Encryption key must be 32 bytes (64 hex characters)');
  }
  
  const keyBytes = new Uint8Array(32);
  for (let i = 0; i < 32; i++) {
    keyBytes[i] = parseInt(keyHex.substr(i * 2, 2), 16);
  }
  
  return keyBytes;
}

/**
 * Import the encryption key for use with Web Crypto API
 */
async function importKey(): Promise<CryptoKey> {
  const keyBytes = getEncryptionKey();
  
  return await crypto.subtle.importKey(
    'raw',
    keyBytes,
    { name: ALGORITHM },
    false, // not extractable
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypt a Twilio auth token
 * 
 * @param plaintext - The auth token to encrypt
 * @returns Base64-encoded encrypted value (IV + ciphertext + tag)
 */
export async function encryptAuthToken(plaintext: string): Promise<string> {
  if (!plaintext) {
    throw new Error('Cannot encrypt empty auth token');
  }
  
  try {
    const key = await importKey();
    
    // Generate random IV
    const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
    
    // Encode plaintext to bytes
    const encoder = new TextEncoder();
    const plaintextBytes = encoder.encode(plaintext);
    
    // Encrypt
    const ciphertext = await crypto.subtle.encrypt(
      {
        name: ALGORITHM,
        iv: iv,
        tagLength: TAG_LENGTH,
      },
      key,
      plaintextBytes
    );
    
    // Combine IV + ciphertext (which includes the auth tag in GCM mode)
    const combined = new Uint8Array(IV_LENGTH + ciphertext.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(ciphertext), IV_LENGTH);
    
    // Encode as base64
    return btoa(String.fromCharCode(...combined));
  } catch (error) {
    console.error('[TWILIO-ENCRYPTION] Encryption failed:', error instanceof Error ? error.message : 'Unknown error');
    throw new Error('Failed to encrypt auth token');
  }
}

/**
 * Decrypt a Twilio auth token
 * 
 * @param encrypted - Base64-encoded encrypted value
 * @returns The decrypted auth token
 */
export async function decryptAuthToken(encrypted: string): Promise<string> {
  if (!encrypted) {
    throw new Error('Cannot decrypt empty value');
  }
  
  try {
    const key = await importKey();
    
    // Decode from base64
    const combined = Uint8Array.from(atob(encrypted), c => c.charCodeAt(0));
    
    if (combined.length < IV_LENGTH + 16) { // Minimum: IV + 16 byte tag
      throw new Error('Invalid encrypted data length');
    }
    
    // Extract IV and ciphertext
    const iv = combined.slice(0, IV_LENGTH);
    const ciphertext = combined.slice(IV_LENGTH);
    
    // Decrypt
    const plaintextBytes = await crypto.subtle.decrypt(
      {
        name: ALGORITHM,
        iv: iv,
        tagLength: TAG_LENGTH,
      },
      key,
      ciphertext
    );
    
    // Decode to string
    const decoder = new TextDecoder();
    return decoder.decode(plaintextBytes);
  } catch (error) {
    console.error('[TWILIO-ENCRYPTION] Decryption failed:', error instanceof Error ? error.message : 'Unknown error');
    throw new Error('Failed to decrypt auth token');
  }
}

/**
 * Check if encryption is properly configured
 * 
 * @returns true if encryption key is available and valid
 */
export function isEncryptionConfigured(): boolean {
  try {
    getEncryptionKey();
    return true;
  } catch {
    return false;
  }
}

/**
 * Generate a new random encryption key (for initial setup)
 * 
 * @returns A 64-character hex string suitable for TWILIO_ENCRYPTION_KEY
 */
export function generateEncryptionKey(): string {
  const keyBytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(keyBytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Mask an auth token for logging purposes
 * Shows only first 4 and last 4 characters
 * 
 * @param token - The auth token to mask
 * @returns Masked version like "abcd****wxyz"
 */
export function maskAuthToken(token: string): string {
  if (!token || token.length < 8) {
    return '********';
  }
  return token.slice(0, 4) + '****' + token.slice(-4);
}

/**
 * Mask an Account SID for UI display
 * Shows only last 4 characters
 * 
 * @param sid - The Account SID to mask
 * @returns Masked version like "****5678"
 */
export function maskAccountSid(sid: string): string {
  if (!sid || sid.length < 4) {
    return '****';
  }
  return '****' + sid.slice(-4);
}
