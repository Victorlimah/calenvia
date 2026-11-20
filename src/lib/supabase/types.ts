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
      admin_audit_log: {
        Row: {
          action: string;
          admin_email: string;
          admin_user_id: string | null;
          business_id: string | null;
          changes: NonNullable<Json>;
          created_at: string;
          id: string;
        };
        ComputedFields: never;
        Insert: {
          action: string;
          admin_email: string;
          admin_user_id?: string | null;
          business_id?: string | null;
          changes?: NonNullable<Json>;
          created_at?: string;
          id?: string;
        };
        Update: {
          action?: string;
          admin_email?: string;
          admin_user_id?: string | null;
          business_id?: string | null;
          changes?: NonNullable<Json>;
          created_at?: string;
          id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "admin_audit_log_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
        ];
      };
      admin_business_notes: {
        Row: {
          business_id: string;
          notes: string;
          updated_at: string;
          updated_by: string | null;
        };
        ComputedFields: never;
        Insert: {
          business_id: string;
          notes?: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          business_id?: string;
          notes?: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "admin_business_notes_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: true;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
        ];
      };
      appointments: {
        Row: {
          business_id: string;
          canceled_at: string | null;
          created_at: string;
          created_by_user_id: string | null;
          customer_id: string;
          customer_name: string;
          customer_whatsapp: string;
          ends_at: string;
          id: string;
          manage_code: string;
          messages_enabled: boolean;
          notes: string | null;
          payment_method: string | null;
          price_cents: number;
          service_id: string;
          source: string;
          staff_member_id: string;
          starts_at: string;
          status: string;
          updated_by_user_id: string | null;
        };
        ComputedFields: never;
        Insert: {
          business_id: string;
          canceled_at?: string | null;
          created_at?: string;
          created_by_user_id?: string | null;
          customer_id: string;
          customer_name: string;
          customer_whatsapp: string;
          ends_at: string;
          id?: string;
          manage_code?: string;
          messages_enabled?: boolean;
          notes?: string | null;
          payment_method?: string | null;
          price_cents?: number;
          service_id: string;
          source?: string;
          staff_member_id: string;
          starts_at: string;
          status?: string;
          updated_by_user_id?: string | null;
        };
        Update: {
          business_id?: string;
          canceled_at?: string | null;
          created_at?: string;
          created_by_user_id?: string | null;
          customer_id?: string;
          customer_name?: string;
          customer_whatsapp?: string;
          ends_at?: string;
          id?: string;
          manage_code?: string;
          messages_enabled?: boolean;
          notes?: string | null;
          payment_method?: string | null;
          price_cents?: number;
          service_id?: string;
          source?: string;
          staff_member_id?: string;
          starts_at?: string;
          status?: string;
          updated_by_user_id?: string | null;
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
      billing_addons: {
        Row: {
          code: string;
          created_at: string;
          description: string;
          id: string;
          is_active: boolean;
          kind: string;
          name: string;
          plans: string[];
          sort_order: number;
          unit_amount: number | null;
        };
        ComputedFields: never;
        Insert: {
          code: string;
          created_at?: string;
          description?: string;
          id?: string;
          is_active?: boolean;
          kind: string;
          name: string;
          plans?: string[];
          sort_order?: number;
          unit_amount?: number | null;
        };
        Update: {
          code?: string;
          created_at?: string;
          description?: string;
          id?: string;
          is_active?: boolean;
          kind?: string;
          name?: string;
          plans?: string[];
          sort_order?: number;
          unit_amount?: number | null;
        };
        Relationships: [];
      };
      billing_events: {
        Row: {
          business_id: string | null;
          error: string | null;
          id: string;
          payload: NonNullable<Json>;
          processed_at: string | null;
          provider: string;
          provider_event_id: string;
          received_at: string;
          type: string;
        };
        ComputedFields: never;
        Insert: {
          business_id?: string | null;
          error?: string | null;
          id?: string;
          payload?: NonNullable<Json>;
          processed_at?: string | null;
          provider: string;
          provider_event_id: string;
          received_at?: string;
          type: string;
        };
        Update: {
          business_id?: string | null;
          error?: string | null;
          id?: string;
          payload?: NonNullable<Json>;
          processed_at?: string | null;
          provider?: string;
          provider_event_id?: string;
          received_at?: string;
          type?: string;
        };
        Relationships: [
          {
            foreignKeyName: "billing_events_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
        ];
      };
      billing_prices: {
        Row: {
          addon_id: string | null;
          amount_cents: number;
          created_at: string;
          created_by: string | null;
          currency: string;
          id: string;
          interval: string;
          is_current: boolean;
          plan: string | null;
          product: string;
          provider_price_id: string | null;
        };
        ComputedFields: never;
        Insert: {
          addon_id?: string | null;
          amount_cents: number;
          created_at?: string;
          created_by?: string | null;
          currency?: string;
          id?: string;
          interval?: string;
          is_current?: boolean;
          plan?: string | null;
          product: string;
          provider_price_id?: string | null;
        };
        Update: {
          addon_id?: string | null;
          amount_cents?: number;
          created_at?: string;
          created_by?: string | null;
          currency?: string;
          id?: string;
          interval?: string;
          is_current?: boolean;
          plan?: string | null;
          product?: string;
          provider_price_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "billing_prices_addon_id_fkey";
            columns: ["addon_id"];
            isOneToOne: false;
            referencedRelation: "billing_addons";
            referencedColumns: ["id"];
          },
        ];
      };
      business_addons: {
        Row: {
          addon_id: string;
          business_id: string;
          created_at: string;
          created_by: string | null;
          custom_amount_cents: number | null;
          custom_label: string | null;
          id: string;
          is_custom: boolean;
          note: string | null;
          price_id: string | null;
          provider_item_id: string | null;
          quantity: number;
          removed_at: string | null;
        };
        ComputedFields: never;
        Insert: {
          addon_id: string;
          business_id: string;
          created_at?: string;
          created_by?: string | null;
          custom_amount_cents?: number | null;
          custom_label?: string | null;
          id?: string;
          is_custom?: boolean;
          note?: string | null;
          price_id?: string | null;
          provider_item_id?: string | null;
          quantity?: number;
          removed_at?: string | null;
        };
        Update: {
          addon_id?: string;
          business_id?: string;
          created_at?: string;
          created_by?: string | null;
          custom_amount_cents?: number | null;
          custom_label?: string | null;
          id?: string;
          is_custom?: boolean;
          note?: string | null;
          price_id?: string | null;
          provider_item_id?: string | null;
          quantity?: number;
          removed_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "business_addons_addon_id_fkey";
            columns: ["addon_id"];
            isOneToOne: false;
            referencedRelation: "billing_addons";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "business_addons_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "business_addons_price_id_fkey";
            columns: ["price_id"];
            isOneToOne: false;
            referencedRelation: "billing_prices";
            referencedColumns: ["id"];
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
      business_invitations: {
        Row: {
          accepted_at: string | null;
          accepted_by: string | null;
          business_id: string;
          created_at: string;
          email: string | null;
          expires_at: string;
          id: string;
          invited_by: string | null;
          revoked_at: string | null;
          role: string;
          staff_member_id: string | null;
          token_hash: string;
        };
        ComputedFields: never;
        Insert: {
          accepted_at?: string | null;
          accepted_by?: string | null;
          business_id: string;
          created_at?: string;
          email?: string | null;
          expires_at?: string;
          id?: string;
          invited_by?: string | null;
          revoked_at?: string | null;
          role: string;
          staff_member_id?: string | null;
          token_hash: string;
        };
        Update: {
          accepted_at?: string | null;
          accepted_by?: string | null;
          business_id?: string;
          created_at?: string;
          email?: string | null;
          expires_at?: string;
          id?: string;
          invited_by?: string | null;
          revoked_at?: string | null;
          role?: string;
          staff_member_id?: string | null;
          token_hash?: string;
        };
        Relationships: [
          {
            foreignKeyName: "business_invitations_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "business_invitations_staff_member_id_business_id_fkey";
            columns: ["staff_member_id", "business_id"];
            isOneToOne: false;
            referencedRelation: "staff_members";
            referencedColumns: ["id", "business_id"];
          },
        ];
      };
      business_members: {
        Row: {
          business_id: string;
          created_at: string;
          display_name: string | null;
          email: string | null;
          id: string;
          invited_by: string | null;
          removed_at: string | null;
          role: string;
          staff_member_id: string | null;
          status: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          business_id: string;
          created_at?: string;
          display_name?: string | null;
          email?: string | null;
          id?: string;
          invited_by?: string | null;
          removed_at?: string | null;
          role: string;
          staff_member_id?: string | null;
          status?: string;
          user_id: string;
        };
        Update: {
          business_id?: string;
          created_at?: string;
          display_name?: string | null;
          email?: string | null;
          id?: string;
          invited_by?: string | null;
          removed_at?: string | null;
          role?: string;
          staff_member_id?: string | null;
          status?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "business_members_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "business_members_staff_member_id_business_id_fkey";
            columns: ["staff_member_id", "business_id"];
            isOneToOne: false;
            referencedRelation: "staff_members";
            referencedColumns: ["id", "business_id"];
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
          addon_members: number;
          addon_messages: number;
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
          member_limit_override: number | null;
          message_limit_override: number | null;
          message_texts: NonNullable<Json>;
          min_notice_min: number;
          name: string;
          onboarding_completed_at: string | null;
          owner_id: string | null;
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
          addon_members?: number;
          addon_messages?: number;
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
          member_limit_override?: number | null;
          message_limit_override?: number | null;
          message_texts?: NonNullable<Json>;
          min_notice_min?: number;
          name: string;
          onboarding_completed_at?: string | null;
          owner_id?: string | null;
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
          addon_members?: number;
          addon_messages?: number;
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
          member_limit_override?: number | null;
          message_limit_override?: number | null;
          message_texts?: NonNullable<Json>;
          min_notice_min?: number;
          name?: string;
          onboarding_completed_at?: string | null;
          owner_id?: string | null;
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
      checkout_sessions: {
        Row: {
          addons: NonNullable<Json>;
          amount_cents: number;
          business_id: string;
          completed_at: string | null;
          created_at: string;
          created_by: string | null;
          id: string;
          plan: string;
          price_id: string;
          provider: string;
          provider_session_id: string | null;
          status: string;
        };
        ComputedFields: never;
        Insert: {
          addons?: NonNullable<Json>;
          amount_cents: number;
          business_id: string;
          completed_at?: string | null;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          plan: string;
          price_id: string;
          provider: string;
          provider_session_id?: string | null;
          status?: string;
        };
        Update: {
          addons?: NonNullable<Json>;
          amount_cents?: number;
          business_id?: string;
          completed_at?: string | null;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          plan?: string;
          price_id?: string;
          provider?: string;
          provider_session_id?: string | null;
          status?: string;
        };
        Relationships: [
          {
            foreignKeyName: "checkout_sessions_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "checkout_sessions_price_id_fkey";
            columns: ["price_id"];
            isOneToOne: false;
            referencedRelation: "billing_prices";
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
      invoices: {
        Row: {
          amount_cents: number;
          business_id: string;
          created_at: string;
          hosted_url: string | null;
          id: string;
          lines: NonNullable<Json>;
          paid_at: string | null;
          period_end: string | null;
          period_start: string | null;
          provider: string;
          provider_invoice_id: string;
          status: string;
        };
        ComputedFields: never;
        Insert: {
          amount_cents: number;
          business_id: string;
          created_at?: string;
          hosted_url?: string | null;
          id?: string;
          lines?: NonNullable<Json>;
          paid_at?: string | null;
          period_end?: string | null;
          period_start?: string | null;
          provider: string;
          provider_invoice_id: string;
          status: string;
        };
        Update: {
          amount_cents?: number;
          business_id?: string;
          created_at?: string;
          hosted_url?: string | null;
          id?: string;
          lines?: NonNullable<Json>;
          paid_at?: string | null;
          period_end?: string | null;
          period_start?: string | null;
          provider?: string;
          provider_invoice_id?: string;
          status?: string;
        };
        Relationships: [
          {
            foreignKeyName: "invoices_business_id_fkey";
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
      owner_invitations: {
        Row: {
          accepted_at: string | null;
          accepted_by: string | null;
          business_id: string;
          canceled_at: string | null;
          created_at: string;
          created_by: string | null;
          email: string;
          expires_at: string;
          id: string;
          opened_at: string | null;
          owner_name: string;
          token_hash: string;
          updated_at: string;
          whatsapp: string | null;
        };
        ComputedFields: never;
        Insert: {
          accepted_at?: string | null;
          accepted_by?: string | null;
          business_id: string;
          canceled_at?: string | null;
          created_at?: string;
          created_by?: string | null;
          email: string;
          expires_at?: string;
          id?: string;
          opened_at?: string | null;
          owner_name: string;
          token_hash: string;
          updated_at?: string;
          whatsapp?: string | null;
        };
        Update: {
          accepted_at?: string | null;
          accepted_by?: string | null;
          business_id?: string;
          canceled_at?: string | null;
          created_at?: string;
          created_by?: string | null;
          email?: string;
          expires_at?: string;
          id?: string;
          opened_at?: string | null;
          owner_name?: string;
          token_hash?: string;
          updated_at?: string;
          whatsapp?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "owner_invitations_business_id_fkey";
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
      platform_admins: {
        Row: {
          created_at: string;
          note: string | null;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          note?: string | null;
          user_id: string;
        };
        Update: {
          created_at?: string;
          note?: string | null;
          user_id?: string;
        };
        Relationships: [];
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
          cancel_at_period_end: boolean;
          canceled_at: string | null;
          created_at: string;
          current_period_end: string | null;
          current_period_start: string | null;
          id: string;
          past_due_since: string | null;
          pending_plan: string | null;
          pending_price_id: string | null;
          plan: string;
          price_id: string | null;
          provider: string;
          provider_customer_id: string | null;
          provider_item_id: string | null;
          provider_subscription_id: string | null;
          status: string;
          trial_end: string | null;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          business_id: string;
          cancel_at_period_end?: boolean;
          canceled_at?: string | null;
          created_at?: string;
          current_period_end?: string | null;
          current_period_start?: string | null;
          id?: string;
          past_due_since?: string | null;
          pending_plan?: string | null;
          pending_price_id?: string | null;
          plan: string;
          price_id?: string | null;
          provider: string;
          provider_customer_id?: string | null;
          provider_item_id?: string | null;
          provider_subscription_id?: string | null;
          status: string;
          trial_end?: string | null;
          updated_at?: string;
        };
        Update: {
          business_id?: string;
          cancel_at_period_end?: boolean;
          canceled_at?: string | null;
          created_at?: string;
          current_period_end?: string | null;
          current_period_start?: string | null;
          id?: string;
          past_due_since?: string | null;
          pending_plan?: string | null;
          pending_price_id?: string | null;
          plan?: string;
          price_id?: string | null;
          provider?: string;
          provider_customer_id?: string | null;
          provider_item_id?: string | null;
          provider_subscription_id?: string | null;
          status?: string;
          trial_end?: string | null;
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
          {
            foreignKeyName: "subscriptions_pending_price_id_fkey";
            columns: ["pending_price_id"];
            isOneToOne: false;
            referencedRelation: "billing_prices";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "subscriptions_price_id_fkey";
            columns: ["price_id"];
            isOneToOne: false;
            referencedRelation: "billing_prices";
            referencedColumns: ["id"];
          },
        ];
      };
      support_requests: {
        Row: {
          admin_reply: string | null;
          answered_at: string | null;
          business_id: string;
          created_at: string;
          id: string;
          message: string;
          priority: boolean;
          status: string;
          topic: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          admin_reply?: string | null;
          answered_at?: string | null;
          business_id: string;
          created_at?: string;
          id?: string;
          message: string;
          priority?: boolean;
          status?: string;
          topic: string;
          updated_at?: string;
        };
        Update: {
          admin_reply?: string | null;
          answered_at?: string | null;
          business_id?: string;
          created_at?: string;
          id?: string;
          message?: string;
          priority?: boolean;
          status?: string;
          topic?: string;
          updated_at?: string;
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
      accept_owner_invitation: {
        Args: { p_token_hash: string; p_user_id: string };
        Returns: string;
      };
      admin_business_directory: {
        Args: {
          p_city?: string;
          p_limit?: number;
          p_offset?: number;
          p_plan?: string;
          p_search?: string;
          p_segment?: string;
          p_sort?: string;
          p_status?: string;
        };
        Returns: {
          address: string;
          appointments_this_month: number;
          created_at: string;
          id: string;
          is_courtesy: boolean;
          member_limit_override: number;
          members: number;
          message_limit_override: number;
          messages_this_month: number;
          monthly_cents: number;
          name: string;
          onboarding_completed_at: string;
          owner_email: string;
          owner_last_sign_in_at: string;
          plan: string;
          plan_status: string;
          segment: string;
          slug: string;
          total_count: number;
          whatsapp: string;
        }[];
      };
      admin_business_list: {
        Args: {
          p_limit?: number;
          p_offset?: number;
          p_plan?: string;
          p_search?: string;
          p_status?: string;
        };
        Returns: {
          created_at: string;
          id: string;
          member_limit_override: number;
          members: number;
          message_limit_override: number;
          messages_this_month: number;
          name: string;
          onboarding_completed_at: string;
          owner_email: string;
          plan: string;
          plan_status: string;
          slug: string;
          total_count: number;
        }[];
      };
      admin_business_monthly_cents: { Args: { p_business_id: string }; Returns: number };
      admin_message_failures_summary: {
        Args: { p_business_id?: string; p_limit?: number; p_since: string };
        Returns: {
          error: string;
          total: number;
        }[];
      };
      admin_metrics_overview: {
        Args: Record<PropertyKey, never>;
        Returns: {
          appointments_last_30d: Json;
          businesses_total: number;
          by_plan_status: Json;
          messages_by_status: Json;
          messages_this_month: number;
          new_businesses_by_week: Json;
          onboarding_completed_total: number;
        }[];
      };
      admin_pending_counts: {
        Args: Record<PropertyKey, never>;
        Returns: {
          failed_messages_7d: number;
          past_due: number;
          pending_activation: number;
          support_open: number;
          suspended: number;
        }[];
      };
      appointment_prices: {
        Args: { p_business_id: string; p_ids: string[] };
        Returns: {
          id: string;
          price_cents: number;
        }[];
      };
      appointment_stats: {
        Args: { p_business_id: string; p_from: string; p_to: string };
        Returns: {
          appointments: number;
          day: string;
          minutes: number;
          payment_method: string;
          revenue_cents: number;
          service_id: string;
          source: string;
          staff_member_id: string;
          status: string;
        }[];
      };
      auth_user_id_by_email: { Args: { p_email: string }; Returns: string };
      consume_message_quota: {
        Args: { p_business_id: string; p_limit: number; p_period: string };
        Returns: number;
      };
      current_prices: {
        Args: Record<PropertyKey, never>;
        Returns: {
          addon_code: string;
          addon_description: string;
          addon_id: string;
          addon_kind: string;
          addon_name: string;
          addon_plans: string[];
          addon_sort_order: number;
          addon_unit_amount: number;
          amount_cents: number;
          plan: string;
          price_id: string;
          product: string;
          provider_price_id: string;
        }[];
      };
      customer_visit_stats: {
        Args: { p_business_id: string };
        Returns: {
          customer_id: string;
          name: string;
          opted_out: boolean;
          visit_cents: number[];
          visit_days: string[];
          whatsapp: string;
        }[];
      };
      erase_customer: { Args: { p_customer_id: string }; Returns: undefined };
      finance_entry_stats: {
        Args: { p_business_id: string; p_from: string; p_to: string };
        Returns: {
          amount_cents: number;
          category: string;
          day: string;
          kind: string;
        }[];
      };
      gen_manage_code: { Args: Record<PropertyKey, never>; Returns: string };
      has_perm: { Args: { p_business_id: string; p_perm: string }; Returns: boolean };
      hit_rate_limit: {
        Args: { p_key: string; p_limit: number; p_window_seconds: number };
        Returns: boolean;
      };
      increment_message_usage: {
        Args: { p_business_id: string; p_period: string };
        Returns: number;
      };
      is_business_owner: { Args: { p_business_id: string }; Returns: boolean };
      is_member: { Args: { p_business_id: string }; Returns: boolean };
      member_role: { Args: { p_business_id: string }; Returns: string };
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
      my_staff_member_id: { Args: { p_business_id: string }; Returns: string };
      owns_media_path: { Args: { p_name: string }; Returns: boolean };
      recompute_business_addons: { Args: { p_business_id: string }; Returns: undefined };
      release_message_quota: {
        Args: { p_business_id: string; p_period: string };
        Returns: undefined;
      };
      save_business_hours: { Args: { p_business_id: string; p_days: Json }; Returns: undefined };
      save_staff_hours: { Args: { p_days: Json; p_staff_member_id: string }; Returns: undefined };
      set_appointment_payment: {
        Args: { p_appointment_id: string; p_method: string };
        Returns: undefined;
      };
      set_appointment_status: {
        Args: { p_appointment_id: string; p_status: string };
        Returns: undefined;
      };
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
