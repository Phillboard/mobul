# Comprehensive Simulated Data System

A complete, production-ready system for generating large-scale, realistic test data for the Mobul platform. This system creates tens of thousands of records with historical patterns, complete event sequences, and realistic temporal distributions to support analytics, development, testing, and demonstrations.

## Features

✅ **Multi-Scenario Support** - Pre-configured scenarios from demo to load testing
✅ **Time-Based Simulation** - Historical data with seasonal patterns and realistic timing
✅ **Complete Entity Coverage** - Organizations, clients, users, contacts, campaigns, recipients, events
✅ **Call Center Simulation** - Realistic call sessions, SMS opt-ins, and agent interactions
✅ **Gift Card System** - Full inventory, billing ledger, and redemption patterns
✅ **Analytics Data** - Performance metrics, usage analytics, and error logs
✅ **Data Validation** - Built-in validation and performance testing
✅ **Interactive CLI** - User-friendly command-line interface
✅ **Batch Processing** - Optimized for performance with configurable batch sizes

## Quick Start

### Prerequisites

```bash
# Set environment variables
export SUPABASE_URL="your_supabase_url"
export SUPABASE_SERVICE_ROLE_KEY="your_service_key"
```

### Interactive Mode (Recommended)

```bash
npm run seed:cli
# or
node scripts/seed-cli.ts
```

Follow the interactive prompts to select a scenario and customize options.

### Command Line Mode

```bash
# Run with a predefined scenario
npm run seed:demo        # Small dataset for demos
npm run seed:dev         # Medium dataset for development
npm run seed:analytics   # Large dataset with full analytics
npm run seed:load        # Massive dataset for load testing

# Or directly
node scripts/seed-all-data.ts demo
node scripts/seed-all-data.ts development
node scripts/seed-all-data.ts analytics
node scripts/seed-all-data.ts load_test
```

## Available Scenarios

### 1. Demo Scenario
**Purpose:** Quick demos and presentations
- 2 organizations, 6 clients
- 300 contacts total
- 18 campaigns
- ~1,000 recipients
- 1 month of data
- **Generation Time:** ~1 minute

### 2. Development Scenario
**Purpose:** Feature development and testing
- 5 organizations, 20 clients
- 5,000 contacts total
- 100 campaigns
- ~15,000 recipients
- 3 months of historical data
- Full call center & gift card data
- **Generation Time:** ~5 minutes

### 3. Analytics Scenario
**Purpose:** Analytics validation and dashboard testing
- 12 organizations, 60 clients
- 60,000 contacts total
- 480 campaigns
- ~192,000 recipients
- 6 months of historical data
- Full analytics, metrics, and error logs
- **Generation Time:** ~15-20 minutes

### 4. Load Test Scenario
**Purpose:** Performance testing and optimization
- 15 organizations, 100 clients
- 200,000 contacts total
- 1,000 campaigns
- ~600,000 recipients
- 12 months of historical data
- All features enabled
- **Generation Time:** ~30-45 minutes

## Architecture

```
scripts/
├── seed-all-data.ts              # Master orchestrator
├── seed-cli.ts                   # Interactive CLI
├── validate-analytics-data.ts    # Validation & performance testing
└── seed-data/
    ├── config.ts                 # Configuration & presets
    ├── time-simulator.ts         # Historical data patterns
    ├── analytics-generators.ts   # Performance metrics & usage data
    ├── campaigns.ts              # Campaign generation
    ├── recipients-events.ts      # Recipient journeys & events
    ├── call-center.ts            # Call center operations
    ├── generators.ts             # Utility generators
    └── constants.ts              # Data constants
```

## Data Generation Flow

```
1. Clear Existing Data
   ↓
2. Create Organizations & Users
   ↓
3. Create Clients & Brand Kits
   ↓
4. Generate Gift Card System
   ↓
5. Generate Contacts & Lists
   ↓
6. Create Templates & Landing Pages
   ↓
7. Generate Campaigns (with historical distribution)
   ↓
8. Generate Recipients & Event Sequences
   ↓
9. Generate Call Center Data (optional)
   ↓
10. Generate Analytics Data (optional)
   ↓
11. Validate & Report
```

## Realistic Patterns

### Temporal Patterns
- **Seasonal Trends:** Higher campaign activity in Q4, lower in summer
- **Day of Week:** More activity on weekdays, especially Tuesday-Thursday
- **Business Hours:** Call center activity during 9 AM - 5 PM
- **Event Sequences:** Proper causal ordering (mail → deliver → engage)

### Campaign Lifecycle
1. Campaign created (historical date)
2. Mail date (7-21 days after creation)
3. Drop date (10-27 days after creation)
4. Delivery (2-5 days after mail date)
5. Engagement (spread over 2 weeks)

