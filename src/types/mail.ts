import { Database } from "@core/services/supabase/types";

// Main mail piece type from database
export type MailPiece = Database["public"]["Tables"]["templates"]["Row"];
export type MailPieceInsert = Database["public"]["Tables"]["templates"]["Insert"];
export type MailPieceUpdate = Database["public"]["Tables"]["templates"]["Update"];

// Mail size options
export type MailSize = "4x6" | "6x9" | "6x11" | "letter" | "trifold";

// Extended mail piece with relations
export interface MailPieceWithRelations extends MailPiece {
  clients?: {
    id: string;
    name: string;
  };
  campaigns?: Array<{
    id: string;
    name: string;
    status: string;
  }>;
}

// Canvas data structure for mail design
export interface CanvasData {
  version: number;
  canvasSize: {
    width: number;
    height: number;
  };
  layers: CanvasLayer[];
}

// Layer types
export type CanvasLayer = 
  | TextLayer
  | ImageLayer
  | ShapeLayer
  | QRCodeLayer
  | TemplateTokenLayer
  | MergeFieldLayer; // Legacy support

// Base layer properties
export interface BaseLayer {
  id: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  opacity?: number;
  visible?: boolean;
  locked?: boolean;
  name?: string;
}

// Text layer
export interface TextLayer extends BaseLayer {
  type: "text";
  text: string;
  fontSize: number;
  fontFamily: string;
  fontWeight?: "normal" | "bold" | "100" | "200" | "300" | "400" | "500" | "600" | "700" | "800" | "900";
  fill: string;
  align?: "left" | "center" | "right" | "justify";
  lineHeight?: number;
  letterSpacing?: number;
}

// Image layer
export interface ImageLayer extends BaseLayer {
  type: "image";
  src: string;
  alt?: string;
  fit?: "cover" | "contain" | "fill" | "none";
}

// Shape layer (rectangle, circle, etc.)
export interface ShapeLayer extends BaseLayer {
  type: "rect" | "circle" | "ellipse" | "polygon";
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  radius?: number; // for circles
  cornerRadius?: number; // for rounded rectangles
}

// QR Code layer
export interface QRCodeLayer extends BaseLayer {
  type: "qr_code";
  data: string; // URL or data to encode
  foregroundColor?: string;
  backgroundColor?: string;
  errorCorrectionLevel?: "L" | "M" | "Q" | "H";
}

// Template token layer (for personalization)
// TERMINOLOGY: Use "template_token" not "merge_field" (see PLATFORM_DICTIONARY.md)
export interface TemplateTokenLayer extends BaseLayer {
  type: "template_token";
  tokenName: string; // e.g., "{{first_name}}", "{{unique_code}}"
  defaultValue?: string;
  fontSize: number;
  fontFamily: string;
  fontWeight?: "normal" | "bold";
  fill: string;
  align?: "left" | "center" | "right";
}

// Legacy: @deprecated Use TemplateTokenLayer instead
export interface MergeFieldLayer extends BaseLayer {
  type: "merge_field";
  fieldName: string;
  defaultValue?: string;
  fontSize: number;
  fontFamily: string;
  fontWeight?: "normal" | "bold";
  fill: string;
  align?: "left" | "center" | "right";
}

// Mail piece dimensions (300 DPI for print)
export const MAIL_DIMENSIONS: Record<MailSize, { width: number; height: number }> = {
  "4x6": { width: 1200, height: 1800 },    // 4"x6" at 300 DPI
  "6x9": { width: 1800, height: 2700 },    // 6"x9" at 300 DPI
  "6x11": { width: 1800, height: 3300 },   // 6"x11" at 300 DPI
  "letter": { width: 2550, height: 3300 }, // 8.5"x11" at 300 DPI
  "trifold": { width: 2550, height: 3300 }, // 8.5"x11" trifold at 300 DPI
};

/**
 * STANDARD TEMPLATE TOKENS
 * 
 * TERMINOLOGY: Use "template_token" not "merge_field" (see PLATFORM_DICTIONARY.md)
 * These are the approved personalization variables for mail, landing pages, and emails.
 * 
 * @see src/lib/terminology.ts for constants version
 * @see PLATFORM_DICTIONARY.md for complete definitions
 */
export const TEMPLATE_TOKENS = [
  { value: "{{first_name}}", label: "First Name" },
  { value: "{{last_name}}", label: "Last Name" },
  { value: "{{full_name}}", label: "Full Name" },
  { value: "{{unique_code}}", label: "Unique Code" }, // PREFERRED over customer_code/redemption_code
  { value: "{{company_name}}", label: "Company Name" },
  { value: "{{purl}}", label: "Personal URL" },
  { value: "{{qr_code}}", label: "QR Code" },
  { value: "{{gift_card_amount}}", label: "Gift Card Amount" },
  // Additional context fields
  { value: "{{email}}", label: "Email" },
  { value: "{{phone}}", label: "Phone" },
  { value: "{{address1}}", label: "Address Line 1" },
  { value: "{{address2}}", label: "Address Line 2" },
  { value: "{{city}}", label: "City" },
  { value: "{{state}}", label: "State" },
  { value: "{{zip}}", label: "ZIP Code" },
] as const;

/**
 * @deprecated Use TEMPLATE_TOKENS instead
 * Legacy constant kept for backward compatibility
 */
export const MERGE_FIELDS = [
  ...TEMPLATE_TOKENS,
  { value: "{{customer_code}}", label: "Customer Code (legacy - use unique_code)" },
  { value: "{{redemption_code}}", label: "Redemption Code (legacy - use unique_code)" },
] as const;
