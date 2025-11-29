import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// US Cities with state and zip
const CITIES = [
  { city: "Phoenix", state: "AZ", zip: "85001" },
  { city: "Scottsdale", state: "AZ", zip: "85250" },
  { city: "Los Angeles", state: "CA", zip: "90001" },
  { city: "San Francisco", state: "CA", zip: "94102" },
  { city: "San Diego", state: "CA", zip: "92101" },
  { city: "Denver", state: "CO", zip: "80201" },
  { city: "Boulder", state: "CO", zip: "80301" },
  { city: "Miami", state: "FL", zip: "33101" },
  { city: "Tampa", state: "FL", zip: "33602" },
  { city: "Orlando", state: "FL", zip: "32801" },
  { city: "Atlanta", state: "GA", zip: "30301" },
  { city: "Chicago", state: "IL", zip: "60601" },
  { city: "Indianapolis", state: "IN", zip: "46201" },
  { city: "Boston", state: "MA", zip: "02101" },
  { city: "Detroit", state: "MI", zip: "48201" },
  { city: "Minneapolis", state: "MN", zip: "55401" },
  { city: "Charlotte", state: "NC", zip: "28201" },
  { city: "Raleigh", state: "NC", zip: "27601" },
  { city: "Las Vegas", state: "NV", zip: "89101" },
  { city: "New York", state: "NY", zip: "10001" },
  { city: "Columbus", state: "OH", zip: "43201" },
  { city: "Portland", state: "OR", zip: "97201" },
  { city: "Philadelphia", state: "PA", zip: "19101" },
  { city: "Pittsburgh", state: "PA", zip: "15201" },
  { city: "Nashville", state: "TN", zip: "37201" },
  { city: "Memphis", state: "TN", zip: "38101" },
  { city: "Austin", state: "TX", zip: "78701" },
  { city: "Dallas", state: "TX", zip: "75201" },
  { city: "Houston", state: "TX", zip: "77001" },
  { city: "San Antonio", state: "TX", zip: "78201" },
  { city: "Seattle", state: "WA", zip: "98101" },
];

const FIRST_NAMES = [
  "James", "Mary", "John", "Patricia", "Robert", "Jennifer", "Michael", "Linda",
  "William", "Barbara", "David", "Elizabeth", "Richard", "Susan", "Joseph", "Jessica",
  "Thomas", "Sarah", "Charles", "Karen", "Christopher", "Nancy", "Daniel", "Lisa",
  "Matthew", "Betty", "Anthony", "Margaret", "Mark", "Sandra", "Donald", "Ashley",
  "Steven", "Kimberly", "Paul", "Emily", "Andrew", "Donna", "Joshua", "Michelle",
  "Kenneth", "Dorothy", "Kevin", "Carol", "Brian", "Amanda", "George", "Melissa",
];

const LAST_NAMES = [
  "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis",
  "Rodriguez", "Martinez", "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson", "Thomas",
  "Taylor", "Moore", "Jackson", "Martin", "Lee", "Perez", "Thompson", "White",
  "Harris", "Sanchez", "Clark", "Ramirez", "Lewis", "Robinson", "Walker", "Young",
  "Allen", "King", "Wright", "Scott", "Torres", "Nguyen", "Hill", "Flores",
];

const INDUSTRIES = [
  { name: "healthcare", clients: 2 },
  { name: "real_estate", clients: 2 },
  { name: "automotive", clients: 1 },
  { name: "legal", clients: 1 },
  { name: "home_services", clients: 1 },
  { name: "technology", clients: 1 },
  { name: "restaurant", clients: 1 },
  { name: "fitness", clients: 1 },
];

const CAMPAIGN_STATUSES = [
  { status: "draft", weight: 0.1 },
  { status: "in_production", weight: 0.2 },
  { status: "mailed", weight: 0.3 },
  { status: "active", weight: 0.3 },
  { status: "completed", weight: 0.1 },
];

const CAMPAIGN_SIZES = ["4x6", "6x9", "6x11", "letter"];
const POSTAGE_TYPES = ["standard", "first_class"];

function randomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateEmail(firstName: string, lastName: string, index: number): string {
  const domains = ["demo.com", "testmail.com", "simulation.test"];
  return `${firstName.toLowerCase()}.${lastName.toLowerCase()}${index}@${randomElement(domains)}`;
}

function generatePhone(): string {
  return `+1555${String(randomInt(1000000, 9999999))}`;
}

function generateRedemptionCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "DEMO-";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

function generatePurlToken(): string {
  return crypto.randomUUID().substring(0, 16);
}

