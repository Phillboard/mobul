-- Fix security warnings for newly created tables

-- Add system insert policy for gift_card_api_purchases
CREATE POLICY "System can create API purchase records"
  ON gift_card_api_purchases
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Add admin management policy for gift_card_api_purchases
CREATE POLICY "Admins can manage API purchases"
  ON gift_card_api_purchases
  FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));