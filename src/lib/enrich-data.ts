import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

// Helper functions
function generateId() {
    return crypto.randomUUID();
}

function randomInt(min: number, max: number) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomElement<T>(array: T[]): T {
    return array[randomInt(0, array.length - 1)];
}

function pastDate(daysAgo: number) {
    const date = new Date();
    date.setDate(date.getDate() - randomInt(0, daysAgo));
    return date.toISOString();
}

const FIRST_NAMES = ['James', 'Mary', 'John', 'Patricia', 'Robert', 'Jennifer', 'Michael', 'Linda', 'William', 'Barbara', 'David', 'Elizabeth', 'Richard', 'Susan', 'Joseph', 'Jessica', 'Thomas', 'Sarah', 'Charles', 'Karen'];
const LAST_NAMES = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson'];

function generatePersonName() {
    const firstName = randomElement(FIRST_NAMES);
    const lastName = randomElement(LAST_NAMES);
    return { firstName, lastName };
}

function generateEmail(firstName: string, lastName: string) {
    const domains = ['gmail.com', 'yahoo.com', 'outlook.com'];
    return `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${randomElement(domains)}`;
}

function generatePhone() {
    return `(${randomInt(200, 999)}) ${randomInt(200, 999)}-${randomInt(1000, 9999)}`;
}

const CITIES = [
    { name: 'Austin', state: 'TX', zip: '78701' },
    { name: 'Dallas', state: 'TX', zip: '75201' },
    { name: 'Houston', state: 'TX', zip: '77001' },
    { name: 'Phoenix', state: 'AZ', zip: '85001' },
    { name: 'Denver', state: 'CO', zip: '80201' },
];

const STREETS = ['Main St', 'Oak Ave', 'Maple Dr', 'Cedar Ln', 'Pine Rd'];

function generateAddress() {
    const city = randomElement(CITIES);
    return {
        street: `${randomInt(100, 9999)} ${randomElement(STREETS)}`,
        city: city.name,
        state: city.state,
        zip: city.zip,
    };
}

// Main enrichment function
export async function enrichData() {
    console.log('🚀 Starting data enrichment...\n');

    // 1. Create demo client
    const demoClient = {
        id: generateId(),
        company_name: 'Summit Roofing & Construction',
        industry: 'roofing',
        address: '1234 Main Street',
        city: 'Austin',
        state: 'TX',
        zip: '78701',
        phone: '(512) 555-0100',
        website: 'www.summitroofing.com',
        created_at: pastDate(180),
        is_active: true,
    };

    console.log('Creating client:', demoClient.company_name);
    const { error: clientError } = await supabase
        .from('clients')
        .upsert(demoClient);

    if (clientError) {
        console.error('Error:', clientError);
        return;
    }

    // 2. Add contacts
    console.log('Adding 25 contacts...');
    const contacts = [];
    for (let i = 0; i < 25; i++) {
        const person = generatePersonName();
        const address = generateAddress();

        contacts.push({
            id: generateId(),
            client_id: demoClient.id,
            first_name: person.firstName,
            last_name: person.lastName,
            email: generateEmail(person.firstName, person.lastName),
            phone: generatePhone(),
            job_title: randomElement(['Homeowner', 'Property Manager', 'Facility Director']),
            address: address.street,
            city: address.city,
            state: address.state,
            zip: address.zip,
            lifecycle_stage: randomElement(['lead', 'opportunity', 'customer']),
            lead_source: randomElement(['website', 'referral', 'direct_mail']),
            created_at: pastDate(90),
        });
    }

    const { error: contactsError } = await supabase
        .from('contacts')
        .upsert(contacts);

    if (contactsError) {
        console.error('Error:', contactsError);
    } else {
        console.log(`✅ Added ${contacts.length} contacts`);
    }

    console.log('\n🎉 Enrichment complete!');
    console.log('Refresh the app and select "Summit Roofing & Construction" from the dropdown');
}
