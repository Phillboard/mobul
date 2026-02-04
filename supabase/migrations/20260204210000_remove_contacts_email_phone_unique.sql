-- Remove unique constraints on email and phone from contacts table
-- Only the customer_code should be unique per client (enforced by contacts_unique_code_per_client_key index)
-- This allows multiple contacts with the same email or phone within a client

-- Drop the email unique constraint
ALTER TABLE "public"."contacts" 
DROP CONSTRAINT IF EXISTS "contacts_client_id_email_key";

-- Drop the phone unique constraint  
ALTER TABLE "public"."contacts"
DROP CONSTRAINT IF EXISTS "contacts_client_id_phone_key";

-- Add a comment explaining the uniqueness strategy
COMMENT ON TABLE "public"."contacts" IS 'Contacts are uniquely identified by customer_code per client. Email and phone are not required to be unique as the same person may have multiple contact records or multiple people may share contact info.';
