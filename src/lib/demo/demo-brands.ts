/**
 * Demo Gift Card Brands
 * 
 * Completely fictional brands for testing purposes
 * These should be clearly identifiable as fake and removed before production launch
 */

export interface DemoBrand {
  brand_name: string;
  brand_code: string;
  provider: string;
  logo_url: string | null;
  category: string;
  typical_denominations: number[];
  balance_check_enabled: boolean;
  is_active: boolean;
  is_demo_brand: boolean;
  description?: string;
}

export const DEMO_BRANDS: DemoBrand[] = [
  {
    brand_name: 'DemoCoffee',
    brand_code: 'demo_coffee',
    provider: 'demo',
    logo_url: null,
    category: 'food_beverage',
    typical_denominations: [5, 10, 15, 25],
    balance_check_enabled: false,
    is_active: true,
    is_demo_brand: true,
    description: '☕ Fictional coffee shop chain - FOR TESTING ONLY',
  },
  {
    brand_name: 'FakeRetail',
    brand_code: 'fake_retail',
    provider: 'demo',
    logo_url: null,
    category: 'retail',
    typical_denominations: [25, 50, 100],
    balance_check_enabled: false,
    is_active: true,
    is_demo_brand: true,
    description: '🛍️ Fictional retail store - FOR TESTING ONLY',
  },
  {
    brand_name: 'TestBurger',
    brand_code: 'test_burger',
    provider: 'demo',
    logo_url: null,
    category: 'food_beverage',
    typical_denominations: [10, 15, 20, 25],
    balance_check_enabled: false,
    is_active: true,
    is_demo_brand: true,
    description: '🍔 Fictional fast food chain - FOR TESTING ONLY',
  },
  {
    brand_name: 'MockElectronics',
    brand_code: 'mock_electronics',
    provider: 'demo',
    logo_url: null,
    category: 'electronics',
    typical_denominations: [50, 100, 200],
    balance_check_enabled: false,
    is_active: true,
    is_demo_brand: true,
    description: '💻 Fictional electronics store - FOR TESTING ONLY',
  },
  {
    brand_name: 'SampleBooks',
    brand_code: 'sample_books',
    provider: 'demo',
    logo_url: null,
    category: 'retail',
    typical_denominations: [10, 25, 50],
    balance_check_enabled: false,
    is_active: true,
    is_demo_brand: true,
    description: '📚 Fictional bookstore - FOR TESTING ONLY',
  },
  {
    brand_name: 'DemoGaming',
    brand_code: 'demo_gaming',
    provider: 'demo',
    logo_url: null,
    category: 'entertainment',
    typical_denominations: [20, 50, 100],
    balance_check_enabled: false,
    is_active: true,
    is_demo_brand: true,
    description: '🎮 Fictional gaming platform - FOR TESTING ONLY',
  },
  {
    brand_name: 'TestGrocery',
    brand_code: 'test_grocery',
    provider: 'demo',
    logo_url: null,
    category: 'food_beverage',
    typical_denominations: [25, 50, 75, 100],
    balance_check_enabled: false,
    is_active: true,
    is_demo_brand: true,
    description: '🛒 Fictional grocery store - FOR TESTING ONLY',
  },
  {
    brand_name: 'FakeFashion',
    brand_code: 'fake_fashion',
    provider: 'demo',
    logo_url: null,
    category: 'retail',
    typical_denominations: [25, 50, 100],
    balance_check_enabled: false,
    is_active: true,
    is_demo_brand: true,
    description: '👗 Fictional fashion retailer - FOR TESTING ONLY',
  },
];

/**
 * Get SQL INSERT statement for demo brands
 */
export function getDemoBrandsSQL(): string {
  return `
-- Insert demo gift card brands for testing
INSERT INTO gift_card_brands (
  brand_name,
  brand_code,
  provider,
  logo_url,
  category,
  typical_denominations,
  balance_check_enabled,
  is_active,
  is_demo_brand
) VALUES
${DEMO_BRANDS.map((brand, index) => `
  (
    '${brand.brand_name}',
    '${brand.brand_code}',
    '${brand.provider}',
    ${brand.logo_url ? `'${brand.logo_url}'` : 'NULL'},
    '${brand.category}',
    '${JSON.stringify(brand.typical_denominations)}'::jsonb,
    ${brand.balance_check_enabled},
    ${brand.is_active},
    ${brand.is_demo_brand}
  )${index < DEMO_BRANDS.length - 1 ? ',' : ''}
`).join('')}
ON CONFLICT (brand_code) DO UPDATE SET
  is_demo_brand = EXCLUDED.is_demo_brand,
  is_active = EXCLUDED.is_active;
`;
}

/**
 * Check if a brand is a demo brand
 */
export function isDemoBrand(brandCode: string): boolean {
  return DEMO_BRANDS.some(b => b.brand_code === brandCode);
}

/**
 * Get demo brand emoji for UI
 */
export function getDemoBrandEmoji(category: string): string {
  const emojiMap: Record<string, string> = {
    'food_beverage': '☕🍔🛒',
    'retail': '🛍️📚👗',
    'electronics': '💻',
    'entertainment': '🎮',
  };
  return emojiMap[category] || '🎁';
}

