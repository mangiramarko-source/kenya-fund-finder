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
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
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
      news_articles: {
        Row: {
          category: string
          content: string | null
          created_at: string
          created_by: string | null
          date_published: string | null
          source_published_at: string | null
          quality_reasons: string[]
          quality_checked_at: string | null
          classification_version: string | null
          stock_match_evidence: Json | null
          id: string
          is_featured: boolean
          read_time: string
          source: string
          status: string
          summary: string
          title: string
          updated_at: string
          updated_by: string | null
          url: string | null
        }
        Insert: {
          category?: string
          content?: string | null
          created_at?: string
          created_by?: string | null
          date_published?: string | null
          source_published_at?: string | null
          quality_reasons?: string[]
          quality_checked_at?: string | null
          classification_version?: string | null
          stock_match_evidence?: Json | null
          id?: string
          is_featured?: boolean
          read_time?: string
          source?: string
          status?: string
          summary: string
          title: string
          updated_at?: string
          updated_by?: string | null
          url?: string | null
        }
        Update: {
          category?: string
          content?: string | null
          created_at?: string
          created_by?: string | null
          date_published?: string | null
          source_published_at?: string | null
          quality_reasons?: string[]
          quality_checked_at?: string | null
          classification_version?: string | null
          stock_match_evidence?: Json | null
          id?: string
          is_featured?: boolean
          read_time?: string
          source?: string
          status?: string
          summary?: string
          title?: string
          updated_at?: string
          updated_by?: string | null
          url?: string | null
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
      market_summary_history: {
        Row: {
          id: string
          date: string
          total_market_cap: number | null
          average_pe: number | null
          advances: number | null
          declines: number | null
          unchanged: number | null
          created_at: string
        }
        Insert: {
          id?: string
          date: string
          total_market_cap?: number | null
          average_pe?: number | null
          advances?: number | null
          declines?: number | null
          unchanged?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          date?: string
          total_market_cap?: number | null
          average_pe?: number | null
          advances?: number | null
          declines?: number | null
          unchanged?: number | null
          created_at?: string
        }
        Relationships: []
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
          logo_url: string | null
          market_cap: number | null
          name: string
          pe_ratio: number | null
          previous_price: number | null
          price: number
          provider_updated_at: string | null
          quote_source: string | null
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
          logo_url?: string | null
          market_cap?: number | null
          name: string
          pe_ratio?: number | null
          previous_price?: number | null
          price?: number
          provider_updated_at?: string | null
          quote_source?: string | null
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
          logo_url?: string | null
          market_cap?: number | null
          name?: string
          pe_ratio?: number | null
          previous_price?: number | null
          price?: number
          provider_updated_at?: string | null
          quote_source?: string | null
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
          category: string | null
          content: string | null
          created_at: string | null
          date_published: string | null
          source_published_at: string | null
          id: string | null
          is_featured: boolean | null
          read_time: string | null
          source: string | null
          status: string | null
          summary: string | null
          title: string | null
          updated_at: string | null
          url: string | null
        }
        Insert: {
          category?: string | null
          content?: string | null
          created_at?: string | null
          date_published?: string | null
          source_published_at?: string | null
          id?: string | null
          is_featured?: boolean | null
          read_time?: string | null
          source?: string | null
          status?: string | null
          summary?: string | null
          title?: string | null
          updated_at?: string | null
          url?: string | null
        }
        Update: {
          category?: string | null
          content?: string | null
          created_at?: string | null
          date_published?: string | null
          source_published_at?: string | null
          id?: string | null
          is_featured?: boolean | null
          read_time?: string | null
          source?: string | null
          status?: string | null
          summary?: string | null
          title?: string | null
          updated_at?: string | null
          url?: string | null
        }
        Relationships: []
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
          logo_url: string | null
          market_cap: number | null
          name: string | null
          pe_ratio: number | null
          previous_price: number | null
          price: number | null
          provider_updated_at: string | null
          quote_source: string | null
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
          logo_url?: string | null
          market_cap?: number | null
          name?: string | null
          pe_ratio?: number | null
          previous_price?: number | null
          price?: number | null
          provider_updated_at?: string | null
          quote_source?: string | null
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
          logo_url?: string | null
          market_cap?: number | null
          name?: string | null
          pe_ratio?: number | null
          previous_price?: number | null
          price?: number | null
          provider_updated_at?: string | null
          quote_source?: string | null
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
      check_rate_limit: {
        Args: {
          p_ip_hash: string
          p_max_requests?: number
          p_window_seconds?: number
        }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      app_role: ["admin", "editor", "reviewer"],
    },
  },
} as const
