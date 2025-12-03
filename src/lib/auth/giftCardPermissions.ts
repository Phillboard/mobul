import { AppRole } from './roleUtils';

/**
 * Gift Card Feature Permissions Matrix
 * 
 * Defines which user roles can access which gift card features.
 * 
 * Permission Strategy:
 * - Admin: Full access to everything
 * - Agency Owner: Marketplace + simplified selection
 * - Company Owner/Client: ONLY simplified selection in campaign wizard
 * - Call Center: Redemption only
 */

export const GIFT_CARD_FEATURES = {
  // ============ ADMIN ONLY ============
  // Platform-level marketplace and inventory management
  'admin_marketplace': ['admin'],
  'master_pools': ['admin'],
  'pool_pricing': ['admin'],
  'sell_cards': ['admin'],
  'analytics': ['admin'],
  'inventory_tracking': ['admin'],
  'brand_management': ['admin'],
  'record_purchase': ['admin'],
  'pool_settings': ['admin'],
  
  // ============ ADMIN + AGENCY ============
  // Client marketplace and pool management
  'client_marketplace': ['admin', 'agency_owner'],
  'purchase_cards': ['admin', 'agency_owner'],
  'view_pools': ['admin', 'agency_owner'],
  'upload_cards': ['admin', 'agency_owner'],
  'manage_inventory': ['admin', 'agency_owner'],
  'delivery_history': ['admin', 'agency_owner'],
  
  // ============ ALL WITH CLIENT CONTEXT ============
  // Campaign wizard gift card selection
  'assign_to_campaign': ['admin', 'agency_owner', 'company_owner'],
  'view_brand_denominations': ['admin', 'agency_owner', 'company_owner'],
  
  // ============ CALL CENTER + ABOVE ============
  // Gift card redemption
  'redeem_cards': ['admin', 'agency_owner', 'company_owner', 'call_center'],
  'view_redemption_history': ['admin', 'agency_owner', 'company_owner', 'call_center'],
} as const;

export type GiftCardFeature = keyof typeof GIFT_CARD_FEATURES;

/**
 * Check if a user role can access a specific gift card feature
 */
export function canAccessGiftCardFeature(
  userRole: AppRole,
  feature: GiftCardFeature
): boolean {
  const allowedRoles = GIFT_CARD_FEATURES[feature];
  return allowedRoles.includes(userRole as any);
}

/**
 * Check if user can access any of the provided features
 */
export function canAccessAnyGiftCardFeature(
  userRole: AppRole,
  features: GiftCardFeature[]
): boolean {
  return features.some(feature => canAccessGiftCardFeature(userRole, feature));
}

/**
 * Get all gift card features accessible to a role
 */
export function getAccessibleGiftCardFeatures(userRole: AppRole): GiftCardFeature[] {
  return (Object.keys(GIFT_CARD_FEATURES) as GiftCardFeature[]).filter(feature =>
    canAccessGiftCardFeature(userRole, feature)
  );
}

/**
 * Navigation visibility rules
 */
export const GIFT_CARD_NAV_VISIBILITY = {
  // Main "Gift Cards" nav item
  giftCardInventory: ['admin', 'agency_owner'],
  
  // Purchase cards nav item  
  purchaseCards: ['admin', 'agency_owner'],
  
  // Admin marketplace nav item
  adminMarketplace: ['admin'],
  
  // No gift card nav items visible to company_owner or call_center
} as const;

/**
 * Route protection rules
 */
export const GIFT_CARD_ROUTE_PROTECTION = {
  '/gift-cards': ['admin', 'agency_owner'],
  '/gift-cards/pools/:poolId': ['admin', 'agency_owner'],
  '/gift-cards/marketplace': ['admin', 'agency_owner'],
  '/gift-cards/purchase/:poolId': ['admin', 'agency_owner'],
  '/credits-billing': ['admin', 'agency_owner', 'company_owner'],
  '/admin/gift-card-marketplace': ['admin'],
  '/admin/gift-cards/record-purchase': ['admin'],
  '/admin/gift-cards/pools/:poolId/pricing': ['admin'],
  '/call-center': ['admin', 'agency_owner', 'company_owner', 'call_center'],
} as const;

/**
 * Check if user can access a gift card route
 */
export function canAccessGiftCardRoute(
  userRole: AppRole,
  path: string
): boolean {
  // Find matching route pattern
  const matchingRoute = Object.keys(GIFT_CARD_ROUTE_PROTECTION).find(route => {
    // Convert route pattern to regex
    const pattern = route.replace(/:[^/]+/g, '[^/]+');
    const regex = new RegExp(`^${pattern}$`);
    return regex.test(path);
  });
  
  if (!matchingRoute) {
    return true; // No restriction found
  }
  
  const allowedRoles = GIFT_CARD_ROUTE_PROTECTION[matchingRoute as keyof typeof GIFT_CARD_ROUTE_PROTECTION];
  return allowedRoles.includes(userRole as any);
}

/**
 * Feature descriptions for documentation
 */
export const GIFT_CARD_FEATURE_DESCRIPTIONS: Record<GiftCardFeature, string> = {
  // Admin only
  admin_marketplace: 'Access platform-level gift card marketplace',
  master_pools: 'Manage master gift card pools',
  pool_pricing: 'Configure pool pricing and markups',
  sell_cards: 'Sell gift cards to clients',
  analytics: 'View gift card analytics and testing tools',
  inventory_tracking: 'Track inventory purchases and costs',
  brand_management: 'Manage gift card brands',
  record_purchase: 'Record inventory purchases',
  pool_settings: 'Configure pool settings and thresholds',
  
  // Admin + Agency
  client_marketplace: 'Access client marketplace to purchase cards',
  purchase_cards: 'Purchase gift cards from marketplace',
  view_pools: 'View gift card pool summaries',
  upload_cards: 'Upload gift card codes to pools',
  manage_inventory: 'Manage gift card inventory',
  delivery_history: 'View gift card delivery history',
  
  // All with client context
  assign_to_campaign: 'Assign gift cards to campaign conditions',
  view_brand_denominations: 'View available gift card brands and denominations',
  
  // Call center + above
  redeem_cards: 'Redeem gift cards for customers',
  view_redemption_history: 'View redemption history',
};

