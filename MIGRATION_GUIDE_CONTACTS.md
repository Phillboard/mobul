# Contacts System - Quick Migration Guide

## 🚀 Deployment Steps

### 1. Database Migrations

Run migrations in order:

```bash
# Apply unique code constraints
psql -d your_database -f supabase/migrations/20251130000001_add_unique_code_constraints.sql

# Backfill existing data
psql -d your_database -f supabase/migrations/20251130000002_backfill_unique_codes.sql
```

Or use Supabase CLI:

```bash
supabase db push
```

### 2. Deploy Edge Function

```bash
supabase functions deploy import-contacts
```

### 3. Verify Installation

```sql
-- Check that all contacts have codes
SELECT COUNT(*) FROM contacts WHERE customer_code IS NULL;
-- Should return: 0

-- Check unique constraint exists
SELECT constraint_name 
FROM information_schema.table_constraints 
WHERE table_name = 'contacts' 
  AND constraint_type = 'UNIQUE';
-- Should show: contacts_unique_code_per_client_key

-- Test code generation function
SELECT generate_customer_code();
-- Should return: UC-XXXXX-XXXXX format
```

### 4. Frontend Deployment

No additional steps needed - changes are part of the main build.

```bash
npm run build
# or
npm run dev  # for local testing
```

---

## 🧪 Testing Checklist

### Pre-Deployment Tests

- [ ] Run database migrations on staging environment
- [ ] Verify all existing contacts have codes
- [ ] Test unique constraint (try inserting duplicate)
- [ ] Test code generation function
- [ ] Deploy edge function to staging

### Post-Deployment Tests

#### Import Testing

- [ ] Download sample CSV template
- [ ] Import CSV with unique_code column
- [ ] Import CSV without unique_code (should auto-generate)
- [ ] Import CSV with duplicates (should warn)
- [ ] Import large file (1000+ rows)
- [ ] Verify custom fields are preserved
- [ ] Check error handling for invalid data

#### Export Testing

- [ ] Export all contacts
- [ ] Export filtered contacts
- [ ] Export as CSV (all formats)
- [ ] Export as JSON
- [ ] Re-import exported CSV
- [ ] Verify data integrity after round-trip

#### UI Testing

- [ ] Contacts page loads with new buttons
- [ ] Import dialog opens and functions
- [ ] Export dropdown shows options
- [ ] Sample CSV downloads correctly
- [ ] Progress indicators work
- [ ] Error messages are clear

---

## 🔄 Rollback Plan

If issues occur, follow these steps:

### 1. Disable Import Feature

```typescript
// In src/pages/Contacts.tsx
// Comment out the import button temporarily
/*
<Button onClick={() => setImportDialogOpen(true)}>
  <Upload className="h-4 w-4 mr-2" />
  Import CSV
</Button>
*/
```

### 2. Revert Database Changes (if needed)

```sql
-- Remove NOT NULL constraint
ALTER TABLE contacts ALTER COLUMN customer_code DROP NOT NULL;

-- Remove format check
ALTER TABLE contacts DROP CONSTRAINT IF EXISTS customer_code_format_check;

-- Remove unique constraint per client (restore global)
DROP INDEX IF EXISTS contacts_unique_code_per_client_key;
CREATE UNIQUE INDEX contacts_customer_code_key ON contacts(customer_code);
```

### 3. Remove Edge Function

```bash
supabase functions delete import-contacts
```

---

## 📊 Monitoring

### Key Metrics to Watch

```sql
-- Import success rate
SELECT 
  DATE(created_at) as date,
  COUNT(*) as imports,
  COUNT(DISTINCT client_id) as clients
FROM contacts
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- Code generation usage
SELECT COUNT(*) 
FROM contacts 
WHERE customer_code LIKE 'UC-%'
  AND created_at > NOW() - INTERVAL '7 days';

-- Failed imports (check logs)
SELECT * FROM contact_code_audit 
WHERE reason LIKE '%error%' 
  OR reason LIKE '%fail%'
ORDER BY changed_at DESC
LIMIT 20;
```

### Performance Monitoring

```sql
-- Check for slow queries
SELECT query, mean_exec_time, calls
FROM pg_stat_statements
WHERE query LIKE '%contacts%'
ORDER BY mean_exec_time DESC
LIMIT 10;

-- Check index usage
SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read, idx_tup_fetch
FROM pg_stat_user_indexes
WHERE tablename = 'contacts'
ORDER BY idx_scan DESC;
```

---

## 🐛 Common Issues & Solutions

### Issue: "customer_code cannot be null"

**Cause:** Migration not run or incomplete backfill

**Solution:**
```sql
-- Manually backfill missing codes
UPDATE contacts 
SET customer_code = generate_customer_code() 
WHERE customer_code IS NULL;
```

### Issue: "duplicate key value violates unique constraint"

**Cause:** Trying to import duplicate code for same client

**Solution:**
- User should review CSV for duplicates
- Or use auto-generate option in import dialog

### Issue: Import seems stuck

**Cause:** Large file processing

**Solution:**
- Check browser console for errors
- Check Supabase edge function logs
- Consider splitting large files into batches

### Issue: Export button disabled

**Cause:** No contacts loaded or permissions issue

**Solution:**
- Check that contacts query is successful
- Verify user has access to current client
- Check browser console for errors

---

## 📈 Optimization Tips

### For Large Imports

1. **Batch Processing:** Import in chunks of 1000 rows
2. **Disable Triggers:** Temporarily for bulk imports (admin only)
3. **Use COPY:** For very large imports (database direct)

```sql
-- For admin use only - bulk import
COPY contacts(client_id, customer_code, first_name, last_name, email)
FROM '/path/to/file.csv'
WITH (FORMAT csv, HEADER true);
```

### For Performance

```sql
-- Add covering index if needed
CREATE INDEX idx_contacts_client_code_email 
ON contacts(client_id, customer_code, email);

-- Analyze table after large import
ANALYZE contacts;
```

---

## 📞 Support Checklist

When users report issues:

1. [ ] Check browser console for errors
2. [ ] Check Supabase logs
3. [ ] Verify user permissions
4. [ ] Test with sample CSV
5. [ ] Check database constraints
6. [ ] Review recent code changes (audit log)
7. [ ] Test in incognito/private mode

---

## ✅ Sign-off Checklist

Before marking as complete:

- [ ] All database migrations applied successfully
- [ ] Edge function deployed and tested
- [ ] Sample CSV template downloads correctly
- [ ] Import works with test data
- [ ] Export produces valid CSV
- [ ] No console errors in browser
- [ ] No database constraint violations
- [ ] Documentation is complete
- [ ] Team has been notified of new features
- [ ] Users have been provided training materials

---

## 📅 Future Maintenance

### Monthly Tasks

- [ ] Review import error logs
- [ ] Check for orphaned codes
- [ ] Analyze usage statistics
- [ ] Update sample CSV if fields change
- [ ] Review performance metrics

### Quarterly Tasks

- [ ] Audit code uniqueness across all clients
- [ ] Review and optimize database indexes
- [ ] Update documentation with new learnings
- [ ] Consider user feedback for improvements

---

*Last Updated: November 30, 2025*

