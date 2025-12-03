import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { encode as base64UrlEncode } from "https://deno.land/std@0.168.0/encoding/base64url.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Generate Google Wallet Pass for Gift Card
 * 
 * SETUP REQUIRED:
 * 1. Create Google Cloud Project
 * 2. Enable Google Wallet API
 * 3. Create Service Account with Wallet API permissions
 * 4. Download service account JSON key
 * 5. Add these secrets to Supabase:
 *    - GOOGLE_WALLET_ISSUER_ID (your issuer ID from Google Wallet console)
 *    - GOOGLE_WALLET_SERVICE_ACCOUNT (the JSON key as string)
 * 
 * Documentation: https://developers.google.com/wallet/generic
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
    const issuerId = Deno.env.get('GOOGLE_WALLET_ISSUER_ID');
    const serviceAccountJson = Deno.env.get('GOOGLE_WALLET_SERVICE_ACCOUNT');

    if (!issuerId || !serviceAccountJson) {
      return new Response(
        JSON.stringify({ 
          error: 'Google Wallet not configured',
          message: 'Please configure GOOGLE_WALLET_ISSUER_ID and GOOGLE_WALLET_SERVICE_ACCOUNT secrets',
          requiredSecrets: ['GOOGLE_WALLET_ISSUER_ID', 'GOOGLE_WALLET_SERVICE_ACCOUNT'],
          setupUrl: 'https://pay.google.com/business/console'
        }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Generating Google Wallet pass for card:', giftCard.id);

    // Parse service account credentials
    let serviceAccount: ServiceAccountKey;
    try {
      console.log('[DEBUG] Service account JSON length:', serviceAccountJson.length);
      console.log('[DEBUG] First 100 chars:', serviceAccountJson.substring(0, 100));
      serviceAccount = JSON.parse(serviceAccountJson);
      console.log('[DEBUG] Parsed service account - project_id:', serviceAccount.project_id);
      console.log('[DEBUG] Parsed service account - client_email:', serviceAccount.client_email);
      console.log('[DEBUG] Private key length:', serviceAccount.private_key?.length);
      console.log('[DEBUG] Private key starts with:', serviceAccount.private_key?.substring(0, 50));
    } catch (e) {
      console.error('[DEBUG] JSON parse error:', e);
      throw new Error('Invalid service account JSON format');
    }

    // Create unique IDs for class and object
    const classId = `${issuerId}.giftcard_class_v1`;
    const objectId = `${issuerId}.gc_${giftCard.id}_${Date.now()}`;

    // Create the Generic Pass Class (will be created if doesn't exist)
    const passClass = createGiftCardClass({
      issuerId,
      classId,
    });

    // Create the gift card pass object
    const passObject = createGiftCardObject({
      giftCard,
      issuerId,
      classId,
      objectId,
    });

    // Get allowed origins from environment or use defaults
    const allowedOrigins = Deno.env.get('WALLET_ALLOWED_ORIGINS')?.split(',') || [
      'https://mobulace.com',
      'https://www.mobulace.com',
      'https://app.mobulace.com',
      'http://localhost:5173',
      'http://localhost:3000',
    ];

    // Create the JWT payload - includes both class and object
    // Google will create the class if it doesn't exist
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

    // Sign the JWT
    console.log('[DEBUG] About to sign JWT...');
    const signedJwt = await signJwt(jwtPayload, serviceAccount.private_key);
    console.log('[DEBUG] JWT signed successfully, length:', signedJwt.length);

    // Generate the save URL
    const saveUrl = `https://pay.google.com/gp/v/save/${signedJwt}`;

    console.log('Google Wallet pass generated successfully for object:', objectId);

    return new Response(
      JSON.stringify({ 
        success: true,
        url: saveUrl,
        objectId,
        classId,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Google Wallet error:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        hint: 'Check that GOOGLE_WALLET_ISSUER_ID and GOOGLE_WALLET_SERVICE_ACCOUNT secrets are properly configured'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

/**
 * Creates the Generic Pass Class definition
 * This defines the template/schema for all gift card passes
 */
function createGiftCardClass({
  issuerId,
  classId,
}: {
  issuerId: string;
  classId: string;
}) {
  return {
    id: classId,
    // Class template settings
    classTemplateInfo: {
      cardTemplateOverride: {
        cardRowTemplateInfos: [
          {
            twoItems: {
              startItem: {
                firstValue: {
                  fields: [
                    {
                      fieldPath: "object.textModulesData['code']",
                    },
                  ],
                },
              },
              endItem: {
                firstValue: {
                  fields: [
                    {
                      fieldPath: "object.textModulesData['balance']",
                    },
                  ],
                },
              },
            },
          },
        ],
      },
    },
    // Enable barcode display
    enableSmartTap: false,
    // Review status - set to UNDER_REVIEW for testing, APPROVED for production
    reviewStatus: 'UNDER_REVIEW',
    // Multiple devices can have this pass
    multipleDevicesAndHoldersAllowedStatus: 'MULTIPLE_HOLDERS',
  };
}

/**
 * Creates the Generic Pass Object (the actual gift card instance)
 */
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

  // Google Wallet Generic Object structure
  // Reference: https://developers.google.com/wallet/generic/rest/v1/genericobject
  const genericObject: Record<string, unknown> = {
    id: objectId,
    classId: classId,
    
    // Card state
    state: 'ACTIVE',
    
    // Header info
    cardTitle: {
      defaultValue: {
        language: 'en',
        value: brandName,
      },
    },
    subheader: {
      defaultValue: {
        language: 'en',
        value: 'GIFT CARD',
      },
    },
    header: {
      defaultValue: {
        language: 'en',
        value: formattedValue,
      },
    },
    
    // Barcode
    barcode: {
      type: 'QR_CODE',
      value: giftCard.card_code,
      alternateText: giftCard.card_code,
    },
    
    // Background color - Purple to match app theme
    hexBackgroundColor: '#7c3aed',
    
    // Text modules for additional info
    textModulesData: [
      {
        id: 'code',
        header: 'CODE',
        body: giftCard.card_code,
      },
      {
        id: 'balance',
        header: 'BALANCE',
        body: formattedValue,
      },
    ],
    
    // Links module
    linksModuleData: {
      uris: [] as Array<{ uri: string; description: string; id: string }>,
    },
    
    // Image module (for brand logos)
    imageModulesData: [] as Array<{ mainImage: { sourceUri: { uri: string }; contentDescription: { defaultValue: { language: string; value: string } } }; id: string }>,
  };

  // Add card number if present
  if (giftCard.card_number) {
    (genericObject.textModulesData as Array<unknown>).push({
      id: 'cardNumber',
      header: 'CARD NUMBER',
      body: giftCard.card_number,
    });
  }

  // Add recipient name if present
  if (giftCard.recipient_name) {
    (genericObject.textModulesData as Array<unknown>).push({
      id: 'recipient',
      header: 'TO',
      body: giftCard.recipient_name,
    });
  }

  // Add expiration if present
  if (giftCard.expiration_date) {
    (genericObject as Record<string, unknown>).validTimeInterval = {
      end: {
        date: giftCard.expiration_date,
      },
    };
    (genericObject.textModulesData as Array<unknown>).push({
      id: 'expiry',
      header: 'EXPIRES',
      body: new Date(giftCard.expiration_date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      }),
    });
  }

  // Add balance check URL if present
  if (giftCard.balance_check_url) {
    (genericObject.linksModuleData as { uris: Array<unknown> }).uris.push({
      uri: giftCard.balance_check_url,
      description: 'Check Balance',
      id: 'checkBalance',
    });
  }

  // Add logo if present
  if (giftCard.logo_url) {
    (genericObject as Record<string, unknown>).logo = {
      sourceUri: {
        uri: giftCard.logo_url,
      },
      contentDescription: {
        defaultValue: {
          language: 'en',
          value: `${brandName} logo`,
        },
      },
    };
    
    // Also add as hero image
    (genericObject as Record<string, unknown>).heroImage = {
      sourceUri: {
        uri: giftCard.logo_url,
      },
      contentDescription: {
        defaultValue: {
          language: 'en',
          value: `${brandName}`,
        },
      },
    };
  }

  return genericObject;
}

async function signJwt(
  payload: Record<string, unknown>,
  privateKeyPem: string
): Promise<string> {
  // JWT Header
  const header = {
    alg: 'RS256',
    typ: 'JWT',
  };

  // Add issued at and expiration (1 hour)
  const now = Math.floor(Date.now() / 1000);
  const jwtPayload = {
    ...payload,
    iat: now,
    exp: now + 3600,
  };

  // Encode header and payload
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(jwtPayload));
  const signingInput = `${encodedHeader}.${encodedPayload}`;

  // Import the private key
  const privateKey = await importPrivateKey(privateKeyPem);

  // Sign the JWT
  const signature = await crypto.subtle.sign(
    { name: 'RSASSA-PKCS1-v1_5' },
    privateKey,
    new TextEncoder().encode(signingInput)
  );

  // Encode signature
  const encodedSignature = base64UrlEncode(new Uint8Array(signature));

  return `${signingInput}.${encodedSignature}`;
}

async function importPrivateKey(pem: string): Promise<CryptoKey> {
  // Remove PEM headers and decode
  const pemContents = pem
    .replace(/-----BEGIN PRIVATE KEY-----/g, '')
    .replace(/-----END PRIVATE KEY-----/g, '')
    .replace(/-----BEGIN RSA PRIVATE KEY-----/g, '')
    .replace(/-----END RSA PRIVATE KEY-----/g, '')
    .replace(/\s/g, '');

  // Decode base64 to get the DER-encoded key
  const binaryString = atob(pemContents);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  // Import the key
  try {
    // Try PKCS#8 format first (most common for service account keys)
    return await crypto.subtle.importKey(
      'pkcs8',
      bytes,
      {
        name: 'RSASSA-PKCS1-v1_5',
        hash: 'SHA-256',
      },
      false,
      ['sign']
    );
  } catch {
    // If PKCS#8 fails, the key might need conversion
    throw new Error('Failed to import private key. Ensure the key is in PKCS#8 format.');
  }
}
