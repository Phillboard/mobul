import { FormTemplate } from "@/types/aceForms";

/**
 * Generate contextual form templates based on client data
 */
export function getContextualTemplates(context: {
  companyName: string;
  industry: string;
  giftCardBrands: string[];
}): FormTemplate[] {
  const templates: FormTemplate[] = [];
  const giftCardBrand = context.giftCardBrands[0] || "Gift Card";

  // Industry-specific templates
  if (context.industry === 'automotive' || context.industry === 'warranty') {
    templates.push({
      id: "vehicle-update",
      name: `Vehicle Info Update - ${context.companyName}`,
      description: "Collect vehicle details, mileage, and service preferences",
      category: "data-collection",
      config: {
        fields: [
          { id: "code", type: "gift-card-code", label: "Gift Card Code", required: true },
          { id: "firstName", type: "text", label: "First Name", required: true },
          { id: "lastName", type: "text", label: "Last Name", required: true },
          { id: "email", type: "email", label: "Email Address", required: true },
          { id: "phone", type: "phone", label: "Phone Number", placeholder: "(555) 123-4567", required: false },
          { id: "vehicleMake", type: "text", label: "Vehicle Make", placeholder: "Toyota", required: false },
          { id: "vehicleModel", type: "text", label: "Vehicle Model", placeholder: "Camry", required: false },
          { id: "mileage", type: "text", label: "Current Mileage", placeholder: "50000", required: false },
          { id: "serviceReminders", type: "checkbox", label: "Send me service reminders via email", required: false },
        ],
        settings: {
          title: `Update Your Info & Claim Your ${giftCardBrand}`,
          description: `Thank you for being a ${context.companyName} customer!`,
          submitButtonText: "Submit & Claim Reward",
          primaryColor: "#6366f1",
        },
      },
    });

    templates.push({
      id: "post-service-feedback",
      name: "Post-Service Feedback",
      description: "Collect feedback after service visit with contact update",
      category: "survey",
      config: {
        fields: [
          { id: "code", type: "gift-card-code", label: "Gift Card Code", required: true },
          { id: "email", type: "email", label: "Email", required: true },
          { id: "serviceDate", type: "date", label: "Service Date", required: false },
          { 
            id: "satisfaction", 
            type: "radio", 
            label: "How satisfied were you with our service?",
            options: ["Very Satisfied", "Satisfied", "Neutral", "Dissatisfied"],
            required: true 
          },
          { id: "feedback", type: "textarea", label: "Additional Comments", placeholder: "Tell us about your experience...", required: false },
          { id: "extendedWarranty", type: "checkbox", label: "I'm interested in learning about extended warranty options", required: false },
        ],
        settings: {
          title: "We Value Your Feedback",
          description: `Help us serve you better and claim your ${giftCardBrand}`,
          submitButtonText: "Submit Feedback",
          primaryColor: "#6366f1",
        },
      },
    });
  } else if (context.industry === 'insurance') {
    templates.push({
      id: "policy-update",
      name: `Policy Information Update - ${context.companyName}`,
      description: "Update policy holder contact and coverage info",
      category: "data-collection",
      config: {
        fields: [
          { id: "code", type: "gift-card-code", label: "Gift Card Code", required: true },
          { id: "firstName", type: "text", label: "First Name", required: true },
          { id: "lastName", type: "text", label: "Last Name", required: true },
          { id: "email", type: "email", label: "Email", required: true },
          { id: "phone", type: "phone", label: "Phone Number", required: false },
          { id: "address", type: "text", label: "Street Address", required: false },
          { id: "city", type: "text", label: "City", required: false },
          { id: "state", type: "text", label: "State", required: false },
          { id: "zip", type: "text", label: "ZIP Code", required: false },
          { id: "coverageInterest", type: "checkbox", label: "I'm interested in additional coverage options", required: false },
        ],
        settings: {
          title: `Update Your Policy Info`,
          description: `Keep your ${context.companyName} policy up to date and claim your reward`,
          submitButtonText: "Update & Claim",
          primaryColor: "#6366f1",
        },
      },
    });
  } else if (context.industry === 'healthcare') {
    templates.push({
      id: "patient-update",
      name: `Patient Information Update`,
      description: "Update patient contact and insurance information",
      category: "data-collection",
      config: {
        fields: [
          { id: "code", type: "gift-card-code", label: "Gift Card Code", required: true },
          { id: "firstName", type: "text", label: "First Name", required: true },
          { id: "lastName", type: "text", label: "Last Name", required: true },
          { id: "email", type: "email", label: "Email", required: true },
          { id: "phone", type: "phone", label: "Phone Number", required: true },
          { id: "address", type: "text", label: "Street Address", required: false },
          { id: "emergencyContact", type: "text", label: "Emergency Contact Name", required: false },
          { id: "emergencyPhone", type: "phone", label: "Emergency Contact Phone", required: false },
          { id: "appointmentReminders", type: "checkbox", label: "Send me appointment reminders", required: false },
        ],
        settings: {
          title: "Update Your Contact Information",
          description: `Help us stay in touch and claim your thank you gift`,
          submitButtonText: "Submit & Claim",
          primaryColor: "#6366f1",
        },
      },
    });
  }

  // Always include generic templates
  templates.push({
    id: "simple-redemption",
    name: "Quick Gift Card Redemption",
    description: "Just code and email - fastest option",
    category: "simple",
    config: {
      fields: [
        { id: "code", type: "gift-card-code", label: "Enter Your Gift Card Code", placeholder: "ABC123XYZ456", required: true },
        { id: "email", type: "email", label: "Email Address", placeholder: "your@email.com", required: true },
      ],
      settings: {
        title: `Claim Your ${giftCardBrand}`,
        description: "Enter your code below to redeem",
        submitButtonText: "Claim Now",
        primaryColor: "#6366f1",
      },
    },
  });

  templates.push({
    id: "basic-info",
    name: "Basic Contact Collection",
    description: "Code + name + email + phone",
    category: "data-collection",
    config: {
      fields: [
        { id: "code", type: "gift-card-code", label: "Gift Card Code", required: true },
        { id: "firstName", type: "text", label: "First Name", required: true },
        { id: "lastName", type: "text", label: "Last Name", required: true },
        { id: "email", type: "email", label: "Email", required: true },
        { id: "phone", type: "phone", label: "Phone Number", placeholder: "(555) 123-4567", required: false },
        { id: "marketing", type: "checkbox", label: "Yes, send me special offers", required: false },
      ],
      settings: {
        title: "Claim Your Reward",
        description: `Thank you for being a ${context.companyName} customer!`,
        submitButtonText: "Claim Reward",
        primaryColor: "#6366f1",
      },
    },
  });

  templates.push({
    id: "full-contact",
    name: "Complete Contact Profile",
    description: "Comprehensive data collection with address",
    category: "data-collection",
    config: {
      fields: [
        { id: "code", type: "gift-card-code", label: "Gift Card Code", required: true },
        { id: "firstName", type: "text", label: "First Name", required: true },
        { id: "lastName", type: "text", label: "Last Name", required: true },
        { id: "email", type: "email", label: "Email", required: true },
        { id: "phone", type: "phone", label: "Phone Number", required: false },
        { id: "address", type: "text", label: "Street Address", required: false },
        { id: "city", type: "text", label: "City", required: false },
        { id: "state", type: "text", label: "State", required: false },
        { id: "zip", type: "text", label: "ZIP Code", required: false },
        { id: "marketing", type: "checkbox", label: "Send me updates and special offers", required: false },
      ],
      settings: {
        title: "Complete Your Profile",
        submitButtonText: "Submit & Claim",
        primaryColor: "#6366f1",
      },
    },
  });

  return templates;
}

/**
 * Legacy static templates export for backward compatibility
 */
export const aceFormTemplates: FormTemplate[] = getContextualTemplates({
  companyName: "Your Company",
  industry: "general",
  giftCardBrands: ["Gift Card"],
});

export function getTemplateById(id: string, context?: { companyName: string; industry: string; giftCardBrands: string[] }): FormTemplate | undefined {
  const templates = context ? getContextualTemplates(context) : aceFormTemplates;
  return templates.find(t => t.id === id);
}

export function getTemplatesByCategory(category: string, context?: { companyName: string; industry: string; giftCardBrands: string[] }): FormTemplate[] {
  const templates = context ? getContextualTemplates(context) : aceFormTemplates;
  return templates.filter(t => t.category === category);
}
