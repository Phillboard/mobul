-- Drop the unique constraint on contacts (client_id, phone)
-- Multiple contacts within the same client should be allowed to have the same phone number

ALTER TABLE contacts 
DROP CONSTRAINT IF EXISTS contacts_client_id_phone_key;
