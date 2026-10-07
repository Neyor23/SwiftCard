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
      app_settings: {
        Row: {
          key: string
          value: Json
        }
        Insert: {
          key: string
          value: Json
        }
        Update: {
          key?: string
          value?: Json
        }
        Relationships: []
      }
      bank_accounts: {
        Row: {
          account_name: string
          account_number: string
          bank_code: string
          bank_name: string
          created_at: string
          id: string
          recipient_code: string | null
          user_id: string
        }
        Insert: {
          account_name: string
          account_number: string
          bank_code: string
          bank_name: string
          created_at?: string
          id?: string
          recipient_code?: string | null
          user_id: string
        }
        Update: {
          account_name?: string
          account_number?: string
          bank_code?: string
          bank_name?: string
          created_at?: string
          id?: string
          recipient_code?: string | null
          user_id?: string
        }
        Relationships: []
      }
      gift_card_codes: {
        Row: {
          code: string
          created_at: string
          id: string
          order_txn: string | null
          pin: string | null
          product_id: string
          sold_at: string | null
          sold_to: string | null
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          order_txn?: string | null
          pin?: string | null
          product_id: string
          sold_at?: string | null
          sold_to?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          order_txn?: string | null
          pin?: string | null
          product_id?: string
          sold_at?: string | null
          sold_to?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gift_card_codes_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "gift_card_products"
            referencedColumns: ["id"]
          },
        ]
      }
      gift_card_products: {
        Row: {
          active: boolean
          brand: string
          country: string
          denomination: number
          id: string
          price_ngn: number
          price_usd: number
        }
        Insert: {
          active?: boolean
          brand: string
          country?: string
          denomination: number
          id?: string
          price_ngn: number
          price_usd: number
        }
        Update: {
          active?: boolean
          brand?: string
          country?: string
          denomination?: number
          id?: string
          price_ngn?: number
          price_usd?: number
        }
        Relationships: []
      }
      gift_card_rates: {
        Row: {
          active: boolean
          brand: string
          card_type: string
          change_pct: number
          country: string
          id: string
          rate_ngn: number
          rate_usd: number
          receipt_type: string
        }
        Insert: {
          active?: boolean
          brand: string
          card_type?: string
          change_pct?: number
          country?: string
          id?: string
          rate_ngn: number
          rate_usd: number
          receipt_type?: string
        }
        Update: {
          active?: boolean
          brand?: string
          card_type?: string
          change_pct?: number
          country?: string
          id?: string
          rate_ngn?: number
          rate_usd?: number
          receipt_type?: string
        }
        Relationships: []
      }
      gift_card_sales: {
        Row: {
          admin_note: string | null
          brand: string
          card_codes: string | null
          card_type: string
          card_value: number
          country: string
          created_at: string
          expected_payout: number
          id: string
          image_paths: string[]
          payout_currency: Database["public"]["Enums"]["currency_code"]
          quantity: number
          receipt_type: string
          status: Database["public"]["Enums"]["sale_status"]
          transaction_id: string | null
          user_id: string
        }
        Insert: {
          admin_note?: string | null
          brand: string
          card_codes?: string | null
          card_type: string
          card_value: number
          country?: string
          created_at?: string
          expected_payout: number
          id?: string
          image_paths?: string[]
          payout_currency?: Database["public"]["Enums"]["currency_code"]
          quantity: number
          receipt_type?: string
          status?: Database["public"]["Enums"]["sale_status"]
          transaction_id?: string | null
          user_id: string
        }
        Update: {
          admin_note?: string | null
          brand?: string
          card_codes?: string | null
          card_type?: string
          card_value?: number
          country?: string
          created_at?: string
          expected_payout?: number
          id?: string
          image_paths?: string[]
          payout_currency?: Database["public"]["Enums"]["currency_code"]
          quantity?: number
          receipt_type?: string
          status?: Database["public"]["Enums"]["sale_status"]
          transaction_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      kyc_submissions: {
        Row: {
          address: string
          admin_note: string | null
          date_of_birth: string
          id_last4: string
          id_type: string
          reviewed_at: string | null
          status: Database["public"]["Enums"]["kyc_status"]
          submitted_at: string
          user_id: string
        }
        Insert: {
          address: string
          admin_note?: string | null
          date_of_birth: string
          id_last4: string
          id_type: string
          reviewed_at?: string | null
          status?: Database["public"]["Enums"]["kyc_status"]
          submitted_at?: string
          user_id: string
        }
        Update: {
          address?: string
          admin_note?: string | null
          date_of_birth?: string
          id_last4?: string
          id_type?: string
          reviewed_at?: string | null
          status?: Database["public"]["Enums"]["kyc_status"]
          submitted_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          read: boolean
          title: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          read?: boolean
          title: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          read?: boolean
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      paystack_events: {
        Row: {
          event: string
          id: string
          payload: Json
          received_at: string
          reference: string
        }
        Insert: {
          event: string
          id?: string
          payload: Json
          received_at?: string
          reference: string
        }
        Update: {
          event?: string
          id?: string
          payload?: Json
          received_at?: string
          reference?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          onboarding_completed: boolean
          phone: string | null
          preferred_currency: Database["public"]["Enums"]["currency_code"]
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          onboarding_completed?: boolean
          phone?: string | null
          preferred_currency?: Database["public"]["Enums"]["currency_code"]
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          onboarding_completed?: boolean
          phone?: string | null
          preferred_currency?: Database["public"]["Enums"]["currency_code"]
          updated_at?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount: number
          created_at: string
          currency: Database["public"]["Enums"]["currency_code"]
          description: string | null
          id: string
          metadata: Json
          reference: string | null
          status: Database["public"]["Enums"]["txn_status"]
          type: Database["public"]["Enums"]["txn_type"]
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: Database["public"]["Enums"]["currency_code"]
          description?: string | null
          id?: string
          metadata?: Json
          reference?: string | null
          status?: Database["public"]["Enums"]["txn_status"]
          type: Database["public"]["Enums"]["txn_type"]
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: Database["public"]["Enums"]["currency_code"]
          description?: string | null
          id?: string
          metadata?: Json
          reference?: string | null
          status?: Database["public"]["Enums"]["txn_status"]
          type?: Database["public"]["Enums"]["txn_type"]
          user_id?: string
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
      virtual_cards: {
        Row: {
          balance_usd: number
          brand: string | null
          created_at: string
          id: string
          last4: string | null
          provider: string
          provider_card_id: string | null
          status: string
          user_id: string
        }
        Insert: {
          balance_usd?: number
          brand?: string | null
          created_at?: string
          id?: string
          last4?: string | null
          provider?: string
          provider_card_id?: string | null
          status?: string
          user_id: string
        }
        Update: {
          balance_usd?: number
          brand?: string | null
          created_at?: string
          id?: string
          last4?: string | null
          provider?: string
          provider_card_id?: string | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      wallets: {
        Row: {
          balance_ngn: number
          balance_usd: number
          updated_at: string
          user_id: string
        }
        Insert: {
          balance_ngn?: number
          balance_usd?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          balance_ngn?: number
          balance_usd?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      apply_deposit: {
        Args: {
          _amount_kobo: number
          _provider_status: string
          _reference: string
        }
        Returns: string
      }
      buy_gift_card: {
        Args: {
          _currency: Database["public"]["Enums"]["currency_code"]
          _product_id: string
          _qty: number
        }
        Returns: string
      }
      convert_currency: {
        Args: {
          _amount: number
          _from: Database["public"]["Enums"]["currency_code"]
        }
        Returns: undefined
      }
      fund_virtual_card: {
        Args: { _amount: number; _card_id: string }
        Returns: undefined
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      product_stock: {
        Args: never
        Returns: {
          available: number
          product_id: string
        }[]
      }
      request_virtual_card: { Args: never; Returns: string }
      review_kyc: {
        Args: { _approve: boolean; _note: string; _user: string }
        Returns: undefined
      }
      review_sale: {
        Args: { _approve: boolean; _note: string; _sale_id: string }
        Returns: undefined
      }
      settle_withdrawal: {
        Args: {
          _provider_status: string
          _reference: string
          _success: boolean
        }
        Returns: string
      }
      start_withdrawal: {
        Args: { _amount: number; _bank_id: string; _user: string }
        Returns: string
      }
      submit_kyc: {
        Args: {
          _address: string
          _dob: string
          _id_number: string
          _id_type: string
        }
        Returns: undefined
      }
      submit_sale:
        | {
            Args: {
              _brand: string
              _card_type: string
              _codes: string
              _country: string
              _currency: Database["public"]["Enums"]["currency_code"]
              _images: string[]
              _qty: number
              _receipt: string
              _value: number
            }
            Returns: string
          }
        | {
            Args: {
              _brand: string
              _card_type: string
              _codes: string
              _country: string
              _currency: Database["public"]["Enums"]["currency_code"]
              _images: string[]
              _qty: number
              _value: number
            }
            Returns: string
          }
    }
    Enums: {
      app_role: "admin" | "user"
      currency_code: "NGN" | "USD"
      kyc_status: "pending" | "verified" | "rejected"
      sale_status: "pending" | "approved" | "rejected"
      txn_status: "pending" | "successful" | "failed"
      txn_type: "buy" | "sell" | "deposit" | "withdrawal" | "card_funding"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      currency_code: ["NGN", "USD"],
      kyc_status: ["pending", "verified", "rejected"],
      sale_status: ["pending", "approved", "rejected"],
      txn_status: ["pending", "successful", "failed"],
      txn_type: ["buy", "sell", "deposit", "withdrawal", "card_funding"],
    },
  },
} as const