function daysAgo(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString();
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { scale = "medium" } = await req.json();
    const batchId = crypto.randomUUID();
    
    console.log(`Starting demo data generation - Scale: ${scale}, Batch: ${batchId}`);

    const stats = {
      organizations: 0,
      clients: 0,
      contacts: 0,
      campaigns: 0,
      recipients: 0,
      events: 0,
      callSessions: 0,
      giftCards: 0,
    };

    // Phase 1: Create Organizations & Clients
    console.log("Phase 1: Creating organizations and clients...");
    const orgIds: string[] = [];
    const clientIds: string[] = [];

    for (let i = 0; i < 3; i++) {
      const orgId = `demo-org-${batchId}-${i}`;
      const { error: orgError } = await supabaseClient
        .from("organizations")
        .insert({
          id: orgId,
          name: `Demo Agency ${i + 1}`,
          org_type: "agency",
          is_simulated: true,
        });

      if (orgError) throw orgError;
      orgIds.push(orgId);
      stats.organizations++;
    }

    // Create clients across industries
    for (const industry of INDUSTRIES) {
      for (let i = 0; i < industry.clients; i++) {
        const clientId = `demo-client-${batchId}-${industry.name}-${i}`;
        const orgId = randomElement(orgIds);
        
        const { error: clientError } = await supabaseClient
          .from("clients")
          .insert({
            id: clientId,
            org_id: orgId,
            name: `${industry.name.replace("_", " ")} Company ${i + 1}`,
            industry: industry.name,
            timezone: "America/New_York",
            credits: 100000,
          });

        if (clientError) throw clientError;
        clientIds.push(clientId);
        stats.clients++;
      }
    }

    console.log(`Created ${stats.organizations} orgs and ${stats.clients} clients`);

    // Phase 2: Generate Contacts
    console.log("Phase 2: Generating contacts...");
    const contactsPerClient = Math.floor(3000 / clientIds.length);
    const contactIds: string[] = [];

    for (const clientId of clientIds) {
      const contacts = [];
      for (let i = 0; i < contactsPerClient; i++) {
        const city = randomElement(CITIES);
        const firstName = randomElement(FIRST_NAMES);
        const lastName = randomElement(LAST_NAMES);

        contacts.push({
          client_id: clientId,
          customer_code: `CUST-${crypto.randomUUID().substring(0, 8).toUpperCase()}`,
          first_name: firstName,
          last_name: lastName,
          email: generateEmail(firstName, lastName, i),
          phone: generatePhone(),
          address: `${randomInt(100, 9999)} ${randomElement(["Main", "Oak", "Elm", "Maple", "Cedar"])} St`,
          city: city.city,
          state: city.state,
          zip: city.zip,
          country: "US",
          lifecycle_stage: randomElement(["lead", "mql", "sql", "opportunity", "customer"]),
          lead_score: randomInt(0, 100),
          is_simulated: true,
          created_at: daysAgo(randomInt(30, 120)),
        });
      }

      const { data: insertedContacts, error: contactError } = await supabaseClient
        .from("contacts")
        .insert(contacts)
        .select("id");

      if (contactError) throw contactError;
      contactIds.push(...insertedContacts.map((c: any) => c.id));
      stats.contacts += contacts.length;
    }

    console.log(`Generated ${stats.contacts} contacts`);

    // Phase 3: Create Campaigns
    console.log("Phase 3: Creating campaigns...");
    const campaignIds: string[] = [];
    const campaignsToCreate = 20;

    for (let i = 0; i < campaignsToCreate; i++) {
      const clientId = randomElement(clientIds);
      const mailDate = daysAgo(randomInt(7, 90));
      const status = randomElement(CAMPAIGN_STATUSES.flatMap(s => 
        Array(Math.floor(s.weight * 100)).fill(s.status)
      ));

      const { data: campaign, error: campaignError } = await supabaseClient
        .from("campaigns")
        .insert({
          client_id: clientId,
          name: `${randomElement(["Spring", "Summer", "Fall", "Winter"])} Campaign ${i + 1}`,
          status: status,
          size: randomElement(CAMPAIGN_SIZES),
          postage: randomElement(POSTAGE_TYPES),
          mail_date: mailDate,
          simulation_batch_id: batchId,
          created_at: daysAgo(randomInt(95, 150)),
        })
        .select("id, client_id, status, mail_date")
        .single();

      if (campaignError) throw campaignError;
      campaignIds.push(campaign.id);
      stats.campaigns++;

      // Create contact list and recipients for non-draft campaigns
      if (status !== "draft") {
        const recipientCount = randomInt(50, 200);
        
        // Create contact list
        const { data: contactList, error: listError } = await supabaseClient
          .from("contact_lists")
          .insert({
            client_id: campaign.client_id,
            name: `Campaign ${i + 1} Recipients`,
            list_type: "static",
            contact_count: recipientCount,
          })
          .select("id")
          .single();

        if (listError) throw listError;

        // Get random contacts for this client
        const { data: clientContacts } = await supabaseClient
          .from("contacts")
          .select("id")
          .eq("client_id", campaign.client_id)
          .limit(recipientCount);

        if (clientContacts && clientContacts.length > 0) {
          // Add to contact list
          await supabaseClient
            .from("contact_list_members")
            .insert(clientContacts.map(c => ({
              list_id: contactList.id,
              contact_id: c.id,
            })));

          // Update campaign with contact list
          await supabaseClient
            .from("campaigns")
            .update({ contact_list_id: contactList.id })
            .eq("id", campaign.id);

          // Create recipients
          const recipients = clientContacts.map(contact => ({
            campaign_id: campaign.id,
            contact_id: contact.id,
            redemption_code: generateRedemptionCode(),
            purl_token: generatePurlToken(),
            status: randomInt(1, 100) > 2 ? "delivered" : "bounced",
            is_simulated: true,
            delivered_at: status === "mailed" || status === "active" || status === "completed" 
              ? daysAgo(randomInt(3, 10))
              : null,
          }));

          const { data: insertedRecipients } = await supabaseClient
            .from("recipients")
            .insert(recipients)
            .select("id, campaign_id, status, delivered_at");

          if (insertedRecipients) {
            stats.recipients += insertedRecipients.length;

            // Phase 4 & 5: Generate Events for delivered recipients
            if (status === "active" || status === "completed") {
              const events = [];
              const performanceLevel = Math.random();
              const responseRate = performanceLevel > 0.7 ? 0.20 : performanceLevel > 0.4 ? 0.10 : 0.03;

              for (const recipient of insertedRecipients) {
                if (recipient.status === "delivered" && recipient.delivered_at) {
                  const deliveryDate = new Date(recipient.delivered_at);

                  // IMB delivered event
                  events.push({
                    campaign_id: campaign.id,
                    recipient_id: recipient.id,
                    event_type: "imb_delivered",
                    occurred_at: recipient.delivered_at,
                  });

                  // Engagement events (based on response rate)
                  if (Math.random() < responseRate) {
                    const engagementDelay = randomInt(1, 14);
                    const engagementDate = new Date(deliveryDate);
                    engagementDate.setDate(engagementDate.getDate() + engagementDelay);

                    // QR scan or PURL visit
                    const eventType = Math.random() > 0.5 ? "qr_scanned" : "purl_viewed";
                    events.push({
                      campaign_id: campaign.id,
                      recipient_id: recipient.id,
                      event_type: eventType,
                      occurred_at: engagementDate.toISOString(),
                    });

                    // Form submission (30% of engaged users)
                    if (Math.random() < 0.3) {
                      const formDate = new Date(engagementDate);
                      formDate.setMinutes(formDate.getMinutes() + randomInt(5, 120));
                      events.push({
                        campaign_id: campaign.id,
                        recipient_id: recipient.id,
                        event_type: "form_submitted",
                        occurred_at: formDate.toISOString(),
                      });
                    }
                  }
                }
              }

              if (events.length > 0) {
                await supabaseClient.from("events").insert(events);
                stats.events += events.length;
              }

              // Phase 7: Generate Call Sessions (for some campaigns)
              if (Math.random() < 0.4) {
                const callCount = Math.floor(insertedRecipients.length * 0.15);
                const callSessions = [];

                for (let j = 0; j < callCount; j++) {
                  const recipient = randomElement(insertedRecipients.filter(r => r.status === "delivered"));
                  if (!recipient) continue;

                  const callStartDate = new Date(recipient.delivered_at);
                  callStartDate.setDate(callStartDate.getDate() + randomInt(2, 20));

                  const callStatus = randomElement([
                    "completed", "completed", "completed", "completed", "completed", "completed",
                    "no-answer", "no-answer",
                    "busy",
                    "failed",
                  ]);

                  const duration = callStatus === "completed" ? randomInt(30, 900) : null;

                  callSessions.push({
                    campaign_id: campaign.id,
                    recipient_id: recipient.id,
                    caller_phone: generatePhone(),
                    call_status: callStatus,
                    match_status: "matched",
                    call_started_at: callStartDate.toISOString(),
                    call_answered_at: callStatus === "completed" ? callStartDate.toISOString() : null,
                    call_ended_at: duration ? new Date(callStartDate.getTime() + duration * 1000).toISOString() : null,
                    call_duration_seconds: duration,
                  });
                }

                if (callSessions.length > 0) {
                  await supabaseClient.from("call_sessions").insert(callSessions);
                  stats.callSessions += callSessions.length;
                }
              }
            }
          }
        }
      }
    }

    console.log(`Created ${stats.campaigns} campaigns with ${stats.recipients} recipients`);
    console.log(`Generated ${stats.events} events and ${stats.callSessions} call sessions`);

    return new Response(
      JSON.stringify({
        success: true,
        batchId,
        stats,
        message: "Demo data generated successfully",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error("Error generating demo data:", error);
    return new Response(
      JSON.stringify({
        error: error.message,
        details: error.toString(),
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});

