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
      investments: {
        Row: {
          completed_at: string | null
          cycle_days: number
          daily_income: number
          days_elapsed: number
          id: string
          last_accrued_on: string
          package_id: number
          price_paid: number
          started_at: string
          status: Database["public"]["Enums"]["investment_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          cycle_days: number
          daily_income: number
          days_elapsed?: number
          id?: string
          last_accrued_on?: string
          package_id: number
          price_paid: number
          started_at?: string
          status?: Database["public"]["Enums"]["investment_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          cycle_days?: number
          daily_income?: number
          days_elapsed?: number
          id?: string
          last_accrued_on?: string
          package_id?: number
          price_paid?: number
          started_at?: string
          status?: Database["public"]["Enums"]["investment_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "investments_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "packages"
            referencedColumns: ["id"]
          },
        ]
      }
      packages: {
        Row: {
          animal_key: string
          created_at: string
          cycle_days: number
          daily_income_kes: number
          display_order: number
          emoji: string
          id: number
          is_active: boolean
          is_free: boolean
          name: string
          price_kes: number
          total_profit_kes: number
          updated_at: string
        }
        Insert: {
          animal_key: string
          created_at?: string
          cycle_days: number
          daily_income_kes: number
          display_order?: number
          emoji: string
          id?: number
          is_active?: boolean
          is_free?: boolean
          name: string
          price_kes: number
          total_profit_kes: number
          updated_at?: string
        }
        Update: {
          animal_key?: string
          created_at?: string
          cycle_days?: number
          daily_income_kes?: number
          display_order?: number
          emoji?: string
          id?: number
          is_active?: boolean
          is_free?: boolean
          name?: string
          price_kes?: number
          total_profit_kes?: number
          updated_at?: string
        }
        Relationships: []
      }
      points_ledger: {
        Row: {
          created_at: string
          delta: number
          id: string
          investment_id: string | null
          reason: string
          user_id: string
        }
        Insert: {
          created_at?: string
          delta: number
          id?: string
          investment_id?: string | null
          reason: string
          user_id: string
        }
        Update: {
          created_at?: string
          delta?: number
          id?: string
          investment_id?: string | null
          reason?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "points_ledger_investment_id_fkey"
            columns: ["investment_id"]
            isOneToOne: false
            referencedRelation: "investments"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          account_balance: number
          available_points: number
          avatar_animal: string
          created_at: string
          deposit_balance: number
          display_name: string | null
          email: string | null
          id: string
          is_active: boolean
          phone: string | null
          referral_code: string
          referred_by: string | null
          unclaimed_income: number
          updated_at: string
        }
        Insert: {
          account_balance?: number
          available_points?: number
          avatar_animal?: string
          created_at?: string
          deposit_balance?: number
          display_name?: string | null
          email?: string | null
          id: string
          is_active?: boolean
          phone?: string | null
          referral_code?: string
          referred_by?: string | null
          unclaimed_income?: number
          updated_at?: string
        }
        Update: {
          account_balance?: number
          available_points?: number
          avatar_animal?: string
          created_at?: string
          deposit_balance?: number
          display_name?: string | null
          email?: string | null
          id?: string
          is_active?: boolean
          phone?: string | null
          referral_code?: string
          referred_by?: string | null
          unclaimed_income?: number
          updated_at?: string
        }
        Relationships: []
      }
      referral_commissions: {
        Row: {
          amount: number
          created_at: string
          earner_id: string
          id: string
          investment_id: string | null
          level: number
          source_user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          earner_id: string
          id?: string
          investment_id?: string | null
          level: number
          source_user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          earner_id?: string
          id?: string
          investment_id?: string | null
          level?: number
          source_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "referral_commissions_investment_id_fkey"
            columns: ["investment_id"]
            isOneToOne: false
            referencedRelation: "investments"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          amount_kes: number
          checkout_request_id: string | null
          created_at: string
          failure_reason: string | null
          id: string
          merchant_request_id: string | null
          metadata: Json
          phone: string | null
          processed_at: string | null
          provider: string
          provider_reference: string | null
          status: Database["public"]["Enums"]["transaction_status"]
          type: Database["public"]["Enums"]["transaction_type"]
          updated_at: string
          user_id: string
        }
        Insert: {
          amount_kes: number
          checkout_request_id?: string | null
          created_at?: string
          failure_reason?: string | null
          id?: string
          merchant_request_id?: string | null
          metadata?: Json
          phone?: string | null
          processed_at?: string | null
          provider?: string
          provider_reference?: string | null
          status?: Database["public"]["Enums"]["transaction_status"]
          type: Database["public"]["Enums"]["transaction_type"]
          updated_at?: string
          user_id: string
        }
        Update: {
          amount_kes?: number
          checkout_request_id?: string | null
          created_at?: string
          failure_reason?: string | null
          id?: string
          merchant_request_id?: string | null
          metadata?: Json
          phone?: string | null
          processed_at?: string | null
          provider?: string
          provider_reference?: string | null
          status?: Database["public"]["Enums"]["transaction_status"]
          type?: Database["public"]["Enums"]["transaction_type"]
          updated_at?: string
          user_id?: string
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
          role?: Database["public"]["Enums"]["app_role"]
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
      accrue_daily_income: { Args: never; Returns: number }
      collect_income: { Args: never; Returns: number }
      ensure_my_profile: {
        Args: {
          _display_name?: string
          _email: string
          _phone?: string
          _referral_code?: string
        }
        Returns: {
          account_balance: number
          available_points: number
          avatar_animal: string
          created_at: string
          deposit_balance: number
          display_name: string | null
          email: string | null
          id: string
          is_active: boolean
          phone: string | null
          referral_code: string
          referred_by: string | null
          unclaimed_income: number
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "profiles"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      purchase_package: { Args: { _package_id: number }; Returns: string }
      request_withdrawal: {
        Args: { _amount: number; _phone: string }
        Returns: string
      }
    }
    Enums: {
      app_role: "admin" | "user"
      investment_status: "active" | "completed"
      transaction_status: "pending" | "completed" | "rejected" | "failed"
      transaction_type: "deposit" | "withdrawal"
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
      investment_status: ["active", "completed"],
      transaction_status: ["pending", "completed", "rejected", "failed"],
      transaction_type: ["deposit", "withdrawal"],
    },
  },
} as const
