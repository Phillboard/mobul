/**
 * Fake Data Helper Functions
 * 
 * Utilities for generating realistic but fake data for testing
 */

// Name generators
const FIRST_NAMES = [
  'James', 'Mary', 'John', 'Patricia', 'Robert', 'Jennifer', 'Michael', 'Linda',
  'William', 'Barbara', 'David', 'Elizabeth', 'Richard', 'Susan', 'Joseph', 'Jessica',
  'Thomas', 'Sarah', 'Charles', 'Karen', 'Christopher', 'Nancy', 'Daniel', 'Lisa',
  'Matthew', 'Betty', 'Anthony', 'Margaret', 'Mark', 'Sandra', 'Donald', 'Ashley',
  'Steven', 'Kimberly', 'Paul', 'Emily', 'Andrew', 'Donna', 'Joshua', 'Michelle',
];

const LAST_NAMES = [
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis',
  'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson',
  'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Perez', 'Thompson',
  'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson',
];

const CITIES = [
  { name: 'Austin', state: 'TX', zip: '78701' },
  { name: 'Dallas', state: 'TX', zip: '75201' },
  { name: 'Houston', state: 'TX', zip: '77001' },
  { name: 'San Antonio', state: 'TX', zip: '78201' },
  { name: 'Phoenix', state: 'AZ', zip: '85001' },
  { name: 'Denver', state: 'CO', zip: '80201' },
  { name: 'Seattle', state: 'WA', zip: '98101' },
  { name: 'Portland', state: 'OR', zip: '97201' },
  { name: 'Los Angeles', state: 'CA', zip: '90001' },
  { name: 'San Diego', state: 'CA', zip: '92101' },
  { name: 'Chicago', state: 'IL', zip: '60601' },
  { name: 'New York', state: 'NY', zip: '10001' },
  { name: 'Miami', state: 'FL', zip: '33101' },
  { name: 'Atlanta', state: 'GA', zip: '30301' },
  { name: 'Boston', state: 'MA', zip: '02101' },
];

const STREETS = [
  'Main St', 'Oak Ave', 'Maple Dr', 'Cedar Ln', 'Pine Rd', 'Elm St',
  'Washington Blvd', 'Park Ave', 'Lake St', 'Hill Dr', 'River Rd',
  'First St', 'Second St', 'Third Ave', 'Broadway', 'Market St',
];

const DOMAINS = ['gmail.com', 'yahoo.com', 'outlook.com', 'icloud.com', 'hotmail.com'];

const INDUSTRIES = [
  'Technology', 'Healthcare', 'Real Estate', 'Automotive', 'Dental',
  'Legal', 'Restaurant', 'Fitness', 'Home Services', 'Insurance',
  'Education', 'Construction', 'Retail', 'Manufacturing', 'Consulting',
];

// Helper functions
export function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function randomElement<T>(array: T[]): T {
  return array[randomInt(0, array.length - 1)];
}

export function randomBoolean(probability = 0.5): boolean {
  return Math.random() < probability;
}

export function generateUUID(): string {
  return crypto.randomUUID();
}

// Name generation
export function generateName() {
  return {
    firstName: randomElement(FIRST_NAMES),
    lastName: randomElement(LAST_NAMES),
  };
}

export function generateFullName(): string {
  const { firstName, lastName } = generateName();
  return `${firstName} ${lastName}`;
}

// Email generation
export function generateEmail(firstName: string, lastName: string): string {
  const variants = [
    `${firstName}.${lastName}`,
    `${firstName}${lastName}`,
    `${firstName.charAt(0)}${lastName}`,
    `${firstName}${randomInt(1, 999)}`,
  ];
  
  const username = randomElement(variants).toLowerCase();
  const domain = randomElement(DOMAINS);
  
  return `${username}@${domain}`;
}

// Phone generation
export function generatePhone(areaCode?: string): string {
  const area = areaCode || String(randomInt(200, 999));
  const exchange = String(randomInt(200, 999));
  const subscriber = String(randomInt(1000, 9999));
  
  return `+1${area}${exchange}${subscriber}`;
}

export function formatPhone(phone: string): string {
  // Format as (XXX) XXX-XXXX
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 11 && cleaned.startsWith('1')) {
    const area = cleaned.slice(1, 4);
    const exchange = cleaned.slice(4, 7);
    const subscriber = cleaned.slice(7);
    return `(${area}) ${exchange}-${subscriber}`;
  }
  if (cleaned.length === 10) {
    const area = cleaned.slice(0, 3);
    const exchange = cleaned.slice(3, 6);
    const subscriber = cleaned.slice(6);
    return `(${area}) ${exchange}-${subscriber}`;
  }
  return phone;
}

// Address generation
export function generateAddress() {
  const city = randomElement(CITIES);
  const streetNumber = randomInt(100, 9999);
  const street = randomElement(STREETS);
  
  return {
    address: `${streetNumber} ${street}`,
    address2: randomBoolean(0.2) ? `Apt ${randomInt(1, 999)}` : null,
    city: city.name,
    state: city.state,
    zip: city.zip,
    country: 'US',
  };
}

// Company generation
export function generateCompanyName(industry?: string): string {
  const adjectives = ['Premier', 'Elite', 'Professional', 'Advanced', 'Quality', 'Expert', 'Trusted', 'Leading'];
  const suffixes = ['Solutions', 'Services', 'Group', 'Partners', 'Professionals', 'Experts', 'Associates'];
  
  const selectedIndustry = industry || randomElement(INDUSTRIES);
  const adjective = randomElement(adjectives);
  const suffix = randomElement(suffixes);
  
  return `${adjective} ${selectedIndustry} ${suffix}`;
}

