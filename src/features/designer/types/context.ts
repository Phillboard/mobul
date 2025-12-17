/**
 * Designer Context Types
 * Comprehensive types for campaign context and brand intelligence
 */

export type IndustryVertical = 
  | 'auto_warranty'
  | 'auto_service'
  | 'roofing'
  | 'solar'
  | 'hvac'
  | 'home_services'
  | 'insurance'
  | 'real_estate'
  | 'other';

export type GiftCardBrand = 
  | 'jimmy-johns'
  | 'starbucks'
  | 'dominos'
  | 'marcos'
  | 'subway'
  | 'chilis'
  | 'panera'
  | 'chipotle'
  | 'generic-food'
  | 'generic-retail'
  | 'unknown';

export interface GiftCardInfo {
  brand: string;           // Display name: "Jimmy John's"
  brandKey: GiftCardBrand; // Normalized key for lookup
  amount: number;          // Dollar amount: 15, 10, 25
  poolId: string;          // Database ID
  logoUrl?: string;        // Brand logo URL
}

export interface BrandStyle {
  brandKey: GiftCardBrand;
  displayName: string;
  colors: {
    primary: string;      // Main brand color hex
    secondary: string;    // Accent color hex
    background: string;   // Suggested background
  };
  imagery: string;        // Description of appropriate imagery
  style: string;          // Style notes for prompts
  foodType?: string;      // Type of food if applicable
}

export interface CompanyInfo {
  name: string;
  logo?: string;
  phone?: string;
  website?: string;
  address?: string;
}

export interface IndustryInfo {
  vertical: IndustryVertical;
  displayName: string;
  colors: {
    primary: string;
    secondary: string;
  };
  styleNotes: string;
}

export interface CampaignInfo {
  id?: string;
  name?: string;
  type?: 'direct-mail' | 'digital';
}

export interface DesignerContext {
  // Campaign
  campaign: CampaignInfo | null;
  
  // Company
  company: CompanyInfo;
  
  // Industry
  industry: IndustryInfo;
  
  // Gift Card (THE MOST IMPORTANT)
  giftCard: GiftCardInfo | null;
  
  // Brand style (derived from gift card)
  brandStyle: BrandStyle | null;
  
  // Status
  hasContext: boolean;
  contextStrength: 'full' | 'partial' | 'none';
  isLoading: boolean;
  error?: string;
}
