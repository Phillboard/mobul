/**
 * Rollback System
 * Handles cleanup of partially created demo data on errors
 */

import { supabase } from '@core/services/supabase';
import type { CreatedRecord, RollbackLog } from '@/types/demo';

export class DemoRollbackManager {
  private records: CreatedRecord[];
  private logs: RollbackLog[] = [];

  constructor(records: CreatedRecord[]) {
    this.records = records;
  }

  async rollback(): Promise<RollbackLog[]> {
    // Delete in reverse order to respect foreign key constraints
    const reversedRecords = [...this.records].reverse();

    for (const record of reversedRecords) {
      try {
        await this.deleteRecord(record);
        this.logs.push({
          timestamp: new Date(),
          recordType: record.type,
          recordId: record.id,
          action: 'deleted'
        });
      } catch (error: any) {
        this.logs.push({
          timestamp: new Date(),
          recordType: record.type,
          recordId: record.id,
          action: 'failed',
          error: error.message
        });
      }
    }

    return this.logs;
  }

  private async deleteRecord(record: CreatedRecord) {
    const tableMap: Record<string, string> = {
      'recipient': 'recipients',
      'audience': 'audiences',
      'campaign_condition': 'campaign_conditions',
      'campaign': 'campaigns',
      'gift_card': 'gift_cards',
      'gift_card_pool': 'gift_card_pools',
      'client': 'clients',
      'organization': 'organizations'
    };

    const table = tableMap[record.type];
    if (!table) return;

    const { error } = await supabase
      .from(table)
      .delete()
      .eq('id', record.id);

    if (error) throw error;
  }
}

