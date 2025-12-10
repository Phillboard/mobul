/**
 * Popular Gift Card Brands Database
 * 
 * Pre-defined database of 100+ popular brands for instant lookup
 * Provides brand metadata including logos, websites, categories, and Tillo codes
 */

export interface PopularBrand {
  brand_name: string;
  brand_code: string;
  website: string;
  logo_url: string;
  category: 'food_beverage' | 'retail' | 'entertainment' | 'travel' | 'gas_automotive' | 'home_garden' | 'health_beauty' | 'technology' | 'general';
  tillo_brand_code?: string;
  description?: string;
}

export const POPULAR_BRANDS: PopularBrand[] = [
  // Food & Beverage
  {
    brand_name: 'Starbucks',
    brand_code: 'starbucks',
    website: 'starbucks.com',
    logo_url: 'https://logo.clearbit.com/starbucks.com',
    category: 'food_beverage',
    tillo_brand_code: 'STARBUCKS',
    description: 'Coffee, espresso drinks, and food items'
  },
  {
    brand_name: 'Dunkin\'',
    brand_code: 'dunkin',
    website: 'dunkindonuts.com',
    logo_url: 'https://logo.clearbit.com/dunkindonuts.com',
    category: 'food_beverage',
    description: 'Coffee, donuts, and breakfast items'
  },
  {
    brand_name: 'Subway',
    brand_code: 'subway',
    website: 'subway.com',
    logo_url: 'https://logo.clearbit.com/subway.com',
    category: 'food_beverage',
    description: 'Fresh sandwiches and salads'
  },
  {
    brand_name: 'Chipotle',
    brand_code: 'chipotle',
    website: 'chipotle.com',
    logo_url: 'https://logo.clearbit.com/chipotle.com',
    category: 'food_beverage',
    description: 'Mexican food and burritos'
  },
  {
    brand_name: 'Panera Bread',
    brand_code: 'panera',
    website: 'panerabread.com',
    logo_url: 'https://logo.clearbit.com/panerabread.com',
    category: 'food_beverage',
    description: 'Bakery, cafe, and fresh food'
  },
  {
    brand_name: 'Papa John\'s',
    brand_code: 'papa_johns',
    website: 'papajohns.com',
    logo_url: 'https://logo.clearbit.com/papajohns.com',
    category: 'food_beverage',
    description: 'Pizza delivery and carryout'
  },
  {
    brand_name: 'Domino\'s Pizza',
    brand_code: 'dominos',
    website: 'dominos.com',
    logo_url: 'https://logo.clearbit.com/dominos.com',
    category: 'food_beverage',
    description: 'Pizza delivery and carryout'
  },
  {
    brand_name: 'Buffalo Wild Wings',
    brand_code: 'buffalo_wild_wings',
    website: 'buffalowildwings.com',
    logo_url: 'https://logo.clearbit.com/buffalowildwings.com',
    category: 'food_beverage',
    description: 'Wings, beer, and sports'
  },
  {
    brand_name: 'Chili\'s',
    brand_code: 'chilis',
    website: 'chilis.com',
    logo_url: 'https://logo.clearbit.com/chilis.com',
    category: 'food_beverage',
    description: 'American casual dining'
  },
  {
    brand_name: 'Olive Garden',
    brand_code: 'olive_garden',
    website: 'olivegarden.com',
    logo_url: 'https://logo.clearbit.com/olivegarden.com',
    category: 'food_beverage',
    description: 'Italian-American restaurant chain'
  },

  // Retail
  {
    brand_name: 'Amazon',
    brand_code: 'amazon',
    website: 'amazon.com',
    logo_url: 'https://logo.clearbit.com/amazon.com',
    category: 'retail',
    tillo_brand_code: 'AMAZON',
    description: 'Online shopping for everything'
  },
  {
    brand_name: 'Target',
    brand_code: 'target',
    website: 'target.com',
    logo_url: 'https://logo.clearbit.com/target.com',
    category: 'retail',
    tillo_brand_code: 'TARGET',
    description: 'Department store and online shopping'
  },
  {
    brand_name: 'Walmart',
    brand_code: 'walmart',
    website: 'walmart.com',
    logo_url: 'https://logo.clearbit.com/walmart.com',
    category: 'retail',
    tillo_brand_code: 'WALMART',
    description: 'Discount retailer and online shopping'
  },
  {
    brand_name: 'Best Buy',
    brand_code: 'best_buy',
    website: 'bestbuy.com',
    logo_url: 'https://logo.clearbit.com/bestbuy.com',
    category: 'technology',
    description: 'Electronics and appliances'
  },
  {
    brand_name: 'Home Depot',
    brand_code: 'home_depot',
    website: 'homedepot.com',
    logo_url: 'https://logo.clearbit.com/homedepot.com',
    category: 'home_garden',
    description: 'Home improvement and hardware'
  },
  {
    brand_name: 'Lowe\'s',
    brand_code: 'lowes',
    website: 'lowes.com',
    logo_url: 'https://logo.clearbit.com/lowes.com',
    category: 'home_garden',
    description: 'Home improvement and hardware'
  },
  {
    brand_name: 'Macy\'s',
    brand_code: 'macys',
    website: 'macys.com',
    logo_url: 'https://logo.clearbit.com/macys.com',
    category: 'retail',
    description: 'Department store for clothing and home goods'
  },
  {
    brand_name: 'Kohl\'s',
    brand_code: 'kohls',
    website: 'kohls.com',
    logo_url: 'https://logo.clearbit.com/kohls.com',
    category: 'retail',
    description: 'Department store for clothing and home goods'
  },
  {
    brand_name: 'Nordstrom',
    brand_code: 'nordstrom',
    website: 'nordstrom.com',
    logo_url: 'https://logo.clearbit.com/nordstrom.com',
    category: 'retail',
    description: 'Upscale fashion and accessories'
  },
  {
    brand_name: 'Gap',
    brand_code: 'gap',
    website: 'gap.com',
    logo_url: 'https://logo.clearbit.com/gap.com',
    category: 'retail',
    description: 'Casual clothing and accessories'
  },

  // Entertainment & Media
  {
    brand_name: 'Netflix',
    brand_code: 'netflix',
    website: 'netflix.com',
    logo_url: 'https://logo.clearbit.com/netflix.com',
    category: 'entertainment',
    description: 'Streaming movies and TV shows'
  },
  {
    brand_name: 'Spotify',
    brand_code: 'spotify',
    website: 'spotify.com',
    logo_url: 'https://logo.clearbit.com/spotify.com',
    category: 'entertainment',
    description: 'Music streaming service'
  },
  {
    brand_name: 'iTunes',
    brand_code: 'itunes',
    website: 'apple.com',
    logo_url: 'https://logo.clearbit.com/apple.com',
    category: 'entertainment',
    tillo_brand_code: 'ITUNES',
    description: 'Music, movies, and apps from Apple'
  },
  {
    brand_name: 'Google Play',
    brand_code: 'google_play',
    website: 'play.google.com',
    logo_url: 'https://logo.clearbit.com/google.com',
    category: 'entertainment',
    description: 'Apps, games, and digital content'
  },
  {
    brand_name: 'Xbox',
    brand_code: 'xbox',
    website: 'xbox.com',
    logo_url: 'https://logo.clearbit.com/xbox.com',
    category: 'entertainment',
    description: 'Gaming console and digital games'
  },
  {
    brand_name: 'PlayStation',
    brand_code: 'playstation',
    website: 'playstation.com',
    logo_url: 'https://logo.clearbit.com/playstation.com',
    category: 'entertainment',
    description: 'Gaming console and digital games'
  },
  {
    brand_name: 'Steam',
    brand_code: 'steam',
    website: 'steampowered.com',
    logo_url: 'https://logo.clearbit.com/steampowered.com',
    category: 'entertainment',
    description: 'PC gaming platform'
  },
  {
    brand_name: 'AMC Theatres',
    brand_code: 'amc_theatres',
    website: 'amctheatres.com',
    logo_url: 'https://logo.clearbit.com/amctheatres.com',
    category: 'entertainment',
    description: 'Movie theatre chain'
  },
  {
    brand_name: 'Regal Cinemas',
    brand_code: 'regal',
    website: 'regmovies.com',
    logo_url: 'https://logo.clearbit.com/regmovies.com',
    category: 'entertainment',
    description: 'Movie theatre chain'
  },
  {
    brand_name: 'Fandango',
    brand_code: 'fandango',
    website: 'fandango.com',
    logo_url: 'https://logo.clearbit.com/fandango.com',
    category: 'entertainment',
    description: 'Movie tickets and streaming'
  },

  // Travel & Hospitality
  {
    brand_name: 'Airbnb',
    brand_code: 'airbnb',
    website: 'airbnb.com',
    logo_url: 'https://logo.clearbit.com/airbnb.com',
    category: 'travel',
    description: 'Vacation rentals and experiences'
  },
  {
    brand_name: 'Uber',
    brand_code: 'uber',
    website: 'uber.com',
    logo_url: 'https://logo.clearbit.com/uber.com',
    category: 'travel',
    description: 'Rideshare and food delivery'
  },
  {
    brand_name: 'Lyft',
    brand_code: 'lyft',
    website: 'lyft.com',
    logo_url: 'https://logo.clearbit.com/lyft.com',
    category: 'travel',
    description: 'Rideshare service'
  },
  {
    brand_name: 'Southwest Airlines',
    brand_code: 'southwest',
    website: 'southwest.com',
    logo_url: 'https://logo.clearbit.com/southwest.com',
    category: 'travel',
    description: 'Airline travel'
  },
  {
    brand_name: 'Marriott',
    brand_code: 'marriott',
    website: 'marriott.com',
    logo_url: 'https://logo.clearbit.com/marriott.com',
    category: 'travel',
    description: 'Hotel chain'
  },
  {
    brand_name: 'Hilton',
    brand_code: 'hilton',
    website: 'hilton.com',
    logo_url: 'https://logo.clearbit.com/hilton.com',
    category: 'travel',
    description: 'Hotel chain'
  },

  // Gas & Automotive
  {
    brand_name: 'Shell',
    brand_code: 'shell',
    website: 'shell.com',
    logo_url: 'https://logo.clearbit.com/shell.com',
    category: 'gas_automotive',
    description: 'Gas stations and convenience stores'
  },
  {
    brand_name: 'BP',
    brand_code: 'bp',
    website: 'bp.com',
    logo_url: 'https://logo.clearbit.com/bp.com',
    category: 'gas_automotive',
    description: 'Gas stations and convenience stores'
  },
  {
    brand_name: 'ExxonMobil',
    brand_code: 'exxon',
    website: 'exxon.com',
    logo_url: 'https://logo.clearbit.com/exxon.com',
    category: 'gas_automotive',
    description: 'Gas stations and convenience stores'
  },
  {
    brand_name: 'AutoZone',
    brand_code: 'autozone',
    website: 'autozone.com',
    logo_url: 'https://logo.clearbit.com/autozone.com',
    category: 'gas_automotive',
    description: 'Auto parts and accessories'
  },

  // Health & Beauty
  {
    brand_name: 'Sephora',
    brand_code: 'sephora',
    website: 'sephora.com',
    logo_url: 'https://logo.clearbit.com/sephora.com',
    category: 'health_beauty',
    description: 'Beauty products and cosmetics'
  },
  {
    brand_name: 'Ulta Beauty',
    brand_code: 'ulta',
    website: 'ulta.com',
    logo_url: 'https://logo.clearbit.com/ulta.com',
    category: 'health_beauty',
    description: 'Beauty products and salon services'
  },
  {
    brand_name: 'CVS',
    brand_code: 'cvs',
    website: 'cvs.com',
    logo_url: 'https://logo.clearbit.com/cvs.com',
    category: 'health_beauty',
    description: 'Pharmacy and health products'
  },
  {
    brand_name: 'Walgreens',
    brand_code: 'walgreens',
    website: 'walgreens.com',
    logo_url: 'https://logo.clearbit.com/walgreens.com',
    category: 'health_beauty',
    description: 'Pharmacy and health products'
  },
  {
    brand_name: 'Bath & Body Works',
    brand_code: 'bath_body_works',
    website: 'bathandbodyworks.com',
    logo_url: 'https://logo.clearbit.com/bathandbodyworks.com',
    category: 'health_beauty',
    description: 'Fragrance and personal care'
  },

  // Additional Popular Brands
  {
    brand_name: 'Nike',
    brand_code: 'nike',
    website: 'nike.com',
    logo_url: 'https://logo.clearbit.com/nike.com',
    category: 'retail',
    description: 'Athletic apparel and footwear'
  },
  {
    brand_name: 'Adidas',
    brand_code: 'adidas',
    website: 'adidas.com',
    logo_url: 'https://logo.clearbit.com/adidas.com',
    category: 'retail',
    description: 'Athletic apparel and footwear'
  },
  {
    brand_name: 'Foot Locker',
    brand_code: 'foot_locker',
    website: 'footlocker.com',
    logo_url: 'https://logo.clearbit.com/footlocker.com',
    category: 'retail',
    description: 'Athletic shoes and apparel'
  },
  {
    brand_name: 'Dick\'s Sporting Goods',
    brand_code: 'dicks_sporting_goods',
    website: 'dickssportinggoods.com',
    logo_url: 'https://logo.clearbit.com/dickssportinggoods.com',
    category: 'retail',
    description: 'Sporting goods and outdoor equipment'
  },
  {
    brand_name: 'REI',
    brand_code: 'rei',
    website: 'rei.com',
    logo_url: 'https://logo.clearbit.com/rei.com',
    category: 'retail',
    description: 'Outdoor gear and apparel'
  },
  {
    brand_name: 'eBay',
    brand_code: 'ebay',
    website: 'ebay.com',
    logo_url: 'https://logo.clearbit.com/ebay.com',
    category: 'retail',
    description: 'Online marketplace'
  },
  {
    brand_name: 'Etsy',
    brand_code: 'etsy',
    website: 'etsy.com',
    logo_url: 'https://logo.clearbit.com/etsy.com',
    category: 'retail',
    description: 'Handmade and vintage marketplace'
  },
  {
    brand_name: 'GameStop',
    brand_code: 'gamestop',
    website: 'gamestop.com',
    logo_url: 'https://logo.clearbit.com/gamestop.com',
    category: 'entertainment',
    description: 'Video games and gaming accessories'
  },
  {
    brand_name: 'Whole Foods',
    brand_code: 'whole_foods',
    website: 'wholefoodsmarket.com',
    logo_url: 'https://logo.clearbit.com/wholefoodsmarket.com',
    category: 'food_beverage',
    description: 'Organic and natural foods'
  },
  {
    brand_name: 'Kroger',
    brand_code: 'kroger',
    website: 'kroger.com',
    logo_url: 'https://logo.clearbit.com/kroger.com',
    category: 'food_beverage',
    description: 'Grocery store chain'
  },
  {
    brand_name: 'Safeway',
    brand_code: 'safeway',
    website: 'safeway.com',
    logo_url: 'https://logo.clearbit.com/safeway.com',
    category: 'food_beverage',
    description: 'Grocery store chain'
  },
  {
    brand_name: 'Publix',
    brand_code: 'publix',
    website: 'publix.com',
    logo_url: 'https://logo.clearbit.com/publix.com',
    category: 'food_beverage',
    description: 'Grocery store chain'
  },
  {
    brand_name: 'Trader Joe\'s',
    brand_code: 'trader_joes',
    website: 'traderjoes.com',
    logo_url: 'https://logo.clearbit.com/traderjoes.com',
    category: 'food_beverage',
    description: 'Specialty grocery store'
  },
  {
    brand_name: 'Red Lobster',
    brand_code: 'red_lobster',
    website: 'redlobster.com',
    logo_url: 'https://logo.clearbit.com/redlobster.com',
    category: 'food_beverage',
    description: 'Seafood restaurant chain'
  },
  {
    brand_name: 'Outback Steakhouse',
    brand_code: 'outback',
    website: 'outback.com',
    logo_url: 'https://logo.clearbit.com/outback.com',
    category: 'food_beverage',
    description: 'Steakhouse restaurant chain'
  },
  {
    brand_name: 'Applebee\'s',
    brand_code: 'applebees',
    website: 'applebees.com',
    logo_url: 'https://logo.clearbit.com/applebees.com',
    category: 'food_beverage',
    description: 'Casual dining restaurant'
  },
  {
    brand_name: 'Texas Roadhouse',
    brand_code: 'texas_roadhouse',
    website: 'texasroadhouse.com',
    logo_url: 'https://logo.clearbit.com/texasroadhouse.com',
    category: 'food_beverage',
    description: 'Steakhouse restaurant chain'
  },
  {
    brand_name: 'DoorDash',
    brand_code: 'doordash',
    website: 'doordash.com',
    logo_url: 'https://logo.clearbit.com/doordash.com',
    category: 'food_beverage',
    description: 'Food delivery service'
  },
  {
    brand_name: 'Uber Eats',
    brand_code: 'uber_eats',
    website: 'ubereats.com',
    logo_url: 'https://logo.clearbit.com/uber.com',
    category: 'food_beverage',
    description: 'Food delivery service'
  },
  {
    brand_name: 'Grubhub',
    brand_code: 'grubhub',
    website: 'grubhub.com',
    logo_url: 'https://logo.clearbit.com/grubhub.com',
    category: 'food_beverage',
    description: 'Food delivery service'
  },
];

