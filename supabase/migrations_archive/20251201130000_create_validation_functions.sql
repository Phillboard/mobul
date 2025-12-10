-- Validation functions for campaign creation

-- Function: Validate campaign can be created with available inventory
CREATE OR REPLACE FUNCTION validate_campaign_inventory(
  p_client_id UUID,
  p_conditions JSONB
)
RETURNS TABLE (
  is_valid BOOLEAN,
  validation_errors JSONB,
  inventory_summary JSONB
) AS $$
DECLARE
  v_condition JSONB;
  v_brand_id UUID;
  v_card_value NUMERIC;
  v_available_count INTEGER;
  v_errors JSONB := '[]'::JSONB;
  v_summary JSONB := '[]'::JSONB;
  v_is_valid BOOLEAN := TRUE;
BEGIN
  -- Validate each condition has available inventory
  FOR v_condition IN SELECT * FROM jsonb_array_elements(p_conditions)
  LOOP
    v_brand_id := (v_condition->>'brand_id')::UUID;
    v_card_value := (v_condition->>'card_value')::NUMERIC;

    IF v_brand_id IS NULL OR v_card_value IS NULL THEN
      CONTINUE;
    END IF;

    -- Get available count
    SELECT COALESCE(SUM(available_cards), 0) INTO v_available_count
    FROM gift_card_pools
    WHERE client_id = p_client_id
      AND brand_id = v_brand_id
      AND card_value = v_card_value
      AND is_active = TRUE;

    -- Add to summary
    v_summary := v_summary || jsonb_build_object(
      'condition_name', v_condition->>'condition_name',
      'brand_id', v_brand_id,
      'card_value', v_card_value,
      'available_count', v_available_count,
      'status', CASE 
        WHEN v_available_count = 0 THEN 'unavailable'
        WHEN v_available_count < 10 THEN 'low'
        ELSE 'available'
      END
    );

    -- Add error if no cards available
    IF v_available_count = 0 THEN
      v_is_valid := FALSE;
      v_errors := v_errors || jsonb_build_object(
        'condition', v_condition->>'condition_name',
        'error', 'No gift cards available for this brand and denomination',
        'brand_id', v_brand_id,
        'card_value', v_card_value
      );
    END IF;
  END LOOP;

  RETURN QUERY SELECT v_is_valid, v_errors, v_summary;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Pre-validate recipient phone numbers
CREATE OR REPLACE FUNCTION validate_phone_number(p_phone TEXT)
RETURNS TABLE (
  is_valid BOOLEAN,
  formatted_phone TEXT,
  error_message TEXT
) AS $$
DECLARE
  v_cleaned TEXT;
  v_is_valid BOOLEAN := FALSE;
  v_formatted TEXT;
  v_error TEXT := NULL;
BEGIN
  -- Remove all non-digit characters
  v_cleaned := regexp_replace(p_phone, '[^0-9]', '', 'g');

  -- Check if it's a valid US phone number (10 digits) or international (11-15 digits)
  IF LENGTH(v_cleaned) = 10 THEN
    v_is_valid := TRUE;
    v_formatted := '+1' || v_cleaned;
  ELSIF LENGTH(v_cleaned) = 11 AND LEFT(v_cleaned, 1) = '1' THEN
    v_is_valid := TRUE;
    v_formatted := '+' || v_cleaned;
  ELSIF LENGTH(v_cleaned) BETWEEN 11 AND 15 THEN
    v_is_valid := TRUE;
    v_formatted := '+' || v_cleaned;
  ELSE
    v_is_valid := FALSE;
    v_error := 'Invalid phone number length';
  END IF;

  -- Additional validation: Check for obviously invalid patterns
  IF v_is_valid AND v_cleaned ~ '^0+$' THEN
    v_is_valid := FALSE;
    v_error := 'Phone number cannot be all zeros';
  END IF;

  IF v_is_valid AND v_cleaned ~ '^1+$' THEN
    v_is_valid := FALSE;
    v_error := 'Phone number cannot be all ones';
  END IF;

  RETURN QUERY SELECT v_is_valid, v_formatted, v_error;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function: Validate email address format
