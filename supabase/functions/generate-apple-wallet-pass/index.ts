import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// Using npm: specifier for node-forge (Supabase Edge Functions support npm packages)
import forge from "npm:node-forge@1.3.1";
import { JSZip } from "https://deno.land/x/jszip@0.11.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Generate Apple Wallet Pass (.pkpass) for Gift Card
 * 
 * SETUP REQUIRED:
 * 1. Enroll in Apple Developer Program ($99/year)
 * 2. Create Pass Type ID (e.g., pass.com.yourcompany.giftcard)
 * 3. Generate Pass Type ID Certificate from Apple Developer
 * 4. Export certificate as .p12 with password
 * 5. Download Apple WWDR G4 certificate from:
 *    https://www.apple.com/certificateauthority/
 * 6. Add these secrets to Supabase:
 *    - APPLE_WALLET_CERTIFICATE (base64 encoded .p12 file)
 *    - APPLE_WALLET_CERTIFICATE_PASSWORD (password for .p12)
 *    - APPLE_WALLET_TEAM_ID (your Apple Team ID)
 *    - APPLE_WALLET_PASS_TYPE_ID (e.g., pass.com.yourcompany.giftcard)
 *    - APPLE_WWDR_CERTIFICATE (base64 encoded Apple WWDR G4 .cer file)
 * 
 * Documentation: https://developer.apple.com/documentation/walletpasses
 */

interface GiftCardData {
  id: string;
  card_code: string;
  card_number?: string;
  card_value: number;
  provider?: string;
  brand_name?: string;
  logo_url?: string;
  balance_check_url?: string;
  expiration_date?: string;
  recipient_name?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { giftCard }: { giftCard: GiftCardData } = await req.json();

