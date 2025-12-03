import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://uibvxhwhkatjcwghnzpu.supabase.co";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_SERVICE_KEY) {
  console.error("Error: SUPABASE_SERVICE_ROLE_KEY environment variable is required");
  console.log("\nTo run this script:");
  console.log("1. Get your service role key from Supabase Dashboard > Settings > API");
  console.log("2. Run: $env:SUPABASE_SERVICE_ROLE_KEY='your-key-here'; npx tsx scripts/add-credits-autocare.ts");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function addCredits() {
  console.log("Finding AutoCare Plus Warranty client...");
  
  // Find the client
  const { data: client, error: clientError } = await supabase
    .from("clients")
    .select("id, name")
    .ilike("name", "%AutoCare Plus Warranty%")
    .single();
  
  if (clientError || !client) {
    console.error("Error finding client:", clientError?.message || "Client not found");
    process.exit(1);
  }
  
  console.log(`Found client: ${client.name} (${client.id})`);
  
  // Add $1,000 credits using the atomic function
  console.log("\nAdding $1,000 in credits...");
  
  const { data: result, error: allocError } = await supabase.rpc("allocate_credits_atomic", {
    p_entity_type: "client",
    p_entity_id: client.id,
    p_amount: 1000.00,
    p_from_account_id: null,
    p_description: "Manual credit addition - $1,000 promotional credits",
    p_user_id: null
  });
  
  if (allocError) {
    console.error("Error allocating credits:", allocError.message);
    process.exit(1);
  }
  
  console.log("\n✅ Success!", result);
  console.log(`\nBalance before: $${result.balance_before}`);
  console.log(`Balance after: $${result.balance_after}`);
  console.log(`Amount added: $${result.amount}`);
  
  // Verify the balance
  const { data: account } = await supabase
    .from("credit_accounts")
    .select("*")
    .eq("entity_type", "client")
    .eq("entity_id", client.id)
    .single();
  
  if (account) {
    console.log(`\nVerified balance: $${account.balance}`);
  }
}

addCredits().catch(console.error);

