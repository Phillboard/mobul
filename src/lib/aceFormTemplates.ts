import { FormTemplate } from "@/types/aceForms";

/**
 * Pre-built form templates for common use cases
 */
export const aceFormTemplates: FormTemplate[] = [
  {
    id: "simple-redemption",
    name: "Simple Gift Card Redemption",
    description: "Just a code input - perfect for quick redemptions",
    category: "simple",
    config: {
      fields: [
        {
          id: "code",
          type: "gift-card-code",
          label: "Enter Your Gift Card Code",
          placeholder: "ABC123XYZ456",
          required: true,
          validation: [
            { type: "pattern", value: "^[A-Z0-9]{12}$", message: "Code must be 12 characters" }
          ]
        }
      ],
      settings: {
        title: "Claim Your Gift Card",
        description: "Enter your redemption code below",
        submitButtonText: "Claim Gift Card",
        successMessage: "Congratulations! Your gift card is ready.",
        primaryColor: "#6366f1"
      }
    }
  },
  {
    id: "basic-info",
    name: "Basic Info Collection",
    description: "Code + name + email",
    category: "data-collection",
    config: {
      fields: [
        {
          id: "code",
          type: "gift-card-code",
          label: "Gift Card Code",
          placeholder: "ABC123XYZ456",
          required: true
        },
        {
          id: "firstName",
          type: "text",
          label: "First Name",
          placeholder: "John",
          required: true
        },
        {
          id: "lastName",
          type: "text",
          label: "Last Name",
          placeholder: "Doe",
          required: true
        },
        {
          id: "email",
          type: "email",
          label: "Email Address",
          placeholder: "john@example.com",
          required: true,
          validation: [
            { type: "pattern", value: "^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$", message: "Invalid email" }
          ]
        }
      ],
      settings: {
        title: "Claim Your Reward",
        submitButtonText: "Claim Now",
        primaryColor: "#6366f1"
      }
    }
  },
  {
    id: "full-contact",
    name: "Full Contact Information",
    description: "Complete contact details for comprehensive data collection",
    category: "data-collection",
    config: {
      fields: [
        {
          id: "code",
          type: "gift-card-code",
          label: "Gift Card Code",
          required: true
        },
        {
          id: "firstName",
          type: "text",
          label: "First Name",
          required: true
        },
        {
          id: "lastName",
          type: "text",
          label: "Last Name",
          required: true
        },
        {
          id: "email",
          type: "email",
          label: "Email",
          required: true
        },
        {
          id: "phone",
          type: "phone",
          label: "Phone Number",
          placeholder: "(555) 123-4567",
          required: false
        },
        {
          id: "address",
          type: "text",
          label: "Street Address",
          required: false
        },
        {
          id: "city",
          type: "text",
          label: "City",
          required: false
        },
        {
          id: "state",
          type: "text",
          label: "State",
          required: false
        },
        {
          id: "zip",
          type: "text",
          label: "ZIP Code",
          required: false
        },
        {
          id: "marketing",
          type: "checkbox",
          label: "Yes, send me special offers and updates",
          required: false
        }
      ],
      settings: {
        title: "Claim Your Gift Card",
        submitButtonText: "Submit & Claim",
        primaryColor: "#6366f1"
      }
    }
  },
  {
    id: "survey-redemption",
    name: "Survey + Redemption",
    description: "Collect feedback while redeeming",
    category: "survey",
    config: {
      fields: [
        {
          id: "code",
          type: "gift-card-code",
          label: "Gift Card Code",
          required: true
        },
        {
          id: "satisfaction",
          type: "radio",
          label: "How satisfied are you with our service?",
          options: ["Very Satisfied", "Satisfied", "Neutral", "Dissatisfied", "Very Dissatisfied"],
          required: true
        },
        {
          id: "feedback",
          type: "textarea",
          label: "Any additional feedback?",
          placeholder: "Tell us what you think...",
          required: false
        },
        {
          id: "email",
          type: "email",
          label: "Email (optional for follow-up)",
          required: false
        }
      ],
      settings: {
        title: "Claim Your Reward & Share Feedback",
        submitButtonText: "Submit Survey & Claim",
        primaryColor: "#6366f1"
      }
    }
  }
];

export function getTemplateById(id: string): FormTemplate | undefined {
  return aceFormTemplates.find(t => t.id === id);
}

export function getTemplatesByCategory(category: string): FormTemplate[] {
  return aceFormTemplates.filter(t => t.category === category);
}
