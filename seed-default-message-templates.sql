-- Default Message Templates
-- Run this after creating a client to seed default templates

DO $$
DECLARE
  client_rec RECORD;
BEGIN
  -- For each client, create default message templates
  FOR client_rec IN SELECT id, name FROM clients LOOP
    
    -- SMS Templates
    INSERT INTO message_templates (client_id, template_type, name, body_template, is_default)
    VALUES
      -- Standard SMS
      (client_rec.id, 'sms', 'Standard Gift Card SMS', 
       'Hi {{first_name}}! Your ${{card_value}} {{brand_name}} gift card code is: {{card_code}}. Expires {{expiration_date}}.', 
       true),
      
      -- Premium SMS with emoji
      (client_rec.id, 'sms', 'Premium Gift Card SMS',
       '🎁 Congratulations {{first_name}}! Here''s your ${{card_value}} {{brand_name}} gift card: {{card_code}}. Thank you for your business!',
       false),
      
      -- Simple code-only SMS
      (client_rec.id, 'sms', 'Simple Code SMS',
       'Your reward code: {{card_code}}',
       false),
      
      -- Professional SMS
      (client_rec.id, 'sms', 'Professional SMS',
       'Dear {{first_name}} {{last_name}}, your {{brand_name}} gift card (${{card_value}}) is ready. Code: {{card_code}}. Valid until {{expiration_date}}.',
       false)
    ON CONFLICT (client_id, name, template_type) DO NOTHING;
    
    -- Email Templates
    INSERT INTO message_templates (client_id, template_type, name, subject, body_template, is_default)
    VALUES
      -- Standard Email
      (client_rec.id, 'email', 'Standard Gift Card Email',
       'Your ${{card_value}} {{brand_name}} Gift Card',
       '<html><body><h1>Hi {{first_name}}!</h1><p>Your gift card code is: <strong>{{card_code}}</strong></p></body></html>',
       true),
      
      -- Premium HTML Email
      (client_rec.id, 'email', 'Premium Gift Card Email',
       '🎁 Your {{brand_name}} Gift Card Reward',
       '<!DOCTYPE html><html><head><style>body{font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;}.card{background:linear-gradient(135deg,#667eea,#764ba2);color:white;padding:30px;border-radius:10px;text-align:center;}.code{font-size:32px;font-weight:bold;letter-spacing:3px;margin:20px 0;}</style></head><body><div class="card"><h1>Congratulations {{first_name}}!</h1><p>You''ve received a ${{card_value}} {{brand_name}} gift card</p><div class="code">{{card_code}}</div><p>Expires: {{expiration_date}}</p></div></body></html>',
       false)
    ON CONFLICT (client_id, name, template_type) DO NOTHING;
    
    RAISE NOTICE 'Created default templates for client: %', client_rec.name;
  END LOOP;
END $$;

SELECT 'Default message templates seeded successfully' as status;

