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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      agencies: {
        Row: {
          address: string | null
          city: string | null
          created_at: string
          description: string | null
          email: string | null
          id: string
          is_published: boolean
          logo_url: string | null
          name: string
          owner_id: string
          phone: string | null
          postcode: string | null
          slug: string
          updated_at: string
          website: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          created_at?: string
          description?: string | null
          email?: string | null
          id?: string
          is_published?: boolean
          logo_url?: string | null
          name: string
          owner_id: string
          phone?: string | null
          postcode?: string | null
          slug: string
          updated_at?: string
          website?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          created_at?: string
          description?: string | null
          email?: string | null
          id?: string
          is_published?: boolean
          logo_url?: string | null
          name?: string
          owner_id?: string
          phone?: string | null
          postcode?: string | null
          slug?: string
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      agency_members: {
        Row: {
          agency_id: string
          created_at: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          agency_id: string
          created_at?: string
          id?: string
          role?: string
          user_id: string
        }
        Update: {
          agency_id?: string
          created_at?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agency_members_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      compliance_records: {
        Row: {
          created_at: string
          document_url: string | null
          expires_on: string | null
          id: string
          issued_on: string | null
          notes: string | null
          property_id: string
          status: Database["public"]["Enums"]["compliance_status"]
          type: Database["public"]["Enums"]["compliance_type"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          document_url?: string | null
          expires_on?: string | null
          id?: string
          issued_on?: string | null
          notes?: string | null
          property_id: string
          status?: Database["public"]["Enums"]["compliance_status"]
          type: Database["public"]["Enums"]["compliance_type"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          document_url?: string | null
          expires_on?: string | null
          id?: string
          issued_on?: string | null
          notes?: string | null
          property_id?: string
          status?: Database["public"]["Enums"]["compliance_status"]
          type?: Database["public"]["Enums"]["compliance_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "compliance_records_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      deals: {
        Row: {
          agency_id: string | null
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string
          id: string
          lead_id: string | null
          listing_id: string | null
          notes: string | null
          owner_id: string
          stage: Database["public"]["Enums"]["deal_stage"]
          title: string
          updated_at: string
          value: number | null
        }
        Insert: {
          agency_id?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          lead_id?: string | null
          listing_id?: string | null
          notes?: string | null
          owner_id: string
          stage?: Database["public"]["Enums"]["deal_stage"]
          title: string
          updated_at?: string
          value?: number | null
        }
        Update: {
          agency_id?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          lead_id?: string | null
          listing_id?: string | null
          notes?: string | null
          owner_id?: string
          stage?: Database["public"]["Enums"]["deal_stage"]
          title?: string
          updated_at?: string
          value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "deals_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          agency_id: string | null
          created_at: string
          email: string | null
          id: string
          listing_id: string | null
          message: string | null
          name: string
          owner_id: string | null
          phone: string | null
          source: string | null
          status: Database["public"]["Enums"]["lead_status"]
          updated_at: string
        }
        Insert: {
          agency_id?: string | null
          created_at?: string
          email?: string | null
          id?: string
          listing_id?: string | null
          message?: string | null
          name: string
          owner_id?: string | null
          phone?: string | null
          source?: string | null
          status?: Database["public"]["Enums"]["lead_status"]
          updated_at?: string
        }
        Update: {
          agency_id?: string | null
          created_at?: string
          email?: string | null
          id?: string
          listing_id?: string | null
          message?: string | null
          name?: string
          owner_id?: string | null
          phone?: string | null
          source?: string | null
          status?: Database["public"]["Enums"]["lead_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leads_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      listings: {
        Row: {
          address: string | null
          agency_id: string | null
          available_from: string | null
          bathrooms: number | null
          bedrooms: number | null
          bills_included: boolean
          city: string | null
          cover_image: string | null
          created_at: string
          currency: string
          description: string | null
          features: Json
          id: string
          is_hmo: boolean
          listing_type: Database["public"]["Enums"]["listing_type"]
          owner_id: string
          photos: Json
          postcode: string | null
          price: number | null
          property_id: string | null
          slug: string
          status: Database["public"]["Enums"]["listing_status"]
          title: string
          updated_at: string
          view_count: number
        }
        Insert: {
          address?: string | null
          agency_id?: string | null
          available_from?: string | null
          bathrooms?: number | null
          bedrooms?: number | null
          bills_included?: boolean
          city?: string | null
          cover_image?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          features?: Json
          id?: string
          is_hmo?: boolean
          listing_type: Database["public"]["Enums"]["listing_type"]
          owner_id: string
          photos?: Json
          postcode?: string | null
          price?: number | null
          property_id?: string | null
          slug: string
          status?: Database["public"]["Enums"]["listing_status"]
          title: string
          updated_at?: string
          view_count?: number
        }
        Update: {
          address?: string | null
          agency_id?: string | null
          available_from?: string | null
          bathrooms?: number | null
          bedrooms?: number | null
          bills_included?: boolean
          city?: string | null
          cover_image?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          features?: Json
          id?: string
          is_hmo?: boolean
          listing_type?: Database["public"]["Enums"]["listing_type"]
          owner_id?: string
          photos?: Json
          postcode?: string | null
          price?: number | null
          property_id?: string | null
          slug?: string
          status?: Database["public"]["Enums"]["listing_status"]
          title?: string
          updated_at?: string
          view_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "listings_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listings_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          phone: string | null
          primary_role: Database["public"]["Enums"]["app_role"] | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          phone?: string | null
          primary_role?: Database["public"]["Enums"]["app_role"] | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          primary_role?: Database["public"]["Enums"]["app_role"] | null
          updated_at?: string
        }
        Relationships: []
      }
      properties: {
        Row: {
          address: string | null
          agency_id: string | null
          bathrooms: number | null
          bedrooms: number | null
          city: string | null
          created_at: string
          hmo_licence_expires: string | null
          hmo_licence_number: string | null
          id: string
          is_hmo: boolean
          notes: string | null
          owner_id: string
          postcode: string | null
          property_type: string | null
          title: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          agency_id?: string | null
          bathrooms?: number | null
          bedrooms?: number | null
          city?: string | null
          created_at?: string
          hmo_licence_expires?: string | null
          hmo_licence_number?: string | null
          id?: string
          is_hmo?: boolean
          notes?: string | null
          owner_id: string
          postcode?: string | null
          property_type?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          agency_id?: string | null
          bathrooms?: number | null
          bedrooms?: number | null
          city?: string | null
          created_at?: string
          hmo_licence_expires?: string | null
          hmo_licence_number?: string | null
          id?: string
          is_hmo?: boolean
          notes?: string | null
          owner_id?: string
          postcode?: string | null
          property_type?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "properties_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      rooms: {
        Row: {
          created_at: string
          deposit: number | null
          id: string
          name: string
          notes: string | null
          property_id: string
          rent_pcm: number | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          deposit?: number | null
          id?: string
          name: string
          notes?: string | null
          property_id: string
          rent_pcm?: number | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          deposit?: number | null
          id?: string
          name?: string
          notes?: string | null
          property_id?: string
          rent_pcm?: number | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rooms_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_agency_member: {
        Args: { _agency: string; _user: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "agent" | "landlord" | "tenant" | "buyer"
      compliance_status: "valid" | "due_soon" | "expired" | "missing"
      compliance_type:
        | "hmo_licence"
        | "gas_safety"
        | "eicr"
        | "epc"
        | "fire_alarm"
        | "legionella"
        | "pat"
        | "insurance"
        | "deposit_protection"
      deal_stage:
        | "lead"
        | "contacted"
        | "viewing"
        | "offer"
        | "negotiation"
        | "agreed"
        | "completed"
        | "lost"
      lead_status:
        | "new"
        | "contacted"
        | "qualified"
        | "viewing_booked"
        | "offer"
        | "closed_won"
        | "closed_lost"
      listing_status:
        | "draft"
        | "published"
        | "under_offer"
        | "let_agreed"
        | "sold"
        | "withdrawn"
      listing_type: "sale" | "rent" | "room"
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
      app_role: ["admin", "agent", "landlord", "tenant", "buyer"],
      compliance_status: ["valid", "due_soon", "expired", "missing"],
      compliance_type: [
        "hmo_licence",
        "gas_safety",
        "eicr",
        "epc",
        "fire_alarm",
        "legionella",
        "pat",
        "insurance",
        "deposit_protection",
      ],
      deal_stage: [
        "lead",
        "contacted",
        "viewing",
        "offer",
        "negotiation",
        "agreed",
        "completed",
        "lost",
      ],
      lead_status: [
        "new",
        "contacted",
        "qualified",
        "viewing_booked",
        "offer",
        "closed_won",
        "closed_lost",
      ],
      listing_status: [
        "draft",
        "published",
        "under_offer",
        "let_agreed",
        "sold",
        "withdrawn",
      ],
      listing_type: ["sale", "rent", "room"],
    },
  },
} as const
