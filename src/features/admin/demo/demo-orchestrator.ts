/**
 * Demo Data Orchestrator
 * Main coordination logic for generating complete demo data scenarios
 */

import { supabase } from '@core/services/supabase';
import type {
  DemoConfig,
  DemoGenerationResult,
  GenerationProgress,
  GenerationStep,
  ProgressCallback,
  CreatedRecord,
  RecipientTestCode
} from '@/types/demo';
import {
  ensureOrganization,
  createClient,
  ensureGiftCardBrand,
  createGiftCardPool,
  populateGiftCardInventory,
  generateCode,
  generatePhone,
  generateEmail,
  generateAddress,
  getRandomFirstName,
  getRandomLastName,
  generateToken
} from './demo-helpers';

export class DemoDataOrchestrator {
  private config: DemoConfig;
  private onProgress: ProgressCallback;
  private createdRecords: CreatedRecord[] = [];
  private startTime: number = 0;
  private steps: GenerationStep[] = [];

  constructor(config: DemoConfig, onProgress: ProgressCallback) {
    this.config = config;
    this.onProgress = onProgress;
    this.initializeSteps();
  }

  private initializeSteps() {
    this.steps = [
      { id: '1', label: 'Validating Configuration', status: 'pending', progress: 0 },
      { id: '2', label: 'Creating Organization', status: 'pending', progress: 0 },
      { id: '3', label: 'Creating Client Profile', status: 'pending', progress: 0 },
      { id: '4', label: 'Setting Up Gift Card Brand', status: 'pending', progress: 0 },
      { id: '5', label: 'Creating Gift Card Pool', status: 'pending', progress: 0 },
      { id: '6', label: 'Generating Gift Card Inventory', status: 'pending', progress: 0 },
      { id: '7', label: 'Creating Campaign', status: 'pending', progress: 0 },
      { id: '8', label: 'Setting Up Campaign Conditions', status: 'pending', progress: 0 },
      { id: '9', label: 'Configuring Reward Settings', status: 'pending', progress: 0 },
      { id: '10', label: 'Creating Audience', status: 'pending', progress: 0 },
      { id: '11', label: 'Generating Recipients', status: 'pending', progress: 0 },
      { id: '12', label: 'Simulating Call Sessions', status: 'pending', progress: 0 },
      { id: '13', label: 'Creating SMS Opt-in Records', status: 'pending', progress: 0 },
      { id: '14', label: 'Finalizing & Validating', status: 'pending', progress: 0 },
    ];
  }

  private updateProgress() {
    const completed = this.steps.filter(s => s.status === 'completed').length;
    const current = this.steps.findIndex(s => s.status === 'in_progress');
    const overallProgress = (completed / this.steps.length) * 100;
    const timeElapsed = Date.now() - this.startTime;
    const estimatedTimeRemaining = completed > 0 
      ? (timeElapsed / completed) * (this.steps.length - completed)
      : 0;

    this.onProgress({
      steps: this.steps,
      currentStep: current >= 0 ? current : completed,
      overallProgress,
      timeElapsed,
      estimatedTimeRemaining,
      status: 'generating'
    });
  }

  private async executeStep(stepId: string, fn: () => Promise<void>) {
    const step = this.steps.find(s => s.id === stepId);
    if (!step) return;

    step.status = 'in_progress';
    step.startTime = new Date();
    this.updateProgress();

    try {
      await fn();
      step.status = 'completed';
      step.progress = 100;
      step.endTime = new Date();
    } catch (error: any) {
      step.status = 'error';
      step.errorMessage = error.message;
      throw error;
    }

    this.updateProgress();
  }

