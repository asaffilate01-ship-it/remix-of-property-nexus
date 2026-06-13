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
          commercial_module_enabled: boolean
          cover_image: string | null
          created_at: string
          description: string | null
          email: string | null
          hmo_module_enabled: boolean
          id: string
          is_published: boolean
          lettings_module_enabled: boolean
          logo_url: string | null
          name: string
          owner_id: string
          phone: string | null
          postcode: string | null
          sales_module_enabled: boolean
          slug: string
          updated_at: string
          website: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          commercial_module_enabled?: boolean
          cover_image?: string | null
          created_at?: string
          description?: string | null
          email?: string | null
          hmo_module_enabled?: boolean
          id?: string
          is_published?: boolean
          lettings_module_enabled?: boolean
          logo_url?: string | null
          name: string
          owner_id: string
          phone?: string | null
          postcode?: string | null
          sales_module_enabled?: boolean
          slug: string
          updated_at?: string
          website?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          commercial_module_enabled?: boolean
          cover_image?: string | null
          created_at?: string
          description?: string | null
          email?: string | null
          hmo_module_enabled?: boolean
          id?: string
          is_published?: boolean
          lettings_module_enabled?: boolean
          logo_url?: string | null
          name?: string
          owner_id?: string
          phone?: string | null
          postcode?: string | null
          sales_module_enabled?: boolean
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
          agency_id: string | null
          created_at: string
          document_url: string | null
          expires_on: string | null
          id: string
          issued_on: string | null
          notes: string | null
          property_id: string | null
          reference: string | null
          status: Database["public"]["Enums"]["compliance_status"]
          tenancy_id: string | null
          type: Database["public"]["Enums"]["compliance_type"]
          updated_at: string
        }
        Insert: {
          agency_id?: string | null
          created_at?: string
          document_url?: string | null
          expires_on?: string | null
          id?: string
          issued_on?: string | null
          notes?: string | null
          property_id?: string | null
          reference?: string | null
          status?: Database["public"]["Enums"]["compliance_status"]
          tenancy_id?: string | null
          type: Database["public"]["Enums"]["compliance_type"]
          updated_at?: string
        }
        Update: {
          agency_id?: string | null
          created_at?: string
          document_url?: string | null
          expires_on?: string | null
          id?: string
          issued_on?: string | null
          notes?: string | null
          property_id?: string | null
          reference?: string | null
          status?: Database["public"]["Enums"]["compliance_status"]
          tenancy_id?: string | null
          type?: Database["public"]["Enums"]["compliance_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "compliance_records_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compliance_records_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compliance_records_tenancy_id_fkey"
            columns: ["tenancy_id"]
            isOneToOne: false
            referencedRelation: "tenancies"
            referencedColumns: ["id"]
          },
        ]
      }
      compliance_rules: {
        Row: {
          authority: string | null
          description: string | null
          label: string
          renewal_months: number | null
          scope: string
          type: Database["public"]["Enums"]["compliance_type"]
        }
        Insert: {
          authority?: string | null
          description?: string | null
          label: string
          renewal_months?: number | null
          scope: string
          type: Database["public"]["Enums"]["compliance_type"]
        }
        Update: {
          authority?: string | null
          description?: string | null
          label?: string
          renewal_months?: number | null
          scope?: string
          type?: Database["public"]["Enums"]["compliance_type"]
        }
        Relationships: []
      }
      contacts: {
        Row: {
          address: string | null
          agency_id: string
          certifications: Json | null
          company_name: string | null
          contact_type: Database["public"]["Enums"]["contact_type"]
          created_at: string
          email: string | null
          full_name: string
          hourly_rate: number | null
          id: string
          insurance_expires_at: string | null
          is_active: boolean
          is_preferred: boolean
          notes: string | null
          phone: string | null
          postcode: string | null
          rating: number | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          agency_id: string
          certifications?: Json | null
          company_name?: string | null
          contact_type: Database["public"]["Enums"]["contact_type"]
          created_at?: string
          email?: string | null
          full_name: string
          hourly_rate?: number | null
          id?: string
          insurance_expires_at?: string | null
          is_active?: boolean
          is_preferred?: boolean
          notes?: string | null
          phone?: string | null
          postcode?: string | null
          rating?: number | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          agency_id?: string
          certifications?: Json | null
          company_name?: string | null
          contact_type?: Database["public"]["Enums"]["contact_type"]
          created_at?: string
          email?: string | null
          full_name?: string
          hourly_rate?: number | null
          id?: string
          insurance_expires_at?: string | null
          is_active?: boolean
          is_preferred?: boolean
          notes?: string | null
          phone?: string | null
          postcode?: string | null
          rating?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contacts_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
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
      job_media: {
        Row: {
          accuracy_m: number | null
          agency_id: string
          altitude_m: number | null
          caption: string | null
          captured_at: string | null
          created_at: string
          duration_s: number | null
          file_size: number | null
          has_exif_gps: boolean
          has_overlay: boolean
          height: number | null
          id: string
          kind: Database["public"]["Enums"]["job_media_kind"]
          latitude: number | null
          longitude: number | null
          mime_type: string | null
          property_id: string | null
          source: string
          storage_path: string
          thumbnail_path: string | null
          uploader_id: string | null
          width: number | null
          work_order_id: string | null
        }
        Insert: {
          accuracy_m?: number | null
          agency_id: string
          altitude_m?: number | null
          caption?: string | null
          captured_at?: string | null
          created_at?: string
          duration_s?: number | null
          file_size?: number | null
          has_exif_gps?: boolean
          has_overlay?: boolean
          height?: number | null
          id?: string
          kind?: Database["public"]["Enums"]["job_media_kind"]
          latitude?: number | null
          longitude?: number | null
          mime_type?: string | null
          property_id?: string | null
          source?: string
          storage_path: string
          thumbnail_path?: string | null
          uploader_id?: string | null
          width?: number | null
          work_order_id?: string | null
        }
        Update: {
          accuracy_m?: number | null
          agency_id?: string
          altitude_m?: number | null
          caption?: string | null
          captured_at?: string | null
          created_at?: string
          duration_s?: number | null
          file_size?: number | null
          has_exif_gps?: boolean
          has_overlay?: boolean
          height?: number | null
          id?: string
          kind?: Database["public"]["Enums"]["job_media_kind"]
          latitude?: number | null
          longitude?: number | null
          mime_type?: string | null
          property_id?: string | null
          source?: string
          storage_path?: string
          thumbnail_path?: string | null
          uploader_id?: string | null
          width?: number | null
          work_order_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "job_media_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_media_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_media_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
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
          business_rates_pa: number | null
          city: string | null
          council_tax_band: string | null
          cover_image: string | null
          created_at: string
          currency: string
          description: string | null
          epc_rating: string | null
          features: Json
          floor_area_sqft: number | null
          furnished: string | null
          id: string
          is_hmo: boolean
          latitude: number | null
          lease_term_months: number | null
          listing_type: Database["public"]["Enums"]["listing_type"]
          longitude: number | null
          marketplace_publish: boolean
          owner_id: string
          photos: Json
          postcode: string | null
          price: number | null
          price_qualifier: Database["public"]["Enums"]["price_qualifier"] | null
          property_id: string | null
          purpose: Database["public"]["Enums"]["listing_purpose"]
          receptions: number | null
          service_charge_pa: number | null
          slug: string
          status: Database["public"]["Enums"]["listing_status"]
          tenure: Database["public"]["Enums"]["tenure_type"] | null
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
          business_rates_pa?: number | null
          city?: string | null
          council_tax_band?: string | null
          cover_image?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          epc_rating?: string | null
          features?: Json
          floor_area_sqft?: number | null
          furnished?: string | null
          id?: string
          is_hmo?: boolean
          latitude?: number | null
          lease_term_months?: number | null
          listing_type: Database["public"]["Enums"]["listing_type"]
          longitude?: number | null
          marketplace_publish?: boolean
          owner_id: string
          photos?: Json
          postcode?: string | null
          price?: number | null
          price_qualifier?:
            | Database["public"]["Enums"]["price_qualifier"]
            | null
          property_id?: string | null
          purpose?: Database["public"]["Enums"]["listing_purpose"]
          receptions?: number | null
          service_charge_pa?: number | null
          slug: string
          status?: Database["public"]["Enums"]["listing_status"]
          tenure?: Database["public"]["Enums"]["tenure_type"] | null
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
          business_rates_pa?: number | null
          city?: string | null
          council_tax_band?: string | null
          cover_image?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          epc_rating?: string | null
          features?: Json
          floor_area_sqft?: number | null
          furnished?: string | null
          id?: string
          is_hmo?: boolean
          latitude?: number | null
          lease_term_months?: number | null
          listing_type?: Database["public"]["Enums"]["listing_type"]
          longitude?: number | null
          marketplace_publish?: boolean
          owner_id?: string
          photos?: Json
          postcode?: string | null
          price?: number | null
          price_qualifier?:
            | Database["public"]["Enums"]["price_qualifier"]
            | null
          property_id?: string | null
          purpose?: Database["public"]["Enums"]["listing_purpose"]
          receptions?: number | null
          service_charge_pa?: number | null
          slug?: string
          status?: Database["public"]["Enums"]["listing_status"]
          tenure?: Database["public"]["Enums"]["tenure_type"] | null
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
          listing_purpose: Database["public"]["Enums"]["listing_purpose"]
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
          listing_purpose?: Database["public"]["Enums"]["listing_purpose"]
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
          listing_purpose?: Database["public"]["Enums"]["listing_purpose"]
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
      rent_schedule: {
        Row: {
          amount: number
          created_at: string
          due_date: string
          id: string
          notes: string | null
          paid_amount: number | null
          paid_at: string | null
          period_end: string
          period_start: string
          status: Database["public"]["Enums"]["rent_status"]
          tenancy_id: string
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          due_date: string
          id?: string
          notes?: string | null
          paid_amount?: number | null
          paid_at?: string | null
          period_end: string
          period_start: string
          status?: Database["public"]["Enums"]["rent_status"]
          tenancy_id: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          due_date?: string
          id?: string
          notes?: string | null
          paid_amount?: number | null
          paid_at?: string | null
          period_end?: string
          period_start?: string
          status?: Database["public"]["Enums"]["rent_status"]
          tenancy_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rent_schedule_tenancy_id_fkey"
            columns: ["tenancy_id"]
            isOneToOne: false
            referencedRelation: "tenancies"
            referencedColumns: ["id"]
          },
        ]
      }
      rooms: {
        Row: {
          available_from: string | null
          bills_included: boolean | null
          created_at: string
          deposit: number | null
          description: string | null
          en_suite: boolean | null
          id: string
          name: string
          notes: string | null
          photos: Json | null
          property_id: string
          rent_pcm: number | null
          size_sqm: number | null
          status: string
          updated_at: string
        }
        Insert: {
          available_from?: string | null
          bills_included?: boolean | null
          created_at?: string
          deposit?: number | null
          description?: string | null
          en_suite?: boolean | null
          id?: string
          name: string
          notes?: string | null
          photos?: Json | null
          property_id: string
          rent_pcm?: number | null
          size_sqm?: number | null
          status?: string
          updated_at?: string
        }
        Update: {
          available_from?: string | null
          bills_included?: boolean | null
          created_at?: string
          deposit?: number | null
          description?: string | null
          en_suite?: boolean | null
          id?: string
          name?: string
          notes?: string | null
          photos?: Json | null
          property_id?: string
          rent_pcm?: number | null
          size_sqm?: number | null
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
      sales_deals: {
        Row: {
          agency_id: string
          agreed_price: number | null
          buyer_conveyancer_id: string | null
          buyer_lead_id: string | null
          chain_position: string | null
          completion_at: string | null
          created_at: string
          enquiries_returned_at: string | null
          exchange_at: string | null
          fall_through_reason: string | null
          id: string
          listing_id: string | null
          memo_of_sale_at: string | null
          mortgage_offer_at: string | null
          notes: string | null
          offer_amount: number | null
          property_id: string | null
          searches_ordered_at: string | null
          seller_conveyancer_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          agency_id: string
          agreed_price?: number | null
          buyer_conveyancer_id?: string | null
          buyer_lead_id?: string | null
          chain_position?: string | null
          completion_at?: string | null
          created_at?: string
          enquiries_returned_at?: string | null
          exchange_at?: string | null
          fall_through_reason?: string | null
          id?: string
          listing_id?: string | null
          memo_of_sale_at?: string | null
          mortgage_offer_at?: string | null
          notes?: string | null
          offer_amount?: number | null
          property_id?: string | null
          searches_ordered_at?: string | null
          seller_conveyancer_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          agency_id?: string
          agreed_price?: number | null
          buyer_conveyancer_id?: string | null
          buyer_lead_id?: string | null
          chain_position?: string | null
          completion_at?: string | null
          created_at?: string
          enquiries_returned_at?: string | null
          exchange_at?: string | null
          fall_through_reason?: string | null
          id?: string
          listing_id?: string | null
          memo_of_sale_at?: string | null
          mortgage_offer_at?: string | null
          notes?: string | null
          offer_amount?: number | null
          property_id?: string | null
          searches_ordered_at?: string | null
          seller_conveyancer_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_deals_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_deals_buyer_conveyancer_id_fkey"
            columns: ["buyer_conveyancer_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_deals_buyer_lead_id_fkey"
            columns: ["buyer_lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_deals_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_deals_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_deals_seller_conveyancer_id_fkey"
            columns: ["seller_conveyancer_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      tenancies: {
        Row: {
          agency_id: string | null
          created_at: string
          deposit: number | null
          deposit_reference: string | null
          deposit_scheme: string | null
          end_date: string | null
          id: string
          notes: string | null
          property_id: string
          rent_amount: number
          rent_frequency: Database["public"]["Enums"]["rent_frequency"]
          room_id: string | null
          start_date: string
          status: Database["public"]["Enums"]["tenancy_status"]
          tenant_email: string | null
          tenant_name: string
          tenant_phone: string | null
          tenant_user_id: string | null
          updated_at: string
        }
        Insert: {
          agency_id?: string | null
          created_at?: string
          deposit?: number | null
          deposit_reference?: string | null
          deposit_scheme?: string | null
          end_date?: string | null
          id?: string
          notes?: string | null
          property_id: string
          rent_amount: number
          rent_frequency?: Database["public"]["Enums"]["rent_frequency"]
          room_id?: string | null
          start_date: string
          status?: Database["public"]["Enums"]["tenancy_status"]
          tenant_email?: string | null
          tenant_name: string
          tenant_phone?: string | null
          tenant_user_id?: string | null
          updated_at?: string
        }
        Update: {
          agency_id?: string | null
          created_at?: string
          deposit?: number | null
          deposit_reference?: string | null
          deposit_scheme?: string | null
          end_date?: string | null
          id?: string
          notes?: string | null
          property_id?: string
          rent_amount?: number
          rent_frequency?: Database["public"]["Enums"]["rent_frequency"]
          room_id?: string | null
          start_date?: string
          status?: Database["public"]["Enums"]["tenancy_status"]
          tenant_email?: string | null
          tenant_name?: string
          tenant_phone?: string | null
          tenant_user_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenancies_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenancies_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenancies_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
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
      work_order_updates: {
        Row: {
          author_id: string | null
          created_at: string
          id: string
          note: string
          status_change: Database["public"]["Enums"]["work_order_status"] | null
          work_order_id: string
        }
        Insert: {
          author_id?: string | null
          created_at?: string
          id?: string
          note: string
          status_change?:
            | Database["public"]["Enums"]["work_order_status"]
            | null
          work_order_id: string
        }
        Update: {
          author_id?: string | null
          created_at?: string
          id?: string
          note?: string
          status_change?:
            | Database["public"]["Enums"]["work_order_status"]
            | null
          work_order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_order_updates_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      work_orders: {
        Row: {
          actual_cost: number | null
          agency_id: string
          category: string | null
          completed_at: string | null
          contact_id: string | null
          created_at: string
          description: string | null
          estimated_cost: number | null
          id: string
          invoice_url: string | null
          priority: Database["public"]["Enums"]["work_order_priority"]
          property_id: string | null
          reported_by: string | null
          room_id: string | null
          scheduled_for: string | null
          status: Database["public"]["Enums"]["work_order_status"]
          tenancy_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          actual_cost?: number | null
          agency_id: string
          category?: string | null
          completed_at?: string | null
          contact_id?: string | null
          created_at?: string
          description?: string | null
          estimated_cost?: number | null
          id?: string
          invoice_url?: string | null
          priority?: Database["public"]["Enums"]["work_order_priority"]
          property_id?: string | null
          reported_by?: string | null
          room_id?: string | null
          scheduled_for?: string | null
          status?: Database["public"]["Enums"]["work_order_status"]
          tenancy_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          actual_cost?: number | null
          agency_id?: string
          category?: string | null
          completed_at?: string | null
          contact_id?: string | null
          created_at?: string
          description?: string | null
          estimated_cost?: number | null
          id?: string
          invoice_url?: string | null
          priority?: Database["public"]["Enums"]["work_order_priority"]
          property_id?: string | null
          reported_by?: string | null
          room_id?: string | null
          scheduled_for?: string | null
          status?: Database["public"]["Enums"]["work_order_status"]
          tenancy_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_orders_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_orders_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_orders_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_orders_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_orders_tenancy_id_fkey"
            columns: ["tenancy_id"]
            isOneToOne: false
            referencedRelation: "tenancies"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      current_user_contact_ids: { Args: never; Returns: string[] }
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
      app_role:
        | "admin"
        | "agent"
        | "landlord"
        | "tenant"
        | "buyer"
        | "conveyancer"
        | "contractor"
        | "inventory_clerk"
        | "utility_provider"
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
        | "selective_licence"
        | "fire_risk_assessment"
        | "emergency_lighting"
        | "fire_door_check"
        | "right_to_rent"
        | "ast"
        | "how_to_rent"
        | "inventory"
        | "cmp"
        | "redress"
        | "aml"
        | "pi_insurance"
        | "ico"
        | "smoke_co_alarms"
        | "mees_epc_upgrade"
        | "awaabs_law"
        | "building_safety"
        | "asbestos_register"
        | "water_safety"
        | "right_to_rent_followup"
        | "tenant_fees_act"
        | "prescribed_info"
        | "renters_rights_readiness"
        | "gdpr_privacy_notice"
        | "complaints_procedure"
        | "material_information"
        | "public_liability"
        | "landlord_insurance"
        | "mtd_itsa"
        | "hhsrs_assessment"
        | "tenancy_deposit_scheme"
        | "gas_appliance_servicing"
        | "window_restrictors"
        | "blind_cord_safety"
      contact_type:
        | "conveyancer"
        | "solicitor"
        | "plumber"
        | "electrician"
        | "gas_engineer"
        | "builder"
        | "cleaner"
        | "handyman"
        | "locksmith"
        | "roofer"
        | "painter"
        | "gardener"
        | "inventory_clerk"
        | "epc_assessor"
        | "utilities"
        | "council"
        | "referencing"
        | "insurance"
        | "other"
      deal_stage:
        | "lead"
        | "contacted"
        | "viewing"
        | "offer"
        | "negotiation"
        | "agreed"
        | "completed"
        | "lost"
      job_media_kind: "photo" | "video"
      lead_status:
        | "new"
        | "contacted"
        | "qualified"
        | "viewing_booked"
        | "offer"
        | "closed_won"
        | "closed_lost"
      listing_purpose: "sale" | "rent"
      listing_status:
        | "draft"
        | "published"
        | "under_offer"
        | "let_agreed"
        | "sold"
        | "withdrawn"
      listing_type: "sale" | "rent" | "room"
      price_qualifier:
        | "asking"
        | "offers_over"
        | "offers_in_region"
        | "guide_price"
        | "poa"
        | "fixed"
      property_type:
        | "residential_sale"
        | "residential_let"
        | "hmo"
        | "commercial"
      rent_frequency: "weekly" | "monthly"
      rent_status: "due" | "paid" | "overdue" | "waived"
      tenancy_status: "draft" | "active" | "notice" | "ended"
      tenure_type: "freehold" | "leasehold" | "share_of_freehold" | "commonhold"
      work_order_priority: "low" | "medium" | "high" | "emergency"
      work_order_status:
        | "open"
        | "in_progress"
        | "on_hold"
        | "completed"
        | "cancelled"
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
      app_role: [
        "admin",
        "agent",
        "landlord",
        "tenant",
        "buyer",
        "conveyancer",
        "contractor",
        "inventory_clerk",
        "utility_provider",
      ],
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
        "selective_licence",
        "fire_risk_assessment",
        "emergency_lighting",
        "fire_door_check",
        "right_to_rent",
        "ast",
        "how_to_rent",
        "inventory",
        "cmp",
        "redress",
        "aml",
        "pi_insurance",
        "ico",
        "smoke_co_alarms",
        "mees_epc_upgrade",
        "awaabs_law",
        "building_safety",
        "asbestos_register",
        "water_safety",
        "right_to_rent_followup",
        "tenant_fees_act",
        "prescribed_info",
        "renters_rights_readiness",
        "gdpr_privacy_notice",
        "complaints_procedure",
        "material_information",
        "public_liability",
        "landlord_insurance",
        "mtd_itsa",
        "hhsrs_assessment",
        "tenancy_deposit_scheme",
        "gas_appliance_servicing",
        "window_restrictors",
        "blind_cord_safety",
      ],
      contact_type: [
        "conveyancer",
        "solicitor",
        "plumber",
        "electrician",
        "gas_engineer",
        "builder",
        "cleaner",
        "handyman",
        "locksmith",
        "roofer",
        "painter",
        "gardener",
        "inventory_clerk",
        "epc_assessor",
        "utilities",
        "council",
        "referencing",
        "insurance",
        "other",
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
      job_media_kind: ["photo", "video"],
      lead_status: [
        "new",
        "contacted",
        "qualified",
        "viewing_booked",
        "offer",
        "closed_won",
        "closed_lost",
      ],
      listing_purpose: ["sale", "rent"],
      listing_status: [
        "draft",
        "published",
        "under_offer",
        "let_agreed",
        "sold",
        "withdrawn",
      ],
      listing_type: ["sale", "rent", "room"],
      price_qualifier: [
        "asking",
        "offers_over",
        "offers_in_region",
        "guide_price",
        "poa",
        "fixed",
      ],
      property_type: [
        "residential_sale",
        "residential_let",
        "hmo",
        "commercial",
      ],
      rent_frequency: ["weekly", "monthly"],
      rent_status: ["due", "paid", "overdue", "waived"],
      tenancy_status: ["draft", "active", "notice", "ended"],
      tenure_type: ["freehold", "leasehold", "share_of_freehold", "commonhold"],
      work_order_priority: ["low", "medium", "high", "emergency"],
      work_order_status: [
        "open",
        "in_progress",
        "on_hold",
        "completed",
        "cancelled",
      ],
    },
  },
} as const
