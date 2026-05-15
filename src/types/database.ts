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
    PostgrestVersion: "14.1"
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
      ai_chat_conversations: {
        Row: {
          created_at: string | null
          id: string
          title: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          title?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          title?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_chat_conversations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_chat_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string | null
          id: string
          metadata: Json | null
          role: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          role: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_chat_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "ai_chat_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_chat_pending_actions: {
        Row: {
          conversation_id: string
          created_at: string | null
          expires_at: string
          id: string
          preview: Json
          resolved_at: string | null
          status: string
          tool_args: Json
          tool_name: string
          user_id: string
        }
        Insert: {
          conversation_id: string
          created_at?: string | null
          expires_at?: string
          id?: string
          preview?: Json
          resolved_at?: string | null
          status?: string
          tool_args?: Json
          tool_name: string
          user_id: string
        }
        Update: {
          conversation_id?: string
          created_at?: string | null
          expires_at?: string
          id?: string
          preview?: Json
          resolved_at?: string | null
          status?: string
          tool_args?: Json
          tool_name?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_chat_pending_actions_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "ai_chat_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_chat_pending_actions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      api_secrets: {
        Row: {
          created_at: string | null
          created_by: string | null
          expires_at: string | null
          id: string
          is_active: boolean | null
          label: string | null
          last_used_at: string | null
          secret_token: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          label?: string | null
          last_used_at?: string | null
          secret_token: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          label?: string | null
          last_used_at?: string | null
          secret_token?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      app_build_counters: {
        Row: {
          base_version: string
          channel: string
          counter_date: string
          created_at: string
          date_code: string
          id: number
          last_sequence: number
          updated_at: string
        }
        Insert: {
          base_version: string
          channel: string
          counter_date: string
          created_at?: string
          date_code: string
          id?: number
          last_sequence: number
          updated_at?: string
        }
        Update: {
          base_version?: string
          channel?: string
          counter_date?: string
          created_at?: string
          date_code?: string
          id?: number
          last_sequence?: number
          updated_at?: string
        }
        Relationships: []
      }
      attachments: {
        Row: {
          created_at: string
          expense_id: string
          file_name: string
          file_size: number | null
          id: string
          mime_type: string | null
          storage_path: string
          uploaded_by: string
        }
        Insert: {
          created_at?: string
          expense_id: string
          file_name: string
          file_size?: number | null
          id?: string
          mime_type?: string | null
          storage_path: string
          uploaded_by: string
        }
        Update: {
          created_at?: string
          expense_id?: string
          file_name?: string
          file_size?: number | null
          id?: string
          mime_type?: string | null
          storage_path?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "attachments_expense_id_fkey"
            columns: ["expense_id"]
            isOneToOne: false
            referencedRelation: "expenses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attachments_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          changed_fields: string[] | null
          created_at: string
          id: string
          ip_address: unknown
          new_data: Json | null
          old_data: Json | null
          operation: string
          record_id: string
          table_name: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          changed_fields?: string[] | null
          created_at?: string
          id?: string
          ip_address?: unknown
          new_data?: Json | null
          old_data?: Json | null
          operation: string
          record_id: string
          table_name: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          changed_fields?: string[] | null
          created_at?: string
          id?: string
          ip_address?: unknown
          new_data?: Json | null
          old_data?: Json | null
          operation?: string
          record_id?: string
          table_name?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_trail: {
        Row: {
          action_type: string
          actor: string
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          metadata: Json | null
          timestamp: string
        }
        Insert: {
          action_type: string
          actor: string
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
          metadata?: Json | null
          timestamp?: string
        }
        Update: {
          action_type?: string
          actor?: string
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
          metadata?: Json | null
          timestamp?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_trail_actor_fkey"
            columns: ["actor"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      balance_history: {
        Row: {
          created_at: string
          currency: string
          id: string
          net_balance: number
          snapshot_date: string
          total_lent: number
          total_owed: number
          user_id: string
        }
        Insert: {
          created_at?: string
          currency?: string
          id?: string
          net_balance?: number
          snapshot_date: string
          total_lent?: number
          total_owed?: number
          user_id: string
        }
        Update: {
          created_at?: string
          currency?: string
          id?: string
          net_balance?: number
          snapshot_date?: string
          total_lent?: number
          total_owed?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "balance_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      comment_mentions: {
        Row: {
          comment_id: string
          created_at: string
          id: string
          mentioned_user_id: string
        }
        Insert: {
          comment_id: string
          created_at?: string
          id?: string
          mentioned_user_id: string
        }
        Update: {
          comment_id?: string
          created_at?: string
          id?: string
          mentioned_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comment_mentions_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "expense_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comment_mentions_mentioned_user_id_fkey"
            columns: ["mentioned_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      donation_settings: {
        Row: {
          avatar_image_url: string | null
          bank_info: Json | null
          created_at: string | null
          cta_text: Json | null
          donate_message: Json | null
          id: string
          is_enabled: boolean
          qr_code_image_url: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_image_url?: string | null
          bank_info?: Json | null
          created_at?: string | null
          cta_text?: Json | null
          donate_message?: Json | null
          id?: string
          is_enabled?: boolean
          qr_code_image_url?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_image_url?: string | null
          bank_info?: Json | null
          created_at?: string | null
          cta_text?: Json | null
          donate_message?: Json | null
          id?: string
          is_enabled?: boolean
          qr_code_image_url?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      expense_comments: {
        Row: {
          content: string
          created_at: string
          edited_at: string | null
          expense_id: string
          id: string
          is_edited: boolean
          parent_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          edited_at?: string | null
          expense_id: string
          id?: string
          is_edited?: boolean
          parent_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          edited_at?: string | null
          expense_id?: string
          id?: string
          is_edited?: boolean
          parent_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "expense_comments_expense_id_fkey"
            columns: ["expense_id"]
            isOneToOne: false
            referencedRelation: "expenses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expense_comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "expense_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expense_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      expense_reactions: {
        Row: {
          created_at: string
          id: string
          reaction_type_id: string
          target_id: string
          target_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          reaction_type_id: string
          target_id: string
          target_type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          reaction_type_id?: string
          target_id?: string
          target_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "expense_reactions_reaction_type_id_fkey"
            columns: ["reaction_type_id"]
            isOneToOne: false
            referencedRelation: "reaction_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expense_reactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      expense_splits: {
        Row: {
          computed_amount: number
          created_at: string
          expense_id: string
          id: string
          is_claimed: boolean | null
          is_settled: boolean | null
          pending_email: string | null
          settled_amount: number | null
          settled_at: string | null
          split_method: string
          split_value: number | null
          user_id: string | null
        }
        Insert: {
          computed_amount: number
          created_at?: string
          expense_id: string
          id?: string
          is_claimed?: boolean | null
          is_settled?: boolean | null
          pending_email?: string | null
          settled_amount?: number | null
          settled_at?: string | null
          split_method: string
          split_value?: number | null
          user_id?: string | null
        }
        Update: {
          computed_amount?: number
          created_at?: string
          expense_id?: string
          id?: string
          is_claimed?: boolean | null
          is_settled?: boolean | null
          pending_email?: string | null
          settled_amount?: number | null
          settled_at?: string | null
          split_method?: string
          split_value?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expense_splits_expense_id_fkey"
            columns: ["expense_id"]
            isOneToOne: false
            referencedRelation: "expenses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expense_splits_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount: number
          category: Database["public"]["Enums"]["expense_category"] | null
          comment: string | null
          context_type: string
          created_at: string
          created_by: string
          currency: string
          cycle_date: string | null
          description: string
          expense_date: string
          friendship_id: string | null
          generated_at: string | null
          group_id: string | null
          id: string
          is_payment: boolean
          paid_by_user_id: string
          recurring_expense_id: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          category?: Database["public"]["Enums"]["expense_category"] | null
          comment?: string | null
          context_type: string
          created_at?: string
          created_by: string
          currency?: string
          cycle_date?: string | null
          description: string
          expense_date?: string
          friendship_id?: string | null
          generated_at?: string | null
          group_id?: string | null
          id?: string
          is_payment?: boolean
          paid_by_user_id: string
          recurring_expense_id?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          category?: Database["public"]["Enums"]["expense_category"] | null
          comment?: string | null
          context_type?: string
          created_at?: string
          created_by?: string
          currency?: string
          cycle_date?: string | null
          description?: string
          expense_date?: string
          friendship_id?: string | null
          generated_at?: string | null
          group_id?: string | null
          id?: string
          is_payment?: boolean
          paid_by_user_id?: string
          recurring_expense_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "expenses_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_friendship_id_fkey"
            columns: ["friendship_id"]
            isOneToOne: false
            referencedRelation: "friendships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_paid_by_user_id_fkey"
            columns: ["paid_by_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_recurring_expense_id_fkey"
            columns: ["recurring_expense_id"]
            isOneToOne: false
            referencedRelation: "recurring_expenses"
            referencedColumns: ["id"]
          },
        ]
      }
      friendships: {
        Row: {
          created_at: string
          created_by: string
          id: string
          status: string
          updated_at: string
          user_a: string
          user_b: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          status?: string
          updated_at?: string
          user_a: string
          user_b: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          status?: string
          updated_at?: string
          user_a?: string
          user_b?: string
        }
        Relationships: [
          {
            foreignKeyName: "friendships_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "friendships_user_a_fkey"
            columns: ["user_a"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "friendships_user_b_fkey"
            columns: ["user_b"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      group_join_requests: {
        Row: {
          created_at: string
          group_id: string
          id: string
          message: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          group_id: string
          id?: string
          message?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          group_id?: string
          id?: string
          message?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_join_requests_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_join_requests_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_join_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      group_members: {
        Row: {
          group_id: string
          id: string
          joined_at: string
          role: string
          user_id: string
        }
        Insert: {
          group_id: string
          id?: string
          joined_at?: string
          role: string
          user_id: string
        }
        Update: {
          group_id?: string
          id?: string
          joined_at?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      groups: {
        Row: {
          archived_at: string | null
          archived_by: string | null
          avatar_url: string | null
          created_at: string
          created_by: string
          description: string | null
          id: string
          is_archived: boolean
          name: string
          simplify_debts: boolean | null
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          archived_by?: string | null
          avatar_url?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          is_archived?: boolean
          name: string
          simplify_debts?: boolean | null
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          archived_by?: string | null
          avatar_url?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          is_archived?: boolean
          name?: string
          simplify_debts?: boolean | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "groups_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      member_prepaid_balances: {
        Row: {
          balance_amount: number
          created_at: string
          currency: string
          id: string
          monthly_share_amount: number
          months_remaining: number | null
          recurring_expense_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          balance_amount?: number
          created_at?: string
          currency: string
          id?: string
          monthly_share_amount: number
          months_remaining?: number | null
          recurring_expense_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          balance_amount?: number
          created_at?: string
          currency?: string
          id?: string
          monthly_share_amount?: number
          months_remaining?: number | null
          recurring_expense_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "member_prepaid_balances_recurring_expense_id_fkey"
            columns: ["recurring_expense_id"]
            isOneToOne: false
            referencedRelation: "recurring_expenses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "member_prepaid_balances_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      momo_payment_requests: {
        Row: {
          amount: number
          created_at: string | null
          currency: string | null
          expense_split_id: string | null
          id: string
          momo_tran_id: string | null
          qr_url: string | null
          raw_webhook_data: Json | null
          receiver_phone: string
          reference_code: string
          status: string | null
          updated_at: string | null
          user_id: string | null
          verified_at: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          currency?: string | null
          expense_split_id?: string | null
          id?: string
          momo_tran_id?: string | null
          qr_url?: string | null
          raw_webhook_data?: Json | null
          receiver_phone: string
          reference_code: string
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
          verified_at?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          currency?: string | null
          expense_split_id?: string | null
          id?: string
          momo_tran_id?: string | null
          qr_url?: string | null
          raw_webhook_data?: Json | null
          receiver_phone?: string
          reference_code?: string
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "momo_payment_requests_expense_split_id_fkey"
            columns: ["expense_split_id"]
            isOneToOne: false
            referencedRelation: "expense_splits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "momo_payment_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      momo_settings: {
        Row: {
          created_at: string | null
          enabled: boolean | null
          id: string
          receiver_name: string | null
          receiver_phone: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          enabled?: boolean | null
          id?: string
          receiver_name?: string | null
          receiver_phone: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          enabled?: boolean | null
          id?: string
          receiver_name?: string | null
          receiver_phone?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      momo_webhook_logs: {
        Row: {
          amount: number | null
          comment: string | null
          created_at: string | null
          event_type: string
          id: string
          matched_request_id: string | null
          partner_id: string | null
          partner_name: string | null
          phone: string | null
          processed: boolean | null
          raw_payload: Json
          tran_id: string | null
        }
        Insert: {
          amount?: number | null
          comment?: string | null
          created_at?: string | null
          event_type: string
          id?: string
          matched_request_id?: string | null
          partner_id?: string | null
          partner_name?: string | null
          phone?: string | null
          processed?: boolean | null
          raw_payload: Json
          tran_id?: string | null
        }
        Update: {
          amount?: number | null
          comment?: string | null
          created_at?: string | null
          event_type?: string
          id?: string
          matched_request_id?: string | null
          partner_id?: string | null
          partner_name?: string | null
          phone?: string | null
          processed?: boolean | null
          raw_payload?: Json
          tran_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "momo_webhook_logs_matched_request_id_fkey"
            columns: ["matched_request_id"]
            isOneToOne: false
            referencedRelation: "momo_payment_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          actor_id: string | null
          created_at: string
          email_context: Json | null
          email_sent_at: string | null
          id: string
          is_read: boolean | null
          link: string | null
          message: string
          related_id: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          email_context?: Json | null
          email_sent_at?: string | null
          id?: string
          is_read?: boolean | null
          link?: string | null
          message: string
          related_id?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          email_context?: Json | null
          email_sent_at?: string | null
          id?: string
          is_read?: boolean | null
          link?: string | null
          message?: string
          related_id?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_events: {
        Row: {
          actor_user_id: string
          amount: number
          created_at: string
          currency: string
          event_type: string
          expense_id: string
          from_user_id: string
          id: string
          metadata: Json | null
          method: string
          split_id: string | null
          to_user_id: string
        }
        Insert: {
          actor_user_id: string
          amount: number
          created_at?: string
          currency?: string
          event_type: string
          expense_id: string
          from_user_id: string
          id?: string
          metadata?: Json | null
          method: string
          split_id?: string | null
          to_user_id: string
        }
        Update: {
          actor_user_id?: string
          amount?: number
          created_at?: string
          currency?: string
          event_type?: string
          expense_id?: string
          from_user_id?: string
          id?: string
          metadata?: Json | null
          method?: string
          split_id?: string | null
          to_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_events_actor_user_id_fkey"
            columns: ["actor_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_events_expense_id_fkey"
            columns: ["expense_id"]
            isOneToOne: false
            referencedRelation: "expenses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_events_from_user_id_fkey"
            columns: ["from_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_events_split_id_fkey"
            columns: ["split_id"]
            isOneToOne: false
            referencedRelation: "expense_splits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_events_to_user_id_fkey"
            columns: ["to_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          context_type: string
          created_at: string
          created_by: string
          currency: string
          friendship_id: string | null
          from_user: string
          group_id: string | null
          id: string
          note: string | null
          payment_date: string
          to_user: string
        }
        Insert: {
          amount: number
          context_type: string
          created_at?: string
          created_by: string
          currency?: string
          friendship_id?: string | null
          from_user: string
          group_id?: string | null
          id?: string
          note?: string | null
          payment_date?: string
          to_user: string
        }
        Update: {
          amount?: number
          context_type?: string
          created_at?: string
          created_by?: string
          currency?: string
          friendship_id?: string | null
          from_user?: string
          group_id?: string | null
          id?: string
          note?: string | null
          payment_date?: string
          to_user?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_friendship_id_fkey"
            columns: ["friendship_id"]
            isOneToOne: false
            referencedRelation: "friendships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_from_user_fkey"
            columns: ["from_user"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_to_user_fkey"
            columns: ["to_user"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      prepaid_consumption_log: {
        Row: {
          amount_consumed: number
          balance_after: number
          balance_before: number
          consumed_at: string
          expense_instance_id: string
          id: string
          recurring_expense_id: string
          user_id: string
        }
        Insert: {
          amount_consumed: number
          balance_after: number
          balance_before: number
          consumed_at?: string
          expense_instance_id: string
          id?: string
          recurring_expense_id: string
          user_id: string
        }
        Update: {
          amount_consumed?: number
          balance_after?: number
          balance_before?: number
          consumed_at?: string
          expense_instance_id?: string
          id?: string
          recurring_expense_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "prepaid_consumption_log_expense_instance_id_fkey"
            columns: ["expense_instance_id"]
            isOneToOne: false
            referencedRelation: "expenses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prepaid_consumption_log_recurring_expense_id_fkey"
            columns: ["recurring_expense_id"]
            isOneToOne: false
            referencedRelation: "recurring_expenses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prepaid_consumption_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      processed_webhook_events: {
        Row: {
          external_id: string
          id: string
          processed_at: string
          provider: string
        }
        Insert: {
          external_id: string
          id?: string
          processed_at?: string
          provider: string
        }
        Update: {
          external_id?: string
          id?: string
          processed_at?: string
          provider?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name: string
          id?: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      reaction_types: {
        Row: {
          code: string
          created_at: string
          created_by: string | null
          emoji: string | null
          emoji_mart_id: string | null
          id: string
          image_url: string | null
          is_active: boolean
          label: string
          media_type: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          created_by?: string | null
          emoji?: string | null
          emoji_mart_id?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          label: string
          media_type?: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string | null
          emoji?: string | null
          emoji_mart_id?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          label?: string
          media_type?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reaction_types_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      recurring_expenses: {
        Row: {
          created_at: string
          end_date: string | null
          frequency: string
          id: string
          interval: number
          is_active: boolean | null
          last_created_at: string | null
          last_prepaid_at: string | null
          next_occurrence: string
          prepaid_until: string | null
          template_expense_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          end_date?: string | null
          frequency: string
          id?: string
          interval?: number
          is_active?: boolean | null
          last_created_at?: string | null
          last_prepaid_at?: string | null
          next_occurrence: string
          prepaid_until?: string | null
          template_expense_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          end_date?: string | null
          frequency?: string
          id?: string
          interval?: number
          is_active?: boolean | null
          last_created_at?: string | null
          last_prepaid_at?: string | null
          next_occurrence?: string
          prepaid_until?: string | null
          template_expense_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "recurring_expenses_template_expense_id_fkey"
            columns: ["template_expense_id"]
            isOneToOne: false
            referencedRelation: "expenses"
            referencedColumns: ["id"]
          },
        ]
      }
      recurring_prepaid_payments: {
        Row: {
          amount: number
          coverage_from: string
          coverage_to: string
          created_at: string
          created_by: string
          expense_id: string | null
          id: string
          paid_by_user_id: string | null
          payment_date: string
          periods_covered: number
          recurring_expense_id: string
          user_id: string | null
        }
        Insert: {
          amount: number
          coverage_from: string
          coverage_to: string
          created_at?: string
          created_by: string
          expense_id?: string | null
          id?: string
          paid_by_user_id?: string | null
          payment_date?: string
          periods_covered: number
          recurring_expense_id: string
          user_id?: string | null
        }
        Update: {
          amount?: number
          coverage_from?: string
          coverage_to?: string
          created_at?: string
          created_by?: string
          expense_id?: string | null
          id?: string
          paid_by_user_id?: string | null
          payment_date?: string
          periods_covered?: number
          recurring_expense_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recurring_prepaid_payments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_prepaid_payments_expense_id_fkey"
            columns: ["expense_id"]
            isOneToOne: false
            referencedRelation: "expenses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_prepaid_payments_paid_by_user_id_fkey"
            columns: ["paid_by_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_prepaid_payments_recurring_expense_id_fkey"
            columns: ["recurring_expense_id"]
            isOneToOne: false
            referencedRelation: "recurring_expenses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_prepaid_payments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      sepay_payment_orders: {
        Row: {
          amount: number
          created_at: string | null
          currency: string
          custom_data: string | null
          expires_at: string | null
          id: string
          order_invoice_number: string
          paid_amount: number | null
          payee_user_id: string
          payer_user_id: string
          sepay_checkout_url: string | null
          source_id: string
          source_type: string
          status: string
          updated_at: string | null
          webhook_payload: Json | null
          webhook_processed_at: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          currency?: string
          custom_data?: string | null
          expires_at?: string | null
          id?: string
          order_invoice_number: string
          paid_amount?: number | null
          payee_user_id: string
          payer_user_id: string
          sepay_checkout_url?: string | null
          source_id: string
          source_type: string
          status?: string
          updated_at?: string | null
          webhook_payload?: Json | null
          webhook_processed_at?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          currency?: string
          custom_data?: string | null
          expires_at?: string | null
          id?: string
          order_invoice_number?: string
          paid_amount?: number | null
          payee_user_id?: string
          payer_user_id?: string
          sepay_checkout_url?: string | null
          source_id?: string
          source_type?: string
          status?: string
          updated_at?: string | null
          webhook_payload?: Json | null
          webhook_processed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sepay_payment_orders_payee_user_id_fkey"
            columns: ["payee_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sepay_payment_orders_payer_user_id_fkey"
            columns: ["payer_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_attributions: {
        Row: {
          anonymous_id: string | null
          created_at: string
          first_landing_path: string | null
          first_landing_url: string | null
          first_referrer: string | null
          first_seen_at: string | null
          first_utm_campaign: string | null
          first_utm_content: string | null
          first_utm_medium: string | null
          first_utm_source: string | null
          first_utm_term: string | null
          id: string
          last_landing_path: string | null
          last_landing_url: string | null
          last_referrer: string | null
          last_seen_at: string | null
          last_utm_campaign: string | null
          last_utm_content: string | null
          last_utm_medium: string | null
          last_utm_source: string | null
          last_utm_term: string | null
          session_id: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          anonymous_id?: string | null
          created_at?: string
          first_landing_path?: string | null
          first_landing_url?: string | null
          first_referrer?: string | null
          first_seen_at?: string | null
          first_utm_campaign?: string | null
          first_utm_content?: string | null
          first_utm_medium?: string | null
          first_utm_source?: string | null
          first_utm_term?: string | null
          id?: string
          last_landing_path?: string | null
          last_landing_url?: string | null
          last_referrer?: string | null
          last_seen_at?: string | null
          last_utm_campaign?: string | null
          last_utm_content?: string | null
          last_utm_medium?: string | null
          last_utm_source?: string | null
          last_utm_term?: string | null
          session_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          anonymous_id?: string | null
          created_at?: string
          first_landing_path?: string | null
          first_landing_url?: string | null
          first_referrer?: string | null
          first_seen_at?: string | null
          first_utm_campaign?: string | null
          first_utm_content?: string | null
          first_utm_medium?: string | null
          first_utm_source?: string | null
          first_utm_term?: string | null
          id?: string
          last_landing_path?: string | null
          last_landing_url?: string | null
          last_referrer?: string | null
          last_seen_at?: string | null
          last_utm_campaign?: string | null
          last_utm_content?: string | null
          last_utm_medium?: string | null
          last_utm_source?: string | null
          last_utm_term?: string | null
          session_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_attributions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "user_tracking_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_attributions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          role: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          role?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          role?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_settings: {
        Row: {
          allow_friend_requests: boolean | null
          allow_group_invites: boolean | null
          bank_info: Json | null
          created_at: string | null
          default_currency: string | null
          email_notifications: boolean | null
          notifications_enabled: boolean | null
          notify_on_expense_added: boolean | null
          notify_on_friend_request: boolean | null
          notify_on_group_invite: boolean | null
          notify_on_payment_received: boolean | null
          number_format: string | null
          profile_visibility: string | null
          qr_code_image_url: string | null
          sepay_config: Json | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          allow_friend_requests?: boolean | null
          allow_group_invites?: boolean | null
          bank_info?: Json | null
          created_at?: string | null
          default_currency?: string | null
          email_notifications?: boolean | null
          notifications_enabled?: boolean | null
          notify_on_expense_added?: boolean | null
          notify_on_friend_request?: boolean | null
          notify_on_group_invite?: boolean | null
          notify_on_payment_received?: boolean | null
          number_format?: string | null
          profile_visibility?: string | null
          qr_code_image_url?: string | null
          sepay_config?: Json | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          allow_friend_requests?: boolean | null
          allow_group_invites?: boolean | null
          bank_info?: Json | null
          created_at?: string | null
          default_currency?: string | null
          email_notifications?: boolean | null
          notifications_enabled?: boolean | null
          notify_on_expense_added?: boolean | null
          notify_on_friend_request?: boolean | null
          notify_on_group_invite?: boolean | null
          notify_on_payment_received?: boolean | null
          number_format?: string | null
          profile_visibility?: string | null
          qr_code_image_url?: string | null
          sepay_config?: Json | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_settings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_tracking_events: {
        Row: {
          anonymous_id: string
          created_at: string
          event_category: string
          event_name: string
          flow_name: string | null
          id: string
          occurred_at: string
          page_path: string
          properties: Json
          referrer_path: string | null
          session_id: string
          step_name: string | null
          target_key: string | null
          target_type: string | null
          user_id: string | null
        }
        Insert: {
          anonymous_id: string
          created_at?: string
          event_category: string
          event_name: string
          flow_name?: string | null
          id?: string
          occurred_at?: string
          page_path: string
          properties?: Json
          referrer_path?: string | null
          session_id: string
          step_name?: string | null
          target_key?: string | null
          target_type?: string | null
          user_id?: string | null
        }
        Update: {
          anonymous_id?: string
          created_at?: string
          event_category?: string
          event_name?: string
          flow_name?: string | null
          id?: string
          occurred_at?: string
          page_path?: string
          properties?: Json
          referrer_path?: string | null
          session_id?: string
          step_name?: string | null
          target_key?: string | null
          target_type?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_tracking_events_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "user_tracking_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_tracking_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_tracking_ignored_users: {
        Row: {
          created_at: string
          created_by: string | null
          reason: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          reason?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          reason?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_tracking_ignored_users_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_tracking_ignored_users_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_tracking_sessions: {
        Row: {
          anonymous_id: string
          created_at: string
          device_type: string | null
          entry_link: string
          id: string
          ip_hash: string | null
          landing_path: string
          landing_referrer: string | null
          landing_source: string
          last_seen_at: string
          locale: string | null
          started_at: string
          updated_at: string
          user_agent_hash: string | null
          user_id: string | null
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
        }
        Insert: {
          anonymous_id: string
          created_at?: string
          device_type?: string | null
          entry_link: string
          id: string
          ip_hash?: string | null
          landing_path: string
          landing_referrer?: string | null
          landing_source?: string
          last_seen_at?: string
          locale?: string | null
          started_at?: string
          updated_at?: string
          user_agent_hash?: string | null
          user_id?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Update: {
          anonymous_id?: string
          created_at?: string
          device_type?: string | null
          entry_link?: string
          id?: string
          ip_hash?: string | null
          landing_path?: string
          landing_referrer?: string | null
          landing_source?: string
          last_seen_at?: string
          locale?: string | null
          started_at?: string
          updated_at?: string
          user_agent_hash?: string | null
          user_id?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_tracking_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      utm_platforms: {
        Row: {
          created_at: string
          display_order: number
          enabled: boolean
          icon_key: string | null
          intent_url_template: string | null
          label: string
          medium: string
          method: string
          platform_key: string
          source: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          enabled?: boolean
          icon_key?: string | null
          intent_url_template?: string | null
          label: string
          medium: string
          method: string
          platform_key: string
          source: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_order?: number
          enabled?: boolean
          icon_key?: string | null
          intent_url_template?: string | null
          label?: string
          medium?: string
          method?: string
          platform_key?: string
          source?: string
          updated_at?: string
        }
        Relationships: []
      }
      utm_share_templates: {
        Row: {
          allowed_platforms: string[]
          campaign: string
          content: string
          created_at: string
          default_platform: string | null
          enabled: boolean
          entity_type: string
          entry_point: string
          template_key: string
          updated_at: string
        }
        Insert: {
          allowed_platforms?: string[]
          campaign: string
          content: string
          created_at?: string
          default_platform?: string | null
          enabled?: boolean
          entity_type: string
          entry_point: string
          template_key: string
          updated_at?: string
        }
        Update: {
          allowed_platforms?: string[]
          campaign?: string
          content?: string
          created_at?: string
          default_platform?: string | null
          enabled?: boolean
          entity_type?: string
          entry_point?: string
          template_key?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "utm_share_templates_default_platform_fkey"
            columns: ["default_platform"]
            isOneToOne: false
            referencedRelation: "utm_platforms"
            referencedColumns: ["platform_key"]
          },
        ]
      }
    }
    Views: {
      admin_audit_unified: {
        Row: {
          action_type: string | null
          actor_email: string | null
          actor_id: string | null
          actor_name: string | null
          entity_id: string | null
          entity_type: string | null
          id: string | null
          metadata: Json | null
          new_data: Json | null
          old_data: Json | null
          source: string | null
          table_name: string | null
          timestamp: string | null
        }
        Relationships: []
      }
      expense_category_stats: {
        Row: {
          avg_amount: number | null
          category: Database["public"]["Enums"]["expense_category"] | null
          expense_count: number | null
          first_expense_date: string | null
          last_expense_date: string | null
          total_amount: number | null
        }
        Relationships: []
      }
      user_debts_history: {
        Row: {
          last_transaction_date: string | null
          owed_user: string | null
          owes_user: string | null
          remaining_amount: number | null
          settled_amount: number | null
          total_amount: number | null
          transaction_count: number | null
        }
        Relationships: [
          {
            foreignKeyName: "expense_splits_user_id_fkey"
            columns: ["owes_user"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_paid_by_user_id_fkey"
            columns: ["owed_user"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_debts_summary: {
        Row: {
          amount_owed: number | null
          owed_user: string | null
          owes_user: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expense_splits_user_id_fkey"
            columns: ["owes_user"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_paid_by_user_id_fkey"
            columns: ["owed_user"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      add_expense_comment: {
        Args: {
          p_content: string
          p_expense_id: string
          p_mentioned_user_ids?: string[]
          p_parent_id?: string
        }
        Returns: Json
      }
      admin_accept_friendship: {
        Args: { p_friendship_id: string }
        Returns: Json
      }
      admin_bulk_insert_expenses: {
        Args: { p_expenses: Json }
        Returns: number
      }
      admin_create_profile: {
        Args: {
          p_avatar_url?: string
          p_email: string
          p_full_name: string
          p_role?: string
        }
        Returns: {
          avatar_url: string
          created_at: string
          email: string
          full_name: string
          id: string
          role: string
        }[]
      }
      admin_delete_user_tracking: {
        Args: { p_time_range?: string; p_user_id: string }
        Returns: Json
      }
      admin_get_email_devtool_summary: {
        Args: { p_limit?: number }
        Returns: Json
      }
      admin_get_latest_tracked_users: {
        Args: { p_limit?: number }
        Returns: Json
      }
      admin_get_user_journey_graph: {
        Args: {
          p_event_names?: string[]
          p_from?: string
          p_session_id?: string
          p_to?: string
          p_user_id: string
        }
        Returns: Json
      }
      admin_get_user_tracking_events: {
        Args: {
          p_event_names?: string[]
          p_from?: string
          p_limit?: number
          p_offset?: number
          p_session_id?: string
          p_to?: string
          p_user_id: string
        }
        Returns: Json
      }
      admin_get_user_tracking_overview: {
        Args: { p_from?: string; p_to?: string; p_user_id: string }
        Returns: Json
      }
      admin_get_user_tracking_sessions: {
        Args: {
          p_from?: string
          p_limit?: number
          p_offset?: number
          p_to?: string
          p_user_id: string
        }
        Returns: Json
      }
      admin_get_utm_canvas: {
        Args: {
          p_campaign?: string
          p_entity_type?: string
          p_from?: string
          p_medium?: string
          p_source?: string
          p_to?: string
          p_user_id?: string
        }
        Returns: Json
      }
      admin_get_utm_config: { Args: never; Returns: Json }
      admin_get_utm_performance: {
        Args: {
          p_campaign?: string
          p_entity_type?: string
          p_from?: string
          p_medium?: string
          p_source?: string
          p_to?: string
          p_user_id?: string
        }
        Returns: Json
      }
      admin_revert_audit_entry: { Args: { p_audit_id: string }; Returns: Json }
      admin_set_user_tracking_ignore: {
        Args: { p_ignore: boolean; p_reason?: string; p_user_id: string }
        Returns: Json
      }
      admin_update_user_role: {
        Args: { p_new_role: string; p_user_id: string }
        Returns: Json
      }
      admin_upsert_utm_platform: { Args: { p_platform: Json }; Returns: Json }
      admin_upsert_utm_template: { Args: { p_template: Json }; Returns: Json }
      allocate_app_build_version: {
        Args: { p_base_version: string; p_channel: string; p_tz?: string }
        Returns: {
          base_version: string
          channel: string
          date_code: string
          sequence: number
          version: string
        }[]
      }
      approve_join_request: {
        Args: { p_request_id: string }
        Returns: undefined
      }
      are_friends: {
        Args: { user_id_1: string; user_id_2: string }
        Returns: boolean
      }
      batch_record_payments: { Args: { p_payments: Json }; Returns: Json }
      bulk_delete_expenses: { Args: { p_expense_ids: string[] }; Returns: Json }
      calculate_daily_balance: {
        Args: {
          p_currency?: string
          p_snapshot_date?: string
          p_user_id: string
        }
        Returns: undefined
      }
      calculate_next_occurrence: {
        Args: {
          p_current_date: string
          p_frequency: string
          p_interval_value: number
        }
        Returns: string
      }
      calculate_prepaid_until: {
        Args: {
          p_frequency: string
          p_interval_value: number
          p_periods_count: number
          p_start_date: string
        }
        Returns: string
      }
      claim_pending_email_splits: {
        Args: { p_email: string; p_user_id: string }
        Returns: Json
      }
      cleanup_old_audit_logs: {
        Args: { p_days_to_keep?: number }
        Returns: Json
      }
      cleanup_old_tracking_data: {
        Args: { p_days_to_keep?: number }
        Returns: Json
      }
      consume_prepaid_for_instance: {
        Args: { p_expense_instance_id: string }
        Returns: Json
      }
      create_api_secret: {
        Args: { p_label?: string }
        Returns: {
          created_at: string
          expires_at: string
          id: string
          label: string
          secret_token: string
        }[]
      }
      create_momo_payment_request: {
        Args: {
          p_amount: number
          p_expense_split_id: string
          p_receiver_phone: string
          p_user_id: string
        }
        Returns: Json
      }
      create_notification: {
        Args: {
          p_link?: string
          p_message: string
          p_related_id?: string
          p_title: string
          p_type: string
          p_user_id: string
        }
        Returns: string
      }
      create_recurring_instance_manual: {
        Args: { p_recurring_expense_id: string }
        Returns: Json
      }
      create_user_if_not_exists: {
        Args: {
          p_email: string
          p_full_name: string
          p_id: string
          p_password?: string
        }
        Returns: undefined
      }
      create_user_with_profile: {
        Args: {
          user_email: string
          user_full_name: string
          user_password?: string
        }
        Returns: string
      }
      delete_expense_comment: { Args: { p_comment_id: string }; Returns: Json }
      expire_pending_actions: { Args: never; Returns: undefined }
      get_admin_stats: { Args: never; Returns: Json }
      get_admin_users: {
        Args: never
        Returns: {
          avatar_url: string
          created_at: string
          email: string
          full_name: string
          id: string
          journey_tracking_ignored: boolean
          role: string
        }[]
      }
      get_all_groups_with_member_counts: {
        Args: never
        Returns: {
          archived_at: string
          archived_by: string
          avatar_url: string
          created_at: string
          created_by: string
          description: string
          id: string
          is_archived: boolean
          member_count: number
          name: string
          simplify_debts: boolean
          updated_at: string
        }[]
      }
      get_all_members_prepaid_info: {
        Args: { p_recurring_expense_id: string }
        Returns: {
          balance_amount: number
          currency: string
          monthly_share: number
          months_remaining: number
          payment_count: number
          total_prepaid: number
          user_id: string
          user_name: string
        }[]
      }
      get_all_users_debt_detailed: {
        Args: { p_limit?: number; p_offset?: number }
        Returns: {
          active_debt_relationships: number
          debts_by_group: Json
          debts_by_person: Json
          email: string
          full_name: string
          net_balance: number
          total_count: number
          total_i_owe: number
          total_owed_to_me: number
          user_id: string
        }[]
      }
      get_all_users_debt_summary: {
        Args: { p_limit?: number; p_offset?: number }
        Returns: {
          full_name: string
          net_balance: number
          total_count: number
          user_id: string
        }[]
      }
      get_audit_filter_options: { Args: never; Returns: Json }
      get_audit_statistics: {
        Args: { p_days?: number }
        Returns: {
          daily_activity: Json
          delete_count: number
          events_by_table: Json
          insert_count: number
          total_events: number
          unique_users: number
          update_count: number
        }[]
      }
      get_audit_stats: { Args: never; Returns: Json }
      get_balance_history: {
        Args: {
          p_currency?: string
          p_end_date?: string
          p_start_date?: string
          p_user_id?: string
        }
        Returns: {
          currency: string
          net_balance: number
          snapshot_date: string
          total_lent: number
          total_owed: number
        }[]
      }
      get_due_recurring_expenses: {
        Args: never
        Returns: {
          context_type: string
          created_by: string
          end_date: string
          frequency: string
          friendship_id: string
          group_id: string
          id: string
          interval_value: number
          next_occurrence: string
          prepaid_until: string
          template_expense_id: string
        }[]
      }
      get_due_recurring_expenses_for_date: {
        Args: { p_reference_date: string }
        Returns: {
          context_type: string
          created_by: string
          end_date: string
          frequency: string
          friendship_id: string
          group_id: string
          id: string
          interval_value: number
          next_occurrence: string
          prepaid_until: string
          template_expense_id: string
        }[]
      }
      get_email_notification_queue: {
        Args: { p_include_recent?: boolean; p_notification_ids?: string[] }
        Returns: {
          created_at: string
          email_context: Json
          link: string
          message: string
          notification_id: string
          notification_type: string
          title: string
          user_email: string
          user_id: string
          user_name: string
        }[]
      }
      get_expense_all_reactions: {
        Args: { p_expense_id: string }
        Returns: Json
      }
      get_expense_categories: {
        Args: never
        Returns: {
          category_name: string
        }[]
      }
      get_expense_comments: { Args: { p_expense_id: string }; Returns: Json }
      get_expense_og_data: {
        Args: { p_expense_id: string }
        Returns: {
          all_settled: boolean
          amount: number
          category: string
          currency: string
          description: string
          expense_date: string
          id: string
          latest_settled_at: string
          payer_name: string
          receipt_mime_type: string
          receipt_storage_path: string
        }[]
      }
      get_expense_payment_events: {
        Args: { p_expense_id: string }
        Returns: {
          actor_user_id: string
          actor_user_name: string
          amount: number
          created_at: string
          currency: string
          event_type: string
          from_user_avatar: string
          from_user_id: string
          from_user_name: string
          id: string
          metadata: Json
          method: string
          to_user_avatar: string
          to_user_id: string
          to_user_name: string
        }[]
      }
      get_expense_splits_public: {
        Args: { p_expense_id: string }
        Returns: {
          avatar_url: string
          computed_amount: number
          created_at: string
          expense_id: string
          full_name: string
          id: string
          is_claimed: boolean
          is_settled: boolean
          pending_email: string
          settled_amount: number
          settled_at: string
          split_method: string
          split_value: number
          split_value_numeric: number
          user_id: string
        }[]
      }
      get_expense_summary_by_category: {
        Args: { p_end_date?: string; p_start_date?: string; p_user_id: string }
        Returns: {
          avg_amount: number
          category: string
          expense_count: number
          percentage: number
          total_amount: number
        }[]
      }
      get_expenses_with_payment_events: {
        Args: { p_expense_ids: string[] }
        Returns: {
          expense_id: string
          payment_events: Json
        }[]
      }
      get_friendship: {
        Args: { user_id_1: string; user_id_2: string }
        Returns: string
      }
      get_friendship_activity: {
        Args: { p_friendship_id: string }
        Returns: {
          expense_count: number
          last_expense_date: string
          last_payment_date: string
          most_common_category: string
          net_balance: number
          payment_count: number
          total_expenses: number
          total_payments: number
          user_a_owes: number
          user_b_owes: number
        }[]
      }
      get_group_member_count: { Args: { p_group_id: string }; Returns: number }
      get_group_stats: {
        Args: { p_group_id: string }
        Returns: {
          created_at: string
          expense_count: number
          last_activity: string
          member_count: number
          most_active_user_count: number
          most_active_user_id: string
          most_active_user_name: string
          payment_count: number
          total_expenses: number
          total_outstanding: number
          total_payments: number
        }[]
      }
      get_leaderboard_data: {
        Args: { p_limit?: number; p_offset?: number }
        Returns: {
          stats: Json
          top_creditors: Json
          top_debtors: Json
        }[]
      }
      get_member_monthly_share: {
        Args: { p_recurring_expense_id: string; p_user_id: string }
        Returns: number
      }
      get_prepaid_payment_history: {
        Args: { p_recurring_expense_id: string }
        Returns: {
          amount: number
          coverage_from: string
          coverage_to: string
          created_at: string
          created_by: string
          created_by_name: string
          expense_id: string
          id: string
          payment_date: string
          periods_covered: number
          total_prepaid_amount: number
        }[]
      }
      get_public_demo_debts: {
        Args: never
        Returns: {
          amount: number
          counterparty_id: string
          counterparty_name: string
          currency: string
          i_owe_them: boolean
          owed_to_id: string
          owed_to_name: string
        }[]
      }
      get_public_recent_activities: {
        Args: { p_limit?: number; p_offset?: number }
        Returns: {
          amount: number
          created_by_id: string
          created_by_name: string
          currency: string
          date: string
          description: string
          group_id: string
          group_name: string
          id: string
          type: string
        }[]
      }
      get_reactions: {
        Args: { p_target_id: string; p_target_type: string }
        Returns: Json
      }
      get_record_audit_history: {
        Args: { p_limit?: number; p_record_id: string; p_table_name: string }
        Returns: {
          changed_fields: string[]
          created_at: string
          id: string
          new_data: Json
          old_data: Json
          operation: string
          user_id: string
          user_name: string
        }[]
      }
      get_spending_comparison: {
        Args: {
          p_current_end: string
          p_current_start: string
          p_group_id?: string
        }
        Returns: {
          current_total: number
          difference: number
          percentage_change: number
          previous_total: number
          trend: string
        }[]
      }
      get_spending_trend: {
        Args: { p_user_id: string; p_weeks?: number }
        Returns: {
          avg_per_expense: number
          expense_count: number
          total_spent: number
          week_end: string
          week_number: number
          week_start: string
        }[]
      }
      get_top_categories: {
        Args: {
          p_end_date?: string
          p_group_id?: string
          p_limit?: number
          p_start_date?: string
        }
        Returns: {
          category: string
          expense_count: number
          percentage: number
          total_amount: number
        }[]
      }
      get_top_spenders: {
        Args: {
          p_end_date?: string
          p_group_id: string
          p_limit?: number
          p_start_date?: string
        }
        Returns: {
          expense_count: number
          percentage: number
          total_spent: number
          user_avatar: string
          user_id: string
          user_name: string
        }[]
      }
      get_user_activities:
        | {
            Args: { p_limit?: number; p_offset?: number; p_user_id: string }
            Returns: {
              currency: string
              date: string
              description: string
              group_name: string
              id: string
              is_borrower: boolean
              is_lender: boolean
              is_payment: boolean
              paid_by_name: string
              total_amount: number
              type: string
              user_share: number
            }[]
          }
        | {
            Args: { p_limit?: number; p_user_id: string }
            Returns: {
              currency: string
              date: string
              description: string
              group_name: string
              id: string
              is_borrower: boolean
              is_lender: boolean
              is_payment: boolean
              paid_by_name: string
              total_amount: number
              type: string
              user_share: number
            }[]
          }
      get_user_activity_heatmap: {
        Args: { p_days?: number; p_user_id: string }
        Returns: {
          activity_date: string
          day_of_week: number
          expense_count: number
          payment_count: number
          total_amount: number
        }[]
      }
      get_user_audit_activity: {
        Args: { p_days?: number; p_limit?: number; p_user_id?: string }
        Returns: {
          changed_fields: string[]
          created_at: string
          id: string
          operation: string
          record_id: string
          table_name: string
        }[]
      }
      get_user_balance: {
        Args: { p_end_date?: string; p_start_date?: string; p_user_id: string }
        Returns: {
          net_balance: number
          total_i_owe: number
          total_owed_to_me: number
        }[]
      }
      get_user_balances: {
        Args: { p_user_id: string }
        Returns: {
          amount: number
          counterparty_id: string
          counterparty_name: string
          currency: string
          i_owe_them: boolean
        }[]
      }
      get_user_balances_with_history: {
        Args: { p_user_id: string }
        Returns: {
          amount: number
          counterparty_id: string
          counterparty_name: string
          currency: string
          i_owe_them: boolean
          last_transaction_date: string
          remaining_amount: number
          settled_amount: number
          total_amount: number
          transaction_count: number
        }[]
      }
      get_user_debt_by_secret: {
        Args: { p_secret_token: string; p_user_id: string }
        Returns: {
          currency: string
          debts_by_group: Json
          debts_by_person: Json
          error_message: string
          net_balance: number
          settlement_summary: Json
          success: boolean
          total_i_owe: number
          total_owed_to_me: number
          user_email: string
          user_id: string
          user_name: string
        }[]
      }
      get_user_debt_details: {
        Args: { p_counterparty_id: string; p_user_id: string }
        Returns: {
          category: string
          context_type: string
          created_at: string
          currency: string
          description: string
          expense_date: string
          expense_id: string
          friendship_id: string
          group_id: string
          group_name: string
          i_owe_them: boolean
          is_settled: boolean
          paid_by_name: string
          paid_by_user_id: string
          remaining_amount: number
          settled_amount: number
          split_amount: number
          total_amount: number
        }[]
      }
      get_user_debts_aggregated: {
        Args: { p_end_date?: string; p_start_date?: string; p_user_id: string }
        Returns: {
          amount: number
          counterparty_avatar_url: string
          counterparty_email: string
          counterparty_id: string
          counterparty_name: string
          currency: string
          i_owe_them: boolean
          last_transaction_date: string
          owed_to_id: string
          owed_to_name: string
          remaining_amount: number
          settled_amount: number
          total_amount: number
          transaction_count: number
        }[]
      }
      get_user_debts_history: {
        Args: { p_user_id: string }
        Returns: {
          amount: number
          counterparty_id: string
          counterparty_name: string
          currency: string
          i_owe_them: boolean
          last_transaction_date: string
          remaining_amount: number
          settled_amount: number
          total_amount: number
          transaction_count: number
        }[]
      }
      get_user_debts_public: {
        Args: { p_admin_email?: string }
        Returns: {
          amount: number
          counterparty_id: string
          counterparty_name: string
          currency: string
          i_owe_them: boolean
          is_real_data: boolean
        }[]
      }
      get_user_monthly_report: {
        Args: { p_month: number; p_user_id: string; p_year: number }
        Returns: {
          avg_expense: number
          expense_count: number
          friend_count: number
          group_count: number
          most_expensive_amount: number
          most_expensive_date: string
          net_balance: number
          payment_count: number
          top_category: string
          top_category_amount: number
          total_i_owe: number
          total_owed_to_me: number
          total_spent: number
        }[]
      }
      get_user_settings: {
        Args: { p_user_id?: string }
        Returns: {
          allow_friend_requests: boolean
          allow_group_invites: boolean
          created_at: string
          default_currency: string
          email_notifications: boolean
          notifications_enabled: boolean
          notify_on_expense_added: boolean
          notify_on_friend_request: boolean
          notify_on_group_invite: boolean
          notify_on_payment_received: boolean
          number_format: string
          preferred_language: string
          profile_visibility: string
          timezone: string
          updated_at: string
          user_id: string
        }[]
      }
      get_users_groups: {
        Args: { p_user_ids: string[] }
        Returns: {
          group_avatar_url: string
          group_id: string
          group_name: string
          joined_at: string
          role: string
          user_id: string
        }[]
      }
      get_utm_share_config: { Args: never; Returns: Json }
      get_who_owes_who: {
        Args: { p_limit?: number; p_offset?: number }
        Returns: {
          amount: number
          from_user_id: string
          from_user_name: string
          to_user_id: string
          to_user_name: string
          total_count: number
        }[]
      }
      hard_delete_old_records: {
        Args: { p_days_old?: number }
        Returns: {
          expenses_deleted: number
          groups_deleted: number
          payments_deleted: number
        }[]
      }
      invoke_process_recurring_expenses: { Args: never; Returns: number }
      is_admin: { Args: never; Returns: boolean }
      jsonb_text_or_null: {
        Args: { p_key: string; p_payload: Json }
        Returns: string
      }
      jsonb_timestamptz_or_null: {
        Args: { p_key: string; p_payload: Json }
        Returns: string
      }
      list_api_secrets: {
        Args: never
        Returns: {
          created_at: string
          expires_at: string
          id: string
          is_active: boolean
          label: string
          last_used_at: string
        }[]
      }
      normalize_utm_config_key: { Args: { p_value: string }; Returns: string }
      process_single_recurring_instance: {
        Args: { p_cycle_date: string; p_recurring_expense_id: string }
        Returns: Json
      }
      read_admin_audit_logs: {
        Args: {
          p_action_type?: string
          p_actor_id?: string
          p_date_from?: string
          p_date_to?: string
          p_limit?: number
          p_offset?: number
          p_search?: string
          p_table_name?: string
        }
        Returns: Json
      }
      read_audit_trail: {
        Args: {
          p_action_type?: string
          p_end_date?: string
          p_entity_id?: string
          p_limit?: number
          p_offset?: number
          p_start_date?: string
        }
        Returns: {
          action_timestamp: string
          action_type: string
          actor: string
          actor_email: string
          actor_name: string
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          metadata: Json
        }[]
      }
      record_member_prepaid: {
        Args: {
          p_months: number
          p_paid_by_user_id?: string
          p_recurring_expense_id: string
          p_user_id: string
        }
        Returns: Json
      }
      record_multi_member_prepaid: {
        Args: {
          p_member_months: Json
          p_paid_by_user_id?: string
          p_recurring_expense_id: string
        }
        Returns: Json
      }
      record_prepaid_payment: {
        Args: {
          p_amount: number
          p_paid_by_user_id?: string
          p_periods_count: number
          p_recurring_expense_id: string
        }
        Returns: Json
      }
      reject_join_request: {
        Args: { p_request_id: string }
        Returns: undefined
      }
      restore_deleted_expense: {
        Args: { p_expense_id: string }
        Returns: boolean
      }
      restore_deleted_group: { Args: { p_group_id: string }; Returns: boolean }
      restore_deleted_payment: {
        Args: { p_payment_id: string }
        Returns: boolean
      }
      revoke_api_secret: {
        Args: { p_secret_id: string }
        Returns: {
          message: string
          success: boolean
        }[]
      }
      search_audit_logs: {
        Args: {
          p_end_date?: string
          p_limit?: number
          p_operation?: string
          p_start_date?: string
          p_table_name?: string
          p_user_id?: string
        }
        Returns: {
          changed_fields: string[]
          created_at: string
          id: string
          operation: string
          record_id: string
          table_name: string
          user_id: string
          user_name: string
        }[]
      }
      settle_all_debts_with_person: {
        Args: { p_counterparty_id: string }
        Returns: Json
      }
      settle_all_group_debts: { Args: { p_group_id: string }; Returns: Json }
      settle_all_splits: { Args: { p_expense_id: string }; Returns: Json }
      settle_all_splits_for_user: { Args: { p_user_id: string }; Returns: Json }
      settle_expense: { Args: { p_expense_id: string }; Returns: Json }
      settle_individual_debt: {
        Args: { p_amount: number; p_counterparty_id: string }
        Returns: Json
      }
      settle_split: {
        Args: { p_amount?: number; p_split_id: string }
        Returns: Json
      }
      settle_splits_batch: { Args: { p_split_ids: string[] }; Returns: Json }
      should_send_notification: {
        Args: { p_notification_type: string; p_user_id: string }
        Returns: boolean
      }
      simplify_group_debts: {
        Args: { p_group_id: string }
        Returns: {
          amount: number
          from_user_avatar: string
          from_user_id: string
          from_user_name: string
          to_user_avatar: string
          to_user_id: string
          to_user_name: string
        }[]
      }
      soft_delete_expense: { Args: { p_expense_id: string }; Returns: boolean }
      soft_delete_group: { Args: { p_group_id: string }; Returns: boolean }
      soft_delete_payment: { Args: { p_payment_id: string }; Returns: boolean }
      toggle_reaction: {
        Args: {
          p_reaction_type_id: string
          p_target_id: string
          p_target_type: string
        }
        Returns: Json
      }
      unsettle_split: { Args: { p_split_id: string }; Returns: Json }
      update_existing_profiles_from_mapping: {
        Args: never
        Returns: {
          email: string
          full_name: string
          updated_count: number
        }[]
      }
      update_expense_comment: {
        Args: { p_comment_id: string; p_content: string }
        Returns: Json
      }
      update_profile_name_by_email: {
        Args: { user_email: string; user_full_name: string }
        Returns: undefined
      }
      upsert_emoji_reaction_type: {
        Args: {
          p_emoji_mart_id: string
          p_label: string
          p_native_emoji: string
        }
        Returns: string
      }
      upsert_user_attribution: {
        Args: {
          p_anonymous_id: string
          p_first: Json
          p_last: Json
          p_session_id: string
          p_user_id: string
        }
        Returns: undefined
      }
      user_is_group_member: { Args: { group_uuid: string }; Returns: boolean }
      verify_momo_payment: {
        Args: {
          p_amount: number
          p_reference_code: string
          p_tran_id: string
          p_webhook_data?: Json
        }
        Returns: Json
      }
      write_audit_trail: {
        Args: {
          p_action_type: string
          p_entity_id: string
          p_entity_type: string
          p_metadata?: Json
        }
        Returns: string
      }
    }
    Enums: {
      expense_category:
        | "Food & Drink"
        | "Transportation"
        | "Accommodation"
        | "Entertainment"
        | "Shopping"
        | "Utilities"
        | "Healthcare"
        | "Education"
        | "Other"
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
      expense_category: [
        "Food & Drink",
        "Transportation",
        "Accommodation",
        "Entertainment",
        "Shopping",
        "Utilities",
        "Healthcare",
        "Education",
        "Other",
      ],
    },
  },
} as const
