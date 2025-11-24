/**
 * Helper utilities for generating realistic seed data
 */

// Generate random date within a range
export function randomDate(start: Date, end: Date): string {
    const date = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
    return date.toISOString();
}

// Generate random integer between min and max (inclusive)
export function randomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Generate random element from array
export function randomElement<T>(array: T[]): T {
    return array[randomInt(0, array.length - 1)];
}

// Generate random boolean with optional probability
export function randomBoolean(probability = 0.5): boolean {
    return Math.random() < probability;
}

// Generate UUID (simple version for demo)
export function generateId(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

// Realistic first names
export const FIRST_NAMES = [
    'James', 'Mary', 'John', 'Patricia', 'Robert', 'Jennifer', 'Michael', 'Linda',
    'William', 'Barbara', 'David', 'Elizabeth', 'Richard', 'Susan', 'Joseph', 'Jessica',
    'Thomas', 'Sarah', 'Charles', 'Karen', 'Christopher', 'Nancy', 'Daniel', 'Lisa',
    'Matthew', 'Betty', 'Anthony', 'Margaret', 'Mark', 'Sandra', 'Donald', 'Ashley',
    'Steven', 'Kimberly', 'Paul', 'Emily', 'Andrew', 'Donna', 'Joshua', 'Michelle',
    'Kenneth', 'Carol', 'Kevin', 'Amanda', 'Brian', 'Dorothy', 'George', 'Melissa',
    'Timothy', 'Deborah', 'Ronald', 'Stephanie', 'Edward', 'Rebecca', 'Jason', 'Sharon',
    'Jeffrey', 'Laura', 'Ryan', 'Cynthia', 'Jacob', 'Kathleen', 'Gary', 'Amy',
];

// Realistic last names
export const LAST_NAMES = [
    'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis',
    'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas',
    'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Perez', 'Thompson', 'White',
    'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson', 'Walker', 'Young',
    'Allen', 'King', 'Wright', 'Scott', 'Torres', 'Nguyen', 'Hill', 'Flores',
    'Green', 'Adams', 'Nelson', 'Baker', 'Hall', 'Rivera', 'Campbell', 'Mitchell',
    'Carter', 'Roberts', 'Gomez', 'Phillips', 'Evans', 'Turner', 'Diaz', 'Parker',
    'Cruz', 'Edwards', 'Collins', 'Reyes', 'Stewart', 'Morris', 'Morales', 'Murphy',
];

// Company name components
export const COMPANY_PREFIXES = [
    'Premier', 'Elite', 'Professional', 'Quality', 'Reliable', 'Trusted', 'Expert',
    'Superior', 'Advanced', 'Modern', 'Classic', 'Precision', 'Perfect', 'Prime',
];

export const COMPANY_SUFFIXES = [
    'Services', 'Solutions', 'Group', 'Company', 'Corp', 'LLC', 'Inc', 'Associates',
    'Partners', 'Enterprises', 'Professionals', 'Specialists', 'Experts', 'Team',
];

// Street names
export const STREET_NAMES = [
    'Main', 'Oak', 'Maple', 'Cedar', 'Elm', 'Washington', 'Lake', 'Hill',
    'Park', 'Pine', 'First', 'Second', 'Third', 'Fourth', 'Fifth', 'Sixth',
    'Market', 'Church', 'Spring', 'Walnut', 'Chestnut', 'Broad', 'High', 'Center',
];

export const STREET_TYPES = ['St', 'Ave', 'Rd', 'Blvd', 'Dr', 'Ln', 'Way', 'Ct'];

// Cities
export const CITIES = [
    { name: 'New York', state: 'NY', zip: '10001' },
    { name: 'Los Angeles', state: 'CA', zip: '90001' },
    { name: 'Chicago', state: 'IL', zip: '60601' },
    { name: 'Houston', state: 'TX', zip: '77001' },
    { name: 'Phoenix', state: 'AZ', zip: '85001' },
    { name: 'Philadelphia', state: 'PA', zip: '19101' },
    { name: 'San Antonio', state: 'TX', zip: '78201' },
    { name: 'San Diego', state: 'CA', zip: '92101' },
    { name: 'Dallas', state: 'TX', zip: '75201' },
    { name: 'Austin', state: 'TX', zip: '78701' },
    { name: 'Jacksonville', state: 'FL', zip: '32099' },
    { name: 'Fort Worth', state: 'TX', zip: '76101' },
    { name: 'Columbus', state: 'OH', zip: '43004' },
    { name: 'Charlotte', state: 'NC', zip: '28201' },
    { name: 'Indianapolis', state: 'IN', zip: '46201' },
    { name: 'Seattle', state: 'WA', zip: '98101' },
    { name: 'Denver', state: 'CO', zip: '80201' },
    { name: 'Boston', state: 'MA', zip: '02101' },
    { name: 'Nashville', state: 'TN', zip: '37201' },
    { name: 'Portland', state: 'OR', zip: '97201' },
];

// Generate realistic email
export function generateEmail(firstName: string, lastName: string, domain?: string): string {
    const domains = domain ? [domain] : ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'icloud.com'];
    const selectedDomain = randomElement(domains);
    const formats = [
        `${firstName.toLowerCase()}.${lastName.toLowerCase()}`,
        `${firstName.toLowerCase()}${lastName.toLowerCase()}`,
        `${firstName.toLowerCase()}${lastName.charAt(0).toLowerCase()}`,
        `${firstName.charAt(0).toLowerCase()}${lastName.toLowerCase()}`,
    ];
    return `${randomElement(formats)}@${selectedDomain}`;
}

