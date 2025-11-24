import { supabase } from '../src/integrations/supabase/client';
import {
    generatePersonName,
    generateEmail,
    generatePhone,
    generateAddress,
    generateCompanyName,
    randomElement,
    randomInt,
    randomBoolean,
    pastDate,
    generateId,
} from './helpers';

/**
 * Quick enrichment script - adds a demo client with realistic data
 * Run this to populate the database with demo data for showcasing
 */

async function quickEnrich() {
    console.log('🚀 Quick Enrichment - Adding Demo Data\n');

    // 1. Create a demo client
    console.log('1️⃣  Creating demo client...');
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

    const { error: clientError } = await supabase
        .from('clients')
        .upsert(demoClient, { onConflict: 'id' });

    if (clientError) {
        console.error('Error creating client:', clientError);
        return;
    }
    console.log('✅ Created client: Summit Roofing & Construction\n');

    // 2. Add contacts
    console.log('2️⃣  Adding 25 contacts...');
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
            job_title: randomElement(['Homeowner', 'Property Manager', 'Facility Director', 'Building Owner']),
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
        .upsert(contacts, { onConflict: 'id' });

    if (contactsError) {
        console.error('Error creating contacts:', contactsError);
    } else {
        console.log(`✅ Added ${contacts.length} contacts\n`);
    }

    // 3. Add companies
    console.log('3️⃣  Adding 8 companies...');
    const companies = [];
    for (let i = 0; i < 8; i++) {
        const companyName = generateCompanyName();
        const address = generateAddress();

        companies.push({
            id: generateId(),
            client_id: demoClient.id,
            company_name: companyName,
            industry: randomElement(['property_management', 'real_estate', 'construction']),
            phone: generatePhone(),
            address: address.street,
            city: address.city,
            state: address.state,
            zip: address.zip,
            created_at: pastDate(120),
        });
    }

    const { error: companiesError } = await supabase
        .from('companies')
        .upsert(companies, { onConflict: 'id' });

    if (companiesError) {
        console.error('Error creating companies:', companiesError);
    } else {
        console.log(`✅ Added ${companies.length} companies\n`);
    }

    console.log('🎉 Quick enrichment complete!');
    console.log('\n📋 Next steps:');
    console.log('1. Refresh the app');
    console.log('2. Select "Summit Roofing & Construction" from the client dropdown');
    console.log('3. Navigate to Contacts to see your demo data\n');
}

// Run the enrichment
quickEnrich()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error('❌ Error:', error);
        process.exit(1);
    });
