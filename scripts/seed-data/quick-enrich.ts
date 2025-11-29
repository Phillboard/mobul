import { supabase } from '../src/integrations/supabase/client';
import {
    generatePersonName,
    generateEmail,
    generatePhone,
    generateAddress,
    generateJobTitle,
    generateNote,
    generateTags,
    randomElement,
    randomInt,
    randomBoolean,
    pastDate,
    generateId,
} from './helpers';

/**
 * Quick enrichment script - adds a demo client with 60 realistic CRM contacts
 * Run this to populate the database with high-quality demo data
 */

async function quickEnrich() {
    console.log('🚀 Quick Enrichment - Adding Realistic CRM Data\n');

    // 1. Create a demo client
    console.log('1️⃣  Creating demo client...');
    const demoClient = {
        id: generateId(),
        name: 'Summit Roofing & Construction',
        industry: 'roofing',
        created_at: pastDate(365),
    };

    const { error: clientError, data: clientData } = await supabase
        .from('clients')
        .upsert(demoClient, { onConflict: 'id' })
        .select()
        .single();

    if (clientError) {
        console.error('Error creating client:', clientError);
        return;
    }
    console.log('✅ Created client: Summit Roofing & Construction\n');

    // 2. Define realistic lifecycle distribution
    const lifecycleDistribution = [
        { stage: 'lead', weight: 25, count: 15 },           // 25% - new leads
        { stage: 'mql', weight: 15, count: 9 },             // 15% - marketing qualified
        { stage: 'sql', weight: 10, count: 6 },             // 10% - sales qualified  
        { stage: 'opportunity', weight: 15, count: 9 },     // 15% - in negotiations
        { stage: 'customer', weight: 30, count: 18 },       // 30% - active customers
        { stage: 'evangelist', weight: 5, count: 3 },       // 5% - promoters
    ];

    const sources = ['website', 'referral', 'direct_mail', 'event', 'social_media', 'cold_call'];

    console.log('2️⃣  Adding 60 realistic CRM contacts...');
    let totalContacts = 0;

    for (const { stage, count } of lifecycleDistribution) {
        for (let i = 0; i < count; i++) {
            const person = generatePersonName();
            const address = generateAddress();
            
            // Calculate lead score based on stage
            const leadScore = stage === 'lead' ? randomInt(0, 40) :
                            stage === 'mql' ? randomInt(30, 60) :
                            stage === 'sql' ? randomInt(50, 80) :
                            stage === 'opportunity' ? randomInt(60, 90) :
                            stage === 'customer' ? randomInt(70, 100) :
                            randomInt(85, 100); // evangelist

            const contact = {
                id: generateId(),
                client_id: clientData.id,
                first_name: person.firstName,
                last_name: person.lastName,
                email: generateEmail(person.firstName, person.lastName),
                phone: generatePhone(),
                mobile_phone: randomBoolean(0.8) ? generatePhone() : null,
                job_title: generateJobTitle('roofing'),
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
                console.error('Error creating contact:', contactError);
                continue;
            }

            totalContacts++;

            // Add notes for engaged contacts (50% based on stage)
            if (['opportunity', 'customer', 'sql', 'evangelist'].includes(stage) || randomBoolean(0.3)) {
                const note = {
                    id: generateId(),
                    contact_id: contactData.id,
                    note_text: generateNote(stage),
                    created_at: pastDate(30),
                };

                await supabase.from('contact_notes').insert(note);
            }

            // Add tags (70% of contacts)
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
        console.log(`   ✓ Added ${count} ${stage} contacts`);
    }

    console.log(`\n✅ Added ${totalContacts} realistic CRM contacts\n`);
    
    console.log('🎉 Quick enrichment complete!');
    console.log('\n📊 Contact Distribution:');
    console.log('   • 15 Leads (new prospects)');
    console.log('   • 9 MQLs (marketing qualified)');
    console.log('   • 6 SQLs (sales qualified)');
    console.log('   • 9 Opportunities (in negotiation)');
    console.log('   • 18 Customers (active clients)');
    console.log('   • 3 Evangelists (promoters)');
    console.log('\n📋 Next steps:');
    console.log('1. Refresh the app');
    console.log('2. Select "Summit Roofing & Construction" from the client dropdown');
    console.log('3. Navigate to Contacts to see your realistic CRM data\n');
}

// Run the enrichment
quickEnrich()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error('❌ Error:', error);
        process.exit(1);
    });
