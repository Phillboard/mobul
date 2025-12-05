import { supabase } from '@core/services/supabase';

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

export async function seedContactsData(clientId: string) {
  console.log('🚀 Starting contacts data seeding...\n');

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('No authenticated user');

  // Create contacts with realistic distribution
  const lifecycleDistribution = [
    { stage: 'lead', count: 15 },
    { stage: 'mql', count: 9 },
    { stage: 'sql', count: 6 },
    { stage: 'opportunity', count: 9 },
    { stage: 'customer', count: 18 },
    { stage: 'evangelist', count: 3 },
  ];

  const sources = ['website', 'referral', 'direct_mail', 'event', 'social_media'];
  const contactIds: string[] = [];

  console.log('Creating 60 contacts across lifecycle stages...');

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
        client_id: clientId,
        created_by_user_id: user.id,
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

      const { error, data: contactData } = await supabase
        .from('contacts')
        .insert(contact)
        .select()
        .single();

      if (error) {
        console.error('Error creating contact:', error);
        continue;
      }

      contactIds.push(contactData.id);

      // Add tags
      if (randomBoolean(0.7)) {
        const tags = generateTags(stage);
        for (const tag of tags) {
          await supabase.from('contact_tags').insert({
            id: generateId(),
            contact_id: contactData.id,
            tag: tag,
            created_by_user_id: user.id,
            created_at: contact.created_at,
          });
        }
      }
    }
  }

  console.log(`✅ Created ${contactIds.length} contacts`);

  // Create static lists
  console.log('\nCreating contact lists...');

  const lists = [
    {
      name: 'Hot Leads',
      description: 'High-priority leads ready for immediate follow-up',
      list_type: 'static',
      contactIds: contactIds.filter(() => randomBoolean(0.2)),
    },
    {
      name: 'VIP Customers',
      description: 'Top-tier customers and evangelists',
      list_type: 'static',
      contactIds: contactIds.filter(() => randomBoolean(0.15)),
    },
    {
      name: 'Q1 Campaign',
      description: 'Contacts targeted for Q1 direct mail campaign',
      list_type: 'static',
      contactIds: contactIds.filter(() => randomBoolean(0.25)),
    },
  ];

  for (const list of lists) {
    const { error: listError, data: listData } = await supabase
      .from('contact_lists')
      .insert({
        id: generateId(),
        client_id: clientId,
        created_by_user_id: user.id,
        name: list.name,
        description: list.description,
        list_type: list.list_type,
        contact_count: list.contactIds.length,
      })
      .select()
      .single();

    if (listError) {
      console.error('Error creating list:', listError);
      continue;
    }

    // Add members to list
    for (const contactId of list.contactIds) {
      await supabase.from('contact_list_members').insert({
        id: generateId(),
        list_id: listData.id,
        contact_id: contactId,
        added_by_user_id: user.id,
      });
    }

    console.log(`✅ Created list "${list.name}" with ${list.contactIds.length} contacts`);
  }

  // Create dynamic segments
  console.log('\nCreating dynamic segments...');

  const segments = [
    {
      name: 'Active Customers',
      description: 'All customers with activity in last 60 days',
      filter_rules: {
        conditions: [
          { field: 'lifecycle_stage', operator: 'equals', value: 'customer' },
          { field: 'last_activity_date', operator: 'within_days', value: 60 },
        ],
      },
    },
    {
      name: 'Texas Leads',
      description: 'All leads and opportunities in Texas',
      filter_rules: {
        conditions: [
          { field: 'state', operator: 'equals', value: 'TX' },
          { field: 'lifecycle_stage', operator: 'in', value: ['lead', 'mql', 'sql', 'opportunity'] },
        ],
      },
    },
    {
      name: 'High Lead Score',
      description: 'Contacts with lead score above 70',
      filter_rules: {
        conditions: [
          { field: 'lead_score', operator: 'greater_than', value: 70 },
        ],
      },
    },
  ];

  for (const segment of segments) {
    const { error: segmentError } = await supabase
      .from('contact_lists')
      .insert({
        id: generateId(),
        client_id: clientId,
        created_by_user_id: user.id,
        name: segment.name,
        description: segment.description,
        list_type: 'dynamic',
        filter_rules: segment.filter_rules,
        contact_count: 0, // Would be calculated dynamically
      });

    if (segmentError) {
      console.error('Error creating segment:', segmentError);
      continue;
    }

    console.log(`✅ Created segment "${segment.name}"`);
  }

  console.log('\n🎉 Contact seeding complete!');
  console.log(`   • 60 contacts across all lifecycle stages`);
  console.log(`   • 3 static lists with real memberships`);
  console.log(`   • 3 dynamic segments with filter rules`);
}
