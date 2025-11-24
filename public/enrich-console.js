// Standalone enrichment script - paste this directly in browser console
const date = new Date();
date.setDate(date.getDate() - randomInt(0, days));
return date.toISOString();
    };

const FIRST_NAMES = ['James', 'Mary', 'John', 'Patricia', 'Robert', 'Jennifer', 'Michael', 'Linda', 'William', 'Barbara', 'David', 'Elizabeth', 'Richard', 'Susan', 'Joseph', 'Jessica', 'Thomas', 'Sarah', 'Charles', 'Karen', 'Christopher', 'Nancy', 'Daniel', 'Lisa'];
const LAST_NAMES = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson'];
const CITIES = [
    { name: 'Austin', state: 'TX', zip: '78701' },
    { name: 'Dallas', state: 'TX', zip: '75201' },
    { name: 'Houston', state: 'TX', zip: '77001' },
];
const STREETS = ['Main St', 'Oak Ave', 'Maple Dr', 'Cedar Ln', 'Pine Rd'];

const generatePerson = () => {
    const firstName = randomElement(FIRST_NAMES);
    const lastName = randomElement(LAST_NAMES);
    return { firstName, lastName };
};

const generateEmail = (firstName, lastName) => {
    const domains = ['gmail.com', 'yahoo.com', 'outlook.com'];
    return `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${randomElement(domains)}`;
};

const generatePhone = () => `(${randomInt(200, 999)}) ${randomInt(200, 999)}-${randomInt(1000, 9999)}`;

const generateAddress = () => {
    const city = randomElement(CITIES);
    return {
        street: `${randomInt(100, 9999)} ${randomElement(STREETS)}`,
        city: city.name,
        state: city.state,
        zip: city.zip,
    };
};

try {
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
        console.error('Error creating client:', clientError);
        alert('Error creating client. Check console for details.');
        return;
    }

    console.log('✅ Client created!');

    // 2. Add 25 contacts
    console.log('Adding 25 contacts...');
    const contacts = [];

    for (let i = 0; i < 25; i++) {
        const person = generatePerson();
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
        .upsert(contacts);

    if (contactsError) {
        console.error('Error creating contacts:', contactsError);
        alert('Error creating contacts. Check console for details.');
        return;
    }

    console.log('✅ Added 25 contacts!');
    console.log('\n🎉 Enrichment complete!');
    console.log('📋 Next steps:');
    console.log('1. Refresh the page');
    console.log('2. Select "Summit Roofing & Construction" from the client dropdown');
    console.log('3. Navigate to Contacts to see your demo data');

    alert('✅ Data enrichment complete!\n\nRefresh the page and select "Summit Roofing & Construction" from the dropdown.');

} catch (error) {
    console.error('❌ Error:', error);
    alert('Error during enrichment. Check console for details.');
}
}) ();
