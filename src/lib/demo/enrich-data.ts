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

function randomBoolean(probability = 0.5) {
    return Math.random() < probability;
}

function pastDate(daysAgo: number) {
    const date = new Date();
    date.setDate(date.getDate() - randomInt(0, daysAgo));
    return date.toISOString();
}

const FIRST_NAMES = ['James', 'Mary', 'John', 'Patricia', 'Robert', 'Jennifer', 'Michael', 'Linda', 'William', 'Barbara', 'David', 'Elizabeth', 'Richard', 'Susan', 'Joseph', 'Jessica', 'Thomas', 'Sarah', 'Charles', 'Karen', 'Christopher', 'Nancy', 'Daniel', 'Lisa', 'Matthew', 'Betty', 'Anthony', 'Margaret'];
const LAST_NAMES = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'White', 'Harris', 'Clark'];

function generatePersonName() {
    const firstName = randomElement(FIRST_NAMES);
    const lastName = randomElement(LAST_NAMES);
    return { firstName, lastName };
}

function generateEmail(firstName: string, lastName: string) {
    const domains = ['gmail.com', 'yahoo.com', 'outlook.com', 'icloud.com'];
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
    { name: 'Seattle', state: 'WA', zip: '98101' },
];

const STREETS = ['Main St', 'Oak Ave', 'Maple Dr', 'Cedar Ln', 'Pine Rd', 'Elm St', 'Washington Blvd'];

function generateAddress() {
    const city = randomElement(CITIES);
    return {
        street: `${randomInt(100, 9999)} ${randomElement(STREETS)}`,
        city: city.name,
        state: city.state,
        zip: city.zip,
    };
}

const JOB_TITLES = [
    'Homeowner', 'Property Manager', 'Facility Director', 'Building Owner',
    'Property Owner', 'Facility Manager', 'Maintenance Manager', 'Operations Director',
    'Real Estate Investor', 'Portfolio Manager', 'HOA Board Member'
];

function generateNote(stage: string) {
    const notes: Record<string, string[]> = {
        lead: [
            'Initial contact via website form',
            'Downloaded our service guide',
            'Interested in learning more',
            'Referred by existing customer',
        ],
        mql: [
            'High engagement score - needs follow-up',
            'Visited pricing page multiple times',
            'Downloaded case study',
            'Requested detailed information',
        ],
        sql: [
            'Scheduled discovery call',
            'Budget confirmed',
            'Strong fit, ready to move forward',
            'Requested custom proposal',
        ],
        opportunity: [
            'Proposal sent - follow up scheduled',
            'In contract negotiation',
            'Decision expected by end of month',
            '75% probability to close',
        ],
        customer: [
            'Onboarded successfully',
            'Very satisfied customer',
            'Great relationship',
            'Excellent payment history',
        ],
        evangelist: [
            'Provided testimonial',
            'Referred 3 new clients this year',
            'Active promoter',
            'Featured in success stories',
        ],
    };
    return randomElement(notes[stage] || notes.lead);
}

function generateTags(stage: string) {
    const tags: Record<string, string[][]> = {
        lead: [['new-lead'], ['website-inquiry'], ['cold']],
        mql: [['qualified'], ['engaged'], ['warm']],
        sql: [['hot-lead'], ['qualified'], ['ready-to-buy']],
        opportunity: [['in-negotiation'], ['proposal-sent'], ['hot']],
        customer: [['active-customer'], ['satisfied']],
        evangelist: [['vip'], ['promoter'], ['referral-source']],
    };
    return randomElement(tags[stage] || tags.lead);
}

// Main enrichment function
export async function enrichData() {
    console.log('🚀 Starting data enrichment with 60 realistic CRM contacts...\n');

    // 1. Create demo client
    const demoClient = {
        id: generateId(),
        name: 'Summit Roofing & Construction',
        industry: 'roofing',
        created_at: pastDate(365),
    };

    console.log('Creating client:', demoClient.name);
    const { error: clientError, data: clientData } = await supabase
        .from('clients')
        .upsert(demoClient)
        .select()
        .single();

    if (clientError) {
        console.error('Error:', clientError);
        return;
    }

    // 2. Create contacts with realistic distribution
    const lifecycleDistribution = [
        { stage: 'lead', count: 15 },
        { stage: 'mql', count: 9 },
        { stage: 'sql', count: 6 },
        { stage: 'opportunity', count: 9 },
        { stage: 'customer', count: 18 },
        { stage: 'evangelist', count: 3 },
    ];

    const sources = ['website', 'referral', 'direct_mail', 'event', 'social_media'];
    let totalContacts = 0;

    console.log('Adding 60 CRM contacts across lifecycle stages...');
    
    for (const { stage, count } of lifecycleDistribution) {
        for (let i = 0; i < count; i++) {
            const person = generatePersonName();
            const address = generateAddress();
            
            const leadScore = stage === 'lead' ? randomInt(0, 40) :
                            stage === 'mql' ? randomInt(30, 60) :
                            stage === 'sql' ? randomInt(50, 80) :
                            stage === 'opportunity' ? randomInt(60, 90) :
                            stage === 'customer' ? randomInt(70, 100) :
                            randomInt(85, 100);

            const contact = {
                id: generateId(),
                client_id: clientData.id,
                first_name: person.firstName,
                last_name: person.lastName,
                email: generateEmail(person.firstName, person.lastName),
                phone: generatePhone(),
                mobile_phone: randomBoolean(0.8) ? generatePhone() : null,
                job_title: randomElement(JOB_TITLES),
                address: address.street,
                city: address.city,
                state: address.state,
                zip: address.zip,
                lifecycle_stage: stage,
                lead_source: randomElement(sources),
                lead_score: leadScore,
                do_not_contact: false,
                email_opt_out: randomBoolean(0.05),
                created_at: stage === 'customer' || stage === 'evangelist' ? pastDate(365) : pastDate(120),
                last_activity_date: ['customer', 'opportunity', 'sql', 'evangelist'].includes(stage) 
                    ? pastDate(30) 
                    : randomBoolean(0.5) ? pastDate(60) : null,
            };

            const { error: contactError, data: contactData } = await supabase
                .from('contacts')
                .insert(contact)
                .select()
                .single();

            if (contactError) {
                console.error('Error:', contactError);
                continue;
            }

            totalContacts++;

            // Add notes for engaged contacts
            if (['opportunity', 'customer', 'sql', 'evangelist'].includes(stage) || randomBoolean(0.3)) {
                await supabase.from('contact_notes').insert({
                    id: generateId(),
                    contact_id: contactData.id,
                    note_text: generateNote(stage),
                    created_at: pastDate(30),
                });
            }

            // Add tags
            if (randomBoolean(0.7)) {
                const tags = generateTags(stage);
                for (const tag of tags) {
                    await supabase.from('contact_tags').insert({
                        id: generateId(),
                        contact_id: contactData.id,
                        tag: tag,
                        created_at: contact.created_at,
                    });
                }
            }
        }
        console.log(`  ✓ Added ${count} ${stage} contacts`);
    }

    console.log(`\n✅ Added ${totalContacts} realistic CRM contacts`);
    console.log('\n📊 Distribution:');
    console.log('   • 15 Leads');
    console.log('   • 9 MQLs');
    console.log('   • 6 SQLs');
    console.log('   • 9 Opportunities');
    console.log('   • 18 Customers');
    console.log('   • 3 Evangelists');
    console.log('\n🎉 Enrichment complete!');
    console.log('Refresh the app and select "Summit Roofing & Construction" from the dropdown');
}
