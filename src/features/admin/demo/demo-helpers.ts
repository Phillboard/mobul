/**
 * Helper functions for generating demo data
 */

import { supabase } from '@core/services/supabase';

/**
 * Generate a random code with prefix
 */
export function generateCode(prefix: string, number: number): string {
  return `${prefix}-${number.toString().padStart(4, '0')}`;
}

/**
 * Generate random phone number
 */
export function generatePhone(): string {
  const areaCode = Math.floor(Math.random() * 900) + 100;
  const prefix = Math.floor(Math.random() * 900) + 100;
  const line = Math.floor(Math.random() * 9000) + 1000;
  return `+1${areaCode}${prefix}${line}`;
}

/**
 * Generate random email
 */
export function generateEmail(firstName: string, lastName: string): string {
  const domains = ['gmail.com', 'yahoo.com', 'outlook.com', 'example.com'];
  const domain = domains[Math.floor(Math.random() * domains.length)];
  return `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${domain}`;
}

/**
 * Generate random address
 */
export function generateAddress() {
  const streets = ['Main St', 'Oak Ave', 'Maple Dr', 'Pine Rd', 'Cedar Ln', 'Elm St', 'Park Ave'];
  const cities = ['Los Angeles', 'San Diego', 'Phoenix', 'Dallas', 'Austin', 'Miami', 'Seattle'];
  const states = ['CA', 'TX', 'FL', 'WA', 'AZ', 'NY', 'IL'];
  
  const number = Math.floor(Math.random() * 9000) + 1000;
  const street = streets[Math.floor(Math.random() * streets.length)];
  const city = cities[Math.floor(Math.random() * cities.length)];
  const state = states[Math.floor(Math.random() * states.length)];
  const zip = Math.floor(Math.random() * 90000) + 10000;
  
  return {
    address: `${number} ${street}`,
    city,
    state,
    zip: zip.toString()
  };
}

/**
 * Common first and last names for recipients
 */
const FIRST_NAMES = [
  'John', 'Sarah', 'Mike', 'Lisa', 'Tom', 'Emma', 'Chris', 'Amy',
  'David', 'Jessica', 'Robert', 'Mary', 'James', 'Patricia', 'Michael', 'Jennifer',
  'William', 'Linda', 'Richard', 'Elizabeth', 'Joseph', 'Susan', 'Thomas', 'Karen',
  'Charles', 'Nancy', 'Daniel', 'Betty', 'Matthew', 'Margaret'
];

const LAST_NAMES = [
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis',
  'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas',
  'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Thompson', 'White', 'Harris',
  'Clark', 'Lewis', 'Robinson', 'Walker', 'Hall', 'Allen'
];

/**
 * Get random first name
 */
export function getRandomFirstName(): string {
  return FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
}

/**
 * Get random last name
 */
export function getRandomLastName(): string {
  return LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];
}

/**
 * Generate unique token
 */
export function generateToken(): string {
  return crypto.randomUUID();
}

/**
 * Ensure organization exists or create default
 */
export async function ensureOrganization(existingOrgId?: string): Promise<string> {
  if (existingOrgId) {
    return existingOrgId;
  }

  // Check for existing organization
  const { data: existingOrgs } = await supabase
    .from('organizations')
    .select('id')
    .limit(1);

  if (existingOrgs && existingOrgs.length > 0) {
    return existingOrgs[0].id;
  }

  // Create default organization
  const { data, error } = await supabase
    .from('organizations')
    .insert({
      name: 'Demo Organization',
      slug: 'demo-org'
    })
    .select('id')
    .single();

  if (error) throw new Error(`Failed to create organization: ${error.message}`);
  return data.id;
}

/**
 * Create client
 */
export async function createClient(orgId: string, name: string, industry: string): Promise<string> {
  const { data, error } = await supabase
    .from('clients')
    .insert({
      organization_id: orgId,
      name,
      industry,
      is_active: true
    })
    .select('id')
    .single();

  if (error) throw new Error(`Failed to create client: ${error.message}`);
  return data.id;
}

/**
 * Ensure gift card brand exists
 */
export async function ensureGiftCardBrand(brandName: string): Promise<string> {
  // Check if brand exists
  const { data: existing } = await supabase
    .from('gift_card_brands')
    .select('id')
    .eq('brand_name', brandName)
    .maybeSingle();

  if (existing) {
    return existing.id;
  }

  // Create brand
  const { data, error } = await supabase
    .from('gift_card_brands')
    .insert({
      brand_name: brandName,
      category: 'retail',
      is_active: true
    })
    .select('id')
    .single();

  if (error) throw new Error(`Failed to create gift card brand: ${error.message}`);
  return data.id;
}

/**
 * DEPRECATED: Use addClientGiftCardOption instead
 * Create gift card option for client (replaces pool creation)
 */
export async function createGiftCardPool(
  clientId: string,
  brandId: string,
  value: number,
  inventorySize: number
): Promise<string> {
  // In the new system, we just enable the brand-denomination for the client
  const { data, error } = await supabase
    .from('client_available_gift_cards')
    .insert({
      client_id: clientId,
      brand_id: brandId,
      denomination: value,
      is_enabled: true
    })
    .select('id')
    .single();

  if (error) {
    // If it already exists, just return a mock ID
    if (error.code === '23505') {
      return `existing-${brandId}-${value}`;
    }
    throw new Error(`Failed to add gift card option: ${error.message}`);
  }
  return data.id;
}

/**
 * DEPRECATED: Use populateInventory instead
 * Populate gift card inventory (new system uses gift_card_inventory table)
 */
export async function populateGiftCardInventory(
  poolId: string,
  count: number,
  onProgress?: (current: number, total: number) => void
): Promise<void> {
  // This function is deprecated in the new system
  // Gift cards are now uploaded directly to gift_card_inventory
  // or provisioned via Tillo API on-demand
  console.warn('populateGiftCardInventory is deprecated - use gift_card_inventory table directly');
  
  if (onProgress) {
    onProgress(count, count);
  }
}

function generateCardNumber(): string {
  return Array.from({ length: 16 }, () => Math.floor(Math.random() * 10)).join('');
}

