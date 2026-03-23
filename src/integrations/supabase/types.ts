export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      available_slots: {
        Row: {
          created_at: string
          date: string
          end_time: string
          id: string
          is_blocked: boolean
          max_bookings: number
          start_time: string
          theme_id: string | null
        }
        Insert: {
          created_at?: string
          date: string
          end_time: string
          id?: string
          is_blocked?: boolean
          max_bookings?: number
          start_time: string
          theme_id?: string | null
        }
        Update: {
          created_at?: string
          date?: string
          end_time?: string
          id?: string
          is_blocked?: boolean
          max_bookings?: number
          start_time?: string
          theme_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "available_slots_theme_id_fkey"
            columns: ["theme_id"]
            isOneToOne: false
            referencedRelation: "party_themes"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          base_price_per_child: number
          candy_bag_count: number
          candy_bag_price: number
          child_age: number
          child_name: string
          contact_email: string
          contact_name: string
          contact_phone: string | null
          created_at: string
          extra_child_price: number
          extra_children: number
          hotdog_count: number
          hotdog_price: number
          id: string
          is_archived: boolean
          message: string | null
          num_children: number
          slot_id: string
          status: Database["public"]["Enums"]["booking_status"]
          stripe_session_id: string | null
          theme_id: string
          total_price: number
          updated_at: string
        }
        Insert: {
          base_price_per_child?: number
          candy_bag_count?: number
          candy_bag_price?: number
          child_age: number
          child_name: string
          contact_email: string
          contact_name: string
          contact_phone?: string | null
          created_at?: string
          extra_child_price?: number
          extra_children?: number
          hotdog_count?: number
          hotdog_price?: number
          id?: string
          is_archived?: boolean
          message?: string | null
          num_children?: number
          slot_id: string
          status?: Database["public"]["Enums"]["booking_status"]
          stripe_session_id?: string | null
          theme_id: string
          total_price?: number
          updated_at?: string
        }
        Update: {
          base_price_per_child?: number
          candy_bag_count?: number
          candy_bag_price?: number
          child_age?: number
          child_name?: string
          contact_email?: string
          contact_name?: string
          contact_phone?: string | null
          created_at?: string
          extra_child_price?: number
          extra_children?: number
          hotdog_count?: number
          hotdog_price?: number
          id?: string
          is_archived?: boolean
          message?: string | null
          num_children?: number
          slot_id?: string
          status?: Database["public"]["Enums"]["booking_status"]
          stripe_session_id?: string | null
          theme_id?: string
          total_price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_slot_id_fkey"
            columns: ["slot_id"]
            isOneToOne: false
            referencedRelation: "available_slots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_theme_id_fkey"
            columns: ["theme_id"]
            isOneToOne: false
            referencedRelation: "party_themes"
            referencedColumns: ["id"]
          },
        ]
      }
      party_themes: {
        Row: {
          addons: string[] | null
          allergy_notes: string | null
          cancellation_text: string | null
          created_at: string
          description: string
          details_text: string | null
          emoji: string
          id: string
          includes: string[] | null
          is_active: boolean
          long_description: string | null
          min_age: number | null
          name: string
          price_text: string | null
          sort_order: number
          updated_at: string
        }
        Insert: {
          addons?: string[] | null
          allergy_notes?: string | null
          cancellation_text?: string | null
          created_at?: string
          description: string
          details_text?: string | null
          emoji?: string
          id?: string
          includes?: string[] | null
          is_active?: boolean
          long_description?: string | null
          min_age?: number | null
          name: string
          price_text?: string | null
          sort_order?: number
          updated_at?: string
        }
        Update: {
          addons?: string[] | null
          allergy_notes?: string | null
          cancellation_text?: string | null
          created_at?: string
          description?: string
          details_text?: string | null
          emoji?: string
          id?: string
          includes?: string[] | null
          is_active?: boolean
          long_description?: string | null
          min_age?: number | null
          name?: string
          price_text?: string | null
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_slot_booking_count: { Args: { slot_uuid: string }; Returns: number }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
      booking_status: "pending" | "confirmed" | "cancelled"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user"],
      booking_status: ["pending", "confirmed", "cancelled"],
    },
  },
} as const
