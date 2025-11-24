import { supabase } from '../src/integrations/supabase/client';
import {
    generateId,
    generatePersonName,
    generateEmail,
    generatePhone,
    generateAddress,
    generateCompanyName,
    randomElement,
    randomInt,
    randomBoolean,
    pastDate,
} from './helpers';

export async function seedContactsAndCompanies(clients: any[]) {
    console.log('👥 Seeding contacts and companies...');

    const lifecycleStages = ['subscriber', 'lead', 'mql', 'sql', 'opportunity', 'customer', 'evangelist'];
    const contactSources = ['website', 'referral', 'cold_call', 'event', 'social_media', 'email_campaign'];

    let totalContacts = 0;
    let totalCompanies = 0;

    for (const client of clients) {
        // Create 5-8 companies per client
        const numCompanies = randomInt(5, 8);
        const companies = [];

        for (let i = 0; i < numCompanies; i++) {
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

            const { error: companyError } = await supabase
                .from('companies')
                .insert(company);

            if (companyError) {
                console.error('Error creating company:', companyError);
            } else {
                companies.push(company);
                totalCompanies++;
            }
        }

        // Create 20-30 contacts per client
        const numContacts = randomInt(20, 30);

        for (let i = 0; i < numContacts; i++) {
            const person = generatePersonName();
            const address = generateAddress();
            const hasCompany = randomBoolean(0.6); // 60% have a company
            const company = hasCompany && companies.length > 0 ? randomElement(companies) : null;

            const contact = {
                id: generateId(),
                client_id: client.id,
                company_id: company?.id || null,
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
                lifecycle_stage: randomElement(lifecycleStages),
                lead_source: randomElement(contactSources),
                lead_score: randomInt(0, 100),
                do_not_contact: randomBoolean(0.05), // 5% do not contact
                email_opt_out: randomBoolean(0.1), // 10% opted out
                created_at: pastDate(120),
                last_activity_date: randomBoolean(0.8) ? pastDate(30) : null,
            };

            const { error: contactError } = await supabase
                .from('contacts')
                .insert(contact);

            if (contactError) {
                console.error('Error creating contact:', contactError);
            } else {
                totalContacts++;
            }

            // Add notes for some contacts
            if (randomBoolean(0.3)) {
                const note = {
                    id: generateId(),
                    contact_id: contact.id,
                    note_text: randomElement([
                        'Interested in our premium package',
                        'Follow up next week',
                        'Requested pricing information',
                        'Very responsive, good lead',
                        'Budget concerns, need to follow up in Q2',
                        'Referred by existing customer',
                        'Attended webinar, showed high interest',
                    ]),
                    created_at: pastDate(60),
                };

                await supabase.from('contact_notes').insert(note);
            }

            // Add tags for some contacts
            if (randomBoolean(0.4)) {
                const tags = randomElement([
                    ['hot-lead'],
                    ['vip'],
                    ['needs-follow-up'],
                    ['qualified'],
                    ['decision-maker'],
                    ['budget-approved'],
                ]);

                for (const tag of tags) {
                    await supabase.from('contact_tags').insert({
                        id: generateId(),
                        contact_id: contact.id,
                        tag: tag,
                        created_at: contact.created_at,
                    });
                }
            }
        }
    }

    console.log(`✅ Created ${totalContacts} contacts and ${totalCompanies} companies`);
    return { totalContacts, totalCompanies };
}
