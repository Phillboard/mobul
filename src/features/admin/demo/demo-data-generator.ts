/**
 * Demo Data Generator
 * 
 * Generates comprehensive dummy data for testing all system features
 */

import { supabase } from "@core/services/supabase";
import {
  generateName,
  generateEmail,
  generatePhone,
  generateAddress,
  generateCampaignName,
  getRandomCampaignStatus,
  getRandomMailSize,
  getRandomGiftCardStatus,
  getRandomLifecycleStage,
  generateDemoCode,
  generateGiftCardCode,
  generatePIN,
  generateToken,
  pastDate,
  futureDate,
  randomInt,
  randomElement,
  randomBoolean,
  generateBatch,
} from "./fake-data-helpers";

export interface GenerationProgress {
  phase: string;
  current: number;
  total: number;
  status: 'pending' | 'in_progress' | 'completed' | 'error';
  message?: string;
}

export interface GenerationOptions {
  clientIds: string[];
  campaignsPerClient?: number;
  recipientsPerCampaign?: number;
  eventsPerCampaign?: number;
  onProgress?: (progress: GenerationProgress) => void;
}

export class DemoDataGenerator {
  private onProgress?: (progress: GenerationProgress) => void;

  constructor(onProgress?: (progress: GenerationProgress) => void) {
    this.onProgress = onProgress;
  }

  private reportProgress(phase: string, current: number, total: number, status: string, message?: string) {
    if (this.onProgress) {
      this.onProgress({ phase, current, total, status: status as any, message });
    }
  }

  /**
   * Generate campaigns for clients
   */
  async generateCampaigns(clientIds: string[], count: number = 5): Promise<string[]> {
    const campaignIds: string[] = [];
    const total = clientIds.length * count;
    let current = 0;

    this.reportProgress('Campaigns', 0, total, 'in_progress', 'Creating campaigns...');

    for (const clientId of clientIds) {
      // Get client details
      const { data: client } = await supabase
        .from('clients')
        .select('name, industry')
        .eq('id', clientId)
        .single();

      if (!client) continue;

      for (let i = 0; i < count; i++) {
        try {
          const status = getRandomCampaignStatus();
          const size = getRandomMailSize();
          const name = generateCampaignName(client.name, client.industry || 'General');

          const { data: campaign, error } = await supabase
            .from('campaigns')
            .insert({
              client_id: clientId,
              name,
              size,
              status,
              postage: randomBoolean() ? 'first_class' : 'standard',
              lp_mode: randomElement(['bridge', 'purl', 'direct']),
              utm_source: 'directmail',
              utm_medium: size === 'letter' ? 'letter' : 'postcard',
              utm_campaign: name.toLowerCase().replace(/\s+/g, '-'),
              mail_date: status === 'scheduled' 
                ? futureDate(30).toISOString().split('T')[0]
                : status === 'draft'
                ? null
                : pastDate(30).toISOString().split('T')[0],
              created_at: pastDate(60).toISOString(),
            })
            .select()
            .single();

          if (!error && campaign) {
            campaignIds.push(campaign.id);
          }

          current++;
          this.reportProgress('Campaigns', current, total, 'in_progress', `Created campaign: ${name}`);
        } catch (error) {
          current++;
          this.reportProgress('Campaigns', current, total, 'error', `Failed to create campaign`);
        }
      }
    }

    this.reportProgress('Campaigns', total, total, 'completed', `${campaignIds.length} campaigns created`);
    return campaignIds;
  }

  /**
   * Generate recipients for campaigns
   */
  async generateRecipients(campaignIds: string[], recipientsPerCampaign: number = 50): Promise<void> {
    const total = campaignIds.length * recipientsPerCampaign;
    let current = 0;

    this.reportProgress('Recipients', 0, total, 'in_progress', 'Creating recipients...');

    for (const campaignId of campaignIds) {
      try {
        // Get campaign details
        const { data: campaign } = await supabase
          .from('campaigns')
          .select('audience_id')
          .eq('id', campaignId)
          .single();

        let audienceId = campaign?.audience_id;

        // Create audience if doesn't exist
        if (!audienceId) {
          const { data: audience } = await supabase
            .from('audiences')
            .insert({
              client_id: (await supabase.from('campaigns').select('client_id').eq('id', campaignId).single()).data?.client_id,
              name: `Recipients for Campaign`,
              source: 'import',
              status: 'ready',
              total_count: recipientsPerCampaign,
              valid_count: recipientsPerCampaign,
            })
            .select()
            .single();

          if (audience) {
            audienceId = audience.id;
            await supabase
              .from('campaigns')
              .update({ audience_id: audienceId })
              .eq('id', campaignId);
          }
        }

        if (!audienceId) continue;

        // Generate recipients
        const recipients = generateBatch(recipientsPerCampaign, (i) => {
          const { firstName, lastName } = generateName();
          const address = generateAddress();
          
          return {
            audience_id: audienceId,
            first_name: firstName,
            last_name: lastName,
            email: generateEmail(firstName, lastName),
            phone: generatePhone(),
            address: address.address,
            address2: address.address2,
            city: address.city,
            state: address.state,
            zip: address.zip,
            token: generateToken(16),
            redemption_code: generateDemoCode('DEMO'),
            created_at: pastDate(25).toISOString(),
          };
        });

        const { error } = await supabase
          .from('recipients')
          .insert(recipients);

        if (!error) {
          current += recipientsPerCampaign;
          this.reportProgress('Recipients', current, total, 'in_progress', `Created ${recipientsPerCampaign} recipients`);
        }
      } catch (error) {
        current += recipientsPerCampaign;
        this.reportProgress('Recipients', current, total, 'error', `Failed batch`);
      }
    }

    this.reportProgress('Recipients', total, total, 'completed', `All recipients created`);
  }

