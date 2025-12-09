# Development Environment Setup

## Overview

This guide walks through setting up a local development environment for the Mobul ACE Platform. The platform uses React, TypeScript, Vite, and Supabase.

---

## Prerequisites

### Required Software

**Node.js & npm:**
- Node.js 18+ (LTS recommended)
- npm 9+ or yarn 1.22+

```bash
# Verify installation
node --version  # Should be v18+ 
npm --version   # Should be v9+
```

**Git:**
- Git 2.30+

```bash
git --version
```

**Code Editor:**
- VS Code (recommended)
- WebStorm
- Or your preferred editor

### Recommended VS Code Extensions

- **ESLint** - Linting
- **Prettier** - Code formatting
- **Tailwind CSS IntelliSense** - Tailwind autocomplete
- **PostgreSQL** - Database queries
- **Thunder Client** - API testing

---

## Project Structure

```
mobul-ace-platform/
├── docs/                          # Documentation markdown files
├── public/                        # Static assets
├── src/
│   ├── assets/                   # Images, fonts, etc.
│   ├── components/               # React components
│   │   ├── ui/                  # shadcn/ui components
│   │   ├── layout/              # Layout components
│   │   ├── campaigns/           # Campaign components
│   │   ├── contacts/            # Contact components
│   │   └── ...                  # Feature-specific folders
│   ├── contexts/                # React contexts
│   ├── hooks/                   # Custom React hooks
│   ├── integrations/
│   │   └── supabase/           # Supabase client & types
│   ├── lib/                    # Utility functions
│   ├── pages/                  # Page components (routes)
│   ├── types/                  # TypeScript type definitions
│   ├── App.tsx                 # Main app component
│   ├── main.tsx                # Entry point
│   └── index.css               # Global styles
├── supabase/
│   ├── functions/              # Edge Functions
│   ├── migrations/             # Database migrations
│   └── config.toml             # Supabase config
├── .env.local                  # Local environment variables
├── package.json                # Dependencies
├── tsconfig.json               # TypeScript config
├── vite.config.ts              # Vite config
└── tailwind.config.ts          # Tailwind CSS config
```

---

## Initial Setup

### 1. Clone Repository

```bash
git clone https://github.com/youraccount/mobul-ace-platform.git
cd mobul-ace-platform
```

### 2. Install Dependencies

```bash
npm install
```

This installs all packages listed in `package.json`:
- React 18
- TypeScript
- Vite
- TanStack Query (React Query)
- TanStack Table
- Supabase JS Client
- shadcn/ui components
- Tailwind CSS
- And more...

### 3. Environment Variables

Create `.env.local` file in project root:

```bash
# Supabase
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_SUPABASE_PROJECT_ID=your-project-id

# Optional: External Services
VITE_POSTGRID_API_KEY=your-postgrid-key
VITE_TWILIO_ACCOUNT_SID=your-twilio-sid
VITE_TWILIO_AUTH_TOKEN=your-twilio-token
VITE_TWILIO_PHONE_NUMBER=+1234567890
```

**Important:** Never commit `.env.local` to version control!

### 4. Start Development Server

```bash
npm run dev
```

Open browser to `http://localhost:5173`

---

## Supabase Setup

### Local Supabase (Recommended)

Use Supabase CLI for local development:

**Install Supabase CLI:**
```bash
npm install -g supabase
```

**Initialize Supabase:**
```bash
supabase init
```

**Start Local Supabase:**
```bash
supabase start
```

This starts:
- PostgreSQL database (port 54322)
- Supabase Studio (port 54323)
- Edge Functions runtime (port 54321)
- Storage API
- Auth API

**Link to Remote Project:**
```bash
supabase link --project-ref your-project-id
```

**Pull Remote Schema:**
```bash
supabase db pull
```

### Cloud Supabase

Alternatively, connect directly to cloud Supabase:

