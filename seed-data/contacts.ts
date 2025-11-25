import { supabase } from '../src/integrations/supabase/client';
import {
    generateId,
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
} from './helpers';

export async function seedContactsAndCompanies(clients: any[]) {
    console.log('👥 Seeding CRM contacts...');

    // Realistic lifecycle distribution
    const lifecycleDistribution = [
        { stage: 'lead', weight: 25 },           // 25% new leads
        { stage: 'mql', weight: 15 },            // 15% marketing qualified
        { stage: 'sql', weight: 10 },            // 10% sales qualified
        { stage: 'opportunity', weight: 15 },    // 15% opportunities
        { stage: 'customer', weight: 30 },       // 30% customers
        { stage: 'evangelist', weight: 5 },      // 5% evangelists
    ];

    const contactSources = [
        'website', 'referral', 'direct_mail', 'event', 'social_media', 
        'cold_call', 'email_campaign', 'partner', 'trade_show', 'organic_search'
    ];

    let totalContacts = 0;

    for (const client of clients) {
        // Create 50-75 contacts per client
        const numContacts = randomInt(50, 75);
        console.log(`Creating ${numContacts} contacts for ${client.name}...`);

        for (let i = 0; i < numContacts; i++) {
            // Select lifecycle stage based on realistic distribution
            const rand = randomInt(1, 100);
            let cumulativeWeight = 0;
            let selectedStage = 'lead';
            
            for (const { stage, weight } of lifecycleDistribution) {
                cumulativeWeight += weight;
                if (rand <= cumulativeWeight) {
                    selectedStage = stage;
                    break;
                }
            }

            const person = generatePersonName();
            const address = generateAddress();
            const leadScore = selectedStage === 'lead' ? randomInt(0, 40) :
                            selectedStage === 'mql' ? randomInt(30, 60) :
                            selectedStage === 'sql' ? randomInt(50, 80) :
                            selectedStage === 'opportunity' ? randomInt(60, 90) :
                            selectedStage === 'customer' ? randomInt(70, 100) :
                            randomInt(85, 100); // evangelist

            const contact = {
                id: generateId(),
                client_id: client.id,
                first_name: person.firstName,
                last_name: person.lastName,
                email: generateEmail(person.firstName, person.lastName),
                phone: generatePhone(),
                mobile_phone: randomBoolean(0.8) ? generatePhone() : null, // 80% have mobile
                job_title: generateJobTitle(client.industry),
                address: address.street,
                city: address.city,
                state: address.state,
                zip: address.zip,
                lifecycle_stage: selectedStage,
                lead_source: randomElement(contactSources),
                lead_score: leadScore,
                do_not_contact: randomBoolean(0.02), // 2% do not contact
                email_opt_out: randomBoolean(0.05), // 5% opted out
                created_at: pastDate(selectedStage === 'customer' ? 365 : 180),
                last_activity_date: ['customer', 'opportunity', 'sql', 'evangelist'].includes(selectedStage) 
                    ? pastDate(30) 
                    : randomBoolean(0.5) ? pastDate(60) : null,
            };

            const { error: contactError } = await supabase
                .from('contacts')
                .insert(contact);

            if (contactError) {
                console.error('Error creating contact:', contactError);
            } else {
                totalContacts++;
            }

            // Add notes for engaged contacts (40% of all contacts)
            if (randomBoolean(0.4)) {
                const note = {
                    id: generateId(),
                    contact_id: contact.id,
                    note_text: generateNote(selectedStage),
                    created_at: pastDate(30),
                };

                await supabase.from('contact_notes').insert(note);
            }

            // Add tags based on lifecycle stage (60% of contacts get tags)
            if (randomBoolean(0.6)) {
                const tags = generateTags(selectedStage);
                
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

    console.log(`✅ Created ${totalContacts} CRM contacts (no companies or deals)`);
    return { totalContacts };
}
