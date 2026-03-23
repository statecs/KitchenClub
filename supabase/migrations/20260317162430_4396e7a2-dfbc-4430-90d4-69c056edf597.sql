
-- Create enum for booking status
CREATE TYPE public.booking_status AS ENUM ('pending', 'confirmed', 'cancelled');

-- Create enum for app roles
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- User roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function for role checking
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- RLS for user_roles
CREATE POLICY "Admins can view all roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage roles"
  ON public.user_roles FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Party themes table
CREATE TABLE public.party_themes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  emoji TEXT NOT NULL DEFAULT '🎂',
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  long_description TEXT,
  min_age INTEGER,
  allergy_notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.party_themes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active themes"
  ON public.party_themes FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage themes"
  ON public.party_themes FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Available time slots
CREATE TABLE public.available_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  theme_id UUID REFERENCES public.party_themes(id) ON DELETE SET NULL,
  max_bookings INTEGER NOT NULL DEFAULT 1,
  is_blocked BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.available_slots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view available slots"
  ON public.available_slots FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage slots"
  ON public.available_slots FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Bookings table
CREATE TABLE public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_id UUID REFERENCES public.available_slots(id) ON DELETE RESTRICT NOT NULL,
  theme_id UUID REFERENCES public.party_themes(id) ON DELETE RESTRICT NOT NULL,
  status booking_status NOT NULL DEFAULT 'pending',
  -- Contact details
  contact_name TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  contact_phone TEXT,
  -- Birthday child
  child_name TEXT NOT NULL,
  child_age INTEGER NOT NULL,
  -- Message
  message TEXT,
  -- Pricing
  num_children INTEGER NOT NULL DEFAULT 12,
  extra_children INTEGER NOT NULL DEFAULT 0,
  hotdog_count INTEGER NOT NULL DEFAULT 0,
  candy_bag_count INTEGER NOT NULL DEFAULT 0,
  base_price_per_child NUMERIC(10,2) NOT NULL DEFAULT 465,
  extra_child_price NUMERIC(10,2) NOT NULL DEFAULT 465,
  hotdog_price NUMERIC(10,2) NOT NULL DEFAULT 25,
  candy_bag_price NUMERIC(10,2) NOT NULL DEFAULT 35,
  total_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- Public can insert bookings (no auth required for booking)
CREATE POLICY "Anyone can create bookings"
  ON public.bookings FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can view all bookings"
  ON public.bookings FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update bookings"
  ON public.bookings FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete bookings"
  ON public.bookings FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Booking count function for slot availability
CREATE OR REPLACE FUNCTION public.get_slot_booking_count(slot_uuid UUID)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(COUNT(*)::INTEGER, 0)
  FROM public.bookings
  WHERE slot_id = slot_uuid AND status != 'cancelled'
$$;

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_party_themes_updated_at
  BEFORE UPDATE ON public.party_themes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_bookings_updated_at
  BEFORE UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default themes
INSERT INTO public.party_themes (emoji, name, description, sort_order) VALUES
  ('🍬', 'Godisverkstad', 'Kalaset där vi bakar och lagar eget godis, så roligt och jättegott!', 1),
  ('🧁', 'Cupcake Fest', 'Baka och dekorera egna cupcakes, festligt, roligt och minnesvärt.', 2),
  ('🍔', 'Hamburgarkockar', 'Laga hamburgare, pommes och smarriga tillbehör. Roligt och festligt!', 3);
