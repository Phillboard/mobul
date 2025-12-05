/**
 * MVP Verification Utility
 * 
 * Comprehensive checks for campaign MVP readiness
 * Can be run from browser console or via admin page
 */

import { supabase } from '@core/services/supabase';

export interface VerificationResult {
  category: string;
  check: string;
  status: 'pass' | 'fail' | 'warning';
  message: string;
  data?: any;
}

export class MVPVerification {
  private results: VerificationResult[] = [];

  /**
   * Run all verification checks
   */
  async runAll(): Promise<VerificationResult[]> {
    this.results = [];
    
    console.log('🔍 Starting MVP Verification...\n');
    
    await this.checkDatabaseTables();
    await this.checkOrganizationsAndClients();
    await this.checkUserSetup();
    await this.checkGiftCardInfrastructure();
    await this.checkContactsAndLists();
    await this.checkCampaignSetup();
    await this.checkEnvironmentConfig();
    await this.checkEdgeFunctions();
    
    this.printSummary();
    
    return this.results;
  }

  private addResult(category: string, check: string, status: 'pass' | 'fail' | 'warning', message: string, data?: any) {
    this.results.push({ category, check, status, message, data });
    
    const icon = status === 'pass' ? '✅' : status === 'fail' ? '❌' : '⚠️';
    console.log(`${icon} [${category}] ${check}: ${message}`);
  }

  /**
   * Check if critical database tables exist
   */
  private async checkDatabaseTables() {
    const category = 'Database Tables';
    
    const criticalTables = [
      'organizations',
      'clients',
      'campaigns',
      'audiences',
      'recipients',
      'campaign_conditions',
      'campaign_reward_configs',
      'gift_card_brands',
      'gift_card_pools',
      'gift_cards',
      'gift_card_deliveries',
      'contacts',
      'contact_lists',
      'templates'
    ];

    try {
      // Check each table by attempting a simple query
      for (const table of criticalTables) {
        try {
          const { error } = await supabase.from(table as any).select('id').limit(1);
          if (error) {
            this.addResult(category, table, 'fail', `Table not accessible: ${error.message}`);
          } else {
            this.addResult(category, table, 'pass', 'Table exists and accessible');
          }
        } catch (err) {
          this.addResult(category, table, 'fail', `Table check failed: ${err}`);
        }
      }
    } catch (error) {
      this.addResult(category, 'Database Connection', 'fail', `Database connection failed: ${error}`);
    }
  }

  /**
   * Check organizations and clients setup
   */
  private async checkOrganizationsAndClients() {
    const category = 'Organizations & Clients';

    try {
      const { data: orgs, error: orgError } = await supabase
        .from('organizations')
        .select('*');

      if (orgError) {
        this.addResult(category, 'Organizations', 'fail', orgError.message);
      } else if (!orgs || orgs.length === 0) {
        this.addResult(category, 'Organizations', 'warning', 'No organizations found - need to create one');
      } else {
        this.addResult(category, 'Organizations', 'pass', `Found ${orgs.length} organization(s)`, orgs);
      }

      const { data: clients, error: clientError } = await supabase
        .from('clients')
        .select('*');

      if (clientError) {
        this.addResult(category, 'Clients', 'fail', clientError.message);
      } else if (!clients || clients.length === 0) {
        this.addResult(category, 'Clients', 'warning', 'No clients found - need to create one');
      } else {
        this.addResult(category, 'Clients', 'pass', `Found ${clients.length} client(s)`, clients);
      }
    } catch (error) {
      this.addResult(category, 'Query', 'fail', `Query failed: ${error}`);
    }
  }

  /**
   * Check user setup and permissions
   */
  private async checkUserSetup() {
    const category = 'User Setup';

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        this.addResult(category, 'Authentication', 'fail', 'No user logged in');
        return;
      }

      this.addResult(category, 'Authentication', 'pass', `User logged in: ${user.email}`);

      const { data: roles, error: roleError } = await supabase
        .from('user_roles')
        .select('*')
        .eq('user_id', user.id);

      if (roleError) {
        this.addResult(category, 'User Role', 'fail', roleError.message);
      } else if (!roles || roles.length === 0) {
        this.addResult(category, 'User Role', 'warning', 'No role assigned to user');
      } else {
        this.addResult(category, 'User Role', 'pass', `Role: ${roles[0].role}`, roles);
      }

      const { data: clientAssignments, error: assignError } = await supabase
        .from('client_users')
        .select('*, clients(name)')
        .eq('user_id', user.id);

