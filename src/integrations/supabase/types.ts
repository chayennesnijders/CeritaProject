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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      activity_log: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          details: Json | null
          id: string
          target_id: string | null
          target_table: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          details?: Json | null
          id?: string
          target_id?: string | null
          target_table: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          details?: Json | null
          id?: string
          target_id?: string | null
          target_table?: string
        }
        Relationships: []
      }
      articles: {
        Row: {
          author_id: string | null
          body: string
          category: string
          created_at: string
          emoji: string
          id: string
          image_url: string | null
          is_published: boolean
          title: string
          updated_at: string
          wp_id: number | null
        }
        Insert: {
          author_id?: string | null
          body: string
          category?: string
          created_at?: string
          emoji?: string
          id?: string
          image_url?: string | null
          is_published?: boolean
          title: string
          updated_at?: string
          wp_id?: number | null
        }
        Update: {
          author_id?: string | null
          body?: string
          category?: string
          created_at?: string
          emoji?: string
          id?: string
          image_url?: string | null
          is_published?: boolean
          title?: string
          updated_at?: string
          wp_id?: number | null
        }
        Relationships: []
      }
      birthday_claims: {
        Row: {
          claim_year: number
          created_at: string
          user_id: string
        }
        Insert: {
          claim_year: number
          created_at?: string
          user_id: string
        }
        Update: {
          claim_year?: number
          created_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "birthday_claims_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      blocks: {
        Row: {
          blocked_id: string
          blocker_id: string
          created_at: string
        }
        Insert: {
          blocked_id: string
          blocker_id: string
          created_at?: string
        }
        Update: {
          blocked_id?: string
          blocker_id?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "blocks_blocked_id_fkey"
            columns: ["blocked_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blocks_blocker_id_fkey"
            columns: ["blocker_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      companions: {
        Row: {
          created_at: string
          id: string
          name: string
          outfit: string
          species: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          outfit?: string
          species: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          outfit?: string
          species?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "companions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_prefs: {
        Row: {
          archived: boolean
          conversation_id: string
          last_read_at: string | null
          muted: boolean
          user_id: string
        }
        Insert: {
          archived?: boolean
          conversation_id: string
          last_read_at?: string | null
          muted?: boolean
          user_id: string
        }
        Update: {
          archived?: boolean
          conversation_id?: string
          last_read_at?: string | null
          muted?: boolean
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_prefs_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_prefs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          created_at: string
          id: string
          last_message_at: string
          requested_by: string
          status: string
          user_a: string
          user_b: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_message_at?: string
          requested_by: string
          status?: string
          user_a: string
          user_b: string
        }
        Update: {
          created_at?: string
          id?: string
          last_message_at?: string
          requested_by?: string
          status?: string
          user_a?: string
          user_b?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_user_a_fkey"
            columns: ["user_a"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_user_b_fkey"
            columns: ["user_b"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      cron_tokens: {
        Row: {
          name: string
          token: string
        }
        Insert: {
          name: string
          token?: string
        }
        Update: {
          name?: string
          token?: string
        }
        Relationships: []
      }
      daily_challenges: {
        Row: {
          challenge_date: string
          created_at: string
          description: string | null
          id: string
          title: string
        }
        Insert: {
          challenge_date: string
          created_at?: string
          description?: string | null
          id?: string
          title: string
        }
        Update: {
          challenge_date?: string
          created_at?: string
          description?: string | null
          id?: string
          title?: string
        }
        Relationships: []
      }
      daily_quotes: {
        Row: {
          author: string | null
          created_at: string
          id: string
          quote_date: string
          text: string
        }
        Insert: {
          author?: string | null
          created_at?: string
          id?: string
          quote_date: string
          text: string
        }
        Update: {
          author?: string | null
          created_at?: string
          id?: string
          quote_date?: string
          text?: string
        }
        Relationships: []
      }
      diary_entries: {
        Row: {
          audio_path: string | null
          body: string | null
          challenge_id: string | null
          created_at: string
          id: string
          photo_path: string | null
          user_id: string
        }
        Insert: {
          audio_path?: string | null
          body?: string | null
          challenge_id?: string | null
          created_at?: string
          id?: string
          photo_path?: string | null
          user_id: string
        }
        Update: {
          audio_path?: string | null
          body?: string | null
          challenge_id?: string | null
          created_at?: string
          id?: string
          photo_path?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "diary_entries_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "daily_challenges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "diary_entries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      direct_messages: {
        Row: {
          attachment_name: string | null
          attachment_path: string | null
          attachment_type: string | null
          audio_path: string | null
          body: string
          conversation_id: string
          created_at: string
          id: string
          sender_id: string
        }
        Insert: {
          attachment_name?: string | null
          attachment_path?: string | null
          attachment_type?: string | null
          audio_path?: string | null
          body: string
          conversation_id: string
          created_at?: string
          id?: string
          sender_id: string
        }
        Update: {
          attachment_name?: string | null
          attachment_path?: string | null
          attachment_type?: string | null
          audio_path?: string | null
          body?: string
          conversation_id?: string
          created_at?: string
          id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "direct_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "direct_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      group_invites: {
        Row: {
          created_at: string
          group_id: string
          id: string
          invitee_id: string
          inviter_id: string
          status: string
        }
        Insert: {
          created_at?: string
          group_id: string
          id?: string
          invitee_id: string
          inviter_id: string
          status?: string
        }
        Update: {
          created_at?: string
          group_id?: string
          id?: string
          invitee_id?: string
          inviter_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_invites_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_invites_invitee_id_fkey"
            columns: ["invitee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_invites_inviter_id_fkey"
            columns: ["inviter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      group_members: {
        Row: {
          group_id: string
          joined_at: string
          user_id: string
        }
        Insert: {
          group_id: string
          joined_at?: string
          user_id: string
        }
        Update: {
          group_id?: string
          joined_at?: string
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
      group_prefs: {
        Row: {
          archived: boolean
          group_id: string
          muted: boolean
          user_id: string
        }
        Insert: {
          archived?: boolean
          group_id: string
          muted?: boolean
          user_id: string
        }
        Update: {
          archived?: boolean
          group_id?: string
          muted?: boolean
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_prefs_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_prefs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      group_reads: {
        Row: {
          created_at: string
          group_id: string
          last_read_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          group_id: string
          last_read_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          group_id?: string
          last_read_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_reads_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_reads_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      groups: {
        Row: {
          age_group: Database["public"]["Enums"]["age_group"]
          created_at: string
          description: string | null
          emoji: string | null
          id: string
          is_archived: boolean
          name: string
        }
        Insert: {
          age_group: Database["public"]["Enums"]["age_group"]
          created_at?: string
          description?: string | null
          emoji?: string | null
          id?: string
          is_archived?: boolean
          name: string
        }
        Update: {
          age_group?: Database["public"]["Enums"]["age_group"]
          created_at?: string
          description?: string | null
          emoji?: string | null
          id?: string
          is_archived?: boolean
          name?: string
        }
        Relationships: []
      }
      member_timeouts: {
        Row: {
          admin_id: string | null
          created_at: string
          id: string
          member_id: string
          reason: string | null
          until: string
        }
        Insert: {
          admin_id?: string | null
          created_at?: string
          id?: string
          member_id: string
          reason?: string | null
          until: string
        }
        Update: {
          admin_id?: string | null
          created_at?: string
          id?: string
          member_id?: string
          reason?: string | null
          until?: string
        }
        Relationships: [
          {
            foreignKeyName: "member_timeouts_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "member_timeouts_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      member_warnings: {
        Row: {
          admin_id: string | null
          created_at: string
          id: string
          member_id: string
          message: string
        }
        Insert: {
          admin_id?: string | null
          created_at?: string
          id?: string
          member_id: string
          message: string
        }
        Update: {
          admin_id?: string | null
          created_at?: string
          id?: string
          member_id?: string
          message?: string
        }
        Relationships: [
          {
            foreignKeyName: "member_warnings_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "member_warnings_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pet_care: {
        Row: {
          action: string
          care_date: string
          created_at: string
          user_id: string
        }
        Insert: {
          action: string
          care_date?: string
          created_at?: string
          user_id: string
        }
        Update: {
          action?: string
          care_date?: string
          created_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pet_care_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pet_games: {
        Row: {
          created_at: string
          game: string
          id: string
          play_date: string
          score: number
          user_id: string
          xp: number
        }
        Insert: {
          created_at?: string
          game: string
          id?: string
          play_date?: string
          score: number
          user_id: string
          xp?: number
        }
        Update: {
          created_at?: string
          game?: string
          id?: string
          play_date?: string
          score?: number
          user_id?: string
          xp?: number
        }
        Relationships: []
      }
      pet_lists: {
        Row: {
          created_at: string
          id: string
          pet_ref: string
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          pet_ref?: string
          title: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          pet_ref?: string
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pet_lists_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pet_todos: {
        Row: {
          created_at: string
          done: boolean
          id: string
          list_id: string | null
          rewarded: boolean
          title: string
          todo_date: string
          user_id: string
        }
        Insert: {
          created_at?: string
          done?: boolean
          id?: string
          list_id?: string | null
          rewarded?: boolean
          title: string
          todo_date?: string
          user_id: string
        }
        Update: {
          created_at?: string
          done?: boolean
          id?: string
          list_id?: string | null
          rewarded?: boolean
          title?: string
          todo_date?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pet_todos_list_id_fkey"
            columns: ["list_id"]
            isOneToOne: false
            referencedRelation: "pet_lists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pet_todos_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pets: {
        Row: {
          background: string
          created_at: string
          house: string
          name: string
          outfit: string
          species: string
          user_id: string
          xp: number
        }
        Insert: {
          background?: string
          created_at?: string
          house?: string
          name: string
          outfit?: string
          species?: string
          user_id: string
          xp?: number
        }
        Update: {
          background?: string
          created_at?: string
          house?: string
          name?: string
          outfit?: string
          species?: string
          user_id?: string
          xp?: number
        }
        Relationships: [
          {
            foreignKeyName: "pets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      post_comments: {
        Row: {
          author_id: string
          body: string
          created_at: string
          id: string
          post_id: string
        }
        Insert: {
          author_id: string
          body: string
          created_at?: string
          id?: string
          post_id: string
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          id?: string
          post_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_comments_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          attachment_name: string | null
          attachment_path: string | null
          attachment_type: string | null
          audio_path: string | null
          author_id: string
          body: string
          created_at: string
          group_id: string
          id: string
          is_hidden: boolean
          mentions: string[]
          reply_to: string | null
        }
        Insert: {
          attachment_name?: string | null
          attachment_path?: string | null
          attachment_type?: string | null
          audio_path?: string | null
          author_id: string
          body: string
          created_at?: string
          group_id: string
          id?: string
          is_hidden?: boolean
          mentions?: string[]
          reply_to?: string | null
        }
        Update: {
          attachment_name?: string | null
          attachment_path?: string | null
          attachment_type?: string | null
          audio_path?: string | null
          author_id?: string
          body?: string
          created_at?: string
          group_id?: string
          id?: string
          is_hidden?: boolean
          mentions?: string[]
          reply_to?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "posts_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_reply_to_fkey"
            columns: ["reply_to"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          age_group: Database["public"]["Enums"]["age_group"]
          allow_calls: boolean
          allow_messages: boolean
          avatar_url: string | null
          bio: string | null
          birthdate: string | null
          created_at: string
          display_name: string
          id: string
          is_private: boolean
          username: string | null
        }
        Insert: {
          age_group?: Database["public"]["Enums"]["age_group"]
          allow_calls?: boolean
          allow_messages?: boolean
          avatar_url?: string | null
          bio?: string | null
          birthdate?: string | null
          created_at?: string
          display_name?: string
          id: string
          is_private?: boolean
          username?: string | null
        }
        Update: {
          age_group?: Database["public"]["Enums"]["age_group"]
          allow_calls?: boolean
          allow_messages?: boolean
          avatar_url?: string | null
          bio?: string | null
          birthdate?: string | null
          created_at?: string
          display_name?: string
          id?: string
          is_private?: boolean
          username?: string | null
        }
        Relationships: []
      }
      push_tokens: {
        Row: {
          created_at: string
          token: string
          user_id: string
        }
        Insert: {
          created_at?: string
          token: string
          user_id: string
        }
        Update: {
          created_at?: string
          token?: string
          user_id?: string
        }
        Relationships: []
      }
      reports: {
        Row: {
          created_at: string
          id: string
          message_id: string | null
          post_id: string | null
          reason: string
          reporter_id: string
          responded_at: string | null
          responded_by: string | null
          response: string | null
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          message_id?: string | null
          post_id?: string | null
          reason: string
          reporter_id: string
          responded_at?: string | null
          responded_by?: string | null
          response?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          message_id?: string | null
          post_id?: string | null
          reason?: string
          reporter_id?: string
          responded_at?: string | null
          responded_by?: string | null
          response?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "reports_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "direct_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_responded_by_fkey"
            columns: ["responded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_orders: {
        Row: {
          amount_cents: number
          created_at: string
          id: string
          kind: string
          points: number
          product: string
          product_id: string | null
          ship_city: string
          ship_name: string
          ship_postcode: string
          ship_street: string
          status: string
          stripe_session_id: string | null
          tier: string | null
          tracking_code: string | null
          user_id: string
        }
        Insert: {
          amount_cents?: number
          created_at?: string
          id?: string
          kind: string
          points?: number
          product?: string
          product_id?: string | null
          ship_city: string
          ship_name: string
          ship_postcode: string
          ship_street: string
          status?: string
          stripe_session_id?: string | null
          tier?: string | null
          tracking_code?: string | null
          user_id: string
        }
        Update: {
          amount_cents?: number
          created_at?: string
          id?: string
          kind?: string
          points?: number
          product?: string
          product_id?: string | null
          ship_city?: string
          ship_name?: string
          ship_postcode?: string
          ship_street?: string
          status?: string
          stripe_session_id?: string | null
          tier?: string | null
          tracking_code?: string | null
          user_id?: string
        }
        Relationships: []
      }
      shop_products: {
        Row: {
          category: string
          cost_cents: number
          created_at: string
          description: string
          emoji: string
          id: string
          is_active: boolean
          kind: string
          name: string
          profit_cents: number
          sort: number
        }
        Insert: {
          category?: string
          cost_cents?: number
          created_at?: string
          description?: string
          emoji?: string
          id: string
          is_active?: boolean
          kind?: string
          name: string
          profit_cents?: number
          sort?: number
        }
        Update: {
          category?: string
          cost_cents?: number
          created_at?: string
          description?: string
          emoji?: string
          id?: string
          is_active?: boolean
          kind?: string
          name?: string
          profit_cents?: number
          sort?: number
        }
        Relationships: []
      }
      story_plans: {
        Row: {
          article_id: string | null
          category: string
          created_at: string
          created_by: string | null
          emoji: string
          id: string
          planned_date: string | null
          published_at: string | null
          sort: number
          status: string
          teaser: string | null
          title: string
          updated_at: string
        }
        Insert: {
          article_id?: string | null
          category?: string
          created_at?: string
          created_by?: string | null
          emoji?: string
          id?: string
          planned_date?: string | null
          published_at?: string | null
          sort?: number
          status?: string
          teaser?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          article_id?: string | null
          category?: string
          created_at?: string
          created_by?: string | null
          emoji?: string
          id?: string
          planned_date?: string | null
          published_at?: string | null
          sort?: number
          status?: string
          teaser?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      story_submissions: {
        Row: {
          body: string
          category: string
          created_at: string
          id: string
          status: string
          title: string
          user_id: string
        }
        Insert: {
          body: string
          category?: string
          created_at?: string
          id?: string
          status?: string
          title: string
          user_id: string
        }
        Update: {
          body?: string
          category?: string
          created_at?: string
          id?: string
          status?: string
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "story_submissions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      story_votes: {
        Row: {
          created_at: string
          plan_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          plan_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          plan_id?: string
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_ids: { Args: never; Returns: string[] }
      can_access_group: { Args: { _group: string }; Returns: boolean }
      can_call: { Args: { _conv: string }; Returns: boolean }
      can_message: { Args: { _other: string }; Returns: boolean }
      can_use_community: { Args: never; Returns: boolean }
      claim_birthday_bonus: { Args: never; Returns: number }
      claim_free_item: {
        Args: {
          _city: string
          _name: string
          _postcode: string
          _street: string
        }
        Returns: string
      }
      conv_other: { Args: { _conv: string }; Returns: string }
      dm_other_read_at: { Args: { _conv: string }; Returns: string }
      finish_pet_game: {
        Args: { _game: string; _score: number }
        Returns: number
      }
      free_items_available: { Args: never; Returns: number }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_member: { Args: { _group: string }; Returns: boolean }
      is_owner: { Args: { _user_id: string }; Returns: boolean }
      is_timed_out: { Args: { _user_id: string }; Returns: boolean }
      my_age_group: {
        Args: never
        Returns: Database["public"]["Enums"]["age_group"]
      }
      my_dm_unread: {
        Args: never
        Returns: {
          conversation_id: string
          unread: number
        }[]
      }
      my_group_unread: {
        Args: never
        Returns: {
          group_id: string
          unread: number
        }[]
      }
      post_group: { Args: { _post: string }; Returns: string }
      refresh_age_groups: { Args: never; Returns: undefined }
      respond_group_invite: {
        Args: { p_accept: boolean; p_invite: string }
        Returns: string
      }
      respond_report: {
        Args: { _action: string; _report: string; _response?: string }
        Returns: string
      }
      story_board: {
        Args: never
        Returns: {
          article_id: string | null
          category: string
          emoji: string
          id: string
          planned_date: string | null
          published_at: string | null
          sort: number
          status: string
          teaser: string | null
          title: string
          voted: boolean
          votes: number
        }[]
      }
      story_is_planned: { Args: { _plan: string }; Returns: boolean }
      today_challenge: {
        Args: never
        Returns: {
          challenge_date: string
          created_at: string
          description: string | null
          id: string
          title: string
        }[]
      }
    }
    Enums: {
      age_group: "junior" | "senior" | "adult"
      app_role: "admin" | "moderator" | "user" | "owner"
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
      age_group: ["junior", "senior", "adult"],
      app_role: ["admin", "moderator", "user", "owner"],
    },
  },
} as const
