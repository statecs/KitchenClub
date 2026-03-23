
-- Add stripe_session_id to bookings
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS stripe_session_id text;

-- Drop trigger first, then function
DROP TRIGGER IF EXISTS trg_auto_confirm_booking ON public.bookings;
DROP FUNCTION IF EXISTS public.auto_confirm_booking() CASCADE;