      if (assignError) {
        this.addResult(category, 'Client Assignment', 'fail', assignError.message);
      } else if (!clientAssignments || clientAssignments.length === 0) {
        this.addResult(category, 'Client Assignment', 'warning', 'User not assigned to any clients');
      } else {
        this.addResult(category, 'Client Assignment', 'pass', `Assigned to ${clientAssignments.length} client(s)`, clientAssignments);
      }
    } catch (error) {
      this.addResult(category, 'User Check', 'fail', `User check failed: ${error}`);
    }
  }

  /**
   * Check gift card infrastructure
   */
  private async checkGiftCardInfrastructure() {
    const category = 'Gift Cards';

    try {
      const { data: brands, error: brandError } = await supabase
        .from('gift_card_brands')
        .select('*');

      if (brandError) {
        this.addResult(category, 'Gift Card Brands', 'fail', brandError.message);
      } else if (!brands || brands.length === 0) {
        this.addResult(category, 'Gift Card Brands', 'warning', 'No gift card brands - need to seed');
      } else {
        this.addResult(category, 'Gift Card Brands', 'pass', `Found ${brands.length} brand(s)`, brands.map(b => b.brand_name));
      }

      const { data: pools, error: poolError } = await supabase
        .from('gift_card_pools')
        .select('*, gift_card_brands(brand_name)');

      if (poolError) {
        this.addResult(category, 'Gift Card Pools', 'fail', poolError.message);
      } else if (!pools || pools.length === 0) {
        this.addResult(category, 'Gift Card Pools', 'warning', 'No gift card pools - need to create');
      } else {
        const poolsWithCards = pools.filter(p => p.available_cards > 0);
        if (poolsWithCards.length === 0) {
          this.addResult(category, 'Gift Card Pools', 'warning', `Found ${pools.length} pool(s) but none have available cards`);
        } else {
          this.addResult(category, 'Gift Card Pools', 'pass', `Found ${poolsWithCards.length} pool(s) with available cards`, poolsWithCards);
        }
      }

      const { data: cards, error: cardError } = await supabase
        .from('gift_cards')
        .select('status')
        .limit(1000);

      if (cardError) {
        this.addResult(category, 'Gift Cards', 'fail', cardError.message);
      } else if (!cards || cards.length === 0) {
        this.addResult(category, 'Gift Cards', 'warning', 'No gift cards in database');
      } else {
        const statusCounts = cards.reduce((acc, card) => {
          acc[card.status] = (acc[card.status] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
        this.addResult(category, 'Gift Cards', 'pass', `Found ${cards.length} card(s)`, statusCounts);
      }
    } catch (error) {
      this.addResult(category, 'Gift Card Check', 'fail', `Check failed: ${error}`);
    }
  }

  /**
   * Check contacts and contact lists
   */
  private async checkContactsAndLists() {
    const category = 'Contacts';

    try {
      const { data: contacts, error: contactError } = await supabase
        .from('contacts')
        .select('*');

      if (contactError) {
        this.addResult(category, 'Contacts', 'fail', contactError.message);
      } else if (!contacts || contacts.length === 0) {
        this.addResult(category, 'Contacts', 'warning', 'No contacts - need to import');
      } else {
        const withPhone = contacts.filter(c => c.phone && c.phone !== '');
        this.addResult(category, 'Contacts', 'pass', `Found ${contacts.length} contact(s), ${withPhone.length} with phone`, { total: contacts.length, withPhone: withPhone.length });
      }

      const { data: lists, error: listError } = await supabase
        .from('contact_lists')
        .select('*, contact_list_members(count)');

      if (listError) {
        this.addResult(category, 'Contact Lists', 'fail', listError.message);
      } else if (!lists || lists.length === 0) {
        this.addResult(category, 'Contact Lists', 'warning', 'No contact lists - need to create');
      } else {
        this.addResult(category, 'Contact Lists', 'pass', `Found ${lists.length} list(s)`, lists);
      }
    } catch (error) {
      this.addResult(category, 'Contact Check', 'fail', `Check failed: ${error}`);
    }
  }

  /**
   * Check campaign setup
   */
  private async checkCampaignSetup() {
    const category = 'Campaigns';

    try {
      const { data: templates, error: templateError } = await supabase
        .from('templates')
        .select('*');

      if (templateError) {
        this.addResult(category, 'Templates', 'fail', templateError.message);
      } else if (!templates || templates.length === 0) {
        this.addResult(category, 'Templates', 'warning', 'No templates - campaigns will need custom design');
      } else {
        this.addResult(category, 'Templates', 'pass', `Found ${templates.length} template(s)`);
      }

      const { data: campaigns, error: campaignError } = await supabase
        .from('campaigns')
        .select('*, campaign_conditions(count), campaign_reward_configs(count)');

      if (campaignError) {
        this.addResult(category, 'Campaigns', 'fail', campaignError.message);
      } else if (!campaigns || campaigns.length === 0) {
        this.addResult(category, 'Campaigns', 'pass', 'No campaigns yet - ready to create first one');
      } else {
        const statusCounts = campaigns.reduce((acc, camp) => {
          acc[camp.status] = (acc[camp.status] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
        this.addResult(category, 'Campaigns', 'pass', `Found ${campaigns.length} campaign(s)`, statusCounts);
      }
    } catch (error) {
      this.addResult(category, 'Campaign Check', 'fail', `Check failed: ${error}`);
    }
  }

  /**
   * Check environment configuration
   */
  private async checkEnvironmentConfig() {
    const category = 'Environment Config';

    const requiredVars = [
      'VITE_SUPABASE_URL',
      'VITE_SUPABASE_PUBLISHABLE_KEY'
    ];

    const optionalVars = [
      'VITE_TWILIO_ACCOUNT_SID',
      'VITE_TWILIO_AUTH_TOKEN',
      'VITE_TILLO_API_KEY'
    ];

    for (const varName of requiredVars) {
      const value = import.meta.env[varName];
      if (!value) {
        this.addResult(category, varName, 'fail', 'Required environment variable not set');
      } else {
        this.addResult(category, varName, 'pass', 'Configured');
      }
    }

    for (const varName of optionalVars) {
      const value = import.meta.env[varName];
      if (!value) {
        this.addResult(category, varName, 'warning', 'Optional variable not set - some features may not work');
      } else {
        this.addResult(category, varName, 'pass', 'Configured');
      }
    }
  }

  /**
   * Check edge functions availability
   */
  private async checkEdgeFunctions() {
    const category = 'Edge Functions';

    const criticalFunctions = [
      'generate-recipient-tokens',
      'evaluate-conditions',
      'claim-and-provision-card',
      'send-gift-card-sms',
      'handle-purl'
    ];

    for (const funcName of criticalFunctions) {
      try {
        // Try to invoke with minimal test data (will fail gracefully)
        const { error } = await supabase.functions.invoke(funcName, {
          body: { test: true }
        });
        
        // If we get a response (even an error), the function exists
        if (error && error.message.includes('not found')) {
          this.addResult(category, funcName, 'fail', 'Function not deployed');
        } else {
          this.addResult(category, funcName, 'pass', 'Function deployed');
        }
      } catch (error) {
        this.addResult(category, funcName, 'warning', 'Unable to verify function');
      }
    }
  }

  /**
   * Print summary of results
   */
  private printSummary() {
    const passed = this.results.filter(r => r.status === 'pass').length;
    const failed = this.results.filter(r => r.status === 'fail').length;
    const warnings = this.results.filter(r => r.status === 'warning').length;

    console.log('\n' + '='.repeat(60));
    console.log('📊 VERIFICATION SUMMARY');
    console.log('='.repeat(60));
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`⚠️  Warnings: ${warnings}`);
    console.log(`📝 Total Checks: ${this.results.length}`);
    console.log('='.repeat(60));

    if (failed === 0 && warnings === 0) {
      console.log('\n🎉 MVP IS READY! You can create and run campaigns.\n');
    } else if (failed === 0) {
      console.log('\n⚠️  MVP is mostly ready but has some warnings. Review the output above.\n');
    } else {
      console.log('\n❌ MVP NOT READY. Please fix the failed checks above.\n');
    }
  }

  /**
   * Get detailed results as JSON
   */
  getResults(): VerificationResult[] {
    return this.results;
  }

  /**
   * Get results grouped by category
   */
  getResultsByCategory(): Record<string, VerificationResult[]> {
    return this.results.reduce((acc, result) => {
      if (!acc[result.category]) {
        acc[result.category] = [];
      }
      acc[result.category].push(result);
      return acc;
    }, {} as Record<string, VerificationResult[]>);
  }
}

/**
 * Convenience function to run verification
 */
export async function verifyMVP(): Promise<VerificationResult[]> {
  const verification = new MVPVerification();
  return await verification.runAll();
}

// Make available in browser console for easy debugging
if (typeof window !== 'undefined') {
  (window as any).verifyMVP = verifyMVP;
  console.log('💡 Run window.verifyMVP() in console to check MVP readiness');
}

