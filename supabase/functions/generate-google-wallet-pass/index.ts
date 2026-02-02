/**
 * Generate Google Wallet Pass Edge Function
 * 
 * Generates Google Wallet passes for gift cards.
 * Returns a "Save to Google Wallet" URL.
 * 
 * SETUP REQUIRED:
 * 1. Create Google Cloud Project
 * 2. Enable Google Wallet API
 * 3. Create Service Account with Wallet API permissions
 * 4. Download service account JSON key
 * 5. Add secrets to Supabase:
 *    - GOOGLE_WALLET_ISSUER_ID
 *    - GOOGLE_WALLET_SERVICE_ACCOUNT
 * 
 * Public endpoint (called from landing pages).
 */

import { withApiGateway, ApiError, type PublicContext } from '../_shared/api-gateway.ts';
import { encode as base64UrlEncode } from "https://deno.land/std@0.168.0/encoding/base64url.ts";

// ============================================================================
// Types
// ============================================================================

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

interface ServiceAccountKey {
  type: string;
  project_id: string;
  private_key_id: string;
  private_key: string;
  client_email: string;
  client_id: string;
  auth_uri: string;
  token_uri: string;
  auth_provider_x509_cert_url: string;
  client_x509_cert_url: string;
}

interface GenerateGoogleWalletRequest {
  giftCard: GiftCardData;
}

interface GenerateGoogleWalletResponse {
  success: boolean;
  url: string;
  objectId: string;
  classId: string;
}

// ============================================================================
// Pass Class & Object Creation
// ============================================================================

function createGiftCardClass({ issuerId, classId }: { issuerId: string; classId: string }) {
  return {
    id: classId,
    classTemplateInfo: {
      cardTemplateOverride: {
        cardRowTemplateInfos: [
          {
            twoItems: {
              startItem: { firstValue: { fields: [{ fieldPath: "object.textModulesData['code']" }] } },
              endItem: { firstValue: { fields: [{ fieldPath: "object.textModulesData['balance']" }] } },
            },
          },
        ],
      },
    },
    enableSmartTap: false,
    reviewStatus: 'UNDER_REVIEW',
    multipleDevicesAndHoldersAllowedStatus: 'MULTIPLE_HOLDERS',
  };
}

function createGiftCardObject({
  giftCard,
  issuerId,
  classId,
  objectId,
}: {
  giftCard: GiftCardData;
  issuerId: string;
  classId: string;
  objectId: string;
}) {
  const brandName = giftCard.brand_name || giftCard.provider || 'Gift Card';
  const formattedValue = `$${giftCard.card_value.toFixed(2)}`;

  const genericObject: Record<string, unknown> = {
    id: objectId,
    classId,
    state: 'ACTIVE',
    cardTitle: { defaultValue: { language: 'en', value: brandName } },
    subheader: { defaultValue: { language: 'en', value: 'GIFT CARD' } },
    header: { defaultValue: { language: 'en', value: formattedValue } },
    barcode: { type: 'QR_CODE', value: giftCard.card_code, alternateText: giftCard.card_code },
    hexBackgroundColor: '#7c3aed',
    textModulesData: [
      { id: 'code', header: 'CODE', body: giftCard.card_code },
      { id: 'balance', header: 'BALANCE', body: formattedValue },
    ],
    linksModuleData: { uris: [] as Array<{ uri: string; description: string; id: string }> },
    imageModulesData: [] as Array<unknown>,
  };

  if (giftCard.card_number) {
    (genericObject.textModulesData as Array<unknown>).push({
      id: 'cardNumber', header: 'CARD NUMBER', body: giftCard.card_number,
    });
  }

  if (giftCard.recipient_name) {
    (genericObject.textModulesData as Array<unknown>).push({
      id: 'recipient', header: 'TO', body: giftCard.recipient_name,
    });
  }

  if (giftCard.expiration_date) {
    (genericObject as Record<string, unknown>).validTimeInterval = {
      end: { date: giftCard.expiration_date },
    };
    (genericObject.textModulesData as Array<unknown>).push({
      id: 'expiry',
      header: 'EXPIRES',
      body: new Date(giftCard.expiration_date).toLocaleDateString('en-US', {
        year: 'numeric', month: 'short', day: 'numeric',
      }),
    });
  }

  if (giftCard.balance_check_url) {
    (genericObject.linksModuleData as { uris: Array<unknown> }).uris.push({
      uri: giftCard.balance_check_url, description: 'Check Balance', id: 'checkBalance',
    });
  }

  if (giftCard.logo_url) {
    (genericObject as Record<string, unknown>).logo = {
      sourceUri: { uri: giftCard.logo_url },
      contentDescription: { defaultValue: { language: 'en', value: `${brandName} logo` } },
    };
    (genericObject as Record<string, unknown>).heroImage = {
      sourceUri: { uri: giftCard.logo_url },
      contentDescription: { defaultValue: { language: 'en', value: brandName } },
    };
  }

  return genericObject;
}