// Generate realistic phone number
export function generatePhone(): string {
    const areaCode = randomInt(200, 999);
    const prefix = randomInt(200, 999);
    const lineNumber = randomInt(1000, 9999);
    return `(${areaCode}) ${prefix}-${lineNumber}`;
}

// Generate realistic address
export function generateAddress() {
    const city = randomElement(CITIES);
    const streetNumber = randomInt(100, 9999);
    const streetName = randomElement(STREET_NAMES);
    const streetType = randomElement(STREET_TYPES);

    return {
        street: `${streetNumber} ${streetName} ${streetType}`,
        city: city.name,
        state: city.state,
        zip: city.zip,
    };
}

// Generate realistic company name
export function generateCompanyName(industry?: string): string {
    const prefix = randomElement(COMPANY_PREFIXES);
    const suffix = randomElement(COMPANY_SUFFIXES);

    const industryNames: Record<string, string[]> = {
        roofing: ['Roofing', 'Roof', 'Roofworks', 'Rooftop'],
        rei: ['Properties', 'Realty', 'Real Estate', 'Homes'],
        dental: ['Dental', 'Dentistry', 'Smile', 'Family Dental'],
        veterinary: ['Veterinary', 'Animal Hospital', 'Pet Care', 'Vet Clinic'],
        insurance: ['Insurance', 'Assurance', 'Coverage', 'Protection'],
        home_services: ['Home Services', 'Handyman', 'Home Repair', 'Maintenance'],
        landscaping: ['Landscaping', 'Lawn Care', 'Outdoor Services', 'Green Thumb'],
    };

    if (industry && industryNames[industry]) {
        return `${prefix} ${randomElement(industryNames[industry])} ${suffix}`;
    }

    return `${prefix} ${suffix}`;
}

// Generate realistic person name
export function generatePersonName() {
    const firstName = randomElement(FIRST_NAMES);
    const lastName = randomElement(LAST_NAMES);
    return { firstName, lastName, fullName: `${firstName} ${lastName}` };
}

// Generate past date (within last N days)
export function pastDate(daysAgo: number): string {
    const date = new Date();
    date.setDate(date.getDate() - randomInt(0, daysAgo));
    return date.toISOString();
}

// Generate future date (within next N days)
export function futureDate(daysAhead: number): string {
    const date = new Date();
    date.setDate(date.getDate() + randomInt(0, daysAhead));
    return date.toISOString();
}