// Industry helper
export function getRandomIndustry(): string {
  return randomElement(INDUSTRIES);
}

// Date generation
export function pastDate(daysAgo: number): Date {
  const date = new Date();
  date.setDate(date.getDate() - randomInt(0, daysAgo));
  date.setHours(randomInt(0, 23), randomInt(0, 59), randomInt(0, 59));
  return date;
}

export function futureDate(daysAhead: number): Date {
  const date = new Date();
  date.setDate(date.getDate() + randomInt(1, daysAhead));
  date.setHours(randomInt(9, 17), randomInt(0, 59), 0);
  return date;
}

export function randomDateBetween(start: Date, end: Date): Date {
  const startTime = start.getTime();
  const endTime = end.getTime();
  const randomTime = startTime + Math.random() * (endTime - startTime);
  return new Date(randomTime);
}

// Code generation
export function generateDemoCode(prefix: string = 'DEMO'): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Exclude similar-looking chars
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(randomInt(0, chars.length - 1));
  }
  return `${prefix}-${code}`;
}

export function generateGiftCardCode(prefix: string = 'DEMO'): string {
  const part1 = randomInt(1000, 9999).toString();
  const part2 = randomInt(1000, 9999).toString();
  const part3 = Array.from({ length: 4 }, () => 
    randomElement('ABCDEFGHJKLMNPQRSTUVWXYZ23456789')
  ).join('');
  
  return `${prefix}-${part1}-${part2}-${part3}`;
}

export function generatePIN(): string {
  return String(randomInt(0, 9999)).padStart(4, '0');
}

export function generateToken(length: number = 16): string {
  return Array.from({ length }, () =>
    randomElement('abcdefghijklmnopqrstuvwxyz0123456789')
  ).join('');
}

// Lifecycle stage
export function getRandomLifecycleStage(): string {
  const stages = [
    { stage: 'lead', weight: 40 },
    { stage: 'mql', weight: 25 },
    { stage: 'sql', weight: 20 },
    { stage: 'opportunity', weight: 10 },
    { stage: 'customer', weight: 5 },
  ];
  
  const random = Math.random() * 100;
  let cumulative = 0;
  
  for (const { stage, weight } of stages) {
    cumulative += weight;
    if (random <= cumulative) {
      return stage;
    }
  }
  
  return 'lead';
}

// Campaign names
export function generateCampaignName(clientName: string, industry: string): string {
  const templates = [
    `Q4 Holiday Promotion - ${industry}`,
    `${getSeasonName()} Special Offer - ${clientName}`,
    `Grand Opening Mailer - ${getMonthName()}`,
    `Customer Appreciation - ${getMonthName()} 2025`,
    `${industry} Services Launch Campaign`,
    `New Year Special - ${clientName}`,
    `Spring Sale Event - ${industry}`,
    `Black Friday Preview - ${clientName}`,
    `Exclusive VIP Offer - ${getMonthName()}`,
    `${industry} Industry Update`,
  ];
  
  return randomElement(templates);
}

function getSeasonName(): string {
  const month = new Date().getMonth();
  if (month >= 2 && month <= 4) return 'Spring';
  if (month >= 5 && month <= 7) return 'Summer';
  if (month >= 8 && month <= 10) return 'Fall';
  return 'Winter';
}

function getMonthName(): string {
  const months = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];
  return months[new Date().getMonth()];
}

// Campaign status
export function getRandomCampaignStatus(): string {
  const statuses = [
    { status: 'draft', weight: 20 },
    { status: 'scheduled', weight: 15 },
    { status: 'in_progress', weight: 30 },
    { status: 'completed', weight: 30 },
    { status: 'cancelled', weight: 5 },
  ];
  
  const random = Math.random() * 100;
  let cumulative = 0;
  
  for (const { status, weight } of statuses) {
    cumulative += weight;
    if (random <= cumulative) {
      return status;
    }
  }
  
  return 'draft';
}

// Mail size
export function getRandomMailSize(): string {
  const sizes = [
    { size: '4x6', weight: 40 },
    { size: '6x9', weight: 30 },
    { size: '6x11', weight: 20 },
    { size: 'letter', weight: 5 },
    { size: 'trifold', weight: 5 },
  ];
  
  const random = Math.random() * 100;
  let cumulative = 0;
  
  for (const { size, weight } of sizes) {
    cumulative += weight;
    if (random <= cumulative) {
      return size;
    }
  }
  
  return '4x6';
}

// Gift card status
export function getRandomGiftCardStatus(): string {
  const statuses = [
    { status: 'available', weight: 60 },
    { status: 'claimed', weight: 20 },
    { status: 'delivered', weight: 15 },
    { status: 'failed', weight: 5 },
  ];
  
  const random = Math.random() * 100;
  let cumulative = 0;
  
  for (const { status, weight } of statuses) {
    cumulative += weight;
    if (random <= cumulative) {
      return status;
    }
  }
  
  return 'available';
}

// Batch generation helpers
export function generateBatch<T>(count: number, generator: (index: number) => T): T[] {
  return Array.from({ length: count }, (_, i) => generator(i));
}

export function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