// ============================================================================
// JWT Signing
// ============================================================================

async function signJwt(
  payload: Record<string, unknown>,
  privateKeyPem: string
): Promise<string> {
  const header = { alg: 'RS256', typ: 'JWT' };

  const now = Math.floor(Date.now() / 1000);
  const jwtPayload = { ...payload, iat: now, exp: now + 3600 };

  const encoder = new TextEncoder();
  const encodedHeader = base64UrlEncode(encoder.encode(JSON.stringify(header)));
  const encodedPayload = base64UrlEncode(encoder.encode(JSON.stringify(jwtPayload)));
  const signingInput = `${encodedHeader}.${encodedPayload}`;

  const privateKey = await importPrivateKey(privateKeyPem);

  const signature = await crypto.subtle.sign(
    { name: 'RSASSA-PKCS1-v1_5' },
    privateKey,
    encoder.encode(signingInput)
  );

  const encodedSignature = base64UrlEncode(new Uint8Array(signature));
  return `${signingInput}.${encodedSignature}`;
}

async function importPrivateKey(pem: string): Promise<CryptoKey> {
  const pemContents = pem
    .replace(/-----BEGIN PRIVATE KEY-----/g, '')
    .replace(/-----END PRIVATE KEY-----/g, '')
    .replace(/-----BEGIN RSA PRIVATE KEY-----/g, '')
    .replace(/-----END RSA PRIVATE KEY-----/g, '')
    .replace(/\s/g, '');

  const binaryString = atob(pemContents);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  try {
    return await crypto.subtle.importKey(
      'pkcs8',
      bytes,
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
      false,
      ['sign']
    );
  } catch {
    throw new Error('Failed to import private key. Ensure the key is in PKCS#8 format.');
  }
}

// ============================================================================
// Main Handler
// ============================================================================

async function handleGenerateGoogleWalletPass(
  request: GenerateGoogleWalletRequest,
  _context: PublicContext
): Promise<GenerateGoogleWalletResponse> {
  const { giftCard } = request;

  if (!giftCard || !giftCard.card_code) {
    throw new ApiError('Gift card data with card_code is required', 'VALIDATION_ERROR', 400);
  }

  const issuerId = Deno.env.get('GOOGLE_WALLET_ISSUER_ID');
  const serviceAccountJson = Deno.env.get('GOOGLE_WALLET_SERVICE_ACCOUNT');

  if (!issuerId || !serviceAccountJson) {
    throw new ApiError('Google Wallet not configured', 'CONFIGURATION_ERROR', 503, {
      requiredSecrets: ['GOOGLE_WALLET_ISSUER_ID', 'GOOGLE_WALLET_SERVICE_ACCOUNT'],
      setupUrl: 'https://pay.google.com/business/console',
    });
  }

  console.log('[GOOGLE-WALLET] Generating pass for card:', giftCard.id);

  let serviceAccount: ServiceAccountKey;
  try {
    serviceAccount = JSON.parse(serviceAccountJson);
  } catch {
    throw new ApiError('Invalid service account JSON format', 'CONFIGURATION_ERROR', 500);
  }

  const classId = `${issuerId}.giftcard_class_v1`;
  const objectId = `${issuerId}.gc_${giftCard.id}_${Date.now()}`;

  const passClass = createGiftCardClass({ issuerId, classId });
  const passObject = createGiftCardObject({ giftCard, issuerId, classId, objectId });

  const allowedOrigins = Deno.env.get('WALLET_ALLOWED_ORIGINS')?.split(',') || [
    'https://mobul.com',
    'https://www.mobul.com',
    'https://app.mobul.com',
    'http://localhost:5173',
    'http://localhost:3000',
  ];

  const jwtPayload = {
    iss: serviceAccount.client_email,
    aud: 'google',
    origins: allowedOrigins,
    typ: 'savetowallet',
    payload: {
      genericClasses: [passClass],
      genericObjects: [passObject],
    },
  };

  const signedJwt = await signJwt(jwtPayload, serviceAccount.private_key);
  const saveUrl = `https://pay.google.com/gp/v/save/${signedJwt}`;

  console.log('[GOOGLE-WALLET] Pass generated successfully for object:', objectId);

  return {
    success: true,
    url: saveUrl,
    objectId,
    classId,
  };
}

// ============================================================================
// Export with API Gateway
// ============================================================================

Deno.serve(withApiGateway(handleGenerateGoogleWalletPass, {
  requireAuth: false, // Public endpoint
  parseBody: true,
  auditAction: 'generate_google_wallet_pass',
}));
