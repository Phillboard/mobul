import { supabase } from '../src/integrations/supabase/client';
import {
    generateId,
    generateCompanyName,
    generatePersonName,
    generateEmail,
    generatePhone,
    generateAddress,
    randomElement,
    randomInt,
    pastDate,
} from './helpers';

export async function seedOrganizationsAndClients() {
    console.log('🏢 Seeding organizations and clients...');

    // 1. Create Internal Organization (Mobul)
    const internalOrg = {
        id: generateId(),
        name: 'Mobul',
        org_type: 'internal' as const,
        created_at: pastDate(365),
    };

    const { error: orgError1 } = await supabase
        .from('organizations')
        .insert(internalOrg);

    if (orgError1) {
        console.error('Error creating internal org:', orgError1);
        throw orgError1;
    }

    // 2. Create Agency Organization
    const agencyOrg = {
        id: generateId(),
        name: 'Summit Marketing Agency',
        org_type: 'agency' as const,
        created_at: pastDate(300),
    };

    const { error: orgError2 } = await supabase
        .from('organizations')
        .insert(agencyOrg);

    if (orgError2) {
        console.error('Error creating agency org:', orgError2);
        throw orgError2;
    }

    // 3. Create Client Companies
    const industries = [
        { type: 'roofing', name: 'roofing' },
        { type: 'dental', name: 'dental' },
        { type: 'rei', name: 'real estate' },
        { type: 'home_services', name: 'home services' },
    ];

    const clients = [];

    for (const industry of industries) {
        const companyName = generateCompanyName(industry.type);
        const address = generateAddress();

        const client = {
            id: generateId(),
            company_name: companyName,
            industry: industry.name,
            address: address.street,
            city: address.city,
            state: address.state,
            zip: address.zip,
            phone: generatePhone(),
            website: `www.${companyName.toLowerCase().replace(/\s+/g, '')}.com`,
            created_at: pastDate(180),
            is_active: true,
        };

        const { error: clientError } = await supabase
            .from('clients')
            .insert(client);

        if (clientError) {
            console.error(`Error creating client ${companyName}:`, clientError);
            throw clientError;
        }

        clients.push(client);

        // Create agency-client assignment
        const assignment = {
            id: generateId(),
            agency_org_id: agencyOrg.id,
            client_id: client.id,
            created_at: client.created_at,
        };

        const { error: assignmentError } = await supabase
            .from('agency_client_assignments')
            .insert(assignment);

        if (assignmentError) {
            console.error('Error creating agency assignment:', assignmentError);
        }

        // Create brand kit for each client
        const brandKit = {
            id: generateId(),
            client_id: client.id,
            name: `${companyName} Brand Kit`,
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
            tagline: `Your Trusted ${industry.name.charAt(0).toUpperCase() + industry.name.slice(1)} Partner`,
            created_at: client.created_at,
        };

        const { error: brandKitError } = await supabase
            .from('brand_kits')
            .insert(brandKit);

        if (brandKitError) {
            console.error('Error creating brand kit:', brandKitError);
        }
    }

    console.log(`✅ Created ${clients.length} clients with organizations and brand kits`);
    return { internalOrg, agencyOrg, clients };
}
