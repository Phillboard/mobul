# Seed Data Scripts

TypeScript scripts for programmatic data generation and seeding in the ACE Engage platform.

## Overview

These scripts are used by the application's admin tools to generate test and demo data. They're TypeScript modules that can be imported and executed within the application context.

## Available Scripts

### `contacts.ts`
**Purpose:** Generate realistic contact data  
**Exports:** Functions for creating contacts with various attributes  
**Features:**
- Realistic names, addresses, emails
- Various lifecycle stages
- Multiple lead sources
- Custom field data

**Usage:** Imported by demo data generator tools

### `organizations.ts`
**Purpose:** Create organization hierarchies  
**Exports:** Functions for generating agency and client structures  
**Features:**
- Multi-level organization trees
- Agency-client relationships
- Industry-specific configurations
- Branding and settings

**Usage:** Foundational data for other seeders

### `helpers.ts`
**Purpose:** Shared utility functions for data generation  
**Exports:** Helper functions used across seed scripts  
**Features:**
- Random data generators
- Date/time utilities
- ID generation
- Validation helpers

**Usage:** Imported by other seed data scripts

### `quick-enrich.ts`
**Purpose:** Quickly populate enrichment data  
**Exports:** Functions for adding enriched contact information  
**Features:**
- Social media profiles
- Company information
- Contact scores
- Engagement history

**Usage:** Testing data enrichment features

## How These Scripts Are Used

These scripts are **not run directly**. Instead, they're imported and executed by:

1. **Admin Demo Data Generator** (`/admin/demo-data`)
   - UI-based data generation
   - Controlled execution with progress tracking
   - Safe for use in development environments

2. **Automated Tests**
   - Test setup and teardown
   - Fixture generation
   - Consistent test data

3. **Development Tools**
   - CLI utilities
   - Database setup scripts
   - Development environment initialization

## Usage in Application

### Via Admin UI

```typescript
// Example: Using in the Demo Data Generator component
import { generateContacts } from '@/scripts/seed-data/contacts';
import { generateOrganizations } from '@/scripts/seed-data/organizations';

// In your component
const handleGenerateData = async () => {
  const orgs = await generateOrganizations(5);
  const contacts = await generateContacts(100, orgs[0].id);
  // ... data is created in database
};
```

### Direct Import (Development)

```typescript
// Example: Custom seeding script
import { createAgencyWithClients } from './scripts/seed-data/organizations';
import { createContactBatch } from './scripts/seed-data/contacts';

async function seedTestEnvironment() {
  const agency = await createAgencyWithClients(3);
  for (const client of agency.clients) {
    await createContactBatch(50, client.id);
  }
}
```

## Script Structure

Each script typically exports:

1. **Generator Functions:** Create single records
2. **Batch Functions:** Create multiple records efficiently
3. **Configuration Objects:** Customize generation behavior
4. **Type Definitions:** TypeScript interfaces for generated data

## Best Practices

### When Using Seed Data Scripts

- **Use in Development Only:** These scripts create test data not suitable for production
- **Check Existing Data:** Don't duplicate data unnecessarily
- **Use Transactions:** Wrap bulk operations in transactions for safety
- **Clean Up After:** Use cleanup scripts when done testing
- **Monitor Performance:** Large batches can be slow

### When Modifying Scripts

- **Maintain Realism:** Generated data should look realistic
- **Avoid Hard-coded Values:** Use parameterized generation
- **Handle Errors Gracefully:** Include proper error handling
- **Document New Functions:** Add JSDoc comments
- **Keep Dependencies Light:** Minimize external dependencies

## Data Generation Patterns

### Realistic Data

Scripts use various techniques for realistic data:

- **Name Generation:** Combinations from curated lists
- **Address Generation:** Real US city/state combinations
- **Email Generation:** Based on names and domains
- **Phone Numbers:** Valid US phone number formats
- **Dates:** Realistic time ranges for created/modified dates

### Deterministic Generation

Some functions support seeding for reproducible results:

```typescript
// Example: Reproducible contact generation
const contacts = generateContacts(100, {
  seed: 12345,  // Same seed = same contacts
  startDate: '2024-01-01'
});
```

## Integration with Admin Tools

These scripts integrate with:

1. **`/admin/demo-data`** - Visual data generation interface
2. **`/admin/mvp-verification`** - Database health checks
3. **Demo Data Generator Component** - `src/pages/DemoDataGenerator.tsx`

## Testing

These scripts should be tested to ensure they:

- Generate valid data that passes validation
- Handle edge cases (0 records, large batches)
- Work with existing data without conflicts
- Clean up properly on failure

## Performance Considerations

### For Large Batches

- Use batch insert operations (not individual inserts)
- Consider pagination for very large datasets
- Show progress indicators for long operations
- Implement cancellation for user control

### Optimization Tips

```typescript
// Good: Batch insert
await supabase.from('contacts').insert(contactsArray);

// Avoid: Individual inserts in loop
for (const contact of contacts) {
  await supabase.from('contacts').insert(contact);
}
```

## Troubleshooting

### Script Import Errors

- Ensure TypeScript paths are configured correctly
- Check that dependencies are installed
- Verify Supabase client is properly initialized

### Data Not Being Created

- Check RLS policies allow insertion
- Verify foreign key constraints are satisfied
- Ensure required fields have values
- Check Supabase client authentication

### Slow Performance

- Reduce batch size
- Use bulk operations instead of individual inserts
- Check database indexes
- Monitor network latency to Supabase

## Relationship to SQL Scripts

| TypeScript Seed Scripts | SQL Seed Scripts |
|------------------------|------------------|
| Programmatic execution | Direct SQL execution |
| Uses Supabase client | Uses SQL editor |
| Type-safe | No type checking |
| Integrated with UI | Manual execution |
| Better for dynamic data | Better for static data |

**Use TypeScript scripts** when:
- Building UI-based data generation
- Need type safety and validation
- Integrating with application logic
- Want progress tracking

**Use SQL scripts** when:
- Doing one-time database setup
- Need fine-grained control
- Working directly with database
- Seeding production/staging environments

## Contributing

When adding new seed data scripts:

1. Follow existing file naming conventions
2. Export clear, well-documented functions
3. Include TypeScript types
4. Add error handling
5. Document in this README
6. Add tests if applicable
7. Update Demo Data Generator UI if needed

## Support

For help with seed data scripts:

1. Review the Demo Data Generator component code
2. Check main documentation in `public/docs/4-DEVELOPER-GUIDE/`
3. See SQL scripts in `scripts/sql/` for comparison
4. Contact the development team

## Related Documentation

- [Demo Data Generation](../../public/docs/4-DEVELOPER-GUIDE/DEMO_DATA.md)
- [Database Schema](../../public/docs/2-ARCHITECTURE/DATA_MODEL.md)
- [SQL Scripts](../sql/README.md)
- [Testing Guide](../../public/docs/4-DEVELOPER-GUIDE/TESTING.md)

