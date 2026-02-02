/**
 * Generate Apple Wallet Pass Edge Function
 * 
 * Generates .pkpass files for gift cards that can be added to Apple Wallet.
 * 
 * SETUP REQUIRED:
 * 1. Enroll in Apple Developer Program ($99/year)
 * 2. Create Pass Type ID (e.g., pass.com.yourcompany.giftcard)
 * 3. Generate Pass Type ID Certificate from Apple Developer
 * 4. Export certificate as .p12 with password
 * 5. Download Apple WWDR G4 certificate
 * 6. Add secrets to Supabase (see types below)
 * 
 * Public endpoint (called from landing pages).
 */

import { withApiGateway, ApiError, type PublicContext } from '../_shared/api-gateway.ts';
import forge from "npm:node-forge@1.3.1";
import { JSZip } from "https://deno.land/x/jszip@0.11.0/mod.ts";

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

interface GenerateAppleWalletRequest {
  giftCard: GiftCardData;
}

interface GenerateAppleWalletResponse {
  success: boolean;
  pkpass: string;
  filename: string;
  size: number;
}

// ============================================================================
// Certificate Parsing
// ============================================================================

function parseCertificate(
  p12Base64: string,
  password: string
): { privateKey: forge.pki.PrivateKey; certificate: forge.pki.Certificate } {
  try {
    const p12Der = forge.util.decode64(p12Base64);
    const p12Asn1 = forge.asn1.fromDer(p12Der);
    const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, password);

    const keyBags = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag });
    const keyBag = keyBags[forge.pki.oids.pkcs8ShroudedKeyBag];

    if (!keyBag || keyBag.length === 0 || !keyBag[0].key) {
      throw new Error('No private key found in certificate');
    }

    const privateKey = keyBag[0].key;

    const certBags = p12.getBags({ bagType: forge.pki.oids.certBag });
    const certBag = certBags[forge.pki.oids.certBag];

    if (!certBag || certBag.length === 0 || !certBag[0].cert) {
      throw new Error('No certificate found in .p12 file');
    }

    return { privateKey, certificate: certBag[0].cert };
  } catch (error) {
    if (error instanceof Error && error.message.includes('Invalid password')) {
      throw new Error('Invalid certificate password');
    }
    throw new Error(`Failed to parse certificate: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

function parseWWDRCertificate(wwdrB64: string): forge.pki.Certificate {
  try {
    const wwdrDer = forge.util.decode64(wwdrB64);
    try {
      const asn1 = forge.asn1.fromDer(wwdrDer);
      return forge.pki.certificateFromAsn1(asn1);
    } catch {
      const pem = forge.util.decodeUtf8(wwdrDer);
      return forge.pki.certificateFromPem(pem);
    }
  } catch (error) {
    console.warn('[APPLE-WALLET] Failed to parse WWDR certificate:', error);
    throw new Error('Failed to parse WWDR certificate');
  }
}

// ============================================================================
// Pass Creation
// ============================================================================

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

  const pass: Record<string, unknown> = {
    formatVersion: 1,
    passTypeIdentifier: passTypeId,
    serialNumber,
    teamIdentifier: teamId,
    organizationName: 'Mobul',
    description: `${brandName} Gift Card`,
    logoText: brandName,
    foregroundColor: 'rgb(255, 255, 255)',
    backgroundColor: 'rgb(124, 58, 237)',
    labelColor: 'rgb(233, 213, 255)',
    barcode: {
      format: 'PKBarcodeFormatQR',
      message: giftCard.card_code,
      messageEncoding: 'iso-8859-1',
      altText: giftCard.card_code,
    },
    barcodes: [
      {
        format: 'PKBarcodeFormatQR',
        message: giftCard.card_code,
        messageEncoding: 'iso-8859-1',
        altText: giftCard.card_code,
      },
    ],
    storeCard: {
      headerFields: [{ key: 'balance', label: 'BALANCE', value: formattedValue }],
      primaryFields: [{ key: 'brand', label: 'GIFT CARD', value: brandName }],
      secondaryFields: [{ key: 'code', label: 'CODE', value: giftCard.card_code }],
      auxiliaryFields: [] as Array<{ key: string; label: string; value: string }>,
      backFields: [
        { key: 'terms', label: 'Terms & Conditions', value: 'This gift card is redeemable for merchandise at participating locations.' },
        { key: 'poweredBy', label: 'Powered By', value: 'Mobul - Direct Mail Campaign Platform' },
      ],
    },
  };

  if (giftCard.card_number) {
    (pass.storeCard as Record<string, unknown[]>).auxiliaryFields.push({
      key: 'cardNumber', label: 'CARD #', value: giftCard.card_number,
    });
  }

  if (giftCard.expiration_date) {
    const expirationDate = new Date(giftCard.expiration_date);
    (pass.storeCard as Record<string, unknown[]>).auxiliaryFields.push({
      key: 'expires', label: 'EXPIRES',
      value: expirationDate.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }),
    });
    pass.expirationDate = expirationDate.toISOString();
  }

  if (giftCard.recipient_name) {
    (pass.storeCard as Record<string, unknown[]>).secondaryFields.push({
      key: 'recipient', label: 'TO', value: giftCard.recipient_name,
    });
  }

  return pass;
}

// ============================================================================
// PNG Generation
// ============================================================================

function createSimpleIcon(size: number): Uint8Array {
  const width = size;
  const height = size;

  const signature = new Uint8Array([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);

  const ihdrData = new Uint8Array([
    (width >> 24) & 0xFF, (width >> 16) & 0xFF, (width >> 8) & 0xFF, width & 0xFF,
    (height >> 24) & 0xFF, (height >> 16) & 0xFF, (height >> 8) & 0xFF, height & 0xFF,
    8, 2, 0, 0, 0,
  ]);

  const ihdrForCrc = new Uint8Array(4 + ihdrData.length);
  ihdrForCrc.set([0x49, 0x48, 0x44, 0x52], 0);
  ihdrForCrc.set(ihdrData, 4);
  const ihdrCrc = crc32Array(ihdrForCrc);

  const ihdr = new Uint8Array(4 + 4 + ihdrData.length + 4);
  ihdr.set([0x00, 0x00, 0x00, 0x0D], 0);
  ihdr.set([0x49, 0x48, 0x44, 0x52], 4);
  ihdr.set(ihdrData, 8);
  ihdr.set([(ihdrCrc >> 24) & 0xFF, (ihdrCrc >> 16) & 0xFF, (ihdrCrc >> 8) & 0xFF, ihdrCrc & 0xFF], 8 + ihdrData.length);

  const rawDataLength = height * (1 + width * 3);
  const rawData = new Uint8Array(rawDataLength);
  let idx = 0;
  for (let y = 0; y < height; y++) {
    rawData[idx++] = 0;
    for (let x = 0; x < width; x++) {
      rawData[idx++] = 124;
      rawData[idx++] = 58;
      rawData[idx++] = 237;
    }
  }

  const deflated = deflateSyncArray(rawData);

  const idatForCrc = new Uint8Array(4 + deflated.length);
  idatForCrc.set([0x49, 0x44, 0x41, 0x54], 0);
  idatForCrc.set(deflated, 4);
  const idatCrc = crc32Array(idatForCrc);

  const idat = new Uint8Array(4 + 4 + deflated.length + 4);
  idat.set([(deflated.length >> 24) & 0xFF, (deflated.length >> 16) & 0xFF, (deflated.length >> 8) & 0xFF, deflated.length & 0xFF], 0);
  idat.set([0x49, 0x44, 0x41, 0x54], 4);
  idat.set(deflated, 8);
  idat.set([(idatCrc >> 24) & 0xFF, (idatCrc >> 16) & 0xFF, (idatCrc >> 8) & 0xFF, idatCrc & 0xFF], 8 + deflated.length);

  const iend = new Uint8Array([0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82]);

  const totalLength = signature.length + ihdr.length + idat.length + iend.length;
  const result = new Uint8Array(totalLength);
  let offset = 0;
  result.set(signature, offset); offset += signature.length;
  result.set(ihdr, offset); offset += ihdr.length;
  result.set(idat, offset); offset += idat.length;
  result.set(iend, offset);

  return result;
}

function deflateSyncArray(data: Uint8Array): Uint8Array {
  const numBlocks = Math.ceil(data.length / 65535);
  const outputSize = 2 + (numBlocks * 5) + data.length + 4;
  const result = new Uint8Array(outputSize);
  let resultIdx = 0;

  result[resultIdx++] = 0x78;
  result[resultIdx++] = 0x9C;

  let offset = 0;
  while (offset < data.length) {
    const remaining = data.length - offset;
    const blockSize = Math.min(remaining, 65535);
    const isLast = offset + blockSize >= data.length;

    result[resultIdx++] = isLast ? 0x01 : 0x00;
    result[resultIdx++] = blockSize & 0xFF;
    result[resultIdx++] = (blockSize >> 8) & 0xFF;
    result[resultIdx++] = (~blockSize) & 0xFF;
    result[resultIdx++] = ((~blockSize) >> 8) & 0xFF;

    result.set(data.subarray(offset, offset + blockSize), resultIdx);
    resultIdx += blockSize;
    offset += blockSize;
  }

  let a = 1, b = 0;
  for (let i = 0; i < data.length; i++) {
    a = (a + data[i]) % 65521;
    b = (b + a) % 65521;
  }
  const adler = (b << 16) | a;
  result[resultIdx++] = (adler >> 24) & 0xFF;
  result[resultIdx++] = (adler >> 16) & 0xFF;
  result[resultIdx++] = (adler >> 8) & 0xFF;
  result[resultIdx++] = adler & 0xFF;

  return result.subarray(0, resultIdx);
}

function crc32Array(data: Uint8Array): number {
  let crc = 0xFFFFFFFF;
  const table = getCrc32Table();
  for (let i = 0; i < data.length; i++) {
    crc = table[(crc ^ data[i]) & 0xFF] ^ (crc >>> 8);
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

// ============================================================================
// Signing
// ============================================================================

function sha1Hash(data: Uint8Array): string {
  const md = forge.md.sha1.create();
  const chunkSize = 32768;
  for (let i = 0; i < data.length; i += chunkSize) {
    const end = Math.min(i + chunkSize, data.length);
    const chunk = data.subarray(i, end);
    let binaryStr = '';
    for (let j = 0; j < chunk.length; j++) {
      binaryStr += String.fromCharCode(chunk[j]);
    }
    md.update(binaryStr);
  }
  return md.digest().toHex();
}

function createPkcs7Signature(
  manifest: string,
  privateKey: forge.pki.PrivateKey,
  certificate: forge.pki.Certificate,
  wwdrCert?: forge.pki.Certificate
): Uint8Array {
  const p7 = forge.pkcs7.createSignedData();
  p7.content = forge.util.createBuffer(manifest, 'utf8');
  p7.addCertificate(certificate);
  if (wwdrCert) p7.addCertificate(wwdrCert);

  p7.addSigner({
    key: privateKey,
    certificate,
    digestAlgorithm: forge.pki.oids.sha256,
    authenticatedAttributes: [
      { type: forge.pki.oids.contentType, value: forge.pki.oids.data },
      { type: forge.pki.oids.messageDigest },
      { type: forge.pki.oids.signingTime, value: new Date() },
    ],
  });

  p7.sign({ detached: true });
  const asn1 = p7.toAsn1();
  const der = forge.asn1.toDer(asn1);

  const bytes = new Uint8Array(der.length());
  for (let i = 0; i < der.length(); i++) {
    bytes[i] = der.at(i);
  }
  return bytes;
}

// ============================================================================
// Pkpass File Creation
// ============================================================================

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

  const passJsonString = JSON.stringify(passJson, null, 2);
  zip.addFile('pass.json', new TextEncoder().encode(passJsonString));

  const iconPng = createSimpleIcon(29);
  const icon2xPng = createSimpleIcon(58);
  const icon3xPng = createSimpleIcon(87);
  const logoPng = createSimpleIcon(160);
  const logo2xPng = createSimpleIcon(320);

  zip.addFile('icon.png', iconPng);
  zip.addFile('icon@2x.png', icon2xPng);
  zip.addFile('icon@3x.png', icon3xPng);
  zip.addFile('logo.png', logoPng);
  zip.addFile('logo@2x.png', logo2xPng);

  const manifest: Record<string, string> = {
    'pass.json': sha1Hash(new TextEncoder().encode(passJsonString)),
    'icon.png': sha1Hash(iconPng),
    'icon@2x.png': sha1Hash(icon2xPng),
    'icon@3x.png': sha1Hash(icon3xPng),
    'logo.png': sha1Hash(logoPng),
    'logo@2x.png': sha1Hash(logo2xPng),
  };

  const manifestString = JSON.stringify(manifest);
  zip.addFile('manifest.json', new TextEncoder().encode(manifestString));

  const signature = createPkcs7Signature(manifestString, privateKey, certificate, wwdrCert);
  zip.addFile('signature', signature);

  return await zip.generateAsync({ type: 'uint8array' });
}

// ============================================================================
// Main Handler
// ============================================================================

async function handleGenerateAppleWalletPass(
  request: GenerateAppleWalletRequest,
  _context: PublicContext
): Promise<GenerateAppleWalletResponse> {
  const { giftCard } = request;

  if (!giftCard || !giftCard.card_code) {
    throw new ApiError('Gift card data with card_code is required', 'VALIDATION_ERROR', 400);
  }

  const certificateB64 = Deno.env.get('APPLE_WALLET_CERTIFICATE');
  const password = Deno.env.get('APPLE_WALLET_CERTIFICATE_PASSWORD');
  const teamId = Deno.env.get('APPLE_WALLET_TEAM_ID');
  const passTypeId = Deno.env.get('APPLE_WALLET_PASS_TYPE_ID');
  const wwdrCertB64 = Deno.env.get('APPLE_WWDR_CERTIFICATE');

  if (!certificateB64 || !password || !teamId || !passTypeId) {
    throw new ApiError('Apple Wallet not configured', 'CONFIGURATION_ERROR', 503, {
      requiredSecrets: [
        'APPLE_WALLET_CERTIFICATE',
        'APPLE_WALLET_CERTIFICATE_PASSWORD',
        'APPLE_WALLET_TEAM_ID',
        'APPLE_WALLET_PASS_TYPE_ID',
        'APPLE_WWDR_CERTIFICATE',
      ],
      setupUrl: 'https://developer.apple.com/account/resources/certificates/list',
    });
  }

  console.log('[APPLE-WALLET] Generating pass for card:', giftCard.id);

  const serialNumber = `gc-${giftCard.id}-${Date.now()}`;

  const passJson = createPassJson({ giftCard, teamId, passTypeId, serialNumber });

  const { privateKey, certificate } = parseCertificate(certificateB64, password);

  let wwdrCert: forge.pki.Certificate | undefined;
  if (wwdrCertB64) {
    wwdrCert = parseWWDRCertificate(wwdrCertB64);
  }

  const pkpassBuffer = await createPkpassFile({ passJson, privateKey, certificate, wwdrCert });

  // Convert to base64
  let binaryString = '';
  const chunkSize = 8192;
  for (let i = 0; i < pkpassBuffer.length; i += chunkSize) {
    const end = Math.min(i + chunkSize, pkpassBuffer.length);
    const chunk = pkpassBuffer.subarray(i, end);
    for (let j = 0; j < chunk.length; j++) {
      binaryString += String.fromCharCode(chunk[j]);
    }
  }
  const base64Pass = btoa(binaryString);

  console.log('[APPLE-WALLET] Pass generated successfully, size:', pkpassBuffer.length);

  return {
    success: true,
    pkpass: base64Pass,
    filename: `giftcard-${giftCard.id}.pkpass`,
    size: pkpassBuffer.length,
  };
}

// ============================================================================
// Export with API Gateway
// ============================================================================

Deno.serve(withApiGateway(handleGenerateAppleWalletPass, {
  requireAuth: false, // Public endpoint
  parseBody: true,
  auditAction: 'generate_apple_wallet_pass',
}));
