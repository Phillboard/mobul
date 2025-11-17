// Industry-specific presets for landing page generation

export interface IndustryPreset {
  industry: string;
  preferredTemplates: string[];
  colorSchemes: Array<{
    primary: string;
    accent: string;
    background: string;
  }>;
  defaultBenefits: string[];
  trustSignals: string[];
  defaultHeadlines: string[];
  defaultSubheadlines: string[];
}

export const industryPresets: Record<string, IndustryPreset> = {
  auto: {
    industry: "Automotive",
    preferredTemplates: ["modern-luxury", "professional-trust"],
    colorSchemes: [
      { primary: "#1e40af", accent: "#3b82f6", background: "#f8fafc" },
      { primary: "#1f2937", accent: "#dc2626", background: "#f9fafb" },
      { primary: "#0f766e", accent: "#14b8a6", background: "#f0fdfa" },
    ],
    defaultBenefits: [
      "Protection You Can Trust",
      "Nationwide Coverage",
      "24/7 Roadside Assistance"
    ],
    trustSignals: [
      "BBB A+ Rated",
      "Over 1M Customers Served",
      "Licensed & Certified"
    ],
    defaultHeadlines: [
      "Thank You for Protecting Your Vehicle",
      "Your Protection Plan Starts Now",
      "Drive with Confidence"
    ],
    defaultSubheadlines: [
      "Claim your reward for choosing peace of mind",
      "We appreciate your trust in our protection",
      "You've made a smart choice for your vehicle"
    ]
  },

  realestate: {
    industry: "Real Estate",
    preferredTemplates: ["modern-luxury", "classic-elegant"],
    colorSchemes: [
      { primary: "#1e40af", accent: "#f59e0b", background: "#fefce8" },
      { primary: "#047857", accent: "#10b981", background: "#f0fdf4" },
      { primary: "#7c3aed", accent: "#a78bfa", background: "#faf5ff" },
    ],
    defaultBenefits: [
      "Expert Local Knowledge",
      "Personalized Service",
      "Proven Track Record"
    ],
    trustSignals: [
      "Licensed Realtor",
      "Top 1% in Sales",
      "Award-Winning Service"
    ],
    defaultHeadlines: [
      "Welcome Home",
      "Thank You for Trusting Us",
      "Your Dream Home Awaits"
    ],
    defaultSubheadlines: [
      "Claim your reward for taking the next step",
      "We're here to make your move seamless",
      "Let's find your perfect home together"
    ]
  },

  financial: {
    industry: "Financial Services",
    preferredTemplates: ["professional-trust", "classic-elegant"],
    colorSchemes: [
      { primary: "#1e3a8a", accent: "#3b82f6", background: "#f8fafc" },
      { primary: "#047857", accent: "#059669", background: "#ecfdf5" },
      { primary: "#7c2d12", accent: "#ea580c", background: "#fff7ed" },
    ],
    defaultBenefits: [
      "Bank-Level Security",
      "Personalized Advice",
      "Transparent Pricing"
    ],
    trustSignals: [
      "SEC Registered",
      "FDIC Insured",
      "30+ Years Experience"
    ],
    defaultHeadlines: [
      "Secure Your Financial Future",
      "Thank You for Your Trust",
      "Your Prosperity Begins Here"
    ],
    defaultSubheadlines: [
      "Claim your reward for smart financial planning",
      "We're committed to your success",
      "Let's grow your wealth together"
    ]
  },

  fitness: {
    industry: "Fitness & Wellness",
    preferredTemplates: ["bold-energetic", "warm-friendly"],
    colorSchemes: [
      { primary: "#dc2626", accent: "#f59e0b", background: "#fef2f2" },
      { primary: "#7c3aed", accent: "#a78bfa", background: "#faf5ff" },
      { primary: "#059669", accent: "#10b981", background: "#ecfdf5" },
    ],
    defaultBenefits: [
      "Expert Trainers",
      "State-of-the-Art Equipment",
      "Flexible Memberships"
    ],
    trustSignals: [
      "Certified Trainers",
      "5-Star Rated",
      "10,000+ Success Stories"
    ],
    defaultHeadlines: [
      "Your Fitness Journey Starts Now",
      "Welcome to the Team",
      "Get Ready to Transform"
    ],
    defaultSubheadlines: [
      "Claim your reward for committing to your health",
      "We're excited to be part of your journey",
      "Let's crush your goals together"
    ]
  },

  restaurant: {
    industry: "Restaurant & Hospitality",
    preferredTemplates: ["warm-friendly", "modern-luxury"],
    colorSchemes: [
      { primary: "#dc2626", accent: "#f59e0b", background: "#fff7ed" },
      { primary: "#7c2d12", accent: "#ea580c", background: "#fff7ed" },
      { primary: "#0f766e", accent: "#14b8a6", background: "#f0fdfa" },
    ],
    defaultBenefits: [
      "Farm-Fresh Ingredients",
      "Award-Winning Chef",
      "Family-Friendly Atmosphere"
    ],
    trustSignals: [
      "Michelin Recommended",
      "Local Favorite",
      "Established 1995"
    ],
    defaultHeadlines: [
      "Thank You for Dining With Us",
      "We Can't Wait to Serve You",
      "Your Table is Ready"
    ],
    defaultSubheadlines: [
      "Claim your reward for supporting local",
      "We're honored to be your choice",
      "Come hungry, leave happy"
    ]
  },

  healthcare: {
    industry: "Healthcare",
    preferredTemplates: ["professional-trust", "warm-friendly"],
    colorSchemes: [
      { primary: "#0369a1", accent: "#0ea5e9", background: "#f0f9ff" },
      { primary: "#047857", accent: "#10b981", background: "#ecfdf5" },
      { primary: "#7c3aed", accent: "#a78bfa", background: "#faf5ff" },
    ],
    defaultBenefits: [
      "Experienced Professionals",
      "Advanced Technology",
      "Patient-Centered Care"
    ],
    trustSignals: [
      "Board Certified",
      "HIPAA Compliant",
      "5-Star Patient Reviews"
    ],
    defaultHeadlines: [
      "Your Health is Our Priority",
      "Thank You for Trusting Us",
      "Quality Care, Every Visit"
    ],
    defaultSubheadlines: [
      "Claim your reward for prioritizing your health",
      "We're here to support your wellness journey",
      "Your care team is ready"
    ]
  },

  tech: {
    industry: "Technology & SaaS",
    preferredTemplates: ["tech-modern", "modern-luxury"],
    colorSchemes: [
      { primary: "#6366f1", accent: "#8b5cf6", background: "#f5f3ff" },
      { primary: "#0891b2", accent: "#06b6d4", background: "#ecfeff" },
      { primary: "#7c3aed", accent: "#a78bfa", background: "#faf5ff" },
    ],
    defaultBenefits: [
      "Cutting-Edge Technology",
      "24/7 Support",
      "Seamless Integration"
    ],
    trustSignals: [
      "SOC 2 Certified",
      "99.9% Uptime",
      "Trusted by 10,000+ Companies"
    ],
    defaultHeadlines: [
      "Welcome to the Future",
      "Your Digital Transformation Starts Here",
      "Innovation Meets Simplicity"
    ],
    defaultSubheadlines: [
      "Claim your reward for going digital",
      "We're excited to power your growth",
      "Let's build something amazing together"
    ]
  },

  legal: {
    industry: "Legal Services",
    preferredTemplates: ["classic-elegant", "professional-trust"],
    colorSchemes: [
      { primary: "#1e3a8a", accent: "#3b82f6", background: "#f8fafc" },
      { primary: "#7c2d12", accent: "#ea580c", background: "#fff7ed" },
      { primary: "#047857", accent: "#059669", background: "#ecfdf5" },
    ],
    defaultBenefits: [
      "Experienced Attorneys",
      "Personalized Attention",
      "Proven Results"
    ],
    trustSignals: [
      "Licensed & Certified",
      "AV Rated",
      "40+ Years Combined Experience"
    ],
    defaultHeadlines: [
      "Your Legal Advocate",
      "Justice Served with Integrity",
      "We Fight for You"
    ],
    defaultSubheadlines: [
      "Claim your reward for seeking expert counsel",
      "We're committed to your case",
      "Let us handle the legal complexities"
    ]
  },

  homeservices: {
    industry: "Home Services",
    preferredTemplates: ["warm-friendly", "professional-trust"],
    colorSchemes: [
      { primary: "#dc2626", accent: "#f59e0b", background: "#fef2f2" },
      { primary: "#0369a1", accent: "#0ea5e9", background: "#f0f9ff" },
      { primary: "#047857", accent: "#10b981", background: "#ecfdf5" },
    ],
    defaultBenefits: [
      "Licensed & Insured",
      "Same-Day Service",
      "100% Satisfaction Guaranteed"
    ],
    trustSignals: [
      "BBB A+ Rated",
      "Locally Owned",
      "20+ Years in Business"
    ],
    defaultHeadlines: [
      "Thank You for Choosing Us",
      "Your Home Deserves the Best",
      "Quality Service, Every Time"
    ],
    defaultSubheadlines: [
      "Claim your reward for trusting local experts",
      "We're here to help with all your home needs",
      "Your satisfaction is our priority"
    ]
  },
};

export function getIndustryPreset(industry: string): IndustryPreset | undefined {
  const normalizedIndustry = industry.toLowerCase().replace(/\s+/g, "");
  
  for (const [key, preset] of Object.entries(industryPresets)) {
    if (normalizedIndustry.includes(key) || key.includes(normalizedIndustry)) {
      return preset;
    }
  }
  
  return undefined;
}

export function getAllIndustryPresets(): IndustryPreset[] {
  return Object.values(industryPresets);
}
