-- Migration: Support Check-out for Phase 1.5
-- Adds checkout columns to existing checkins table

ALTER TABLE public.checkins
ADD COLUMN checkout_at TIMESTAMPTZ,
ADD COLUMN checkout_location GEOGRAPHY(Point, 4326),
ADD COLUMN checkout_valid BOOLEAN;

-- Function to verify check-out against the framework location
CREATE OR REPLACE FUNCTION verify_checkout(
  p_checkin_id UUID,
  p_latitude DOUBLE PRECISION,
  p_longitude DOUBLE PRECISION,
  p_geofence_radius_m INTEGER DEFAULT 100
)
RETURNS TABLE (
  is_valid BOOLEAN,
  distance_m NUMERIC
) AS $$
DECLARE
  v_framework_location geography;
  v_checkout_point geography;
  v_distance NUMERIC;
  v_is_valid BOOLEAN;
  v_match_id UUID;
BEGIN
  -- Validate checkin belongs to the current user (professional)
  SELECT c.match_id INTO v_match_id
  FROM checkins c
  JOIN matches m ON m.id = c.match_id
  WHERE c.id = p_checkin_id
    AND m.professional_id = get_professional_id()
    AND c.checkout_at IS NULL;

  IF v_match_id IS NULL THEN
    RAISE EXCEPTION 'Checkin not found, already checked out, or access denied';
  END IF;

  -- Get framework location
  SELECT c.location INTO v_framework_location
  FROM matches m
  JOIN children c ON c.id = m.child_id
  WHERE m.id = v_match_id;

  -- Create point from provided coordinates
  v_checkout_point := ST_SetSRID(ST_MakePoint(p_longitude, p_latitude), 4326)::geography;

  -- Calculate distance
  v_distance := ROUND(ST_Distance(v_checkout_point, v_framework_location), 1);

  -- Validate within geofence
  v_is_valid := v_distance <= p_geofence_radius_m;

  -- Update checkin record
  UPDATE checkins 
  SET checkout_at = now(),
      checkout_location = v_checkout_point,
      checkout_valid = v_is_valid
  WHERE id = p_checkin_id;

  RETURN QUERY SELECT v_is_valid, v_distance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
