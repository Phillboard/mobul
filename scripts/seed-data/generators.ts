/**
 * Data generators for seed data
 */

import { faker } from '@faker-js/faker';

export function generatePhoneNumber(): string {
  const areaCode = faker.number.int({ min: 200, max: 999 });
  const exchange = faker.number.int({ min: 200, max: 999 });
  const number = faker.number.int({ min: 1000, max: 9999 });
  return `${areaCode}-${exchange}-${number}`;
}

export function generateEmail(firstName: string, lastName: string, domain?: string): string {
  const cleanFirst = firstName.toLowerCase().replace(/[^a-z]/g, '');
  const cleanLast = lastName.toLowerCase().replace(/[^a-z]/g, '');
  const domainName = domain || faker.internet.domainName();
  return `${cleanFirst}.${cleanLast}@${domainName}`;
}

export function generateAddress() {
  return {
    street: faker.location.streetAddress(),
    city: faker.location.city(),
    state: faker.location.state({ abbreviated: true }),
    zipCode: faker.location.zipCode('#####'),
  };
}

export function generateContact(industry: 'roofing' | 'automotive') {
  const firstName = faker.person.firstName();
  const lastName = faker.person.lastName();
  const address = generateAddress();
  
  return {
    first_name: firstName,
    last_name: lastName,
    email: generateEmail(firstName, lastName),
    phone: generatePhoneNumber(),
    address: address.street,
    city: address.city,
    state: address.state,
    zip: address.zipCode,
    // Industry-specific custom fields
    custom_fields: industry === 'roofing' ? {
      home_age: faker.number.int({ min: 5, max: 50 }),
      roof_type: faker.helpers.arrayElement(['Asphalt Shingle', 'Metal', 'Tile', 'Flat']),
    } : {
      vehicle_year: faker.number.int({ min: 2015, max: 2022 }),
      vehicle_make: faker.vehicle.manufacturer(),
      vehicle_model: faker.vehicle.model(),
      vehicle_mileage: faker.number.int({ min: 20000, max: 150000 }),
    },
  };
}

export function generateRecipient(contactData: any) {
  return {
    first_name: contactData.first_name,
    last_name: contactData.last_name,
    email: contactData.email,
    phone: contactData.phone,
    address1: contactData.address,
    city: contactData.city,
    state: contactData.state,
    zip: contactData.zip,
    redemption_code: generateRedemptionCode(),
  };
}

export function generateRedemptionCode(): string {
  const letters = faker.string.alpha({ length: 3, casing: 'upper' });
  const numbers = faker.string.numeric(6);
  return `${letters}-${numbers}`;
}

export function generateGiftCardCode(brand: string): string {
  const prefix = brand.substring(0, 3).toUpperCase();
  const code = faker.string.alphanumeric(16, { casing: 'upper' });
  return `${prefix}-${code.substring(0, 4)}-${code.substring(4, 8)}-${code.substring(8, 12)}-${code.substring(12, 16)}`;
}

export function generateGiftCardPin(): string {
  return faker.string.numeric(4);
}

export function generateCampaignCode(): string {
  return faker.string.alpha({ length: 6, casing: 'upper' });
}

export function generateUserPassword(): string {
  // For demo purposes - in production, users would set their own
  return 'Demo2025!';
}

export function generateMailerId(): string {
  return faker.string.alphanumeric(8, { casing: 'upper' });
}

export function generateBrandColors(industry: 'roofing' | 'automotive'): { primary: string; secondary: string; accent: string } {
  if (industry === 'roofing') {
    return {
      primary: faker.helpers.arrayElement(['#1E40AF', '#DC2626', '#059669', '#7C3AED']),
      secondary: faker.helpers.arrayElement(['#64748B', '#475569', '#334155']),
      accent: faker.helpers.arrayElement(['#F59E0B', '#EAB308', '#10B981']),
    };
  } else {
    return {
      primary: faker.helpers.arrayElement(['#DC2626', '#1E40AF', '#0891B2', '#7C3AED']),
      secondary: faker.helpers.arrayElement(['#1F2937', '#374151', '#4B5563']),
      accent: faker.helpers.arrayElement(['#F97316', '#EF4444', '#8B5CF6']),
    };
  }
}

export function randomDate(start: Date, end: Date): Date {
  return faker.date.between({ from: start, to: end });
}

export function randomPastDate(days: number): Date {
  return faker.date.recent({ days });
}

export function randomFutureDate(days: number): Date {
  return faker.date.soon({ days });
}

