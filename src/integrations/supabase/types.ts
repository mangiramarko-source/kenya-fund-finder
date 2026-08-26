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
      ad_events: {
        Row: {
          ad_id: string
          created_at: string
          event_type: string
          id: string
          page_path: string | null
          session_id: string | null
        }
        Insert: {
          ad_id: string
          created_at?: string
          event_type?: string
          id?: string
          page_path?: string | null
          session_id?: string | null
        }
        Update: {
          ad_id?: string
          created_at?: string
          event_type?: string
          id?: string
          page_path?: string | null
          session_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ad_events_ad_id_fkey"
            columns: ["ad_id"]
            isOneToOne: false
            referencedRelation: "ads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ad_events_ad_id_fkey"
            columns: ["ad_id"]
            isOneToOne: false
            referencedRelation: "ads_public"
            referencedColumns: ["id"]
          },
        ]
      }
      ads: {
        Row: {
          click_url: string
          created_at: string
          created_by: string | null
          description: string
          end_date: string | null
          id: string
          is_active: boolean
          media_type: string
          media_url: string
          placement: string
          start_date: string | null
          title: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          click_url?: string
          created_at?: string
          created_by?: string | null
          description?: string
          end_date?: string | null
          id?: string
          is_active?: boolean
          media_type?: string
          media_url?: string
          placement?: string
          start_date?: string | null
          title: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          click_url?: string
          created_at?: string
          created_by?: string | null
          description?: string
          end_date?: string | null
          id?: string
          is_active?: boolean
          media_type?: string
          media_url?: string
          placement?: string
          start_date?: string | null
          title?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      auth_gate_clicks: {
        Row: {
          action: string
          created_at: string
          id: string
          page_path: string
          session_id: string | null
          source: string
        }
        Insert: {
          action?: string
          created_at?: string
          id?: string
          page_path: string
          session_id?: string | null
          source: string
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          page_path?: string
          session_id?: string | null
          source?: string
        }
        Relationships: []
      }
      change_log: {
        Row: {
          action: string
          changed_at: string
          changed_by: string | null
          entity_id: string
          entity_type: string
          id: string
          new_values: Json | null
          old_values: Json | null
        }
        Insert: {
          action: string
          changed_at?: string
          changed_by?: string | null
          entity_id: string
          entity_type: string
          id?: string
          new_values?: Json | null
          old_values?: Json | null
        }
        Update: {
          action?: string
          changed_at?: string
          changed_by?: string | null
          entity_id?: string
          entity_type?: string
          id?: string
          new_values?: Json | null
          old_values?: Json | null
        }
        Relationships: []
      }
      commodities: {
        Row: {
          id: string
          is_active: boolean
          name: string
          previous_price: number | null
          price: number
          sort_order: number
          symbol: string
          unit: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          id?: string
          is_active?: boolean
          name: string
          previous_price?: number | null
          price: number
          sort_order?: number
          symbol: string
          unit?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          id?: string
          is_active?: boolean
          name?: string
          previous_price?: number | null
          price?: number
          sort_order?: number
          symbol?: string
          unit?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      commodity_price_history: {
        Row: {
          commodity_id: string
          created_at: string
          id: string
          price: number
          snapshot_date: string
        }
        Insert: {
          commodity_id: string
          created_at?: string
          id?: string
          price: number
          snapshot_date?: string
        }
        Update: {
          commodity_id?: string
          created_at?: string
          id?: string
          price?: number
          snapshot_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "commodity_price_history_commodity_id_fkey"
            columns: ["commodity_id"]
            isOneToOne: false
            referencedRelation: "commodities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commodity_price_history_commodity_id_fkey"
            columns: ["commodity_id"]
            isOneToOne: false
            referencedRelation: "commodities_public"
            referencedColumns: ["id"]
          },
        ]
      }
      communication_delivery_events: {
        Row: {
          created_at: string
          event_created_at: string
          event_type: string
          id: string
          provider_message_id: string
          webhook_event_id: string
        }
        Insert: {
          created_at?: string
          event_created_at: string
          event_type: string
          id?: string
          provider_message_id: string
          webhook_event_id: string
        }
        Update: {
          created_at?: string
          event_created_at?: string
          event_type?: string
          id?: string
          provider_message_id?: string
          webhook_event_id?: string
        }
        Relationships: []
      }
      communication_outbox: {
        Row: {
          attempts: number
          category: string
          claim_token: string | null
          created_at: string
          delivered_at: string | null
          delivery_event_at: string | null
          delivery_status: string
          failure_reason: string | null
          id: string
          idempotency_key: string
          lease_expires_at: string | null
          next_attempt_at: string
          payload: Json
          provider_request: Json | null
          provider_request_frozen_at: string | null
          provider_message_id: string | null
          recipient_email: string | null
          sent_at: string | null
          status: string
          submission_started_at: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          attempts?: number
          category: string
          claim_token?: string | null
          created_at?: string
          delivered_at?: string | null
          delivery_event_at?: string | null
          delivery_status?: string
          failure_reason?: string | null
          id?: string
          idempotency_key: string
          lease_expires_at?: string | null
          next_attempt_at?: string
          payload?: Json
          provider_request?: Json | null
          provider_request_frozen_at?: string | null
          provider_message_id?: string | null
          recipient_email?: string | null
          sent_at?: string | null
          status?: string
          submission_started_at?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          attempts?: number
          category?: string
          claim_token?: string | null
          created_at?: string
          delivered_at?: string | null
          delivery_event_at?: string | null
          delivery_status?: string
          failure_reason?: string | null
          id?: string
          idempotency_key?: string
          lease_expires_at?: string | null
          next_attempt_at?: string
          payload?: Json
          provider_request?: Json | null
          provider_request_frozen_at?: string | null
          provider_message_id?: string | null
          recipient_email?: string | null
          sent_at?: string | null
          status?: string
          submission_started_at?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      communication_preferences: {
        Row: {
          created_at: string
          email_welcome_completed: boolean
          market_brief_email: boolean
          market_brief_email_consented_at: string | null
          price_alert_email: boolean
          price_alert_email_consented_at: string | null
          price_alert_inapp: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email_welcome_completed?: boolean
          market_brief_email?: boolean
          market_brief_email_consented_at?: string | null
          price_alert_email?: boolean
          price_alert_email_consented_at?: string | null
          price_alert_inapp?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email_welcome_completed?: boolean
          market_brief_email?: boolean
          market_brief_email_consented_at?: string | null
          price_alert_email?: boolean
          price_alert_email_consented_at?: string | null
          price_alert_inapp?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      communication_suppressions: {
        Row: {
          created_at: string
          email_normalized: string
          id: string
          lifted_at: string | null
          reason: string
          scope: string
          source: string
        }
        Insert: {
          created_at?: string
          email_normalized: string
          id?: string
          lifted_at?: string | null
          reason: string
          scope: string
          source?: string
        }
        Update: {
          created_at?: string
          email_normalized?: string
          id?: string
          lifted_at?: string | null
          reason?: string
          scope?: string
          source?: string
        }
        Relationships: []
      }
      corporate_actions: {
        Row: {
          action_date: string
          action_type: string
          created_at: string | null
          details: string | null
          id: string
          stock_id: string
        }
        Insert: {
          action_date: string
          action_type: string
          created_at?: string | null
          details?: string | null
          id?: string
          stock_id: string
        }
        Update: {
          action_date?: string
          action_type?: string
          created_at?: string | null
          details?: string | null
          id?: string
          stock_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "corporate_actions_stock_id_fkey"
            columns: ["stock_id"]
            isOneToOne: false
            referencedRelation: "stocks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "corporate_actions_stock_id_fkey"
            columns: ["stock_id"]
            isOneToOne: false
            referencedRelation: "stocks_public"
            referencedColumns: ["id"]
          },
        ]
      }
      exchange_rate_history: {
        Row: {
          created_at: string
          exchange_rate_id: string
          id: string
          rate: number
          snapshot_date: string
        }
        Insert: {
          created_at?: string
          exchange_rate_id: string
          id?: string
          rate: number
          snapshot_date?: string
        }
        Update: {
          created_at?: string
          exchange_rate_id?: string
          id?: string
          rate?: number
          snapshot_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "exchange_rate_history_exchange_rate_id_fkey"
            columns: ["exchange_rate_id"]
            isOneToOne: false
            referencedRelation: "exchange_rates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exchange_rate_history_exchange_rate_id_fkey"
            columns: ["exchange_rate_id"]
            isOneToOne: false
            referencedRelation: "exchange_rates_public"
            referencedColumns: ["id"]
          },
        ]
      }
      exchange_rates: {
        Row: {
          currency_code: string
          currency_name: string
          id: string
          is_active: boolean
          previous_rate: number | null
          rate: number
          sort_order: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          currency_code: string
          currency_name: string
          id?: string
          is_active?: boolean
          previous_rate?: number | null
          rate: number
          sort_order?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          currency_code?: string
          currency_name?: string
          id?: string
          is_active?: boolean
          previous_rate?: number | null
          rate?: number
          sort_order?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      fund_historical_yields: {
        Row: {
          fund_id: string
          id: string
          month: string
          yield: number
        }
        Insert: {
          fund_id: string
          id?: string
          month: string
          yield: number
        }
        Update: {
          fund_id?: string
          id?: string
          month?: string
          yield?: number
        }
        Relationships: [
          {
            foreignKeyName: "fund_historical_yields_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "funds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fund_historical_yields_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "funds_public"
            referencedColumns: ["id"]
          },
        ]
      }
      fund_yield_snapshots: {
        Row: {
          annual_yield: number
          created_at: string
          daily_yield: number
          fund_id: string
          id: string
          snapshot_date: string
        }
        Insert: {
          annual_yield: number
          created_at?: string
          daily_yield: number
          fund_id: string
          id?: string
          snapshot_date?: string
        }
        Update: {
          annual_yield?: number
          created_at?: string
          daily_yield?: number
          fund_id?: string
          id?: string
          snapshot_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "fund_yield_snapshots_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "funds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fund_yield_snapshots_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "funds_public"
            referencedColumns: ["id"]
          },
        ]
      }
      funds: {
        Row: {
          annual_yield: number
          cma_licensed: boolean
          created_at: string
          created_by: string | null
          daily_yield: number
          description: string
          fact_sheet_date: string | null
          fund_type: string
          id: string
          is_published: boolean
          logo_url: string | null
          management_fee: number
          manager: string
          minimum_investment: number
          name: string
          seven_day_yield: number
          slug: string
          source_url: string | null
          thirty_day_yield: number
          updated_at: string
          updated_by: string | null
          website: string
          withdrawal_time: string
          yield_unit: string
        }
        Insert: {
          annual_yield: number
          cma_licensed?: boolean
          created_at?: string
          created_by?: string | null
          daily_yield?: number
          description?: string
          fact_sheet_date?: string | null
          fund_type?: string
          id?: string
          is_published?: boolean
          logo_url?: string | null
          management_fee: number
          manager: string
          minimum_investment: number
          name: string
          seven_day_yield: number
          slug: string
          source_url?: string | null
          thirty_day_yield: number
          updated_at?: string
          updated_by?: string | null
          website?: string
          withdrawal_time: string
          yield_unit?: string
        }
        Update: {
          annual_yield?: number
          cma_licensed?: boolean
          created_at?: string
          created_by?: string | null
          daily_yield?: number
          description?: string
          fact_sheet_date?: string | null
          fund_type?: string
          id?: string
          is_published?: boolean
          logo_url?: string | null
          management_fee?: number
          manager?: string
          minimum_investment?: number
          name?: string
          seven_day_yield?: number
          slug?: string
          source_url?: string | null
          thirty_day_yield?: number
          updated_at?: string
          updated_by?: string | null
          website?: string
          withdrawal_time?: string
          yield_unit?: string
        }
        Relationships: []
      }
      macro_rates: {
        Row: {
          created_at: string
          id: string
          metric: string
          observation_date: string
          source: string
          source_url: string | null
          value: number
        }
        Insert: {
          created_at?: string
          id?: string
          metric: string
          observation_date: string
          source: string
          source_url?: string | null
          value: number
        }
        Update: {
          created_at?: string
          id?: string
          metric?: string
          observation_date?: string
          source?: string
          source_url?: string | null
          value?: number
        }
        Relationships: []
      }
      market_overviews: {
        Row: {
          ai_summary: string | null
          blocked_reasons: Json
          breadth_direction: string | null
          created_at: string
          deterministic_summary: string | null
          fx_fresh_at: string | null
          fx_snapshot: Json
          gainers_count: number
          generated_at: string | null
          generation_metadata: Json
          id: string
          losers_count: number
          market_date: string
          narrative: string | null
          news_items: Json
          optional_markets: Json
          payload_version: number
          source_as_of: string | null
          source_facts: Json
          status: string
          stocks_fresh_at: string | null
          top_gainers: Json
          top_losers: Json
          unchanged_count: number
          updated_at: string
          validated_stock_count: number
          validation_warnings: Json
        }
        Insert: {
          ai_summary?: string | null
          blocked_reasons?: Json
          breadth_direction?: string | null
          created_at?: string
          deterministic_summary?: string | null
          fx_fresh_at?: string | null
          fx_snapshot?: Json
          gainers_count?: number
          generated_at?: string | null
          generation_metadata?: Json
          id?: string
          losers_count?: number
          market_date: string
          narrative?: string | null
          news_items?: Json
          optional_markets?: Json
          payload_version?: number
          source_as_of?: string | null
          source_facts?: Json
          status: string
          stocks_fresh_at?: string | null
          top_gainers?: Json
          top_losers?: Json
          unchanged_count?: number
          updated_at?: string
          validated_stock_count?: number
          validation_warnings?: Json
        }
        Update: {
          ai_summary?: string | null
          blocked_reasons?: Json
          breadth_direction?: string | null
          created_at?: string
          deterministic_summary?: string | null
          fx_fresh_at?: string | null
          fx_snapshot?: Json
          gainers_count?: number
          generated_at?: string | null
          generation_metadata?: Json
          id?: string
          losers_count?: number
          market_date?: string
          narrative?: string | null
          news_items?: Json
          optional_markets?: Json
          payload_version?: number
          source_as_of?: string | null
          source_facts?: Json
          status?: string
          stocks_fresh_at?: string | null
          top_gainers?: Json
          top_losers?: Json
          unchanged_count?: number
          updated_at?: string
          validated_stock_count?: number
          validation_warnings?: Json
        }
        Relationships: []
      }
      news_articles: {
        Row: {
          ai_insight: string | null
          category: string
          classification_version: string | null
          content: string | null
          created_at: string
          created_by: string | null
          date_published: string | null
          id: string
          image_url: string | null
          is_featured: boolean
          quality_checked_at: string | null
          quality_reasons: string[]
          read_time: string
          related_stock_id: string | null
          source: string
          source_published_at: string | null
          status: string
          stock_match_evidence: Json | null
          summary: string
          title: string
          updated_at: string
          updated_by: string | null
          url: string | null
        }
        Insert: {
          ai_insight?: string | null
          category?: string
          classification_version?: string | null
          content?: string | null
          created_at?: string
          created_by?: string | null
          date_published?: string | null
          id?: string
          image_url?: string | null
          is_featured?: boolean
          quality_checked_at?: string | null
          quality_reasons?: string[]
          read_time?: string
          related_stock_id?: string | null
          source?: string
          source_published_at?: string | null
          status?: string
          stock_match_evidence?: Json | null
          summary: string
          title: string
          updated_at?: string
          updated_by?: string | null
          url?: string | null
        }
        Update: {
          ai_insight?: string | null
          category?: string
          classification_version?: string | null
          content?: string | null
          created_at?: string
          created_by?: string | null
          date_published?: string | null
          id?: string
          image_url?: string | null
          is_featured?: boolean
          quality_checked_at?: string | null
          quality_reasons?: string[]
          read_time?: string
          related_stock_id?: string | null
          source?: string
          source_published_at?: string | null
          status?: string
          stock_match_evidence?: Json | null
          summary?: string
          title?: string
          updated_at?: string
          updated_by?: string | null
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "news_articles_related_stock_id_fkey"
            columns: ["related_stock_id"]
            isOneToOne: false
            referencedRelation: "stocks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "news_articles_related_stock_id_fkey"
            columns: ["related_stock_id"]
            isOneToOne: false
            referencedRelation: "stocks_public"
            referencedColumns: ["id"]
          },
        ]
      }
      news_highlights_editions: {
        Row: {
          company_watch: Json
          created_at: string
          diagnostics: Json
          edition_date: string
          featured_story: Json | null
          generated_at: string | null
          id: string
          insights: Json
          policy_watch: Json
          selected_articles: Json
          source_window_end: string
          source_window_start: string
          status: string
          updated_at: string
        }
        Insert: {
          company_watch?: Json
          created_at?: string
          diagnostics?: Json
          edition_date: string
          featured_story?: Json | null
          generated_at?: string | null
          id?: string
          insights?: Json
          policy_watch?: Json
          selected_articles?: Json
          source_window_end: string
          source_window_start: string
          status?: string
          updated_at?: string
        }
        Update: {
          company_watch?: Json
          created_at?: string
          diagnostics?: Json
          edition_date?: string
          featured_story?: Json | null
          generated_at?: string | null
          id?: string
          insights?: Json
          policy_watch?: Json
          selected_articles?: Json
          source_window_end?: string
          source_window_start?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          event_key: string | null
          id: string
          is_read: boolean
          message: string
          metadata: Json
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          event_key?: string | null
          id?: string
          is_read?: boolean
          message: string
          metadata?: Json
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          event_key?: string | null
          id?: string
          is_read?: boolean
          message?: string
          metadata?: Json
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      page_views: {
        Row: {
          created_at: string
          id: string
          page_path: string
          session_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          page_path: string
          session_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          page_path?: string
          session_id?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      post_comments: {
        Row: {
          author_name: string | null
          content: string
          created_at: string
          device_id: string | null
          id: string
          post_id: string
          user_id: string | null
        }
        Insert: {
          author_name?: string | null
          content: string
          created_at?: string
          device_id?: string | null
          id?: string
          post_id: string
          user_id?: string | null
        }
        Update: {
          author_name?: string | null
          content?: string
          created_at?: string
          device_id?: string | null
          id?: string
          post_id?: string
          user_id?: string | null
        }
        Relationships: []
      }
      post_likes: {
        Row: {
          created_at: string
          guest_hash: string | null
          id: string
          post_id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          guest_hash?: string | null
          id?: string
          post_id: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          guest_hash?: string | null
          id?: string
          post_id?: string
          user_id?: string | null
        }
        Relationships: []
      }
      price_alerts: {
        Row: {
          asset_id: string
          asset_name: string
          asset_type: string
          baseline_price: number | null
          condition: string
          created_at: string
          id: string
          is_active: boolean
          is_triggered: boolean
          last_evaluated_at: string | null
          notify_email: boolean
          notify_inapp: boolean
          stock_id: string | null
          target_price: number
          trigger_count: number
          triggered_at: string | null
          triggered_price: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          asset_id: string
          asset_name: string
          asset_type?: string
          baseline_price?: number | null
          condition: string
          created_at?: string
          id?: string
          is_active?: boolean
          is_triggered?: boolean
          last_evaluated_at?: string | null
          notify_email?: boolean
          notify_inapp?: boolean
          stock_id?: string | null
          target_price: number
          trigger_count?: number
          triggered_at?: string | null
          triggered_price?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          asset_id?: string
          asset_name?: string
          asset_type?: string
          baseline_price?: number | null
          condition?: string
          created_at?: string
          id?: string
          is_active?: boolean
          is_triggered?: boolean
          last_evaluated_at?: string | null
          notify_email?: boolean
          notify_inapp?: boolean
          stock_id?: string | null
          target_price?: number
          trigger_count?: number
          triggered_at?: string | null
          triggered_price?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "price_alerts_stock_id_fkey"
            columns: ["stock_id"]
            isOneToOne: false
            referencedRelation: "stocks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "price_alerts_stock_id_fkey"
            columns: ["stock_id"]
            isOneToOne: false
            referencedRelation: "stocks_public"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      rate_limit_hits: {
        Row: {
          created_at: string
          id: string
          ip_hash: string
        }
        Insert: {
          created_at?: string
          id?: string
          ip_hash: string
        }
        Update: {
          created_at?: string
          id?: string
          ip_hash?: string
        }
        Relationships: []
      }
      site_pages: {
        Row: {
          content: string
          id: string
          meta: Json | null
          slug: string
          title: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          content?: string
          id?: string
          meta?: Json | null
          slug: string
          title: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          content?: string
          id?: string
          meta?: Json | null
          slug?: string
          title?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      social_links: {
        Row: {
          created_at: string
          icon_name: string
          id: string
          is_active: boolean
          platform: string
          sort_order: number
          updated_at: string
          updated_by: string | null
          url: string
        }
        Insert: {
          created_at?: string
          icon_name?: string
          id?: string
          is_active?: boolean
          platform: string
          sort_order?: number
          updated_at?: string
          updated_by?: string | null
          url?: string
        }
        Update: {
          created_at?: string
          icon_name?: string
          id?: string
          is_active?: boolean
          platform?: string
          sort_order?: number
          updated_at?: string
          updated_by?: string | null
          url?: string
        }
        Relationships: []
      }
      stock_corporate_actions: {
        Row: {
          action_type: string
          amount: number | null
          announcement_date: string
          book_closure_date: string | null
          created_at: string
          currency: string | null
          disclosure_id: string
          ex_date: string | null
          id: string
          payment_date: string | null
          ratio: string | null
          source_url: string
          stock_id: string
          updated_at: string
        }
        Insert: {
          action_type: string
          amount?: number | null
          announcement_date: string
          book_closure_date?: string | null
          created_at?: string
          currency?: string | null
          disclosure_id: string
          ex_date?: string | null
          id?: string
          payment_date?: string | null
          ratio?: string | null
          source_url: string
          stock_id: string
          updated_at?: string
        }
        Update: {
          action_type?: string
          amount?: number | null
          announcement_date?: string
          book_closure_date?: string | null
          created_at?: string
          currency?: string | null
          disclosure_id?: string
          ex_date?: string | null
          id?: string
          payment_date?: string | null
          ratio?: string | null
          source_url?: string
          stock_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_corporate_actions_disclosure_id_fkey"
            columns: ["disclosure_id"]
            isOneToOne: false
            referencedRelation: "stock_disclosures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_corporate_actions_disclosure_id_fkey"
            columns: ["disclosure_id"]
            isOneToOne: false
            referencedRelation: "stock_disclosures_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_corporate_actions_stock_id_fkey"
            columns: ["stock_id"]
            isOneToOne: false
            referencedRelation: "stocks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_corporate_actions_stock_id_fkey"
            columns: ["stock_id"]
            isOneToOne: false
            referencedRelation: "stocks_public"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_disclosure_sources: {
        Row: {
          checkpoint: Json
          created_at: string
          etag: string | null
          id: string
          is_enabled: boolean
          last_checked_at: string | null
          last_error: string | null
          last_modified: string | null
          last_success_at: string | null
          rate_limit_ms: number
          source_domain: string
          source_type: string
          source_url: string
          stock_id: string
          updated_at: string
        }
        Insert: {
          checkpoint?: Json
          created_at?: string
          etag?: string | null
          id?: string
          is_enabled?: boolean
          last_checked_at?: string | null
          last_error?: string | null
          last_modified?: string | null
          last_success_at?: string | null
          rate_limit_ms?: number
          source_domain: string
          source_type?: string
          source_url: string
          stock_id: string
          updated_at?: string
        }
        Update: {
          checkpoint?: Json
          created_at?: string
          etag?: string | null
          id?: string
          is_enabled?: boolean
          last_checked_at?: string | null
          last_error?: string | null
          last_modified?: string | null
          last_success_at?: string | null
          rate_limit_ms?: number
          source_domain?: string
          source_type?: string
          source_url?: string
          stock_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_disclosure_sources_stock_id_fkey"
            columns: ["stock_id"]
            isOneToOne: false
            referencedRelation: "stocks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_disclosure_sources_stock_id_fkey"
            columns: ["stock_id"]
            isOneToOne: false
            referencedRelation: "stocks_public"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_disclosures: {
        Row: {
          canonical_url: string | null
          content_hash: string
          created_at: string
          disclosure_type: string
          extraction_error: string | null
          extraction_status: string
          fetched_at: string
          id: string
          key_facts: Json
          model_version: string | null
          prompt_version: string | null
          published_at: string
          source_domain: string
          source_id: string | null
          source_text: string | null
          source_url: string | null
          stock_id: string
          summary: string | null
          title: string
          updated_at: string
        }
        Insert: {
          canonical_url?: string | null
          content_hash: string
          created_at?: string
          disclosure_type: string
          extraction_error?: string | null
          extraction_status?: string
          fetched_at?: string
          id?: string
          key_facts?: Json
          model_version?: string | null
          prompt_version?: string | null
          published_at: string
          source_domain: string
          source_id?: string | null
          source_text?: string | null
          source_url?: string | null
          stock_id: string
          summary?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          canonical_url?: string | null
          content_hash?: string
          created_at?: string
          disclosure_type?: string
          extraction_error?: string | null
          extraction_status?: string
          fetched_at?: string
          id?: string
          key_facts?: Json
          model_version?: string | null
          prompt_version?: string | null
          published_at?: string
          source_domain?: string
          source_id?: string | null
          source_text?: string | null
          source_url?: string | null
          stock_id?: string
          summary?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_disclosures_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "stock_disclosure_sources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_disclosures_stock_id_fkey"
            columns: ["stock_id"]
            isOneToOne: false
            referencedRelation: "stocks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_disclosures_stock_id_fkey"
            columns: ["stock_id"]
            isOneToOne: false
            referencedRelation: "stocks_public"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_price_history: {
        Row: {
          created_at: string
          id: string
          price: number
          snapshot_date: string
          stock_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          price: number
          snapshot_date?: string
          stock_id: string
        }
        Update: {
          created_at?: string
          id?: string
          price?: number
          snapshot_date?: string
          stock_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_price_history_stock_id_fkey"
            columns: ["stock_id"]
            isOneToOne: false
            referencedRelation: "stocks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_price_history_stock_id_fkey"
            columns: ["stock_id"]
            isOneToOne: false
            referencedRelation: "stocks_public"
            referencedColumns: ["id"]
          },
        ]
      }
      stocks: {
        Row: {
          created_at: string
          created_by: string | null
          day_change: number
          day_change_percent: number
          dividend_yield: number | null
          id: string
          is_active: boolean
          market_cap: number | null
          name: string
          pe_ratio: number | null
          previous_price: number | null
          price: number
          sector: string
          sort_order: number
          symbol: string
          updated_at: string
          updated_by: string | null
          volume: number
          year_high: number | null
          year_low: number | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          day_change?: number
          day_change_percent?: number
          dividend_yield?: number | null
          id?: string
          is_active?: boolean
          market_cap?: number | null
          name: string
          pe_ratio?: number | null
          previous_price?: number | null
          price?: number
          sector?: string
          sort_order?: number
          symbol: string
          updated_at?: string
          updated_by?: string | null
          volume?: number
          year_high?: number | null
          year_low?: number | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          day_change?: number
          day_change_percent?: number
          dividend_yield?: number | null
          id?: string
          is_active?: boolean
          market_cap?: number | null
          name?: string
          pe_ratio?: number | null
          previous_price?: number | null
          price?: number
          sector?: string
          sort_order?: number
          symbol?: string
          updated_at?: string
          updated_by?: string | null
          volume?: number
          year_high?: number | null
          year_low?: number | null
        }
        Relationships: []
      }
      treasury_bill_auctions: {
        Row: {
          accepted_average_rate: number | null
          amount_accepted: number | null
          amount_offered: number | null
          auction_date: string
          bid_to_cover: number | null
          bids_received: number | null
          competitive_bids: number | null
          id: string
          issue_date: string
          issue_number: string
          market_average_rate: number | null
          maturity_date: string
          non_competitive_bids: number | null
          number_bids_accepted: number | null
          number_bids_received: number | null
          performance_rate: number | null
          previous_rate: number | null
          price_per_100: number | null
          published_at: string | null
          rate_change: number | null
          retrieved_at: string
          source_document: string | null
          source_url: string | null
          tenor_days: number
        }
        Insert: {
          accepted_average_rate?: number | null
          amount_accepted?: number | null
          amount_offered?: number | null
          auction_date: string
          bid_to_cover?: number | null
          bids_received?: number | null
          competitive_bids?: number | null
          id?: string
          issue_date: string
          issue_number: string
          market_average_rate?: number | null
          maturity_date: string
          non_competitive_bids?: number | null
          number_bids_accepted?: number | null
          number_bids_received?: number | null
          performance_rate?: number | null
          previous_rate?: number | null
          price_per_100?: number | null
          published_at?: string | null
          rate_change?: number | null
          retrieved_at?: string
          source_document?: string | null
          source_url?: string | null
          tenor_days: number
        }
        Update: {
          accepted_average_rate?: number | null
          amount_accepted?: number | null
          amount_offered?: number | null
          auction_date?: string
          bid_to_cover?: number | null
          bids_received?: number | null
          competitive_bids?: number | null
          id?: string
          issue_date?: string
          issue_number?: string
          market_average_rate?: number | null
          maturity_date?: string
          non_competitive_bids?: number | null
          number_bids_accepted?: number | null
          number_bids_received?: number | null
          performance_rate?: number | null
          previous_rate?: number | null
          price_per_100?: number | null
          published_at?: string | null
          rate_change?: number | null
          retrieved_at?: string
          source_document?: string | null
          source_url?: string | null
          tenor_days?: number
        }
        Relationships: []
      }
      treasury_bond_auctions: {
        Row: {
          amount_accepted: number | null
          amount_offered: number | null
          auction_date: string
          auction_type: string | null
          average_price: number | null
          average_rate: number | null
          bids_received: number | null
          bond_id: string
          cutoff_rate: number | null
          id: string
          retrieved_at: string
          settlement_date: string | null
          source_url: string | null
        }
        Insert: {
          amount_accepted?: number | null
          amount_offered?: number | null
          auction_date: string
          auction_type?: string | null
          average_price?: number | null
          average_rate?: number | null
          bids_received?: number | null
          bond_id: string
          cutoff_rate?: number | null
          id?: string
          retrieved_at?: string
          settlement_date?: string | null
          source_url?: string | null
        }
        Update: {
          amount_accepted?: number | null
          amount_offered?: number | null
          auction_date?: string
          auction_type?: string | null
          average_price?: number | null
          average_rate?: number | null
          bids_received?: number | null
          bond_id?: string
          cutoff_rate?: number | null
          id?: string
          retrieved_at?: string
          settlement_date?: string | null
          source_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "treasury_bond_auctions_bond_id_fkey"
            columns: ["bond_id"]
            isOneToOne: false
            referencedRelation: "treasury_bonds"
            referencedColumns: ["id"]
          },
        ]
      }
      treasury_bonds: {
        Row: {
          bond_code: string
          bond_type: string
          coupon_rate: number | null
          created_at: string
          id: string
          interest_payment_frequency: string | null
          isin: string | null
          issue_date: string
          maturity_date: string
          original_tenor_years: number | null
          source_url: string | null
          status: string
          tax_status: string | null
          updated_at: string
        }
        Insert: {
          bond_code: string
          bond_type: string
          coupon_rate?: number | null
          created_at?: string
          id?: string
          interest_payment_frequency?: string | null
          isin?: string | null
          issue_date: string
          maturity_date: string
          original_tenor_years?: number | null
          source_url?: string | null
          status: string
          tax_status?: string | null
          updated_at?: string
        }
        Update: {
          bond_code?: string
          bond_type?: string
          coupon_rate?: number | null
          created_at?: string
          id?: string
          interest_payment_frequency?: string | null
          isin?: string | null
          issue_date?: string
          maturity_date?: string
          original_tenor_years?: number | null
          source_url?: string | null
          status?: string
          tax_status?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      treasury_upcoming_auctions: {
        Row: {
          amount_offered: number | null
          auction_date: string
          closing_date: string | null
          created_at: string
          id: string
          issue_number: string | null
          results_date: string | null
          security: string
          security_type: string
          settlement_date: string | null
          source_url: string | null
        }
        Insert: {
          amount_offered?: number | null
          auction_date: string
          closing_date?: string | null
          created_at?: string
          id?: string
          issue_number?: string | null
          results_date?: string | null
          security: string
          security_type: string
          settlement_date?: string | null
          source_url?: string | null
        }
        Update: {
          amount_offered?: number | null
          auction_date?: string
          closing_date?: string | null
          created_at?: string
          id?: string
          issue_number?: string | null
          results_date?: string | null
          security?: string
          security_type?: string
          settlement_date?: string | null
          source_url?: string | null
        }
        Relationships: []
      }
      treasury_update_runs: {
        Row: {
          completed_at: string | null
          created_at: string | null
          error_code: string | null
          error_message: string | null
          execution_duration_ms: number | null
          id: string
          latest_source_issue: string | null
          latest_stored_issue: string | null
          records_detected: number | null
          records_inserted: number | null
          records_updated: number | null
          source_checked: string | null
          started_at: string
          status: string
          trigger_type: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          error_code?: string | null
          error_message?: string | null
          execution_duration_ms?: number | null
          id?: string
          latest_source_issue?: string | null
          latest_stored_issue?: string | null
          records_detected?: number | null
          records_inserted?: number | null
          records_updated?: number | null
          source_checked?: string | null
          started_at: string
          status: string
          trigger_type: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          error_code?: string | null
          error_message?: string | null
          execution_duration_ms?: number | null
          id?: string
          latest_source_issue?: string | null
          latest_stored_issue?: string | null
          records_detected?: number | null
          records_inserted?: number | null
          records_updated?: number | null
          source_checked?: string | null
          started_at?: string
          status?: string
          trigger_type?: string
        }
        Relationships: []
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
      user_watchlist: {
        Row: {
          created_at: string
          id: string
          item_id: string
          item_name: string
          item_type: string
          sort_order: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          item_id: string
          item_name?: string
          item_type: string
          sort_order?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          item_id?: string
          item_name?: string
          item_type?: string
          sort_order?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      ads_public: {
        Row: {
          click_url: string | null
          description: string | null
          end_date: string | null
          id: string | null
          media_type: string | null
          media_url: string | null
          placement: string | null
          start_date: string | null
          title: string | null
        }
        Insert: {
          click_url?: string | null
          description?: string | null
          end_date?: string | null
          id?: string | null
          media_type?: string | null
          media_url?: string | null
          placement?: string | null
          start_date?: string | null
          title?: string | null
        }
        Update: {
          click_url?: string | null
          description?: string | null
          end_date?: string | null
          id?: string | null
          media_type?: string | null
          media_url?: string | null
          placement?: string | null
          start_date?: string | null
          title?: string | null
        }
        Relationships: []
      }
      commodities_public: {
        Row: {
          id: string | null
          name: string | null
          previous_price: number | null
          price: number | null
          sort_order: number | null
          symbol: string | null
          unit: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string | null
          name?: string | null
          previous_price?: number | null
          price?: number | null
          sort_order?: number | null
          symbol?: string | null
          unit?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string | null
          name?: string | null
          previous_price?: number | null
          price?: number | null
          sort_order?: number | null
          symbol?: string | null
          unit?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      commodity_price_history_public: {
        Row: {
          commodity_id: string | null
          id: string | null
          price: number | null
          snapshot_date: string | null
          symbol: string | null
        }
        Relationships: [
          {
            foreignKeyName: "commodity_price_history_commodity_id_fkey"
            columns: ["commodity_id"]
            isOneToOne: false
            referencedRelation: "commodities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commodity_price_history_commodity_id_fkey"
            columns: ["commodity_id"]
            isOneToOne: false
            referencedRelation: "commodities_public"
            referencedColumns: ["id"]
          },
        ]
      }
      exchange_rate_history_public: {
        Row: {
          currency_code: string | null
          exchange_rate_id: string | null
          id: string | null
          rate: number | null
          snapshot_date: string | null
        }
        Relationships: [
          {
            foreignKeyName: "exchange_rate_history_exchange_rate_id_fkey"
            columns: ["exchange_rate_id"]
            isOneToOne: false
            referencedRelation: "exchange_rates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exchange_rate_history_exchange_rate_id_fkey"
            columns: ["exchange_rate_id"]
            isOneToOne: false
            referencedRelation: "exchange_rates_public"
            referencedColumns: ["id"]
          },
        ]
      }
      exchange_rates_public: {
        Row: {
          currency_code: string | null
          currency_name: string | null
          id: string | null
          previous_rate: number | null
          rate: number | null
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          currency_code?: string | null
          currency_name?: string | null
          id?: string | null
          previous_rate?: number | null
          rate?: number | null
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          currency_code?: string | null
          currency_name?: string | null
          id?: string | null
          previous_rate?: number | null
          rate?: number | null
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      funds_public: {
        Row: {
          annual_yield: number | null
          cma_licensed: boolean | null
          created_at: string | null
          daily_yield: number | null
          description: string | null
          fact_sheet_date: string | null
          fund_type: string | null
          id: string | null
          is_published: boolean | null
          logo_url: string | null
          management_fee: number | null
          manager: string | null
          minimum_investment: number | null
          name: string | null
          seven_day_yield: number | null
          slug: string | null
          thirty_day_yield: number | null
          updated_at: string | null
          website: string | null
          withdrawal_time: string | null
          yield_unit: string | null
        }
        Insert: {
          annual_yield?: number | null
          cma_licensed?: boolean | null
          created_at?: string | null
          daily_yield?: number | null
          description?: string | null
          fact_sheet_date?: string | null
          fund_type?: string | null
          id?: string | null
          is_published?: boolean | null
          logo_url?: string | null
          management_fee?: number | null
          manager?: string | null
          minimum_investment?: number | null
          name?: string | null
          seven_day_yield?: number | null
          slug?: string | null
          thirty_day_yield?: number | null
          updated_at?: string | null
          website?: string | null
          withdrawal_time?: string | null
          yield_unit?: string | null
        }
        Update: {
          annual_yield?: number | null
          cma_licensed?: boolean | null
          created_at?: string | null
          daily_yield?: number | null
          description?: string | null
          fact_sheet_date?: string | null
          fund_type?: string | null
          id?: string | null
          is_published?: boolean | null
          logo_url?: string | null
          management_fee?: number | null
          manager?: string | null
          minimum_investment?: number | null
          name?: string | null
          seven_day_yield?: number | null
          slug?: string | null
          thirty_day_yield?: number | null
          updated_at?: string | null
          website?: string | null
          withdrawal_time?: string | null
          yield_unit?: string | null
        }
        Relationships: []
      }
      news_articles_public: {
        Row: {
          ai_insight: string | null
          category: string | null
          content: string | null
          created_at: string | null
          date_published: string | null
          id: string | null
          image_url: string | null
          is_featured: boolean | null
          read_time: string | null
          related_stock_id: string | null
          source: string | null
          source_published_at: string | null
          status: string | null
          summary: string | null
          title: string | null
          updated_at: string | null
          url: string | null
        }
        Insert: {
          ai_insight?: string | null
          category?: string | null
          content?: string | null
          created_at?: string | null
          date_published?: string | null
          id?: string | null
          image_url?: string | null
          is_featured?: boolean | null
          read_time?: string | null
          related_stock_id?: string | null
          source?: string | null
          source_published_at?: string | null
          status?: string | null
          summary?: string | null
          title?: string | null
          updated_at?: string | null
          url?: string | null
        }
        Update: {
          ai_insight?: string | null
          category?: string | null
          content?: string | null
          created_at?: string | null
          date_published?: string | null
          id?: string | null
          image_url?: string | null
          is_featured?: boolean | null
          read_time?: string | null
          related_stock_id?: string | null
          source?: string | null
          source_published_at?: string | null
          status?: string | null
          summary?: string | null
          title?: string | null
          updated_at?: string | null
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "news_articles_related_stock_id_fkey"
            columns: ["related_stock_id"]
            isOneToOne: false
            referencedRelation: "stocks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "news_articles_related_stock_id_fkey"
            columns: ["related_stock_id"]
            isOneToOne: false
            referencedRelation: "stocks_public"
            referencedColumns: ["id"]
          },
        ]
      }
      site_pages_public: {
        Row: {
          content: string | null
          id: string | null
          meta: Json | null
          slug: string | null
          title: string | null
          updated_at: string | null
        }
        Insert: {
          content?: string | null
          id?: string | null
          meta?: Json | null
          slug?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          content?: string | null
          id?: string | null
          meta?: Json | null
          slug?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      social_links_public: {
        Row: {
          icon_name: string | null
          id: string | null
          platform: string | null
          sort_order: number | null
          url: string | null
        }
        Insert: {
          icon_name?: string | null
          id?: string | null
          platform?: string | null
          sort_order?: number | null
          url?: string | null
        }
        Update: {
          icon_name?: string | null
          id?: string | null
          platform?: string | null
          sort_order?: number | null
          url?: string | null
        }
        Relationships: []
      }
      stock_corporate_actions_public: {
        Row: {
          action_type: string | null
          amount: number | null
          announcement_date: string | null
          book_closure_date: string | null
          currency: string | null
          ex_date: string | null
          id: string | null
          payment_date: string | null
          ratio: string | null
          source_url: string | null
          stock_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_corporate_actions_stock_id_fkey"
            columns: ["stock_id"]
            isOneToOne: false
            referencedRelation: "stocks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_corporate_actions_stock_id_fkey"
            columns: ["stock_id"]
            isOneToOne: false
            referencedRelation: "stocks_public"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_disclosures_public: {
        Row: {
          disclosure_type: string | null
          id: string | null
          key_facts: Json | null
          published_at: string | null
          source_domain: string | null
          source_url: string | null
          stock_id: string | null
          summary: string | null
          title: string | null
        }
        Insert: {
          disclosure_type?: string | null
          id?: string | null
          key_facts?: Json | null
          published_at?: string | null
          source_domain?: string | null
          source_url?: never
          stock_id?: string | null
          summary?: string | null
          title?: string | null
        }
        Update: {
          disclosure_type?: string | null
          id?: string | null
          key_facts?: Json | null
          published_at?: string | null
          source_domain?: string | null
          source_url?: never
          stock_id?: string | null
          summary?: string | null
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_disclosures_stock_id_fkey"
            columns: ["stock_id"]
            isOneToOne: false
            referencedRelation: "stocks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_disclosures_stock_id_fkey"
            columns: ["stock_id"]
            isOneToOne: false
            referencedRelation: "stocks_public"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_price_history_public: {
        Row: {
          id: string | null
          price: number | null
          snapshot_date: string | null
          stock_id: string | null
          symbol: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_price_history_stock_id_fkey"
            columns: ["stock_id"]
            isOneToOne: false
            referencedRelation: "stocks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_price_history_stock_id_fkey"
            columns: ["stock_id"]
            isOneToOne: false
            referencedRelation: "stocks_public"
            referencedColumns: ["id"]
          },
        ]
      }
      stocks_public: {
        Row: {
          day_change: number | null
          day_change_percent: number | null
          dividend_yield: number | null
          id: string | null
          is_active: boolean | null
          market_cap: number | null
          name: string | null
          pe_ratio: number | null
          previous_price: number | null
          price: number | null
          sector: string | null
          sort_order: number | null
          symbol: string | null
          updated_at: string | null
          volume: number | null
          year_high: number | null
          year_low: number | null
        }
        Insert: {
          day_change?: number | null
          day_change_percent?: number | null
          dividend_yield?: number | null
          id?: string | null
          is_active?: boolean | null
          market_cap?: number | null
          name?: string | null
          pe_ratio?: number | null
          previous_price?: number | null
          price?: number | null
          sector?: string | null
          sort_order?: number | null
          symbol?: string | null
          updated_at?: string | null
          volume?: number | null
          year_high?: number | null
          year_low?: number | null
        }
        Update: {
          day_change?: number | null
          day_change_percent?: number | null
          dividend_yield?: number | null
          id?: string | null
          is_active?: boolean | null
          market_cap?: number | null
          name?: string | null
          pe_ratio?: number | null
          previous_price?: number | null
          price?: number | null
          sector?: string | null
          sort_order?: number | null
          symbol?: string | null
          updated_at?: string | null
          volume?: number | null
          year_high?: number | null
          year_low?: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      bulk_sync_funds: {
        Args: { dry_run?: boolean; p_effective_date?: string; payload: Json }
        Returns: Json
      }
      check_rate_limit: {
        Args: {
          p_ip_hash: string
          p_max_requests?: number
          p_window_seconds?: number
        }
        Returns: boolean
      }
      claim_communication_batch: {
        Args: { p_lease_seconds?: number; p_limit?: number }
        Returns: {
          attempts: number
          category: string
          created_at: string
          delivered_at: string | null
          delivery_status: string
          failure_reason: string | null
          id: string
          idempotency_key: string
          lease_expires_at: string | null
          next_attempt_at: string
          payload: Json
          provider_message_id: string | null
          recipient_email: string | null
          sent_at: string | null
          status: string
          updated_at: string
          user_id: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "communication_outbox"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      claim_communication_category_batch: {
        Args: {
          p_allowed_user_ids?: string[] | null
          p_category: string
          p_lease_seconds: number
          p_limit: number
        }
        Returns: {
          attempts: number
          category: string
          claim_token: string | null
          created_at: string
          delivered_at: string | null
          delivery_event_at: string | null
          delivery_status: string
          failure_reason: string | null
          id: string
          idempotency_key: string
          lease_expires_at: string | null
          next_attempt_at: string
          payload: Json
          provider_request: Json | null
          provider_request_frozen_at: string | null
          provider_message_id: string | null
          recipient_email: string | null
          sent_at: string | null
          status: string
          submission_started_at: string | null
          updated_at: string
          user_id: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "communication_outbox"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      claim_price_alert_event: {
        Args: {
          p_alert_id: string
          p_email_allowed?: boolean
          p_source_observed_at?: string
          p_triggered_price: number
        }
        Returns: {
          alert_id: string
          notification_created: boolean
          outbox_created: boolean
          trigger_count: number
          user_id: string
        }[]
      }
      record_communication_delivery_event: {
        Args: {
          p_event_created_at: string
          p_event_type: string
          p_failure_reason?: string | null
          p_provider_message_id: string
          p_webhook_event_id: string
        }
        Returns: {
          delivery_status: string
          event_inserted: boolean
          outbox_updated: boolean
          recipient_email: string
        }[]
      }
      update_communication_preferences_service: {
        Args: {
          p_email_normalized: string
          p_email_welcome_completed?: boolean | null
          p_market_brief_email?: boolean | null
          p_price_alert_email?: boolean | null
          p_user_id: string
        }
        Returns: Database["public"]["Tables"]["communication_preferences"]["Row"]
      }
      get_guest_liked_posts: {
        Args: { p_guest_token: string }
        Returns: {
          post_id: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      like_post: {
        Args: { p_guest_token?: string; p_post_id: string }
        Returns: boolean
      }
      unlike_post: {
        Args: { p_guest_token?: string; p_post_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "editor" | "reviewer"
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
      app_role: ["admin", "editor", "reviewer"],
    },
  },
} as const
