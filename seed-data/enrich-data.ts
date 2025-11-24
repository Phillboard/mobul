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
 * Enrich existing dummy data with more realistic information
 * This script adds data to existing records without creating duplicates
 */

export async function enrichExistingData() {
    console.log('🎨 Enriching existing data...');

    // 1. Get existing clients
    const { data: clients, error: clientsError } = await supabase
        .from('clients')
        .select('*');

    if (clientsError) {
        console.error('Error fetching clients:', clientsError);
        return;
    }

    console.log(`Found ${clients?.length || 0} existing clients`);

    if (!clients || clients.length === 0) {
        console.log('No clients found. Please create some clients first.');
        return;
    }

    // 2. Enrich contacts for each client
    for (const client of clients) {
        console.log(`\n📊 Enriching data for client: ${client.company_name}`);

        // Get existing contacts for this client
        const { data: existingContacts } = await supabase
            .from('contacts')
            .select('*')
            .eq('client_id', client.id);

        const contactCount = existingContacts?.length || 0;
        console.log(`  - Found ${contactCount} existing contacts`);

        // Add more contacts if needed (target: 20-30 per client)
        const contactsToAdd = Math.max(0, randomInt(20, 30) - contactCount);

        if (contactsToAdd > 0) {
            console.log(`  - Adding ${contactsToAdd} new contacts...`);

            for (let i = 0; i < contactsToAdd; i++) {
                const person = generatePersonName();
                const address = generateAddress();

                const contact = {
                    id: generateId(),
                    client_id: client.id,
                    first_name: person.firstName,
                    last_name: person.lastName,
                    email: generateEmail(person.firstName, person.lastName),
                    phone: generatePhone(),
                    mobile_phone: randomBoolean(0.7) ? generatePhone() : null,
                    job_title: randomElement([
                        'CEO', 'President', 'VP of Sales', 'Marketing Director', 'Operations Manager',
                        'Owner', 'General Manager', 'Sales Manager', 'Account Executive', 'Director',
                    ]),
                    address: address.street,
                    city: address.city,
                    state: address.state,
                    zip: address.zip,
                    lifecycle_stage: randomElement(['subscriber', 'lead', 'mql', 'sql', 'opportunity', 'customer', 'evangelist']),
                    lead_source: randomElement(['website', 'referral', 'cold_call', 'event', 'social_media', 'email_campaign']),
                    lead_score: randomInt(0, 100),
                    do_not_contact: randomBoolean(0.05),
                    email_opt_out: randomBoolean(0.1),
                    created_at: pastDate(120),
                    last_activity_date: randomBoolean(0.8) ? pastDate(30) : null,
                };

                await supabase.from('contacts').insert(contact);
            }
        }

        // Get existing companies
        const { data: existingCompanies } = await supabase
            .from('companies')
            .select('*')
            .eq('client_id', client.id);

        const companyCount = existingCompanies?.length || 0;
        console.log(`  - Found ${companyCount} existing companies`);

        // Add companies if needed (target: 5-8 per client)
        const companiesToAdd = Math.max(0, randomInt(5, 8) - companyCount);

        if (companiesToAdd > 0) {
            console.log(`  - Adding ${companiesToAdd} new companies...`);

            for (let i = 0; i < companiesToAdd; i++) {
                const companyName = generateCompanyName();
                const address = generateAddress();

                const company = {
                    id: generateId(),
                    client_id: client.id,
                    company_name: companyName,
                    industry: randomElement(['technology', 'healthcare', 'finance', 'retail', 'manufacturing']),
                    website: `www.${companyName.toLowerCase().replace(/\s+/g, '')}.com`,
                    phone: generatePhone(),
                    address: address.street,
                    city: address.city,
                    state: address.state,
                    zip: address.zip,
                    employee_count: randomElement([10, 25, 50, 100, 250, 500, 1000]),
                    annual_revenue: randomElement([100000, 500000, 1000000, 5000000, 10000000]),
                    created_at: pastDate(150),
                };

                await supabase.from('companies').insert(company);
            }
        }

        // Check for brand kit
        const { data: brandKit } = await supabase
            .from('brand_kits')
            .select('*')
            .eq('client_id', client.id)
            .maybeSingle();

        if (!brandKit) {
            console.log(`  - Creating brand kit...`);

            const newBrandKit = {
                id: generateId(),
                client_id: client.id,
                name: `${client.company_name} Brand Kit`,
                is_default: true,
                colors: {
                    primary: randomElement(['#2563eb', '#dc2626', '#059669', '#7c3aed']),
                    secondary: randomElement(['#64748b', '#f59e0b', '#06b6d4', '#ec4899']),
                    accent: randomElement(['#f97316', '#10b981', '#8b5cf6', '#ef4444']),
                },
                fonts: {
                    heading: randomElement(['Inter', 'Roboto', 'Montserrat', 'Poppins']),
                    body: randomElement(['Open Sans', 'Lato', 'Raleway', 'Source Sans Pro']),
                },
                tagline: `Your Trusted ${client.industry || 'Business'} Partner`,
                created_at: client.created_at || new Date().toISOString(),
            };

            await supabase.from('brand_kits').insert(newBrandKit);
        }
    }

    console.log('\n✅ Data enrichment complete!');
}

// Run if called directly
if (require.main === module) {
    enrichExistingData()
        .then(() => {
            console.log('\n🎉 All done!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n❌ Error:', error);
            process.exit(1);
        });
}
