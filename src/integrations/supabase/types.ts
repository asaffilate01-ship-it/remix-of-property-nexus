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
      agency_member_branches: {
        Row: {
          branch_id: string
          created_at: string
          id: string
          member_id: string
        }
        Insert: {
          branch_id: string
          created_at?: string
          id?: string
          member_id: string
        }
        Update: {
          branch_id?: string
          created_at?: string
          id?: string
          member_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agency_member_branches_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agency_member_branches_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "agency_members"
            referencedColumns: ["id"]
          },
        ]
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
      bank_transactions: {
        Row: {
          agency_id: string
          amount: number
          counterparty: string | null
          created_at: string
          currency: string
          id: string
          matched_at: string | null
          matched_rent_schedule_id: string | null
          matched_tenancy_id: string | null
          posted_at: string
          raw: Json | null
          reference: string | null
          source: string
        }
        Insert: {
          agency_id: string
          amount: number
          counterparty?: string | null
          created_at?: string
          currency?: string
          id?: string
          matched_at?: string | null
          matched_rent_schedule_id?: string | null
          matched_tenancy_id?: string | null
          posted_at?: string
          raw?: Json | null
          reference?: string | null
          source?: string
        }
        Update: {
          agency_id?: string
          amount?: number
          counterparty?: string | null
          created_at?: string
          currency?: string
          id?: string
          matched_at?: string | null
          matched_rent_schedule_id?: string | null
          matched_tenancy_id?: string | null
          posted_at?: string
          raw?: Json | null
          reference?: string | null
          source?: string
        }
        Relationships: [
          {
            foreignKeyName: "bank_transactions_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_transactions_matched_rent_schedule_id_fkey"
            columns: ["matched_rent_schedule_id"]
            isOneToOne: false
            referencedRelation: "rent_schedule"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_transactions_matched_tenancy_id_fkey"
            columns: ["matched_tenancy_id"]
            isOneToOne: false
            referencedRelation: "tenancies"
            referencedColumns: ["id"]
          },
        ]
      }
      branches: {
        Row: {
          address: string | null
          agency_id: string
          city: string | null
          created_at: string
          email: string | null
          id: string
          is_primary: boolean
          name: string
          phone: string | null
          postcode: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          agency_id: string
          city?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_primary?: boolean
          name: string
          phone?: string | null
          postcode?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          agency_id?: string
          city?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_primary?: boolean
          name?: string
          phone?: string | null
          postcode?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "branches_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      cleaning_jobs: {
        Row: {
          assignee_name: string | null
          assignee_user_id: string | null
          created_at: string
          created_by: string
          duration_minutes: number
          id: string
          notes: string | null
          property_id: string
          room_id: string | null
          scheduled_at: string
          status: string
          updated_at: string
        }
        Insert: {
          assignee_name?: string | null
          assignee_user_id?: string | null
          created_at?: string
          created_by?: string
          duration_minutes?: number
          id?: string
          notes?: string | null
          property_id: string
          room_id?: string | null
          scheduled_at: string
          status?: string
          updated_at?: string
        }
        Update: {
          assignee_name?: string | null
          assignee_user_id?: string | null
          created_at?: string
          created_by?: string
          duration_minutes?: number
          id?: string
          notes?: string | null
          property_id?: string
          room_id?: string | null
          scheduled_at?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cleaning_jobs_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cleaning_jobs_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
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
      documents: {
        Row: {
          agency_id: string | null
          created_at: string
          expires_on: string | null
          folder: string
          id: string
          landlord_user_id: string | null
          locked: boolean
          mime_type: string | null
          name: string
          notes: string | null
          property_id: string | null
          retention: string | null
          scope: Database["public"]["Enums"]["doc_scope"]
          size_bytes: number | null
          storage_path: string
          tags: string[]
          tenancy_id: string | null
          tenant_user_id: string | null
          updated_at: string
          uploaded_by: string | null
        }
        Insert: {
          agency_id?: string | null
          created_at?: string
          expires_on?: string | null
          folder?: string
          id?: string
          landlord_user_id?: string | null
          locked?: boolean
          mime_type?: string | null
          name: string
          notes?: string | null
          property_id?: string | null
          retention?: string | null
          scope: Database["public"]["Enums"]["doc_scope"]
          size_bytes?: number | null
          storage_path: string
          tags?: string[]
          tenancy_id?: string | null
          tenant_user_id?: string | null
          updated_at?: string
          uploaded_by?: string | null
        }
        Update: {
          agency_id?: string | null
          created_at?: string
          expires_on?: string | null
          folder?: string
          id?: string
          landlord_user_id?: string | null
          locked?: boolean
          mime_type?: string | null
          name?: string
          notes?: string | null
          property_id?: string | null
          retention?: string | null
          scope?: Database["public"]["Enums"]["doc_scope"]
          size_bytes?: number | null
          storage_path?: string
          tags?: string[]
          tenancy_id?: string | null
          tenant_user_id?: string | null
          updated_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_tenancy_id_fkey"
            columns: ["tenancy_id"]
            isOneToOne: false
            referencedRelation: "tenancies"
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
          branch_id: string | null
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
          branch_id?: string | null
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
          branch_id?: string | null
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
            foreignKeyName: "leads_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
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
          ai_copy_caption: string | null
          ai_copy_generated_at: string | null
          ai_copy_highlights: Json | null
          ai_copy_long: string | null
          ai_copy_short: string | null
          available_from: string | null
          bathrooms: number | null
          bedrooms: number | null
          bills_included: boolean
          branch_id: string | null
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
          floorplan_url: string | null
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
          tour_image_path: string | null
          tour_url: string | null
          updated_at: string
          view_count: number
        }
        Insert: {
          address?: string | null
          agency_id?: string | null
          ai_copy_caption?: string | null
          ai_copy_generated_at?: string | null
          ai_copy_highlights?: Json | null
          ai_copy_long?: string | null
          ai_copy_short?: string | null
          available_from?: string | null
          bathrooms?: number | null
          bedrooms?: number | null
          bills_included?: boolean
          branch_id?: string | null
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
          floorplan_url?: string | null
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
          tour_image_path?: string | null
          tour_url?: string | null
          updated_at?: string
          view_count?: number
        }
        Update: {
          address?: string | null
          agency_id?: string | null
          ai_copy_caption?: string | null
          ai_copy_generated_at?: string | null
          ai_copy_highlights?: Json | null
          ai_copy_long?: string | null
          ai_copy_short?: string | null
          available_from?: string | null
          bathrooms?: number | null
          bedrooms?: number | null
          bills_included?: boolean
          branch_id?: string | null
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
          floorplan_url?: string | null
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
          tour_image_path?: string | null
          tour_url?: string | null
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
            foreignKeyName: "listings_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
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
      offers: {
        Row: {
          agency_id: string | null
          amount: number
          buyer_email: string | null
          buyer_name: string
          buyer_phone: string | null
          created_at: string
          deal_id: string | null
          financing: string | null
          id: string
          lead_id: string | null
          listing_id: string | null
          notes: string | null
          owner_id: string
          position_in_chain: number | null
          property_id: string | null
          responded_at: string | null
          status: Database["public"]["Enums"]["offer_status"]
          submitted_at: string
          tenancy_id: string | null
          updated_at: string
        }
        Insert: {
          agency_id?: string | null
          amount: number
          buyer_email?: string | null
          buyer_name: string
          buyer_phone?: string | null
          created_at?: string
          deal_id?: string | null
          financing?: string | null
          id?: string
          lead_id?: string | null
          listing_id?: string | null
          notes?: string | null
          owner_id: string
          position_in_chain?: number | null
          property_id?: string | null
          responded_at?: string | null
          status?: Database["public"]["Enums"]["offer_status"]
          submitted_at?: string
          tenancy_id?: string | null
          updated_at?: string
        }
        Update: {
          agency_id?: string | null
          amount?: number
          buyer_email?: string | null
          buyer_name?: string
          buyer_phone?: string | null
          created_at?: string
          deal_id?: string | null
          financing?: string | null
          id?: string
          lead_id?: string | null
          listing_id?: string | null
          notes?: string | null
          owner_id?: string
          position_in_chain?: number | null
          property_id?: string | null
          responded_at?: string | null
          status?: Database["public"]["Enums"]["offer_status"]
          submitted_at?: string
          tenancy_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "offers_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offers_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offers_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offers_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offers_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offers_tenancy_id_fkey"
            columns: ["tenancy_id"]
            isOneToOne: false
            referencedRelation: "tenancies"
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
          branch_id: string | null
          city: string | null
          cleaning_fee: number | null
          created_at: string
          features: string[]
          hmo_licence_expires: string | null
          hmo_licence_number: string | null
          id: string
          is_hmo: boolean
          listing_purpose: Database["public"]["Enums"]["listing_purpose"]
          min_stay_nights: number | null
          nightly_rate: number | null
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
          branch_id?: string | null
          city?: string | null
          cleaning_fee?: number | null
          created_at?: string
          features?: string[]
          hmo_licence_expires?: string | null
          hmo_licence_number?: string | null
          id?: string
          is_hmo?: boolean
          listing_purpose?: Database["public"]["Enums"]["listing_purpose"]
          min_stay_nights?: number | null
          nightly_rate?: number | null
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
          branch_id?: string | null
          city?: string | null
          cleaning_fee?: number | null
          created_at?: string
          features?: string[]
          hmo_licence_expires?: string | null
          hmo_licence_number?: string | null
          id?: string
          is_hmo?: boolean
          listing_purpose?: Database["public"]["Enums"]["listing_purpose"]
          min_stay_nights?: number | null
          nightly_rate?: number | null
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
          {
            foreignKeyName: "properties_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      referencing_cases: {
        Row: {
          agency_id: string | null
          applicant: Json
          created_at: string
          credit_consent: boolean
          current_step: number
          decided_at: string | null
          decided_by: string | null
          decision: string | null
          employment: Json
          id: string
          income_monthly: number | null
          notes: string | null
          previous_landlord: Json
          property_id: string | null
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          agency_id?: string | null
          applicant?: Json
          created_at?: string
          credit_consent?: boolean
          current_step?: number
          decided_at?: string | null
          decided_by?: string | null
          decision?: string | null
          employment?: Json
          id?: string
          income_monthly?: number | null
          notes?: string | null
          previous_landlord?: Json
          property_id?: string | null
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          agency_id?: string | null
          applicant?: Json
          created_at?: string
          credit_consent?: boolean
          current_step?: number
          decided_at?: string | null
          decided_by?: string | null
          decision?: string | null
          employment?: Json
          id?: string
          income_monthly?: number | null
          notes?: string | null
          previous_landlord?: Json
          property_id?: string | null
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "referencing_cases_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referencing_cases_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      referencing_checks: {
        Row: {
          case_id: string
          check_type: string
          completed_at: string | null
          created_at: string
          expires_at: string | null
          external_ref: string | null
          id: string
          provider: string
          requested_at: string
          requested_by: string | null
          result: Json
          score: number | null
          status: string
          updated_at: string
        }
        Insert: {
          case_id: string
          check_type: string
          completed_at?: string | null
          created_at?: string
          expires_at?: string | null
          external_ref?: string | null
          id?: string
          provider?: string
          requested_at?: string
          requested_by?: string | null
          result?: Json
          score?: number | null
          status?: string
          updated_at?: string
        }
        Update: {
          case_id?: string
          check_type?: string
          completed_at?: string | null
          created_at?: string
          expires_at?: string | null
          external_ref?: string | null
          id?: string
          provider?: string
          requested_at?: string
          requested_by?: string | null
          result?: Json
          score?: number | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "referencing_checks_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "referencing_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      referencing_documents: {
        Row: {
          case_id: string
          created_at: string
          doc_type: string
          file_size: number | null
          id: string
          mime_type: string | null
          storage_path: string
          uploaded_by: string | null
        }
        Insert: {
          case_id: string
          created_at?: string
          doc_type: string
          file_size?: number | null
          id?: string
          mime_type?: string | null
          storage_path: string
          uploaded_by?: string | null
        }
        Update: {
          case_id?: string
          created_at?: string
          doc_type?: string
          file_size?: number | null
          id?: string
          mime_type?: string | null
          storage_path?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "referencing_documents_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "referencing_cases"
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
      role_permissions: {
        Row: {
          agency_id: string
          allowed: boolean
          capability: string
          created_at: string
          id: string
          role: string
          updated_at: string
        }
        Insert: {
          agency_id: string
          allowed?: boolean
          capability: string
          created_at?: string
          id?: string
          role: string
          updated_at?: string
        }
        Update: {
          agency_id?: string
          allowed?: boolean
          capability?: string
          created_at?: string
          id?: string
          role?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
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
          room_number: string | null
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
          room_number?: string | null
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
          room_number?: string | null
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
          branch_id: string | null
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
          branch_id?: string | null
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
          branch_id?: string | null
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
            foreignKeyName: "sales_deals_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
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
      saved_search_matches: {
        Row: {
          id: string
          listing_id: string
          notified_at: string
          saved_search_id: string
        }
        Insert: {
          id?: string
          listing_id: string
          notified_at?: string
          saved_search_id: string
        }
        Update: {
          id?: string
          listing_id?: string
          notified_at?: string
          saved_search_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_search_matches_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_search_matches_saved_search_id_fkey"
            columns: ["saved_search_id"]
            isOneToOne: false
            referencedRelation: "saved_searches"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_searches: {
        Row: {
          alert_email: boolean
          alert_push: boolean
          created_at: string
          criteria: Json
          frequency: string
          id: string
          last_notified_at: string | null
          name: string | null
          polygon: Json | null
          updated_at: string
          user_id: string
        }
        Insert: {
          alert_email?: boolean
          alert_push?: boolean
          created_at?: string
          criteria?: Json
          frequency?: string
          id?: string
          last_notified_at?: string | null
          name?: string | null
          polygon?: Json | null
          updated_at?: string
          user_id: string
        }
        Update: {
          alert_email?: boolean
          alert_push?: boolean
          created_at?: string
          criteria?: Json
          frequency?: string
          id?: string
          last_notified_at?: string | null
          name?: string | null
          polygon?: Json | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      survey_captures: {
        Row: {
          accuracy_m: number | null
          agency_id: string | null
          altitude: number | null
          bytes: number | null
          caption: string | null
          captured_at: string
          created_at: string
          duration_ms: number | null
          folder_id: string | null
          heading: number | null
          height: number | null
          id: string
          kind: string
          lat: number | null
          lng: number | null
          mime_type: string | null
          property_id: string | null
          storage_path: string
          tags: string[]
          thumb_path: string | null
          updated_at: string
          user_id: string
          width: number | null
          work_order_id: string | null
        }
        Insert: {
          accuracy_m?: number | null
          agency_id?: string | null
          altitude?: number | null
          bytes?: number | null
          caption?: string | null
          captured_at?: string
          created_at?: string
          duration_ms?: number | null
          folder_id?: string | null
          heading?: number | null
          height?: number | null
          id?: string
          kind: string
          lat?: number | null
          lng?: number | null
          mime_type?: string | null
          property_id?: string | null
          storage_path: string
          tags?: string[]
          thumb_path?: string | null
          updated_at?: string
          user_id: string
          width?: number | null
          work_order_id?: string | null
        }
        Update: {
          accuracy_m?: number | null
          agency_id?: string | null
          altitude?: number | null
          bytes?: number | null
          caption?: string | null
          captured_at?: string
          created_at?: string
          duration_ms?: number | null
          folder_id?: string | null
          heading?: number | null
          height?: number | null
          id?: string
          kind?: string
          lat?: number | null
          lng?: number | null
          mime_type?: string | null
          property_id?: string | null
          storage_path?: string
          tags?: string[]
          thumb_path?: string | null
          updated_at?: string
          user_id?: string
          width?: number | null
          work_order_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "survey_captures_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "survey_captures_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "survey_folders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "survey_captures_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "survey_captures_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      survey_folders: {
        Row: {
          agency_id: string | null
          color: string | null
          created_at: string
          id: string
          name: string
          parent_id: string | null
          property_id: string | null
          updated_at: string
          user_id: string
          work_order_id: string | null
        }
        Insert: {
          agency_id?: string | null
          color?: string | null
          created_at?: string
          id?: string
          name: string
          parent_id?: string | null
          property_id?: string | null
          updated_at?: string
          user_id: string
          work_order_id?: string | null
        }
        Update: {
          agency_id?: string | null
          color?: string | null
          created_at?: string
          id?: string
          name?: string
          parent_id?: string | null
          property_id?: string | null
          updated_at?: string
          user_id?: string
          work_order_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "survey_folders_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "survey_folders_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "survey_folders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "survey_folders_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "survey_folders_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
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
      tenancy_events: {
        Row: {
          actor_user_id: string | null
          created_at: string
          id: string
          kind: Database["public"]["Enums"]["tenancy_event_kind"]
          occurred_at: string
          payload: Json
          summary: string | null
          tenancy_id: string
        }
        Insert: {
          actor_user_id?: string | null
          created_at?: string
          id?: string
          kind: Database["public"]["Enums"]["tenancy_event_kind"]
          occurred_at?: string
          payload?: Json
          summary?: string | null
          tenancy_id: string
        }
        Update: {
          actor_user_id?: string | null
          created_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["tenancy_event_kind"]
          occurred_at?: string
          payload?: Json
          summary?: string | null
          tenancy_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenancy_events_tenancy_id_fkey"
            columns: ["tenancy_id"]
            isOneToOne: false
            referencedRelation: "tenancies"
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
      viewings: {
        Row: {
          agency_id: string | null
          agent_name: string | null
          agent_user_id: string | null
          applicant_email: string | null
          applicant_name: string
          applicant_phone: string | null
          created_at: string
          duration_minutes: number
          feedback: Database["public"]["Enums"]["viewing_feedback"] | null
          id: string
          lead_id: string | null
          listing_id: string | null
          notes: string | null
          owner_id: string
          property_id: string | null
          scheduled_at: string
          status: Database["public"]["Enums"]["viewing_status"]
          updated_at: string
        }
        Insert: {
          agency_id?: string | null
          agent_name?: string | null
          agent_user_id?: string | null
          applicant_email?: string | null
          applicant_name: string
          applicant_phone?: string | null
          created_at?: string
          duration_minutes?: number
          feedback?: Database["public"]["Enums"]["viewing_feedback"] | null
          id?: string
          lead_id?: string | null
          listing_id?: string | null
          notes?: string | null
          owner_id: string
          property_id?: string | null
          scheduled_at: string
          status?: Database["public"]["Enums"]["viewing_status"]
          updated_at?: string
        }
        Update: {
          agency_id?: string | null
          agent_name?: string | null
          agent_user_id?: string | null
          applicant_email?: string | null
          applicant_name?: string
          applicant_phone?: string | null
          created_at?: string
          duration_minutes?: number
          feedback?: Database["public"]["Enums"]["viewing_feedback"] | null
          id?: string
          lead_id?: string | null
          listing_id?: string | null
          notes?: string | null
          owner_id?: string
          property_id?: string | null
          scheduled_at?: string
          status?: Database["public"]["Enums"]["viewing_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "viewings_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "viewings_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "viewings_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "viewings_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
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
      has_capability: {
        Args: { _agency: string; _capability: string; _user: string }
        Returns: boolean
      }
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
      doc_scope: "property" | "landlord" | "tenant" | "tenancy" | "agency"
      job_media_kind: "photo" | "video"
      lead_status:
        | "new"
        | "contacted"
        | "qualified"
        | "viewing_booked"
        | "offer"
        | "closed_won"
        | "closed_lost"
      listing_purpose: "sale" | "rent" | "both" | "short_let"
      listing_status:
        | "draft"
        | "published"
        | "under_offer"
        | "let_agreed"
        | "sold"
        | "withdrawn"
      listing_type: "sale" | "rent" | "room"
      offer_status:
        | "pending"
        | "accepted"
        | "rejected"
        | "withdrawn"
        | "countered"
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
      tenancy_event_kind:
        | "lead_captured"
        | "viewing_booked"
        | "viewing_completed"
        | "offer_made"
        | "offer_accepted"
        | "references_requested"
        | "references_passed"
        | "tenancy_drafted"
        | "ast_signed"
        | "deposit_received"
        | "deposit_protected"
        | "prescribed_info_served"
        | "moved_in"
        | "rent_paid"
        | "renewal_offered"
        | "renewed"
        | "notice_served"
        | "moved_out"
        | "deposit_returned"
        | "rent_schedule_generated"
      tenancy_status: "draft" | "active" | "notice" | "ended"
      tenure_type: "freehold" | "leasehold" | "share_of_freehold" | "commonhold"
      viewing_feedback: "positive" | "negative" | "neutral" | "offer"
      viewing_status:
        | "pending"
        | "confirmed"
        | "completed"
        | "no_show"
        | "cancelled"
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
      doc_scope: ["property", "landlord", "tenant", "tenancy", "agency"],
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
      listing_purpose: ["sale", "rent", "both", "short_let"],
      listing_status: [
        "draft",
        "published",
        "under_offer",
        "let_agreed",
        "sold",
        "withdrawn",
      ],
      listing_type: ["sale", "rent", "room"],
      offer_status: [
        "pending",
        "accepted",
        "rejected",
        "withdrawn",
        "countered",
      ],
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
      tenancy_event_kind: [
        "lead_captured",
        "viewing_booked",
        "viewing_completed",
        "offer_made",
        "offer_accepted",
        "references_requested",
        "references_passed",
        "tenancy_drafted",
        "ast_signed",
        "deposit_received",
        "deposit_protected",
        "prescribed_info_served",
        "moved_in",
        "rent_paid",
        "renewal_offered",
        "renewed",
        "notice_served",
        "moved_out",
        "deposit_returned",
        "rent_schedule_generated",
      ],
      tenancy_status: ["draft", "active", "notice", "ended"],
      tenure_type: ["freehold", "leasehold", "share_of_freehold", "commonhold"],
      viewing_feedback: ["positive", "negative", "neutral", "offer"],
      viewing_status: [
        "pending",
        "confirmed",
        "completed",
        "no_show",
        "cancelled",
      ],
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
