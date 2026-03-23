
-- When a booking is created, block all other slots at the same date and time
CREATE OR REPLACE FUNCTION public.block_sibling_slots()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_date date;
  v_start time;
  v_end time;
BEGIN
  -- Only act on non-cancelled bookings
  IF NEW.status = 'cancelled' THEN
    RETURN NEW;
  END IF;

  -- Get the slot's date and time
  SELECT date, start_time, end_time INTO v_date, v_start, v_end
  FROM public.available_slots
  WHERE id = NEW.slot_id;

  -- Block all other slots on the same date with overlapping time
  UPDATE public.available_slots
  SET is_blocked = true
  WHERE date = v_date
    AND start_time = v_start
    AND end_time = v_end
    AND id != NEW.slot_id;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_block_sibling_slots
AFTER INSERT ON public.bookings
FOR EACH ROW
EXECUTE FUNCTION public.block_sibling_slots();

-- Also: when a booking is cancelled, unblock siblings IF no other active booking exists at that time
CREATE OR REPLACE FUNCTION public.unblock_sibling_slots()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_date date;
  v_start time;
  v_end time;
  v_active_count integer;
BEGIN
  -- Only act when status changes to cancelled
  IF NEW.status != 'cancelled' OR OLD.status = 'cancelled' THEN
    RETURN NEW;
  END IF;

  SELECT date, start_time, end_time INTO v_date, v_start, v_end
  FROM public.available_slots
  WHERE id = NEW.slot_id;

  -- Check if any other active bookings exist for this exact time
  SELECT COUNT(*) INTO v_active_count
  FROM public.bookings b
  JOIN public.available_slots s ON s.id = b.slot_id
  WHERE s.date = v_date
    AND s.start_time = v_start
    AND s.end_time = v_end
    AND b.status != 'cancelled'
    AND b.id != NEW.id;

  -- If no active bookings remain, unblock the siblings
  IF v_active_count = 0 THEN
    UPDATE public.available_slots
    SET is_blocked = false
    WHERE date = v_date
      AND start_time = v_start
      AND end_time = v_end
      AND id != NEW.slot_id;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_unblock_sibling_slots
AFTER UPDATE ON public.bookings
FOR EACH ROW
EXECUTE FUNCTION public.unblock_sibling_slots();