  async generate(): Promise<DemoGenerationResult> {
    this.startTime = Date.now();
    
    let orgId: string;
    let clientId: string;
      let brandId: string;
      let poolId: string;
      let campaignId: string;
      let audienceId: string;
      const recipients: any[] = [];

      // Step 1: Validation (already done, skip)
      await this.executeStep('1', async () => {
        // Pre-validation done before orchestrator creation
      });

      // Step 2: Organization
      await this.executeStep('2', async () => {
        orgId = await ensureOrganization(this.config.organizationId);
        this.createdRecords.push({ type: 'organization', id: orgId });
      });

      // Step 3: Client
      await this.executeStep('3', async () => {
        clientId = await createClient(orgId!, this.config.clientName, this.config.industry);
        this.createdRecords.push({ type: 'client', id: clientId, name: this.config.clientName });
      });

      // Step 4: Gift Card Brand
      await this.executeStep('4', async () => {
        brandId = await ensureGiftCardBrand(this.config.giftCardBrand);
        this.createdRecords.push({ type: 'gift_card_brand', id: brandId });
      });

      // Step 5: Gift Card Pool
      await this.executeStep('5', async () => {
        poolId = await createGiftCardPool(
          clientId!,
          brandId!,
          this.config.giftCardValue,
          this.config.inventorySize
        );
        this.createdRecords.push({ type: 'gift_card_pool', id: poolId });
      });

      // Step 6: Gift Card Inventory
      await this.executeStep('6', async () => {
        await populateGiftCardInventory(
          poolId!,
          this.config.inventorySize,
          (current, total) => {
            const step = this.steps.find(s => s.id === '6');
            if (step) {
              step.progress = (current / total) * 100;
              step.details = `${current}/${total} cards created`;
              this.updateProgress();
            }
          }
        );
      });

      // Step 7: Campaign
      await this.executeStep('7', async () => {
        const { data, error } = await supabase
          .from('campaigns')
          .insert({
            client_id: clientId!,
            name: this.config.campaignName,
            type: this.config.campaignType,
            status: 'active',
            mail_date: this.config.mailDate,
            postage: 'first_class',
            size: '6x9'
          })
          .select('id')
          .single();

        if (error) throw new Error(`Failed to create campaign: ${error.message}`);
        campaignId = data.id;
        this.createdRecords.push({ type: 'campaign', id: campaignId, name: this.config.campaignName });
      });

      // Step 8: Campaign Conditions
      await this.executeStep('8', async () => {
        const conditions = [
          { condition_number: 1, condition_type: 'call_received', description: 'Customer called in' },
          { condition_number: 2, condition_type: 'sms_opt_in', description: 'Customer opted in via SMS' },
          { condition_number: 3, condition_type: 'form_submitted', description: 'Customer submitted form' }
        ];

        for (const cond of conditions) {
          const { data, error } = await supabase
            .from('campaign_conditions')
            .insert({
              campaign_id: campaignId!,
              ...cond,
              is_active: true
            })
            .select('id')
            .single();

          if (error) throw new Error(`Failed to create condition: ${error.message}`);
          this.createdRecords.push({ type: 'campaign_condition', id: data.id });
        }
      });

      // Step 9: Reward Configs
      await this.executeStep('9', async () => {
        const { error } = await supabase
          .from('campaign_reward_configs')
          .insert({
            campaign_id: campaignId!,
            condition_number: 2, // SMS opt-in condition
            gift_card_pool_id: poolId!,
            is_active: true
          });

        if (error) throw new Error(`Failed to create reward config: ${error.message}`);
      });

      // Step 10: Audience
      await this.executeStep('10', async () => {
        const { data, error } = await supabase
          .from('audiences')
          .insert({
            campaign_id: campaignId!,
            name: `${this.config.campaignName} - Audience`,
            size: this.config.recipientCount
          })
          .select('id')
          .single();

        if (error) throw new Error(`Failed to create audience: ${error.message}`);
        audienceId = data.id;
        this.createdRecords.push({ type: 'audience', id: audienceId });
      });

      // Step 11: Recipients
      await this.executeStep('11', async () => {
        for (let i = 0; i < this.config.recipientCount; i++) {
          const firstName = getRandomFirstName();
          const lastName = getRandomLastName();
          const address = generateAddress();

          const { data, error } = await supabase
            .from('recipients')
            .insert({
              audience_id: audienceId!,
              first_name: firstName,
              last_name: lastName,
              email: generateEmail(firstName, lastName),
              phone: generatePhone(),
              address: address.address,
              city: address.city,
              state: address.state,
              zip: address.zip,
              redemption_code: generateCode(this.config.codePrefix, i + 1),
              token: generateToken(),
              approval_status: 'approved'
            })
            .select()
            .single();

          if (error) throw new Error(`Failed to create recipient: ${error.message}`);
          recipients.push(data);

          const step = this.steps.find(s => s.id === '11');
          if (step) {
            step.progress = ((i + 1) / this.config.recipientCount) * 100;
            step.details = `${i + 1}/${this.config.recipientCount} recipients created`;
            this.updateProgress();
          }
        }
      });

      // Step 12: Call Sessions
      await this.executeStep('12', async () => {
        const callCount = this.config.outcomes.smsSent + this.config.outcomes.smsOptedIn + this.config.outcomes.redeemed;
        for (let i = 0; i < callCount && i < recipients.length; i++) {
          const { error } = await supabase
            .from('call_sessions')
            .insert({
              recipient_id: recipients[i].id,
              campaign_id: campaignId!,
              start_time: new Date().toISOString(),
              disposition: 'completed'
            });

          if (error) console.error('Call session error:', error);
        }
      });

      // Step 13: SMS Opt-ins
      await this.executeStep('13', async () => {
        const smsCount = this.config.outcomes.smsOptedIn;
        for (let i = 0; i < smsCount && i < recipients.length; i++) {
          const { error } = await supabase
            .from('sms_opt_ins')
            .insert({
              recipient_id: recipients[i].id,
              campaign_id: campaignId!,
              phone: recipients[i].phone,
              status: 'opted_in',
              opted_in_at: new Date().toISOString()
            });

          if (error) console.error('SMS opt-in error:', error);
        }
      });

      // Step 14: Finalize
      await this.executeStep('14', async () => {
        // Final validation would go here
      });

      // Build result
      const testCodes: RecipientTestCode[] = recipients.map((r, idx) => ({
        code: r.redemption_code,
        firstName: r.first_name,
        lastName: r.last_name,
        status: this.getRecipientStatus(idx),
        smsStatus: this.getSmsStatus(idx),
        isRedeemed: idx < this.config.outcomes.redeemed
      }));

    return {
      success: true,
      clientId: clientId!,
      clientName: this.config.clientName,
      campaignId: campaignId!,
      campaignName: this.config.campaignName,
      records: {
        organizations: 1,
        clients: 1,
        giftCardPools: 1,
        giftCards: this.config.inventorySize,
        campaigns: 1,
        campaignConditions: 3,
        rewardConfigs: 1,
        audiences: 1,
        recipients: this.config.recipientCount,
        callSessions: this.config.outcomes.smsSent + this.config.outcomes.smsOptedIn,
        smsOptIns: this.config.outcomes.smsOptedIn,
        events: 0
      },
      testCodes,
      createdRecords: this.createdRecords,
      timeElapsed: Date.now() - this.startTime
    };
  }

  private getRecipientStatus(index: number): string {
    if (index < this.config.outcomes.redeemed) return 'redeemed';
    if (index < this.config.outcomes.redeemed + this.config.outcomes.smsOptedIn) return 'opted_in';
    if (index < this.config.outcomes.redeemed + this.config.outcomes.smsOptedIn + this.config.outcomes.smsSent) return 'sms_sent';
    return 'not_contacted';
  }

  private getSmsStatus(index: number): 'not_sent' | 'sent' | 'opted_in' {
    if (index < this.config.outcomes.redeemed + this.config.outcomes.smsOptedIn) return 'opted_in';
    if (index < this.config.outcomes.redeemed + this.config.outcomes.smsOptedIn + this.config.outcomes.smsSent) return 'sent';
    return 'not_sent';
  }
}

