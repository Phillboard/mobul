/**
 * Demo Scenario Templates
 * Pre-configured scenarios for common client types
 */

import type { DemoTemplate } from '@/types/demo';

export const DEMO_TEMPLATES: DemoTemplate[] = [
  {
    id: 'premier_auto',
    name: 'Premier Auto Warranty',
    description: 'Automotive warranty follow-up campaign with service reminders',
    industry: 'automotive',
    icon: '🚗',
    defaults: {
      clientName: 'Premier Auto Warranty',
      campaignName: 'Summer Warranty Renewal Campaign',
      campaignType: 'warranty_renewal',
      recipientCount: 15,
      giftCardBrand: 'Amazon',
      giftCardValue: 25,
      inventorySize: 50,
      outcomes: {
        notCalled: 5,
        smsSent: 3,
        smsOptedIn: 2,
        redeemed: 2,
        declined: 3
      },
      codePrefix: 'PREM'
    }
  },
  {
    id: 'abc_roofing',
    name: 'ABC Roofing',
    description: 'Free roof inspection offers for homeowners',
    industry: 'home_services',
    icon: '🏠',
    defaults: {
      clientName: 'ABC Roofing Company',
      campaignName: 'Free Roof Inspection Offer',
      campaignType: 'service_offer',
      recipientCount: 20,
      giftCardBrand: 'Home Depot',
      giftCardValue: 50,
      inventorySize: 100,
      outcomes: {
        notCalled: 8,
        smsSent: 5,
        smsOptedIn: 3,
        redeemed: 2,
        declined: 2
      },
      codePrefix: 'ROOF'
    }
  },
  {
    id: 'elite_real_estate',
    name: 'Elite Real Estate',
    description: 'High-value property investment lead generation',
    industry: 'real_estate',
    icon: '🏢',
    defaults: {
      clientName: 'Elite Real Estate Investors',
      campaignName: 'Q4 Investment Opportunities',
      campaignType: 'lead_generation',
      recipientCount: 12,
      giftCardBrand: 'Visa',
      giftCardValue: 100,
      inventorySize: 30,
      outcomes: {
        notCalled: 4,
        smsSent: 3,
        smsOptedIn: 2,
        redeemed: 1,
        declined: 2
      },
      codePrefix: 'ELITE'
    }
  }
];

/**
 * Get template by ID
 */
export function getTemplate(templateId: string): DemoTemplate | undefined {
  return DEMO_TEMPLATES.find(t => t.id === templateId);
}

/**
 * Get all available templates
 */
export function getAllTemplates(): DemoTemplate[] {
  return DEMO_TEMPLATES;
}

