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
      {
        category: "getting-started",
        title: "Quickstart Guide",
        slug: "quickstart",
        order_index: 1,
        content: `# Quickstart Guide

Welcome to the Mobul ACE Platform! This guide will help you get started quickly.

## Getting Started

1. Create your first campaign
2. Upload your audience
3. Design your mailer
4. Launch your campaign

## Next Steps

Once you've completed these steps, you can explore more advanced features.`,
        search_keywords: ["quickstart", "getting started", "guide", "tutorial"],
        is_admin_only: false,
      },
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

## Campaign Statuses

- **Draft**: Campaign is being created
- **Pending**: Awaiting approval
- **Active**: Campaign is live
- **Completed**: Campaign has finished`,
        search_keywords: ["campaigns", "create campaign", "campaign management"],
        is_admin_only: false,
      },
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
\`\`\``,
        search_keywords: ["api", "rest", "endpoints", "integration"],
        is_admin_only: false,
      },
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
\`\`\``,
        search_keywords: ["development", "setup", "installation", "local"],
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
