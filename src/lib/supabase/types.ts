export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      graphql: {
        Args: { extensions?: Json; operationName?: string; query?: string; variables?: Json };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  public: {
    Tables: {
      appointments: {
        Row: {
          business_id: string;
          canceled_at: string | null;
          created_at: string;
          customer_id: string;
          customer_name: string;
          customer_whatsapp: string;
          ends_at: string;
          id: string;
          manage_code: string;
          messages_enabled: boolean;
          notes: string | null;
          price_cents: number;
          service_id: string;
          source: string;
          staff_member_id: string;
          starts_at: string;
          status: string;
        };
        ComputedFields: never;
        Insert: {
          business_id: string;
          canceled_at?: string | null;
          created_at?: string;
          customer_id: string;
          customer_name: string;
          customer_whatsapp: string;
          ends_at: string;
          id?: string;
          manage_code?: string;
          messages_enabled?: boolean;
          notes?: string | null;
          price_cents?: number;
          service_id: string;
          source?: string;
          staff_member_id: string;
          starts_at: string;
          status?: string;
        };
        Update: {
          business_id?: string;
          canceled_at?: string | null;
          created_at?: string;
          customer_id?: string;
          customer_name?: string;
          customer_whatsapp?: string;
          ends_at?: string;
          id?: string;
          manage_code?: string;
          messages_enabled?: boolean;
          notes?: string | null;
          price_cents?: number;
          service_id?: string;
          source?: string;
          staff_member_id?: string;
          starts_at?: string;
          status?: string;
        };
        Relationships: [
          {
            foreignKeyName: "appointments_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "appointments_customer_id_business_id_fkey";
            columns: ["customer_id", "business_id"];
            isOneToOne: false;
            referencedRelation: "customer_summaries";
            referencedColumns: ["id", "business_id"];
          },
          {
            foreignKeyName: "appointments_customer_id_business_id_fkey";
            columns: ["customer_id", "business_id"];
            isOneToOne: false;
            referencedRelation: "customers";
            referencedColumns: ["id", "business_id"];
          },
          {
            foreignKeyName: "appointments_service_id_business_id_fkey";
            columns: ["service_id", "business_id"];
            isOneToOne: false;
            referencedRelation: "services";
            referencedColumns: ["id", "business_id"];
          },
          {
            foreignKeyName: "appointments_staff_member_id_business_id_fkey";
            columns: ["staff_member_id", "business_id"];
            isOneToOne: false;
            referencedRelation: "staff_members";
            referencedColumns: ["id", "business_id"];
          },
        ];
      };
      business_breaks: {
        Row: {
          business_id: string;
          ends_at: string;
          id: string;
          starts_at: string;
          weekday: number;
        };
        ComputedFields: never;
        Insert: {
          business_id: string;
          ends_at: string;
          id?: string;
          starts_at: string;
          weekday: number;
        };
        Update: {
          business_id?: string;
          ends_at?: string;
          id?: string;
          starts_at?: string;
          weekday?: number;
        };
        Relationships: [
          {
            foreignKeyName: "business_breaks_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
        ];
      };
      business_hours: {
        Row: {
          business_id: string;
          closes_at: string | null;
          id: string;
          is_open: boolean;
          opens_at: string | null;
          weekday: number;
        };
        ComputedFields: never;
        Insert: {
          business_id: string;
          closes_at?: string | null;
          id?: string;
          is_open?: boolean;
          opens_at?: string | null;
          weekday: number;
        };
        Update: {
          business_id?: string;
          closes_at?: string | null;
          id?: string;
          is_open?: boolean;
          opens_at?: string | null;
          weekday?: number;
        };
        Relationships: [
          {
            foreignKeyName: "business_hours_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
        ];
      };
      business_message_settings: {
        Row: {
          business_id: string;
          cancellation_enabled: boolean;
          confirmation_enabled: boolean;
          reminder_enabled: boolean;
          reminder_offsets_min: number[];
          updated_at: string;
          updated_by: string | null;
        };
        ComputedFields: never;
        Insert: {
          business_id: string;
          cancellation_enabled?: boolean;
          confirmation_enabled?: boolean;
          reminder_enabled?: boolean;
          reminder_offsets_min?: number[];
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          business_id?: string;
          cancellation_enabled?: boolean;
          confirmation_enabled?: boolean;
          reminder_enabled?: boolean;
          reminder_offsets_min?: number[];
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "business_message_settings_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: true;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
        ];
      };
      business_photos: {
        Row: {
          business_id: string;
          caption: string | null;
          created_at: string;
          id: string;
          sort_order: number;
          storage_path: string | null;
          url: string;
        };
        ComputedFields: never;
        Insert: {
          business_id: string;
          caption?: string | null;
          created_at?: string;
          id?: string;
          sort_order?: number;
          storage_path?: string | null;
          url: string;
        };
        Update: {
          business_id?: string;
          caption?: string | null;
          created_at?: string;
          id?: string;
          sort_order?: number;
          storage_path?: string | null;
          url?: string;
        };
        Relationships: [
          {
            foreignKeyName: "business_photos_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
        ];
      };
      business_testimonials: {
        Row: {
          author_name: string;
          business_id: string;
          created_at: string;
          id: string;
          sort_order: number;
          text: string;
        };
        ComputedFields: never;
        Insert: {
          author_name: string;
          business_id: string;
          created_at?: string;
          id?: string;
          sort_order?: number;
          text: string;
        };
        Update: {
          author_name?: string;
          business_id?: string;
          created_at?: string;
          id?: string;
          sort_order?: number;
          text?: string;
        };
        Relationships: [
          {
            foreignKeyName: "business_testimonials_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
        ];
      };
      businesses: {
        Row: {
          accent_color: string;
          address: string | null;
          address_reference: string | null;
          calendar_token: string | null;
          cancel_notice_min: number;
          cover_url: string | null;
          created_at: string;
          headline: string | null;
          id: string;
          instagram: string | null;
          logo_url: string | null;
          max_days_ahead: number;
          message_limit_override: number | null;
          message_texts: NonNullable<Json>;
          min_notice_min: number;
          name: string;
          onboarding_completed_at: string | null;
          owner_id: string;
          plan: string;
          plan_status: string;
          referral_code: string | null;
          referred_by: string | null;
          segment: string | null;
          slot_interval_min: number;
          slug: string;
          subheadline: string | null;
          timezone: string;
          whatsapp: string | null;
        };
        ComputedFields: never;
        Insert: {
          accent_color?: string;
          address?: string | null;
          address_reference?: string | null;
          calendar_token?: string | null;
          cancel_notice_min?: number;
          cover_url?: string | null;
          created_at?: string;
          headline?: string | null;
          id?: string;
          instagram?: string | null;
          logo_url?: string | null;
          max_days_ahead?: number;
          message_limit_override?: number | null;
          message_texts?: NonNullable<Json>;
          min_notice_min?: number;
          name: string;
          onboarding_completed_at?: string | null;
          owner_id: string;
          plan?: string;
          plan_status?: string;
          referral_code?: string | null;
          referred_by?: string | null;
          segment?: string | null;
          slot_interval_min?: number;
          slug: string;
          subheadline?: string | null;
          timezone?: string;
          whatsapp?: string | null;
        };
        Update: {
          accent_color?: string;
          address?: string | null;
          address_reference?: string | null;
          calendar_token?: string | null;
          cancel_notice_min?: number;
          cover_url?: string | null;
          created_at?: string;
          headline?: string | null;
          id?: string;
          instagram?: string | null;
          logo_url?: string | null;
          max_days_ahead?: number;
          message_limit_override?: number | null;
          message_texts?: NonNullable<Json>;
          min_notice_min?: number;
          name?: string;
          onboarding_completed_at?: string | null;
          owner_id?: string;
          plan?: string;
          plan_status?: string;
          referral_code?: string | null;
          referred_by?: string | null;
          segment?: string | null;
          slot_interval_min?: number;
          slug?: string;
          subheadline?: string | null;
          timezone?: string;
          whatsapp?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "businesses_referred_by_fkey";
            columns: ["referred_by"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
        ];
      };
      custom_domains: {
        Row: {
          business_id: string;
          created_at: string;
          domain: string;
          last_checked_at: string | null;
          last_error: string | null;
          verified_at: string | null;
        };
        ComputedFields: never;
        Insert: {
          business_id: string;
          created_at?: string;
          domain: string;
          last_checked_at?: string | null;
          last_error?: string | null;
          verified_at?: string | null;
        };
        Update: {
          business_id?: string;
          created_at?: string;
          domain?: string;
          last_checked_at?: string | null;
          last_error?: string | null;
          verified_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "custom_domains_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
        ];
      };
      customer_packages: {
        Row: {
          business_id: string;
          customer_id: string;
          expires_at: string | null;
          id: string;
          name: string;
          package_id: string;
          price_cents: number;
          service_id: string;
          sessions_total: number;
          sessions_used: number;
          sold_at: string;
        };
        ComputedFields: never;
        Insert: {
          business_id: string;
          customer_id: string;
          expires_at?: string | null;
          id?: string;
          name: string;
          package_id: string;
          price_cents: number;
          service_id: string;
          sessions_total: number;
          sessions_used?: number;
          sold_at?: string;
        };
        Update: {
          business_id?: string;
          customer_id?: string;
          expires_at?: string | null;
          id?: string;
          name?: string;
          package_id?: string;
          price_cents?: number;
          service_id?: string;
          sessions_total?: number;
          sessions_used?: number;
          sold_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "customer_packages_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "customer_packages_customer_id_business_id_fkey";
            columns: ["customer_id", "business_id"];
            isOneToOne: false;
            referencedRelation: "customer_summaries";
            referencedColumns: ["id", "business_id"];
          },
          {
            foreignKeyName: "customer_packages_customer_id_business_id_fkey";
            columns: ["customer_id", "business_id"];
            isOneToOne: false;
            referencedRelation: "customers";
            referencedColumns: ["id", "business_id"];
          },
          {
            foreignKeyName: "customer_packages_package_id_business_id_fkey";
            columns: ["package_id", "business_id"];
            isOneToOne: false;
            referencedRelation: "service_packages";
            referencedColumns: ["id", "business_id"];
          },
        ];
      };
      customers: {
        Row: {
          business_id: string;
          created_at: string;
          erased_at: string | null;
          id: string;
          last_visit_at: string | null;
          name: string;
          opted_out_at: string | null;
          whatsapp: string;
        };
        ComputedFields: never;
        Insert: {
          business_id: string;
          created_at?: string;
          erased_at?: string | null;
          id?: string;
          last_visit_at?: string | null;
          name: string;
          opted_out_at?: string | null;
          whatsapp: string;
        };
        Update: {
          business_id?: string;
          created_at?: string;
          erased_at?: string | null;
          id?: string;
          last_visit_at?: string | null;
          name?: string;
          opted_out_at?: string | null;
          whatsapp?: string;
        };
        Relationships: [
          {
            foreignKeyName: "customers_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
        ];
      };
      finance_entries: {
        Row: {
          amount_cents: number;
          business_id: string;
          category: string;
          created_at: string;
          description: string | null;
          id: string;
          kind: string;
          occurred_on: string;
        };
        ComputedFields: never;
        Insert: {
          amount_cents: number;
          business_id: string;
          category: string;
          created_at?: string;
          description?: string | null;
          id?: string;
          kind: string;
          occurred_on: string;
        };
        Update: {
          amount_cents?: number;
          business_id?: string;
          category?: string;
          created_at?: string;
          description?: string | null;
          id?: string;
          kind?: string;
          occurred_on?: string;
        };
        Relationships: [
          {
            foreignKeyName: "finance_entries_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
        ];
      };
      message_usage: {
        Row: {
          business_id: string;
          count: number;
          period: string;
        };
        ComputedFields: never;
        Insert: {
          business_id: string;
          count?: number;
          period: string;
        };
        Update: {
          business_id?: string;
          count?: number;
          period?: string;
        };
        Relationships: [
          {
            foreignKeyName: "message_usage_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
        ];
      };
      messages: {
        Row: {
          appointment_id: string | null;
          appointment_starts_at: string | null;
          business_id: string;
          created_at: string;
          error: string | null;
          id: string;
          provider_message_id: string | null;
          reminder_offset_min: number | null;
          sent_at: string | null;
          skip_reason: string | null;
          status: string;
          template: string;
          to_number: string;
          type: string;
        };
        ComputedFields: never;
        Insert: {
          appointment_id?: string | null;
          appointment_starts_at?: string | null;
          business_id: string;
          created_at?: string;
          error?: string | null;
          id?: string;
          provider_message_id?: string | null;
          reminder_offset_min?: number | null;
          sent_at?: string | null;
          skip_reason?: string | null;
          status?: string;
          template: string;
          to_number: string;
          type: string;
        };
        Update: {
          appointment_id?: string | null;
          appointment_starts_at?: string | null;
          business_id?: string;
          created_at?: string;
          error?: string | null;
          id?: string;
          provider_message_id?: string | null;
          reminder_offset_min?: number | null;
          sent_at?: string | null;
          skip_reason?: string | null;
          status?: string;
          template?: string;
          to_number?: string;
          type?: string;
        };
        Relationships: [
          {
            foreignKeyName: "messages_appointment_id_fkey";
            columns: ["appointment_id"];
            isOneToOne: false;
            referencedRelation: "appointments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "messages_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
        ];
      };
      package_usages: {
        Row: {
          appointment_id: string;
          business_id: string;
          customer_package_id: string;
          id: string;
          used_at: string;
        };
        ComputedFields: never;
        Insert: {
          appointment_id: string;
          business_id: string;
          customer_package_id: string;
          id?: string;
          used_at?: string;
        };
        Update: {
          appointment_id?: string;
          business_id?: string;
          customer_package_id?: string;
          id?: string;
          used_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "package_usages_appointment_id_fkey";
            columns: ["appointment_id"];
            isOneToOne: true;
            referencedRelation: "appointments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "package_usages_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "package_usages_customer_package_id_fkey";
            columns: ["customer_package_id"];
            isOneToOne: false;
            referencedRelation: "customer_packages";
            referencedColumns: ["id"];
          },
        ];
      };
      product_events: {
        Row: {
          business_id: string | null;
          created_at: string;
          id: number;
          name: string;
          props: NonNullable<Json>;
        };
        ComputedFields: never;
        Insert: {
          business_id?: string | null;
          created_at?: string;
          id?: never;
          name: string;
          props?: NonNullable<Json>;
        };
        Update: {
          business_id?: string | null;
          created_at?: string;
          id?: never;
          name?: string;
          props?: NonNullable<Json>;
        };
        Relationships: [
          {
            foreignKeyName: "product_events_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
        ];
      };
      rate_limits: {
        Row: {
          count: number;
          key: string;
          window_start: string;
        };
        ComputedFields: never;
        Insert: {
          count?: number;
          key: string;
          window_start: string;
        };
        Update: {
          count?: number;
          key?: string;
          window_start?: string;
        };
        Relationships: [];
      };
      reviews: {
        Row: {
          appointment_id: string;
          author_name: string;
          business_id: string;
          comment: string | null;
          created_at: string;
          id: string;
          is_published: boolean;
          rating: number;
        };
        ComputedFields: never;
        Insert: {
          appointment_id: string;
          author_name: string;
          business_id: string;
          comment?: string | null;
          created_at?: string;
          id?: string;
          is_published?: boolean;
          rating: number;
        };
        Update: {
          appointment_id?: string;
          author_name?: string;
          business_id?: string;
          comment?: string | null;
          created_at?: string;
          id?: string;
          is_published?: boolean;
          rating?: number;
        };
        Relationships: [
          {
            foreignKeyName: "reviews_appointment_id_fkey";
            columns: ["appointment_id"];
            isOneToOne: true;
            referencedRelation: "appointments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reviews_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
        ];
      };
      service_packages: {
        Row: {
          business_id: string;
          created_at: string;
          id: string;
          is_active: boolean;
          name: string;
          price_cents: number;
          service_id: string;
          sessions: number;
          validity_days: number | null;
        };
        ComputedFields: never;
        Insert: {
          business_id: string;
          created_at?: string;
          id?: string;
          is_active?: boolean;
          name: string;
          price_cents: number;
          service_id: string;
          sessions: number;
          validity_days?: number | null;
        };
        Update: {
          business_id?: string;
          created_at?: string;
          id?: string;
          is_active?: boolean;
          name?: string;
          price_cents?: number;
          service_id?: string;
          sessions?: number;
          validity_days?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "service_packages_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "service_packages_service_id_business_id_fkey";
            columns: ["service_id", "business_id"];
            isOneToOne: false;
            referencedRelation: "services";
            referencedColumns: ["id", "business_id"];
          },
        ];
      };
      services: {
        Row: {
          business_id: string;
          created_at: string;
          description: string | null;
          duration_min: number;
          id: string;
          is_active: boolean;
          is_featured: boolean;
          name: string;
          price_cents: number;
          sort_order: number;
        };
        ComputedFields: never;
        Insert: {
          business_id: string;
          created_at?: string;
          description?: string | null;
          duration_min: number;
          id?: string;
          is_active?: boolean;
          is_featured?: boolean;
          name: string;
          price_cents?: number;
          sort_order?: number;
        };
        Update: {
          business_id?: string;
          created_at?: string;
          description?: string | null;
          duration_min?: number;
          id?: string;
          is_active?: boolean;
          is_featured?: boolean;
          name?: string;
          price_cents?: number;
          sort_order?: number;
        };
        Relationships: [
          {
            foreignKeyName: "services_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
        ];
      };
      staff_hours: {
        Row: {
          business_id: string;
          closes_at: string | null;
          id: string;
          is_open: boolean;
          opens_at: string | null;
          staff_member_id: string;
          weekday: number;
        };
        ComputedFields: never;
        Insert: {
          business_id: string;
          closes_at?: string | null;
          id?: string;
          is_open?: boolean;
          opens_at?: string | null;
          staff_member_id: string;
          weekday: number;
        };
        Update: {
          business_id?: string;
          closes_at?: string | null;
          id?: string;
          is_open?: boolean;
          opens_at?: string | null;
          staff_member_id?: string;
          weekday?: number;
        };
        Relationships: [
          {
            foreignKeyName: "staff_hours_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "staff_hours_staff_member_id_business_id_fkey";
            columns: ["staff_member_id", "business_id"];
            isOneToOne: false;
            referencedRelation: "staff_members";
            referencedColumns: ["id", "business_id"];
          },
        ];
      };
      staff_members: {
        Row: {
          business_id: string;
          created_at: string;
          id: string;
          is_active: boolean;
          name: string;
          photo_url: string | null;
          role: string | null;
        };
        ComputedFields: never;
        Insert: {
          business_id: string;
          created_at?: string;
          id?: string;
          is_active?: boolean;
          name: string;
          photo_url?: string | null;
          role?: string | null;
        };
        Update: {
          business_id?: string;
          created_at?: string;
          id?: string;
          is_active?: boolean;
          name?: string;
          photo_url?: string | null;
          role?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "staff_members_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
        ];
      };
      staff_services: {
        Row: {
          business_id: string;
          service_id: string;
          staff_member_id: string;
        };
        ComputedFields: never;
        Insert: {
          business_id: string;
          service_id: string;
          staff_member_id: string;
        };
        Update: {
          business_id?: string;
          service_id?: string;
          staff_member_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "staff_services_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "staff_services_service_id_business_id_fkey";
            columns: ["service_id", "business_id"];
            isOneToOne: false;
            referencedRelation: "services";
            referencedColumns: ["id", "business_id"];
          },
          {
            foreignKeyName: "staff_services_staff_member_id_business_id_fkey";
            columns: ["staff_member_id", "business_id"];
            isOneToOne: false;
            referencedRelation: "staff_members";
            referencedColumns: ["id", "business_id"];
          },
        ];
      };
      subscriptions: {
        Row: {
          business_id: string;
          created_at: string;
          current_period_end: string | null;
          id: string;
          plan: string;
          provider: string;
          provider_customer_id: string | null;
          provider_subscription_id: string | null;
          status: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          business_id: string;
          created_at?: string;
          current_period_end?: string | null;
          id?: string;
          plan: string;
          provider: string;
          provider_customer_id?: string | null;
          provider_subscription_id?: string | null;
          status: string;
          updated_at?: string;
        };
        Update: {
          business_id?: string;
          created_at?: string;
          current_period_end?: string | null;
          id?: string;
          plan?: string;
          provider?: string;
          provider_customer_id?: string | null;
          provider_subscription_id?: string | null;
          status?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "subscriptions_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
        ];
      };
      support_requests: {
        Row: {
          business_id: string;
          created_at: string;
          id: string;
          message: string;
          priority: boolean;
          status: string;
          topic: string;
        };
        ComputedFields: never;
        Insert: {
          business_id: string;
          created_at?: string;
          id?: string;
          message: string;
          priority?: boolean;
          status?: string;
          topic: string;
        };
        Update: {
          business_id?: string;
          created_at?: string;
          id?: string;
          message?: string;
          priority?: boolean;
          status?: string;
          topic?: string;
        };
        Relationships: [
          {
            foreignKeyName: "support_requests_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
        ];
      };
      time_blocks: {
        Row: {
          business_id: string;
          created_at: string;
          ends_at: string;
          id: string;
          reason: string | null;
          staff_member_id: string | null;
          starts_at: string;
        };
        ComputedFields: never;
        Insert: {
          business_id: string;
          created_at?: string;
          ends_at: string;
          id?: string;
          reason?: string | null;
          staff_member_id?: string | null;
          starts_at: string;
        };
        Update: {
          business_id?: string;
          created_at?: string;
          ends_at?: string;
          id?: string;
          reason?: string | null;
          staff_member_id?: string | null;
          starts_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "time_blocks_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "time_blocks_staff_member_id_business_id_fkey";
            columns: ["staff_member_id", "business_id"];
            isOneToOne: false;
            referencedRelation: "staff_members";
            referencedColumns: ["id", "business_id"];
          },
        ];
      };
      waitlist_entries: {
        Row: {
          business_id: string;
          created_at: string;
          customer_name: string;
          customer_whatsapp: string;
          desired_date: string;
          id: string;
          notified_at: string | null;
          period: string;
          service_id: string;
          staff_member_id: string | null;
          status: string;
        };
        ComputedFields: never;
        Insert: {
          business_id: string;
          created_at?: string;
          customer_name: string;
          customer_whatsapp: string;
          desired_date: string;
          id?: string;
          notified_at?: string | null;
          period?: string;
          service_id: string;
          staff_member_id?: string | null;
          status?: string;
        };
        Update: {
          business_id?: string;
          created_at?: string;
          customer_name?: string;
          customer_whatsapp?: string;
          desired_date?: string;
          id?: string;
          notified_at?: string | null;
          period?: string;
          service_id?: string;
          staff_member_id?: string | null;
          status?: string;
        };
        Relationships: [
          {
            foreignKeyName: "waitlist_entries_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "waitlist_entries_service_id_business_id_fkey";
            columns: ["service_id", "business_id"];
            isOneToOne: false;
            referencedRelation: "services";
            referencedColumns: ["id", "business_id"];
          },
          {
            foreignKeyName: "waitlist_entries_staff_member_id_business_id_fkey";
            columns: ["staff_member_id", "business_id"];
            isOneToOne: false;
            referencedRelation: "staff_members";
            referencedColumns: ["id", "business_id"];
          },
        ];
      };
    };
    Views: {
      customer_summaries: {
        Row: {
          business_id: string;
          created_at: string;
          id: string;
          last_appointment_at: string | null;
          last_visit_at: string | null;
          name: string;
          no_shows: number | null;
          opted_out_at: string | null;
          total_spent_cents: number | null;
          upcoming: number | null;
          visits: number | null;
          whatsapp: string;
        };
        ComputedFields: never;
        Relationships: [
          {
            foreignKeyName: "customers_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Functions: {
      consume_message_quota: {
        Args: { p_business_id: string; p_limit: number; p_period: string };
        Returns: number;
      };
      erase_customer: { Args: { p_customer_id: string }; Returns: undefined };
      gen_manage_code: { Args: Record<PropertyKey, never>; Returns: string };
      hit_rate_limit: {
        Args: { p_key: string; p_limit: number; p_window_seconds: number };
        Returns: boolean;
      };
      increment_message_usage: {
        Args: { p_business_id: string; p_period: string };
        Returns: number;
      };
      is_business_owner: { Args: { p_business_id: string }; Returns: boolean };
      metrics_funnel: {
        Args: { p_from: string; p_to: string };
        Returns: {
          step: string;
          total: number;
        }[];
      };
      my_referrals: {
        Args: Record<PropertyKey, never>;
        Returns: {
          active: boolean;
          created_at: string;
          name: string;
        }[];
      };
      owns_media_path: { Args: { p_name: string }; Returns: boolean };
      release_message_quota: {
        Args: { p_business_id: string; p_period: string };
        Returns: undefined;
      };
      save_business_hours: { Args: { p_business_id: string; p_days: Json }; Returns: undefined };
      save_staff_hours: { Args: { p_days: Json; p_staff_member_id: string }; Returns: undefined };
      set_staff_services: {
        Args: { p_service_ids: string[]; p_staff_member_id: string };
        Returns: undefined;
      };
      use_package_session: {
        Args: { p_appointment_id: string; p_customer_package_id: string };
        Returns: number;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const;