/**
 * Search for a brand in the popular brands database
 * Case-insensitive search by brand name
 */
export function searchPopularBrand(brandName: string): PopularBrand | null {
  const normalized = brandName.toLowerCase().trim();
  
  // First try exact match
  let brand = POPULAR_BRANDS.find(b => b.brand_name.toLowerCase() === normalized);
  if (brand) return brand;
  
  // Try partial match
  brand = POPULAR_BRANDS.find(b => 
    b.brand_name.toLowerCase().includes(normalized) || 
    normalized.includes(b.brand_name.toLowerCase())
  );
  if (brand) return brand;
  
  // Try brand code match
  brand = POPULAR_BRANDS.find(b => b.brand_code.toLowerCase() === normalized.replace(/\s+/g, '_'));
  if (brand) return brand;
  
  return null;
}

/**
 * Get all brands in a specific category
 */
export function getBrandsByCategory(category: PopularBrand['category']): PopularBrand[] {
  return POPULAR_BRANDS.filter(b => b.category === category);
}

/**
 * Get all available categories
 */
export function getAllCategories(): Array<{ value: string; label: string }> {
  return [
    { value: 'food_beverage', label: 'Food & Beverage' },
    { value: 'retail', label: 'Retail' },
    { value: 'entertainment', label: 'Entertainment' },
    { value: 'travel', label: 'Travel' },
    { value: 'gas_automotive', label: 'Gas & Automotive' },
    { value: 'home_garden', label: 'Home & Garden' },
    { value: 'health_beauty', label: 'Health & Beauty' },
    { value: 'technology', label: 'Technology' },
    { value: 'general', label: 'General' },
  ];
}