  /**
   * Generate tracking events for analytics
   */
  async generateEvents(campaignIds: string[], eventsPerCampaign: number = 100): Promise<void> {
    const total = campaignIds.length * eventsPerCampaign;
    let current = 0;

    this.reportProgress('Events', 0, total, 'in_progress', 'Creating tracking events...');

    const eventTypes = [
      { type: 'purl_visit', weight: 30 },
      { type: 'qr_scan', weight: 20 },
      { type: 'form_submission', weight: 15 },
      { type: 'call_received', weight: 10 },
      { type: 'gift_card_claimed', weight: 10 },
      { type: 'gift_card_delivered', weight: 10 },
      { type: 'email_opened', weight: 5 },
    ];

    for (const campaignId of campaignIds) {
      try {
        // Get recipients for this campaign
        const { data: recipients } = await supabase
          .from('recipients')
          .select('id, audience_id')
          .eq('audience_id', (await supabase.from('campaigns').select('audience_id').eq('id', campaignId).single()).data?.audience_id)
          .limit(eventsPerCampaign);

        if (!recipients || recipients.length === 0) continue;

        const events = generateBatch(eventsPerCampaign, (i) => {
          const recipient = recipients[i % recipients.length];
          const eventType = this.getWeightedEventType(eventTypes);
          
          // Time distribution: 50% last 7 days, 30% last 30 days, 20% older
          const daysAgo = i < eventsPerCampaign * 0.5 ? 7 
                        : i < eventsPerCampaign * 0.8 ? 30 
                        : 60;

          return {
            recipient_id: recipient.id,
            campaign_id: campaignId,
            event_type: eventType,
            event_data: {
              browser: randomElement(['Chrome', 'Safari', 'Firefox', 'Edge']),
              device: randomElement(['desktop', 'mobile', 'tablet']),
              location: randomElement(['Austin, TX', 'Dallas, TX', 'Phoenix, AZ']),
            },
            created_at: pastDate(daysAgo).toISOString(),
          };
        });

        const { error } = await supabase
          .from('events')
          .insert(events);

        if (!error) {
          current += eventsPerCampaign;
          this.reportProgress('Events', current, total, 'in_progress', `Created ${eventsPerCampaign} events`);
        }
      } catch (error) {
        current += eventsPerCampaign;
        this.reportProgress('Events', current, total, 'error', `Failed batch`);
      }
    }

    this.reportProgress('Events', total, total, 'completed', `All tracking events created`);
  }

  private getWeightedEventType(types: { type: string; weight: number }[]): string {
    const random = Math.random() * 100;
    let cumulative = 0;
    
    for (const { type, weight } of types) {
      cumulative += weight;
      if (random <= cumulative) {
        return type;
      }
    }
    
    return types[0].type;
  }

  /**
   * Generate complete demo dataset
   */
  async generateCompleteDataset(options: GenerationOptions): Promise<void> {
    const {
      clientIds,
      campaignsPerClient = 5,
      recipientsPerCampaign = 50,
      eventsPerCampaign = 100,
    } = options;

    try {
      // Phase 1: Campaigns
      const campaignIds = await this.generateCampaigns(clientIds, campaignsPerClient);

      // Phase 2: Recipients
      await this.generateRecipients(campaignIds, recipientsPerCampaign);

      // Phase 3: Events
      await this.generateEvents(campaignIds, eventsPerCampaign);

      this.reportProgress('Complete', 1, 1, 'completed', 'All demo data generated successfully!');
    } catch (error) {
      this.reportProgress('Complete', 0, 1, 'error', `Generation failed: ${error}`);
      throw error;
    }
  }
}

