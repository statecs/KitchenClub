export interface Theme {
  id: string;
  emoji: string;
  name: string;
  description: string;
  long_description: string | null;
  min_age: number | null;
  allergy_notes: string | null;
  is_active: boolean;
  sort_order: number;
  includes: string[];
  addons: string[];
  price_text: string | null;
  details_text: string | null;
  cancellation_text: string | null;
  created_at: string;
  updated_at: string;
}

export interface Slot {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  theme_id: string | null;
  max_bookings: number;
  is_blocked: boolean;
  created_at: string;
  booking_count?: number;
  party_themes?: Theme | null;
}

export interface Booking {
  id: string;
  slot_id: string;
  theme_id: string;
  status: 'pending' | 'confirmed' | 'cancelled';
  contact_name: string;
  contact_email: string;
  contact_phone: string | null;
  child_name: string;
  child_age: number;
  message: string | null;
  num_children: number;
  extra_children: number;
  hotdog_count: number;
  candy_bag_count: number;
  base_price_per_child: number;
  extra_child_price: number;
  hotdog_price: number;
  candy_bag_price: number;
  total_price: number;
  stripe_session_id: string | null;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
  available_slots?: Slot | null;
  party_themes?: Theme | null;
}