CREATE OR REPLACE FUNCTION validate_email(p_email TEXT)
RETURNS TABLE (
  is_valid BOOLEAN,
  normalized_email TEXT,
  error_message TEXT
) AS $$
DECLARE
  v_normalized TEXT;
  v_is_valid BOOLEAN;
  v_error TEXT := NULL;
BEGIN
  -- Normalize: lowercase and trim
  v_normalized := LOWER(TRIM(p_email));

  -- Basic email regex validation
  v_is_valid := v_normalized ~* '^[a-zA-Z0-9.!#$%&''*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$';

  IF NOT v_is_valid THEN
    v_error := 'Invalid email format';
  END IF;

  -- Check for common typos
  IF v_is_valid AND v_normalized ~* '@(gmial|gmai|yahooo|outlok|hotmial)\.com$' THEN
    v_error := 'Possible typo in email domain';
    v_is_valid := FALSE;
  END IF;

  RETURN QUERY SELECT v_is_valid, v_normalized, v_error;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function: Bulk validate contact data before import
CREATE OR REPLACE FUNCTION validate_contact_batch(
  p_contacts JSONB
)
RETURNS TABLE (
  row_number INTEGER,
  is_valid BOOLEAN,
  errors JSONB,
  normalized_data JSONB
) AS $$
DECLARE
  v_contact JSONB;
  v_row_num INTEGER := 0;
  v_errors JSONB;
  v_normalized JSONB;
  v_email_check RECORD;
  v_phone_check RECORD;
BEGIN
  FOR v_contact IN SELECT * FROM jsonb_array_elements(p_contacts)
  LOOP
    v_row_num := v_row_num + 1;
    v_errors := '[]'::JSONB;
    v_normalized := v_contact;

    -- Validate email if provided
    IF v_contact->>'email' IS NOT NULL AND v_contact->>'email' != '' THEN
      SELECT * INTO v_email_check FROM validate_email(v_contact->>'email');
      
      IF NOT v_email_check.is_valid THEN
        v_errors := v_errors || jsonb_build_object(
          'field', 'email',
          'error', v_email_check.error_message
        );
      ELSE
        v_normalized := jsonb_set(v_normalized, '{email}', to_jsonb(v_email_check.normalized_email));
      END IF;
    END IF;

    -- Validate phone if provided
    IF v_contact->>'phone' IS NOT NULL AND v_contact->>'phone' != '' THEN
      SELECT * INTO v_phone_check FROM validate_phone_number(v_contact->>'phone');
      
      IF NOT v_phone_check.is_valid THEN
        v_errors := v_errors || jsonb_build_object(
          'field', 'phone',
          'error', v_phone_check.error_message
        );
      ELSE
        v_normalized := jsonb_set(v_normalized, '{phone}', to_jsonb(v_phone_check.formatted_phone));
      END IF;
    END IF;

    -- Check required fields
    IF v_contact->>'email' IS NULL OR v_contact->>'email' = '' THEN
      v_errors := v_errors || jsonb_build_object(
        'field', 'email',
        'error', 'Email is required'
      );
    END IF;

    RETURN QUERY SELECT 
      v_row_num,
      jsonb_array_length(v_errors) = 0,
      v_errors,
      v_normalized;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION validate_campaign_inventory IS 'Validates that sufficient gift card inventory exists for campaign conditions';
COMMENT ON FUNCTION validate_phone_number IS 'Validates and formats phone numbers for E.164 standard';
COMMENT ON FUNCTION validate_email IS 'Validates and normalizes email addresses';
COMMENT ON FUNCTION validate_contact_batch IS 'Bulk validates contact data before import with error reporting';

GRANT EXECUTE ON FUNCTION validate_campaign_inventory TO authenticated;
GRANT EXECUTE ON FUNCTION validate_phone_number TO authenticated;
GRANT EXECUTE ON FUNCTION validate_email TO authenticated;
GRANT EXECUTE ON FUNCTION validate_contact_batch TO authenticated;

