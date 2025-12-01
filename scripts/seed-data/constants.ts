/**
 * Industry-specific constants and content for seed data
 */

export const AGENCIES = [
  {
    name: 'Summit Marketing Group',
    industry: 'roofing',
    description: 'Premier marketing agency specializing in home exterior services',
  },
  {
    name: 'AutoReach Agency',
    industry: 'automotive',
    description: 'Automotive warranty marketing specialists',
  },
];

export const CLIENTS = {
  roofing: [
    {
      name: 'Apex Roofing Solutions',
      industry: 'Roofing',
      description: 'Full-service residential and commercial roofing',
    },
    {
      name: 'StormGuard Roofing Co.',
      industry: 'Roofing',
      description: 'Storm damage specialists and insurance claims experts',
    },
    {
      name: 'Premier Home Exteriors',
      industry: 'Roofing',
      description: 'Roofing, siding, and gutter installation services',
    },
  ],
  automotive: [
    {
      name: 'ShieldDrive Protection',
      industry: 'Automotive',
      description: 'Comprehensive vehicle service contracts and warranties',
    },
    {
      name: 'AutoCare Plus Warranty',
      industry: 'Automotive',
      description: 'Extended auto warranty coverage for all makes and models',
    },
    {
      name: 'DriveSecure Extended Coverage',
      industry: 'Automotive',
      description: 'Premium extended warranty and roadside assistance',
    },
  ],
};

export const GIFT_CARD_BRANDS = [
  { name: 'Amazon', category: 'General', logo_url: 'https://placehold.co/200x120/0F1419/FFFFFF?text=Amazon' },
  { name: 'Visa', category: 'General', logo_url: 'https://placehold.co/200x120/1A1F71/FFFFFF?text=Visa' },
  { name: 'Mastercard', category: 'General', logo_url: 'https://placehold.co/200x120/EB001B/FFFFFF?text=Mastercard' },
  { name: 'Home Depot', category: 'Home Improvement', logo_url: 'https://placehold.co/200x120/F96302/FFFFFF?text=Home+Depot' },
  { name: 'Lowes', category: 'Home Improvement', logo_url: 'https://placehold.co/200x120/004990/FFFFFF?text=Lowes' },
  { name: 'AutoZone', category: 'Automotive', logo_url: 'https://placehold.co/200x120/FF6600/FFFFFF?text=AutoZone' },
  { name: 'Advance Auto Parts', category: 'Automotive', logo_url: 'https://placehold.co/200x120/ED1C24/FFFFFF?text=Advance' },
  { name: 'Target', category: 'General', logo_url: 'https://placehold.co/200x120/CC0000/FFFFFF?text=Target' },
];

export const CAMPAIGN_TEMPLATES = {
  roofing: [
    {
      name: 'Spring Storm Damage Mailer',
      subject: 'Free Roof Inspection - Limited Time',
      offer: '$50 Home Depot Gift Card',
      conditions: ['SMS opt-in', 'Phone verification', 'Schedule inspection'],
    },
    {
      name: 'Summer Roof Maintenance',
      subject: 'Beat the Heat - Roof Check Special',
      offer: '$25 Visa Gift Card',
      conditions: ['Complete online form', 'SMS opt-in'],
    },
  ],
  automotive: [
    {
      name: 'Extended Coverage Direct Mail',
      subject: 'Your Factory Warranty is Expiring',
      offer: '$25 Amazon Gift Card',
      conditions: ['Vehicle 3-7 years old', 'Complete ACE form', 'Phone verification'],
    },
    {
      name: 'Premium Protection Offer',
      subject: 'Protect Your Investment',
      offer: '$50 Gas Card',
      conditions: ['Request free quote', 'SMS opt-in'],
    },
  ],
};

export const CONTACT_TAGS = {
  roofing: ['interested', 'contacted', 'quoted', 'qualified', 'storm_damage', 'new_roof', 'repair_only'],
  automotive: ['interested', 'contacted', 'quoted', 'qualified', 'high_mileage', 'luxury_vehicle', 'older_vehicle'],
};

export const EVENT_TYPES = [
  'mail_sent',
  'mail_delivered',
  'page_visited',
  'form_submitted',
  'call_initiated',
  'call_completed',
  'sms_sent',
  'sms_delivered',
  'sms_clicked',
  'gift_card_claimed',
];

export const CALL_DISPOSITIONS = [
  'interested',
  'not_interested',
  'call_back',
  'wrong_number',
  'no_answer',
  'voicemail',
  'qualified',
  'not_qualified',
];

export const MAILER_CONTENT = {
  roofing: {
    headline: 'Your Roof Deserves Expert Care',
    body: 'Trust our certified professionals for quality roofing services. Get a free inspection today!',
    cta: 'Schedule Your Free Inspection',
  },
  automotive: {
    headline: 'Don\'t Let Your Warranty Expire',
    body: 'Protect your vehicle with comprehensive extended warranty coverage. Get a free quote now!',
    cta: 'Get Your Free Quote',
  },
};

export const LANDING_PAGE_CONTENT = {
  roofing: {
    title: 'Free Roof Inspection',
    subtitle: 'Protect Your Home\'s Most Important Asset',
    benefits: [
      'Certified & Insured Professionals',
      'Free No-Obligation Inspection',
      'Insurance Claim Assistance',
      'Lifetime Workmanship Warranty',
    ],
  },
  automotive: {
    title: 'Extended Warranty Protection',
    subtitle: 'Peace of Mind for Your Vehicle',
    benefits: [
      'Coverage for Major Components',
      '24/7 Roadside Assistance',
      'No Deductible Options',
      'Transferable Coverage',
    ],
  },
};