    if (!giftCard || !giftCard.card_code) {
      return new Response(
        JSON.stringify({ error: 'Gift card data with card_code is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if credentials are configured
    const certificateB64 = Deno.env.get('APPLE_WALLET_CERTIFICATE');
    const password = Deno.env.get('APPLE_WALLET_CERTIFICATE_PASSWORD');
    const teamId = Deno.env.get('APPLE_WALLET_TEAM_ID');
    const passTypeId = Deno.env.get('APPLE_WALLET_PASS_TYPE_ID');
    const wwdrCertB64 = Deno.env.get('APPLE_WWDR_CERTIFICATE');

    if (!certificateB64 || !password || !teamId || !passTypeId) {
      return new Response(
        JSON.stringify({ 
          error: 'Apple Wallet not configured',
          message: 'Please configure Apple Wallet secrets (certificate, password, team ID, pass type ID)',
          requiredSecrets: [
            'APPLE_WALLET_CERTIFICATE',
            'APPLE_WALLET_CERTIFICATE_PASSWORD', 
            'APPLE_WALLET_TEAM_ID',
            'APPLE_WALLET_PASS_TYPE_ID',
            'APPLE_WWDR_CERTIFICATE (optional but recommended)'
          ],
          setupUrl: 'https://developer.apple.com/account/resources/certificates/list'
        }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Generating Apple Wallet pass for card:', giftCard.id);

    // Generate unique serial number for this pass
    const serialNumber = `gc-${giftCard.id}-${Date.now()}`;

    // Create pass.json structure
    const passJson = createPassJson({
      giftCard,
      teamId,
      passTypeId,
      serialNumber,
    });

    // Parse the certificate
    const { privateKey, certificate } = parseCertificate(certificateB64, password);

    // Parse WWDR certificate if provided
    let wwdrCert: forge.pki.Certificate | undefined;
    if (wwdrCertB64) {
      wwdrCert = parseWWDRCertificate(wwdrCertB64);
    }

    // Create the .pkpass file with proper signing
    const pkpassBuffer = await createPkpassFile({
      passJson,
      privateKey,
      certificate,
      wwdrCert,
    });

    console.log('Apple Wallet pass generated successfully, size:', pkpassBuffer.length, 'bytes');

    // Convert to base64 for JSON response (Supabase functions.invoke doesn't handle binary well)
    const base64Pass = btoa(String.fromCharCode(...pkpassBuffer));

    // Return as JSON with base64-encoded pass
    return new Response(
      JSON.stringify({ 
        success: true,
        pkpass: base64Pass,
        filename: `giftcard-${giftCard.id}.pkpass`,
        size: pkpassBuffer.length,
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );

  } catch (error) {
    console.error('Apple Wallet error:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        hint: 'Check that your Apple certificates are properly configured. The .p12 file should be base64 encoded.'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

/**
 * Parse the .p12 certificate to extract private key and certificate
 */
function parseCertificate(
  p12Base64: string, 
  password: string
): { privateKey: forge.pki.PrivateKey; certificate: forge.pki.Certificate } {
  try {
    // Decode base64 to get the p12 data
    const p12Der = forge.util.decode64(p12Base64);
    
    // Parse the p12 (PKCS#12) file
    const p12Asn1 = forge.asn1.fromDer(p12Der);
    const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, password);
    
    // Extract the private key
    const keyBags = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag });
    const keyBag = keyBags[forge.pki.oids.pkcs8ShroudedKeyBag];
    
    if (!keyBag || keyBag.length === 0 || !keyBag[0].key) {
      throw new Error('No private key found in certificate');
    }
    
    const privateKey = keyBag[0].key;
    
    // Extract the certificate
    const certBags = p12.getBags({ bagType: forge.pki.oids.certBag });
    const certBag = certBags[forge.pki.oids.certBag];
    
    if (!certBag || certBag.length === 0 || !certBag[0].cert) {
      throw new Error('No certificate found in .p12 file');
    }
    
    const certificate = certBag[0].cert;
    
    return { privateKey, certificate };
  } catch (error) {
    if (error instanceof Error && error.message.includes('Invalid password')) {
      throw new Error('Invalid certificate password. Check APPLE_WALLET_CERTIFICATE_PASSWORD.');
    }
    throw new Error(`Failed to parse certificate: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Parse Apple WWDR certificate (DER or PEM format)
 */
function parseWWDRCertificate(wwdrB64: string): forge.pki.Certificate {
  try {
    const wwdrDer = forge.util.decode64(wwdrB64);
    
    // Try to parse as DER first
    try {
      const asn1 = forge.asn1.fromDer(wwdrDer);
      return forge.pki.certificateFromAsn1(asn1);
    } catch {
      // If DER fails, try as PEM
      const pem = forge.util.decodeUtf8(wwdrDer);
      return forge.pki.certificateFromPem(pem);
    }
  } catch (error) {
    console.warn('Failed to parse WWDR certificate, continuing without it:', error);
    throw new Error('Failed to parse WWDR certificate');
  }
}

/**
 * Create the pass.json structure for Apple Wallet
 */
function createPassJson({
  giftCard,
  teamId,
  passTypeId,
  serialNumber,
}: {
  giftCard: GiftCardData;
  teamId: string;
  passTypeId: string;
  serialNumber: string;
}) {
  const brandName = giftCard.brand_name || giftCard.provider || 'Gift Card';
  const formattedValue = `$${giftCard.card_value.toFixed(2)}`;

  // Apple Wallet pass structure
  // Reference: https://developer.apple.com/documentation/walletpasses/pass
  const pass: Record<string, unknown> = {
    formatVersion: 1,
    passTypeIdentifier: passTypeId,
    serialNumber: serialNumber,
    teamIdentifier: teamId,
    organizationName: 'Mobul ACE',
    description: `${brandName} Gift Card`,
    logoText: brandName,
    
    // Colors - Purple/blue gradient theme matching the app
    foregroundColor: 'rgb(255, 255, 255)',
    backgroundColor: 'rgb(124, 58, 237)', // Purple-600
    labelColor: 'rgb(233, 213, 255)', // Purple-200
    
    // Barcode with card code
    barcode: {
      format: 'PKBarcodeFormatQR',
      message: giftCard.card_code,
      messageEncoding: 'iso-8859-1',
      altText: giftCard.card_code,
    },
    
    // Also include barcodes array for iOS 9+
    barcodes: [
      {
        format: 'PKBarcodeFormatQR',
        message: giftCard.card_code,
        messageEncoding: 'iso-8859-1',
        altText: giftCard.card_code,
      },
    ],
    
    // Store card style (best for gift cards)
    storeCard: {
      headerFields: [
        {
          key: 'balance',
          label: 'BALANCE',
          value: formattedValue,
        },
      ],
      primaryFields: [
        {
          key: 'brand',
          label: 'GIFT CARD',
          value: brandName,
        },
      ],
      secondaryFields: [
        {
          key: 'code',
          label: 'CODE',
          value: giftCard.card_code,
        },
      ],
      auxiliaryFields: [] as Array<{ key: string; label: string; value: string }>,
      backFields: [
        {
          key: 'terms',
          label: 'Terms & Conditions',
          value: 'This gift card is redeemable for merchandise at participating locations. Card cannot be redeemed for cash. Protect this card like cash - lost or stolen cards cannot be replaced.',
        },
        {
          key: 'poweredBy',
          label: 'Powered By',
          value: 'Mobul ACE - Direct Mail Campaign Platform',
        },
      ],
    },
  };

  // Add card number if present
  if (giftCard.card_number) {
    (pass.storeCard as Record<string, unknown[]>).auxiliaryFields.push({
      key: 'cardNumber',
      label: 'CARD #',
      value: giftCard.card_number,
    });
  }

  // Add expiration if present
  if (giftCard.expiration_date) {
    const expirationDate = new Date(giftCard.expiration_date);
    (pass.storeCard as Record<string, unknown[]>).auxiliaryFields.push({
      key: 'expires',
      label: 'EXPIRES',
      value: expirationDate.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short', 
        day: 'numeric',
      }),
    });
    
    // Add expiration date for pass validity
    pass.expirationDate = expirationDate.toISOString();
  }

  // Add recipient name if present
  if (giftCard.recipient_name) {
    (pass.storeCard as Record<string, unknown[]>).secondaryFields.push({
      key: 'recipient',
      label: 'TO',
      value: giftCard.recipient_name,
    });
  }

  // Add balance check URL as back field
  if (giftCard.balance_check_url) {
    (pass.storeCard as Record<string, unknown[]>).backFields.push({
      key: 'checkBalance',
      label: 'Check Balance',
      value: giftCard.balance_check_url,
      attributedValue: `<a href="${giftCard.balance_check_url}">Check your balance online</a>`,
    });
  }

  return pass;
}

/**
 * Create the .pkpass file with proper PKCS#7 signing
 */
async function createPkpassFile({
  passJson,
  privateKey,
  certificate,
  wwdrCert,
}: {
  passJson: Record<string, unknown>;
  privateKey: forge.pki.PrivateKey;
  certificate: forge.pki.Certificate;
  wwdrCert?: forge.pki.Certificate;
}): Promise<Uint8Array> {
  const zip = new JSZip();

  // Add pass.json
  const passJsonString = JSON.stringify(passJson, null, 2);
  zip.addFile('pass.json', new TextEncoder().encode(passJsonString));

  // Create default icons (simple colored square as placeholder)
  // In production, you should use actual brand logos
  const iconPng = createSimpleIcon(29);
  const icon2xPng = createSimpleIcon(58);
  const icon3xPng = createSimpleIcon(87);
  
  zip.addFile('icon.png', iconPng);
  zip.addFile('icon@2x.png', icon2xPng);
  zip.addFile('icon@3x.png', icon3xPng);

  // Create logo images
  const logoPng = createSimpleIcon(160);
  const logo2xPng = createSimpleIcon(320);
  
  zip.addFile('logo.png', logoPng);
  zip.addFile('logo@2x.png', logo2xPng);

  // Create manifest.json with SHA1 hashes
  const manifest: Record<string, string> = {};
  
  // Hash all files
  manifest['pass.json'] = sha1Hash(new TextEncoder().encode(passJsonString));
  manifest['icon.png'] = sha1Hash(iconPng);
  manifest['icon@2x.png'] = sha1Hash(icon2xPng);
  manifest['icon@3x.png'] = sha1Hash(icon3xPng);
  manifest['logo.png'] = sha1Hash(logoPng);
  manifest['logo@2x.png'] = sha1Hash(logo2xPng);

  const manifestString = JSON.stringify(manifest);
  zip.addFile('manifest.json', new TextEncoder().encode(manifestString));

  // Create PKCS#7 detached signature
  const signature = createPkcs7Signature(manifestString, privateKey, certificate, wwdrCert);
  zip.addFile('signature', signature);

  // Generate the ZIP file
  const pkpassBuffer = await zip.generateAsync({ type: 'uint8array' });
  return pkpassBuffer;
}

/**
 * Create PKCS#7 detached signature using node-forge
 * This is the critical part that makes Apple Wallet passes work
 */
function createPkcs7Signature(
  manifest: string,
  privateKey: forge.pki.PrivateKey,
  certificate: forge.pki.Certificate,
  wwdrCert?: forge.pki.Certificate,
): Uint8Array {
  // Create a PKCS#7 signed data structure
  const p7 = forge.pkcs7.createSignedData();
  
  // Set the content (manifest)
  p7.content = forge.util.createBuffer(manifest, 'utf8');
  
  // Add the signer's certificate
  p7.addCertificate(certificate);
  
  // Add WWDR intermediate certificate if available
  if (wwdrCert) {
    p7.addCertificate(wwdrCert);
  }
  
  // Add signer
  p7.addSigner({
    key: privateKey,
    certificate: certificate,
    digestAlgorithm: forge.pki.oids.sha256,
    authenticatedAttributes: [
      {
        type: forge.pki.oids.contentType,
        value: forge.pki.oids.data,
      },
      {
        type: forge.pki.oids.messageDigest,
        // messageDigest will be calculated automatically
      },
      {
        type: forge.pki.oids.signingTime,
        value: new Date(),
      },
    ],
  });
  
  // Sign the data (detached = true means content is not included in signature)
  p7.sign({ detached: true });
  
  // Convert to DER format
  const asn1 = p7.toAsn1();
  const der = forge.asn1.toDer(asn1);
  
  // Convert to Uint8Array
  const bytes = new Uint8Array(der.length());
  for (let i = 0; i < der.length(); i++) {
    bytes[i] = der.at(i);
  }
  
  return bytes;
}

/**
 * Calculate SHA1 hash (required by Apple for manifest)
 */
function sha1Hash(data: Uint8Array): string {
  const md = forge.md.sha1.create();
  md.update(forge.util.binary.raw.encode(data));
  return md.digest().toHex();
}

/**
 * Create a simple colored PNG icon
 * In production, replace with actual brand logos
 */
function createSimpleIcon(size: number): Uint8Array {
  // Create a minimal valid PNG with purple color
  // This is a simplified PNG generator for placeholder icons
  
  const width = size;
  const height = size;
  
  // PNG signature
  const signature = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A];
  
  // IHDR chunk
  const ihdrData = [
    (width >> 24) & 0xFF, (width >> 16) & 0xFF, (width >> 8) & 0xFF, width & 0xFF,
    (height >> 24) & 0xFF, (height >> 16) & 0xFF, (height >> 8) & 0xFF, height & 0xFF,
    8, // bit depth
    2, // color type (RGB)
    0, // compression
    0, // filter
    0, // interlace
  ];
  const ihdrCrc = crc32([0x49, 0x48, 0x44, 0x52, ...ihdrData]);
  const ihdr = [
    0x00, 0x00, 0x00, 0x0D, // length
    0x49, 0x48, 0x44, 0x52, // type "IHDR"
    ...ihdrData,
    (ihdrCrc >> 24) & 0xFF, (ihdrCrc >> 16) & 0xFF, (ihdrCrc >> 8) & 0xFF, ihdrCrc & 0xFF,
  ];
  
  // Create image data (purple pixels)
  const rawData: number[] = [];
  for (let y = 0; y < height; y++) {
    rawData.push(0); // Filter byte (none)
    for (let x = 0; x < width; x++) {
      rawData.push(124); // R (purple-600)
      rawData.push(58);  // G
      rawData.push(237); // B
    }
  }
  
  // Compress with zlib/deflate
  const deflated = deflateSync(new Uint8Array(rawData));
  
  // IDAT chunk
  const idatCrc = crc32([0x49, 0x44, 0x41, 0x54, ...deflated]);
  const idat = [
    (deflated.length >> 24) & 0xFF, (deflated.length >> 16) & 0xFF, 
    (deflated.length >> 8) & 0xFF, deflated.length & 0xFF,
    0x49, 0x44, 0x41, 0x54, // type "IDAT"
    ...deflated,
    (idatCrc >> 24) & 0xFF, (idatCrc >> 16) & 0xFF, (idatCrc >> 8) & 0xFF, idatCrc & 0xFF,
  ];
  
  // IEND chunk
  const iend = [
    0x00, 0x00, 0x00, 0x00,
    0x49, 0x45, 0x4E, 0x44,
    0xAE, 0x42, 0x60, 0x82,
  ];
  
  return new Uint8Array([...signature, ...ihdr, ...idat, ...iend]);
}

/**
 * Simple deflate compression (uncompressed blocks for simplicity)
 */
function deflateSync(data: Uint8Array): number[] {
  const result: number[] = [];
  
  // Zlib header
  result.push(0x78, 0x9C); // Default compression
  
  let offset = 0;
  while (offset < data.length) {
    const remaining = data.length - offset;
    const blockSize = Math.min(remaining, 65535);
    const isLast = offset + blockSize >= data.length;
    
    // Block header
    result.push(isLast ? 0x01 : 0x00);
    result.push(blockSize & 0xFF);
    result.push((blockSize >> 8) & 0xFF);
    result.push((~blockSize) & 0xFF);
    result.push(((~blockSize) >> 8) & 0xFF);
    
    // Block data
    for (let i = 0; i < blockSize; i++) {
      result.push(data[offset + i]);
    }
    
    offset += blockSize;
  }
  
  // Adler-32 checksum
  let a = 1, b = 0;
  for (const byte of data) {
    a = (a + byte) % 65521;
    b = (b + a) % 65521;
  }
  const adler = (b << 16) | a;
  result.push((adler >> 24) & 0xFF);
  result.push((adler >> 16) & 0xFF);
  result.push((adler >> 8) & 0xFF);
  result.push(adler & 0xFF);
  
  return result;
}

/**
 * CRC32 calculation for PNG chunks
 */
function crc32(data: number[]): number {
  let crc = 0xFFFFFFFF;
  const table = getCrc32Table();
  
  for (const byte of data) {
    crc = table[(crc ^ byte) & 0xFF] ^ (crc >>> 8);
  }
  
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

let crc32TableCache: Uint32Array | null = null;
function getCrc32Table(): Uint32Array {
  if (crc32TableCache) return crc32TableCache;
  
  crc32TableCache = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) {
      c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    }
    crc32TableCache[i] = c >>> 0;
  }
  return crc32TableCache;
}
