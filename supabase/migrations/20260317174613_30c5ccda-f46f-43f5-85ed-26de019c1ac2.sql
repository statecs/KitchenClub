
-- Auto-confirm bookings on insert
CREATE OR REPLACE FUNCTION public.auto_confirm_booking()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  NEW.status := 'confirmed';
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_auto_confirm_booking
BEFORE INSERT ON public.bookings
FOR EACH ROW
EXECUTE FUNCTION public.auto_confirm_booking();