1. Create project at [supabase.com](https://supabase.com)
2. Copy project URL and anon key
3. Add to `.env.local`
4. Run migrations manually via Supabase Studio

---

## Database Migrations

### Creating Migrations

```bash
# Create new migration file
supabase migration new add_campaign_notes_field

# Edit the generated file in supabase/migrations/
```

Example migration:
```sql
-- supabase/migrations/20240115000000_add_campaign_notes_field.sql

ALTER TABLE campaigns 
ADD COLUMN notes TEXT;

CREATE INDEX idx_campaigns_notes ON campaigns USING gin(to_tsvector('english', notes));
```

### Running Migrations

**Local:**
```bash
supabase db reset  # Reset and run all migrations
# OR
supabase migration up  # Run pending migrations only
```

**Cloud:**
```bash
supabase db push  # Push local migrations to cloud
```

### Migration Best Practices

1. **Idempotent** - Migrations should be rerunnable
2. **Forward-only** - Never edit existing migrations
3. **Atomic** - Each migration is a single transaction
4. **Tested** - Test migrations locally before pushing
5. **Documented** - Add comments explaining changes

---

## Edge Functions Development

### Creating Edge Functions

```bash
supabase functions new send-gift-card-sms
```

This creates `supabase/functions/send-gift-card-sms/index.ts`

### Edge Function Template

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  try {
    // Parse request
    const { giftCardId, recipientPhone } = await req.json()
    
    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )
    
    // Fetch gift card
    const { data: giftCard, error } = await supabase
      .from('gift_cards')
      .select('*')
      .eq('id', giftCardId)
      .single()
    
    if (error) throw error
    
    // Send SMS via Twilio
    // ... implementation
    
    return new Response(
      JSON.stringify({ success: true }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
```

### Testing Edge Functions Locally

```bash
# Serve all functions
supabase functions serve

# Serve specific function
supabase functions serve send-gift-card-sms --env-file .env.local

# Test with curl
curl -X POST http://localhost:54321/functions/v1/send-gift-card-sms \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -d '{"giftCardId": "123", "recipientPhone": "+1234567890"}'
```

### Deploying Edge Functions

```bash
# Deploy all functions
supabase functions deploy

# Deploy specific function
supabase functions deploy send-gift-card-sms

# Set secrets
supabase secrets set TWILIO_AUTH_TOKEN=your-token
```

---

## Type Generation

### Generate TypeScript Types from Database

Supabase automatically generates TypeScript types:

```bash
# Generate types
supabase gen types typescript --local > src/integrations/supabase/types.ts

# OR from cloud
supabase gen types typescript --project-id your-project-id > src/integrations/supabase/types.ts
```

### Using Generated Types

```typescript
import { Database } from '@/integrations/supabase/types'

type Campaign = Database['public']['Tables']['campaigns']['Row']
type CampaignInsert = Database['public']['Tables']['campaigns']['Insert']
type CampaignUpdate = Database['public']['Tables']['campaigns']['Update']

// Type-safe database queries
const { data } = await supabase
  .from('campaigns')
  .select('*')
  .returns<Campaign[]>()
```

---

## Development Workflow

### Standard Development Flow

1. **Create feature branch**
   ```bash
   git checkout -b feature/campaign-notes
   ```

2. **Create migration (if needed)**
   ```bash
   supabase migration new add_campaign_notes
   # Edit migration file
   supabase db reset  # Test locally
   ```

3. **Update types**
   ```bash
   supabase gen types typescript --local > src/integrations/supabase/types.ts
   ```

4. **Develop feature**
   ```bash
   npm run dev  # Hot reload enabled
   ```

5. **Test changes**
   - Manual testing in browser
   - Unit tests: `npm run test`
   - E2E tests (if applicable)

6. **Commit changes**
   ```bash
   git add .
   git commit -m "feat: Add campaign notes field and UI"
   ```

7. **Push to remote**
   ```bash
   git push origin feature/campaign-notes
   ```

8. **Create pull request**
   - Code review
   - CI/CD runs tests
   - Merge to main

9. **Deploy**
   ```bash
   supabase db push  # Push migrations
   supabase functions deploy  # Deploy edge functions
   npm run build  # Build frontend
   ```

---

## Testing

### Running Tests

```bash
# Run all tests
npm run test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

### Writing Tests

Example component test:

```typescript
import { render, screen } from '@testing-library/react'
import { CampaignCard } from '@/components/campaigns/CampaignCard'

describe('CampaignCard', () => {
  it('renders campaign name', () => {
    render(<CampaignCard campaign={{
      id: '1',
      name: 'Q1 Roofing Campaign',
      status: 'active',
    }} />)
    
    expect(screen.getByText('Q1 Roofing Campaign')).toBeInTheDocument()
  })
  
  it('displays status badge', () => {
    render(<CampaignCard campaign={{
      id: '1',
      name: 'Q1 Roofing Campaign',
      status: 'active',
    }} />)
    
    expect(screen.getByText('Active')).toBeInTheDocument()
  })
})
```

---

## Debugging

### Browser DevTools

**React DevTools:**
- Install React DevTools extension
- Inspect component tree
- View props and state
- Profile performance

**Network Tab:**
- Monitor API requests
- Check request/response payloads
- Inspect headers
- Measure load times

**Console:**
- View console.log output
- Inspect errors
- Run JavaScript in context

### VS Code Debugging

Create `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "chrome",
      "request": "launch",
      "name": "Launch Chrome",
      "url": "http://localhost:5173",
      "webRoot": "${workspaceFolder}/src"
    }
  ]
}
```

Set breakpoints in VS Code, press F5 to debug.

### Database Debugging

**Supabase Studio:**
- Open `http://localhost:54323` (local)
- Table editor for viewing data
- SQL editor for running queries
- Database logs

**PostgreSQL Client:**
```bash
psql postgresql://postgres:postgres@localhost:54322/postgres

-- View tables
\dt

-- Query data
SELECT * FROM campaigns LIMIT 10;

-- Explain query plan
EXPLAIN ANALYZE SELECT * FROM campaigns WHERE client_id = '...';
```

---

## Common Issues

### Port Already in Use

If port 5173 is taken:

```bash
# Kill process on port 5173
lsof -ti:5173 | xargs kill -9

# OR use different port
npm run dev -- --port 3000
```

### Supabase Connection Errors

- Verify `.env.local` has correct credentials
- Check Supabase project is running
- Test connection with curl:
  ```bash
  curl https://your-project.supabase.co/rest/v1/campaigns \
    -H "apikey: your-anon-key"
  ```

### Type Errors

Regenerate types after database changes:

```bash
supabase gen types typescript --local > src/integrations/supabase/types.ts
```

---

## Best Practices

1. **Use TypeScript** - Catch errors at compile time
2. **Run migrations locally first** - Test before pushing to cloud
3. **Keep .env.local secret** - Never commit credentials
4. **Use TanStack Query** - For server state management
5. **Follow naming conventions** - camelCase for JS/TS, snake_case for SQL
6. **Write tests** - Test critical paths
7. **Use ESLint** - Maintain code quality
8. **Format with Prettier** - Consistent code style
9. **Commit frequently** - Small, atomic commits
10. **Document complex logic** - Future you will thank you

---

## Related Documentation

- [Edge Functions](/docs/developer-guide/edge-functions)
- [Database Operations](/docs/developer-guide/database)
- [Event Tracking](/docs/developer-guide/event-tracking)
- [Architecture Overview](/docs/architecture/architecture-overview)
