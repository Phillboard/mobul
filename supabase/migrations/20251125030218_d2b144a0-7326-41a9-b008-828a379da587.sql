-- Fix search_path for security functions
CREATE OR REPLACE FUNCTION calculate_engagement_score(
  p_last_activity_date TIMESTAMPTZ,
  p_total_interactions INTEGER,
  p_redemptions_count INTEGER,
  p_email_opens_count INTEGER
) RETURNS INTEGER AS $$
DECLARE
  v_recency INTEGER := 0;
  v_frequency INTEGER := 0;
  v_campaign_engagement INTEGER := 0;
  v_days_since_activity INTEGER;
BEGIN
  -- Calculate recency score (0-40 points)
  IF p_last_activity_date IS NOT NULL THEN
    v_days_since_activity := EXTRACT(DAY FROM now() - p_last_activity_date)::INTEGER;
    v_recency := CASE
      WHEN v_days_since_activity < 7 THEN 40
      WHEN v_days_since_activity < 30 THEN 30
      WHEN v_days_since_activity < 90 THEN 15
      WHEN v_days_since_activity < 180 THEN 5
      ELSE 0
    END;
  END IF;

  -- Calculate frequency score (0-30 points)
  v_frequency := LEAST(FLOOR(LOG(COALESCE(p_total_interactions, 0) + 1) * 10), 30)::INTEGER;

  -- Calculate campaign engagement score (0-30 points)
  v_campaign_engagement := LEAST(
    (COALESCE(p_redemptions_count, 0) * 10) + (COALESCE(p_email_opens_count, 0) * 2),
    30
  )::INTEGER;

  RETURN v_recency + v_frequency + v_campaign_engagement;
END;
$$ LANGUAGE plpgsql IMMUTABLE SET search_path = public;

CREATE OR REPLACE FUNCTION update_contact_engagement_score()
RETURNS TRIGGER AS $$
BEGIN
  NEW.engagement_score := calculate_engagement_score(
    NEW.last_activity_date,
    NEW.total_interactions,
    NEW.redemptions_count,
    NEW.email_opens_count
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;