### Recipient Journey
1. **Mailed** (95% of recipients)
2. **Delivered** (85% of mailed, 2-5 days later)
3. **QR Scan** (20% of delivered, within 7 days)
4. **PURL Visit** (28% of delivered, within 14 days)
5. **Form Submit** (12% of visitors, within 30 minutes)
6. **Lead Captured** (10% of submissions, immediately)
7. **Call Received** (35% of delivered, 1-7 days later)
8. **SMS Opt-in** (68% of calls, within 60 minutes)
9. **Gift Card Redeemed** (60% within 7 days, 25% within 30 days)

### Data Distributions
- **Campaign Status:** 60% completed, 15% mailed, 15% in production, 10% draft
- **Lifecycle Stages:** 40% leads, 20% MQL, 15% SQL, 10% opportunities, 10% customers, 5% evangelists
- **Industry Mix:** Balanced across roofing, REI, auto service, auto warranty, auto buyback
- **Call Outcomes:** 85% answered, 85% matched to recipients, 68% opt-in rate

## Configuration Options

```typescript
interface SeedConfig {
  scenario: 'demo' | 'development' | 'analytics' | 'load_test';
  timeRange: {
    months: number;
    startDate?: Date;
  };
  scale: {
    organizations: number;
    clients: number;
    usersPerOrg: number;
    contactsPerClient: number;
    listsPerClient: number;
    campaignsPerClient: number;
    recipientsPerCampaign: number;
    giftCardBrands: number;
    giftCardInventorySize: number;
  };
  features: {
    includeCallCenter: boolean;
    includeGiftCards: boolean;
    includeAnalytics: boolean;
    includeErrors: boolean;
    includeHistoricalData: boolean;
  };
  performance: {
    batchSize: number;
    parallelBatches: number;
    checkpointInterval: number;
  };
}
```

## Validation & Testing

After generating data, run the validation script:

```bash
npm run validate:data
# or
node scripts/validate-analytics-data.ts
```

This validates:
- ✅ Record counts for all tables
- ✅ Foreign key relationships
- ✅ Time sequence integrity
- ✅ Data distribution realism
- ✅ Query performance benchmarks

### Performance Benchmarks

Expected query performance on generated data:
- Campaign list: < 2 seconds
- Campaign with recipient counts: < 3 seconds
- Events aggregation: < 3 seconds
- Contact list: < 2 seconds
- Analytics metrics: < 2.5 seconds

## Troubleshooting

### Generation is slow
- Reduce `batchSize` in config (lower memory usage)
- Increase `parallelBatches` (faster processing)
- Use a smaller scenario
- Check database connection latency

### Validation fails
- Review validation report for specific issues
- Check foreign key constraints in database
- Verify RLS policies allow data creation
- Ensure sufficient database resources

### Out of memory
- Reduce `batchSize` to 500 or less
- Process in smaller chunks
- Use a machine with more RAM
- Enable database connection pooling

## Performance Optimization

The system is optimized for:
- **Batch Inserts:** Groups records into configurable batches (default: 500-1000)
- **Parallel Processing:** Concurrent batch operations where possible
- **Minimal Queries:** Pre-fetches related data to avoid N+1 queries
- **Progress Checkpointing:** Can resume from failures (future enhancement)

## Use Cases

### Development
Generate realistic data for:
- Feature development
- UI/UX testing
- Integration testing
- Bug reproduction

### Analytics
Validate and test:
- Dashboard queries
- Report generation
- Chart rendering
- Aggregation performance

### Demos
Create impressive presentations with:
- Realistic data volumes
- Professional-looking records
- Complete workflows
- Varied scenarios

### Performance Testing
Load test the system with:
- Large data volumes
- Concurrent operations
- Complex queries
- Edge cases

## Package.json Scripts

Add these to your `package.json`:

```json
{
  "scripts": {
    "seed:cli": "node scripts/seed-cli.ts",
    "seed:demo": "node scripts/seed-all-data.ts demo",
    "seed:dev": "node scripts/seed-all-data.ts development",
    "seed:analytics": "node scripts/seed-all-data.ts analytics",
    "seed:load": "node scripts/seed-all-data.ts load_test",
    "validate:data": "node scripts/validate-analytics-data.ts"
  }
}
```

## Safety Notes

⚠️ **WARNING:** These scripts will DELETE all existing data before generating new data.

- Always backup your database before running
- Never run against production databases
- Use dedicated development/testing environments
- Verify the scenario before confirming generation

## Future Enhancements

- [ ] Resume capability for interrupted generation
- [ ] Incremental data generation (add to existing)
- [ ] Custom data templates
- [ ] Export/import configurations
- [ ] Web UI for data generation
- [ ] Real-time progress visualization
- [ ] Data anonymization for production exports

## Contributing

When adding new generators:
1. Follow the existing patterns in `seed-data/`
2. Add configuration options to `config.ts`
3. Update the orchestrator in `seed-all-data.ts`
4. Add validation checks to `validate-analytics-data.ts`
5. Document in this README

## Support

For issues or questions:
1. Check validation output for specific errors
2. Review console logs for detailed information
3. Verify environment variables are set correctly
4. Check database permissions and RLS policies

---

*Context improved by Giga AI - Using configuration system, time-based simulator, campaign condition model, gift card provisioning system, and organization hierarchy information.*

