import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Sample documentation pages to seed
    const docs = [
      // Getting Started
      {
        category: "getting-started",
        title: "Quickstart Guide",
        slug: "quickstart",
        order_index: 1,
        content: `# Quickstart Guide

Welcome to the Mobul ACE Platform! This guide will help you get started quickly.

## Getting Started

1. **Create your first campaign** - Navigate to Campaigns and click "Create Campaign"
2. **Upload your audience** - Import contacts via CSV or manual entry
3. **Design your mailer** - Use our template builder to create stunning direct mail
4. **Launch your campaign** - Review, approve, and send

## Next Steps

- Explore gift card rewards
- Set up call tracking
- Configure landing pages
- Integrate with your CRM`,
        search_keywords: ["quickstart", "getting started", "guide", "tutorial"],
        is_admin_only: false,
      },
      {
        category: "getting-started",
        title: "Platform Overview",
        slug: "overview",
        order_index: 2,
        content: `# Platform Overview

Mobul ACE is a comprehensive direct mail marketing platform with integrated gift card rewards, call tracking, and landing pages.

## Core Features

- **Campaign Management** - Create and manage direct mail campaigns
- **Gift Card Rewards** - Integrated gift card provisioning and tracking
- **Call Tracking** - Track campaign responses with dedicated phone numbers
- **Landing Pages** - Build personalized landing pages (PURLs)
- **Analytics** - Comprehensive campaign analytics and reporting

## User Roles

- **Admin** - Full platform access
- **Agency Owner** - Manage multiple clients
- **Company Owner** - Manage company campaigns
- **Call Center** - Gift card redemption only`,
        search_keywords: ["overview", "introduction", "features"],
        is_admin_only: false,
      },
      
      // Features
      {
        category: "features",
        title: "Campaigns Overview",
        slug: "campaigns",
        order_index: 1,
        content: `# Campaigns Overview

Learn how to create and manage campaigns in the ACE Platform.

## Creating a Campaign

1. Navigate to the Campaigns page
2. Click "Create Campaign"
3. Fill in campaign details
4. Select your audience
5. Design your mailer
6. Configure call tracking and landing pages
7. Add gift card rewards (optional)

## Campaign Statuses

- **Draft** - Campaign is being created
- **Pending** - Awaiting approval
- **Active** - Campaign is live
- **Completed** - Campaign has finished

## Best Practices

- Test with a small audience first
- Use clear call-to-actions
- Track all response channels
- Monitor analytics regularly`,
        search_keywords: ["campaigns", "create campaign", "campaign management"],
        is_admin_only: false,
      },
      {
        category: "features",
        title: "Gift Card System",
        slug: "gift-cards",
        order_index: 2,
        content: `# Gift Card System

The gift card system allows you to offer rewards to campaign recipients.

## Gift Card Pools

Pools organize gift cards by brand and client. Each pool has:
- Brand (Amazon, Visa, etc.)
- Face value
- Cost per card
- Available inventory

## Provisioning

Gift cards can be provisioned:
- Automatically when conditions are met
- Manually by call center agents
- Via API integration

## Tracking

All gift card redemptions are tracked with:
- Timestamp
- Recipient information
- Campaign association
- Delivery method (SMS/Email)`,
        search_keywords: ["gift cards", "rewards", "provisioning"],
        is_admin_only: false,
      },
      
      // API Reference
      {
        category: "api-reference",
        title: "REST API",
        slug: "rest-api",
        order_index: 1,
        content: `# REST API Reference

The ACE Platform provides a comprehensive REST API for integration.

## Authentication

All API requests require authentication using an API key:

\`\`\`
Authorization: Bearer YOUR_API_KEY
\`\`\`

Generate API keys in Settings → API & Integrations.

## Endpoints

### Create Campaign

\`\`\`http
POST /api/campaigns
Content-Type: application/json

{
  "name": "Campaign Name",
  "client_id": "client_id_here"
}
\`\`\`

### Get Campaign

\`\`\`http
GET /api/campaigns/:id
\`\`\`

### Provision Gift Card

\`\`\`http
POST /api/gift-cards/provision
Content-Type: application/json

{
  "recipient_phone": "+15125551234",
  "pool_id": "pool_id_here"
}
\`\`\``,
        search_keywords: ["api", "rest", "endpoints", "integration"],
        is_admin_only: false,
      },
      
      // Developer Guide
      {
        category: "developer-guide",
        title: "Development Setup",
        slug: "setup",
        order_index: 1,
        content: `# Development Setup

Set up your local development environment for the ACE Platform.

## Prerequisites

- Node.js 18+
- npm or yarn
- Git

## Installation

\`\`\`bash
git clone <repository>
cd ace-platform
npm install
npm run dev
\`\`\`

## Environment Variables

Create a \`.env\` file with the following:

\`\`\`
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
\`\`\`

## Database Setup

The platform uses Supabase for backend services. Database migrations are located in \`supabase/migrations/\`.

## Edge Functions

Edge functions are located in \`supabase/functions/\`. Deploy using:

\`\`\`bash
supabase functions deploy
\`\`\``,
        search_keywords: ["development", "setup", "installation", "local"],
        is_admin_only: true,
      },
      {
        category: "developer-guide",
        title: "Architecture",
        slug: "architecture",
        order_index: 2,
        content: `# Architecture

The ACE Platform is built on modern web technologies.

## Tech Stack

- **Frontend**: React + TypeScript + Vite
- **Backend**: Supabase (PostgreSQL + Edge Functions)
- **UI**: Tailwind CSS + shadcn/ui
- **State Management**: React Query
- **Routing**: React Router

## Project Structure

\`\`\`
src/
├── components/     # Reusable UI components
├── pages/         # Page components
├── hooks/         # Custom React hooks
├── lib/           # Utility functions
├── contexts/      # React contexts
└── integrations/  # External service integrations

supabase/
├── functions/     # Edge functions
└── migrations/    # Database migrations
\`\`\`

## Key Concepts

- Multi-tenant architecture
- Role-based access control
- Real-time updates via Supabase
- Serverless edge functions`,
        search_keywords: ["architecture", "structure", "tech stack"],
        is_admin_only: true,
      },
    ];

    // Insert documentation pages
    const { error } = await supabase
      .from("documentation_pages")
      .upsert(
        docs.map(doc => ({
          ...doc,
          file_path: `docs/${doc.category}/${doc.slug}.md`,
        })),
        { onConflict: "slug" }
      );

    if (error) throw error;

    return new Response(
      JSON.stringify({ success: true, seeded: docs.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error seeding documentation:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
