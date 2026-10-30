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
      coaches: {
        Row: {
          active: boolean
          added_by: string | null
          bio: string | null
          created_at: string
          title: string
          user_id: string
        }
        Insert: {
          active?: boolean
          added_by?: string | null
          bio?: string | null
          created_at?: string
          title: string
          user_id: string
        }
        Update: {
          active?: boolean
          added_by?: string | null
          bio?: string | null
          created_at?: string
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      gratitude_notes: {
        Row: {
          body: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      themes: {
        Row: {
          created_at: string
          description: string | null
          emoji: string
          id: string
          month: string
          title: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          emoji?: string
          id?: string
          month: string
          title: string
        }
        Update: {
          created_at?: string
          description?: string | null
          emoji?: string
          id?: string
          month?: string
          title?: string
        }
        Relationships: []
      }
      theme_entries: {
        Row: {
          age_group: Database["public"]["Enums"]["age_group"]
          body: string | null
          created_at: string
          id: string
          image_path: string | null
          kind: string
          show_name: boolean
          status: string
          theme_id: string
          user_id: string
        }
        Insert: {
          age_group: Database["public"]["Enums"]["age_group"]
          body?: string | null
          created_at?: string
          id?: string
          image_path?: string | null
          kind: string
          show_name?: boolean
          status?: string
          theme_id: string
          user_id: string
        }
        Update: {
          age_group?: Database["public"]["Enums"]["age_group"]
          body?: string | null
          created_at?: string
          id?: string
          image_path?: string | null
          kind?: string
          show_name?: boolean
          status?: string
          theme_id?: string
          user_id?: string
        }
        Relationships: []
      }
      mean_word_flags: {
        Row: {
          count: number
          created_at: string
          day: string
          id: string
          user_id: string
        }
        Insert: {
          count: number
          created_at?: string
          day?: string
          id?: string
          user_id: string
        }
        Update: {
          count?: number
          created_at?: string
          day?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      safety_plans: {
        Row: {
          plan: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          plan?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          plan?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      anon_questions: {
        Row: {
          coaches_notified: boolean
          age_group: Database["public"]["Enums"]["age_group"]
          answer: string | null
          answer_seen: boolean
          answered_at: string | null
          answered_by: string | null
          body: string
          created_at: string
          id: string
          published: boolean
          status: string
          user_id: string
        }
        Insert: {
          coaches_notified?: boolean
          age_group: Database["public"]["Enums"]["age_group"]
          answer?: string | null
          answer_seen?: boolean
          answered_at?: string | null
          answered_by?: string | null
          body: string
          created_at?: string
          id?: string
          published?: boolean
          status?: string
          user_id: string
        }
        Update: {
          coaches_notified?: boolean
          age_group?: Database["public"]["Enums"]["age_group"]
          answer?: string | null
          answer_seen?: boolean
          answered_at?: string | null
          answered_by?: string | null
          body?: string
          created_at?: string
          id?: string
          published?: boolean
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      events: {
        Row: {
          age_group: Database["public"]["Enums"]["age_group"]
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          link: string | null
          minutes: number
          starts_at: string
          title: string
        }
        Insert: {
          age_group: Database["public"]["Enums"]["age_group"]
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          link?: string | null
          minutes?: number
          starts_at: string
          title: string
        }
        Update: {
          age_group?: Database["public"]["Enums"]["age_group"]
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          link?: string | null
          minutes?: number
          starts_at?: string
          title?: string
        }
        Relationships: []
      }
      event_rsvps: {
        Row: {
          created_at: string
          event_id: string
          reminded: boolean
          user_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          reminded?: boolean
          user_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          reminded?: boolean
          user_id?: string
        }
        Relationships: []
      }
      buddy_profiles: {
        Row: {
          interests: string[]
          looking: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          interests?: string[]
          looking?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          interests?: string[]
          looking?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      future_letters: {
        Row: {
          body: string
          created_at: string
          id: string
          notified: boolean
          open_at: string
          opened_at: string | null
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          notified?: boolean
          open_at: string
          opened_at?: string | null
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          notified?: boolean
          open_at?: string
          opened_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      playlists: {
        Row: {
          created_at: string
          description: string | null
          emoji: string
          id: string
          min_age: number
          sort: number
          title: string
          url: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          emoji?: string
          id?: string
          min_age?: number
          sort?: number
          title: string
          url: string
        }
        Update: {
          created_at?: string
          description?: string | null
          emoji?: string
          id?: string
          min_age?: number
          sort?: number
          title?: string
          url?: string
        }
        Relationships: []
      }
      song_tips: {
        Row: {
          age_group: Database["public"]["Enums"]["age_group"]
          artist: string
          created_at: string
          hidden: boolean
          id: string
          title: string
          url: string | null
          user_id: string
        }
        Insert: {
          age_group: Database["public"]["Enums"]["age_group"]
          artist: string
          created_at?: string
          hidden?: boolean
          id?: string
          title: string
          url?: string | null
          user_id: string
        }
        Update: {
          age_group?: Database["public"]["Enums"]["age_group"]
          artist?: string
          created_at?: string
          hidden?: boolean
          id?: string
          title?: string
          url?: string | null
          user_id?: string
        }
        Relationships: []
      }
      song_tip_likes: {
        Row: {
          tip_id: string
          user_id: string
        }
        Insert: {
          tip_id: string
          user_id: string
        }
        Update: {
          tip_id?: string
          user_id?: string
        }
        Relationships: []
      }
      message_reactions: {
        Row: {
          created_at: string
          emoji: string
          id: string
          message_id: string | null
          post_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          emoji: string
          id?: string
          message_id?: string | null
          post_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          emoji?: string
          id?: string
          message_id?: string | null
          post_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      polls: {
        Row: {
          created_at: string
          created_by: string
          group_id: string
          id: string
          options: string[]
          question: string
        }
        Insert: {
          created_at?: string
          created_by: string
          group_id: string
          id?: string
          options: string[]
          question: string
        }
        Update: {
          created_at?: string
          created_by?: string
          group_id?: string
          id?: string
          options?: string[]
          question?: string
        }
        Relationships: []
      }
      poll_votes: {
        Row: {
          created_at: string
          option: number
          poll_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          option: number
          poll_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          option?: number
          poll_id?: string
          user_id?: string
        }
        Relationships: []
      }
      mood_entries: {
        Row: {
          created_at: string
          day: string
          mood: string
          user_id: string
        }
        Insert: {
          created_at?: string
          day: string
          mood: string
          user_id: string
        }
        Update: {
          created_at?: string
          day?: string
          mood?: string
          user_id?: string
        }
        Relationships: []
      }
      compliments: {
        Row: {
          compliment: number
          created_at: string
          from_id: string
          id: string
          to_id: string
        }
        Insert: {
          compliment: number
          created_at?: string
          from_id: string
          id?: string
          to_id: string
        }
        Update: {
          compliment?: number
          created_at?: string
          from_id?: string
          id?: string
          to_id?: string
        }
        Relationships: []
      }
      group_challenge_checkins: {
        Row: {
          day: string
          group_id: string
          user_id: string
        }
        Insert: {
          day?: string
          group_id: string
          user_id: string
        }
        Update: {
          day?: string
          group_id?: string
          user_id?: string
        }
        Relationships: []
      }
      group_challenge_claims: {
        Row: {
          group_id: string
          user_id: string
          week: string
        }
        Insert: {
          group_id: string
          user_id: string
          week: string
        }
        Update: {
          group_id?: string
          user_id?: string
          week?: string
        }
        Relationships: []
      }
      chat_games: {
        Row: {
          conversation_id: string | null
          created_at: string
          created_by: string
          game: string
          group_id: string | null
          id: string
          moves: number
          players: string[]
          state: Json
          status: string
          turn: string | null
          updated_at: string
          winner: string | null
        }
        Insert: {
          conversation_id?: string | null
          created_at?: string
          created_by: string
          game: string
          group_id?: string | null
          id?: string
          moves?: number
          players: string[]
          state?: Json
          status?: string
          turn?: string | null
          updated_at?: string
          winner?: string | null
        }
        Update: {
          conversation_id?: string | null
          created_at?: string
          created_by?: string
          game?: string
          group_id?: string | null
          id?: string
          moves?: number
          players?: string[]
          state?: Json
          status?: string
          turn?: string | null
          updated_at?: string
          winner?: string | null
        }
        Relationships: []
      }
      admin_push_state: {
        Row: { id: number; last_run: string }
        Insert: { id?: number; last_run?: string }
        Update: { id?: number; last_run?: string }
        Relationships: []
      }
      admin_messages: {
        Row: {
          body: string
          created_at: string
          id: string
          replied_at: string | null
          replied_by: string | null
          reply: string | null
          reply_seen: boolean
          status: string
          topic: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          replied_at?: string | null
          replied_by?: string | null
          reply?: string | null
          reply_seen?: boolean
          status?: string
          topic?: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          replied_at?: string | null
          replied_by?: string | null
          reply?: string | null
          reply_seen?: boolean
          status?: string
          topic?: string
          user_id?: string
        }
        Relationships: []
      }
      admin_news_seen: {
        Row: { push: boolean; seen_at: string; user_id: string }
        Insert: { push?: boolean; seen_at?: string; user_id: string }
        Update: { push?: boolean; seen_at?: string; user_id?: string }
        Relationships: []
      }
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
      article_reactions: {
        Row: {
          article_id: string
          created_at: string
          kind: string
          user_id: string
        }
        Insert: {
          article_id: string
          created_at?: string
          kind: string
          user_id: string
        }
        Update: {
          article_id?: string
          created_at?: string
          kind?: string
          user_id?: string
        }
        Relationships: []
      }
      article_reads: {
        Row: {
          article_id: string
          read_at: string
          user_id: string
        }
        Insert: {
          article_id: string
          read_at?: string
          user_id: string
        }
        Update: {
          article_id?: string
          read_at?: string
          user_id?: string
        }
        Relationships: []
      }
      article_saves: {
        Row: {
          article_id: string
          created_at: string
          user_id: string
        }
        Insert: {
          article_id: string
          created_at?: string
          user_id: string
        }
        Update: {
          article_id?: string
          created_at?: string
          user_id?: string
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
          kind: string
          min_age: number
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
          kind?: string
          min_age?: number
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
          kind?: string
          min_age?: number
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
          sticker: string | null
          attachment_name: string | null
          attachment_path: string | null
          attachment_type: string | null
          audio_path: string | null
          body: string
          conversation_id: string
          created_at: string
          game_id: string | null
          id: string
          sender_id: string
        }
        Insert: {
          sticker?: string | null
          attachment_name?: string | null
          attachment_path?: string | null
          attachment_type?: string | null
          audio_path?: string | null
          body: string
          conversation_id: string
          created_at?: string
          game_id?: string | null
          id?: string
          sender_id: string
        }
        Update: {
          sticker?: string | null
          attachment_name?: string | null
          attachment_path?: string | null
          attachment_type?: string | null
          audio_path?: string | null
          body?: string
          conversation_id?: string
          created_at?: string
          game_id?: string | null
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
          created_by: string | null
          description: string | null
          emoji: string | null
          id: string
          is_archived: boolean
          name: string
        }
        Insert: {
          age_group: Database["public"]["Enums"]["age_group"]
          created_at?: string
          created_by?: string | null
          description?: string | null
          emoji?: string | null
          id?: string
          is_archived?: boolean
          name: string
        }
        Update: {
          age_group?: Database["public"]["Enums"]["age_group"]
          created_at?: string
          created_by?: string | null
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
      media_items: {
        Row: {
          cover_path: string | null
          created_at: string
          created_by: string | null
          description: string
          duration_seconds: number | null
          id: string
          kind: string
          media_path: string
          media_type: string
          min_age: number
          publish_at: string
          title: string
        }
        Insert: {
          cover_path?: string | null
          created_at?: string
          created_by?: string | null
          description?: string
          duration_seconds?: number | null
          id?: string
          kind?: string
          media_path: string
          media_type?: string
          min_age?: number
          publish_at?: string
          title: string
        }
        Update: {
          cover_path?: string | null
          created_at?: string
          created_by?: string | null
          description?: string
          duration_seconds?: number | null
          id?: string
          kind?: string
          media_path?: string
          media_type?: string
          min_age?: number
          publish_at?: string
          title?: string
        }
        Relationships: []
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
          sticker: string | null
          poll_id: string | null
          attachment_name: string | null
          attachment_path: string | null
          attachment_type: string | null
          audio_path: string | null
          author_id: string
          body: string
          created_at: string
          game_id: string | null
          group_id: string
          id: string
          is_hidden: boolean
          mentions: string[]
          reply_to: string | null
        }
        Insert: {
          sticker?: string | null
          poll_id?: string | null
          attachment_name?: string | null
          attachment_path?: string | null
          attachment_type?: string | null
          audio_path?: string | null
          author_id: string
          body: string
          created_at?: string
          game_id?: string | null
          group_id: string
          id?: string
          is_hidden?: boolean
          mentions?: string[]
          reply_to?: string | null
        }
        Update: {
          sticker?: string | null
          poll_id?: string | null
          attachment_name?: string | null
          attachment_path?: string | null
          attachment_type?: string | null
          audio_path?: string | null
          author_id?: string
          body?: string
          created_at?: string
          game_id?: string | null
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
          quiet_end: number | null
          quiet_start: number | null
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
          quiet_end?: number | null
          quiet_start?: number | null
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
          quiet_end?: number | null
          quiet_start?: number | null
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
      public_messages: {
        Row: {
          body: string
          created_at: string
          email: string
          id: string
          name: string
          organisation: string | null
          sender_type: string
          status: string
        }
        Insert: {
          body: string
          created_at?: string
          email: string
          id?: string
          name: string
          organisation?: string | null
          sender_type?: string
          status?: string
        }
        Update: {
          body?: string
          created_at?: string
          email?: string
          id?: string
          name?: string
          organisation?: string | null
          sender_type?: string
          status?: string
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
      safety_alerts: {
        Row: {
          author_id: string | null
          created_at: string
          excerpt: string
          handled_at: string | null
          handled_by: string | null
          id: string
          ref_id: string
          source: string
          status: string
        }
        Insert: {
          author_id?: string | null
          created_at?: string
          excerpt: string
          handled_at?: string | null
          handled_by?: string | null
          id?: string
          ref_id: string
          source: string
          status?: string
        }
        Update: {
          author_id?: string | null
          created_at?: string
          excerpt?: string
          handled_at?: string | null
          handled_by?: string | null
          id?: string
          ref_id?: string
          source?: string
          status?: string
        }
        Relationships: []
      }
      shop_returns: {
        Row: {
          contact_email: string
          created_at: string
          id: string
          note: string | null
          order_id: string
          reason: string
          refund_cents: number | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          contact_email: string
          created_at?: string
          id?: string
          note?: string | null
          order_id: string
          reason?: string
          refund_cents?: number | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          contact_email?: string
          created_at?: string
          id?: string
          note?: string | null
          order_id?: string
          reason?: string
          refund_cents?: number | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
          contact_email: string | null
          id: string
          may_publish: boolean
          pen_name: string | null
          status: string
          title: string
          user_id: string
        }
        Insert: {
          body: string
          category?: string
          created_at?: string
          contact_email?: string | null
          id?: string
          may_publish?: boolean
          pen_name?: string | null
          status?: string
          title: string
          user_id: string
        }
        Update: {
          body?: string
          category?: string
          created_at?: string
          contact_email?: string | null
          id?: string
          may_publish?: boolean
          pen_name?: string | null
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
      user_consents: {
        Row: {
          parent_confirmed_at: string | null
          terms_accepted_at: string
          terms_version: string
          user_id: string
        }
        Insert: {
          parent_confirmed_at?: string | null
          terms_accepted_at?: string
          terms_version: string
          user_id: string
        }
        Update: {
          parent_confirmed_at?: string | null
          terms_accepted_at?: string
          terms_version?: string
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
      answer_admin_message: { Args: { _message: string; _reply?: string }; Returns: string }
      mark_admin_replies_seen: { Args: never; Returns: undefined }
      schedule_admin_news_push: { Args: { site_url: string }; Returns: number }
      admin_news: {
        Args: { _days?: number }
        Returns: { created_at: string; detail: string; kind: string; ref_id: string; title: string }[]
      }
      article_reaction_counts: {
        Args: never
        Returns: { article_id: string; herkenbaar: number; knuffel: number; sterk: number }[]
      }
      can_access_group: { Args: { _group: string }; Returns: boolean }
      can_call: { Args: { _conv: string }; Returns: boolean }
      can_open_media: { Args: { _path: string }; Returns: boolean }
      create_group: { Args: { _name: string; _description: string; _emoji: string }; Returns: string }
      update_my_group: { Args: { _group: string; _name: string; _description: string; _emoji: string }; Returns: undefined }
      close_my_group: { Args: { _group: string }; Returns: undefined }
      can_see_dm: { Args: { _message: string }; Returns: boolean }
      create_poll: { Args: { _group: string; _question: string; _options: string[] }; Returns: string }
      send_compliment: { Args: { _to: string; _compliment: number }; Returns: undefined }
      my_compliments: { Args: never; Returns: { id: string; compliment: number; created_at: string }[] }
      checkin_group_challenge: { Args: { _group: string }; Returns: undefined }
      claim_group_challenge: { Args: { _group: string }; Returns: number }
      my_badge_stats: { Args: never; Returns: Json }
      add_song_tip: { Args: { _title: string; _artist: string; _url: string }; Returns: string }
      can_see_song_tip: { Args: { _tip: string }; Returns: boolean }
      is_music_url: { Args: { _url: string }; Returns: boolean }
      ask_question: { Args: { _body: string }; Returns: string }
      answer_question: { Args: { _question: string; _answer: string; _publish: boolean }; Returns: undefined }
      question_wall: { Args: never; Returns: { id: string; body: string; answer: string; answered_at: string; coach: string | null }[] }
      write_letter: { Args: { _body: string; _months: number }; Returns: string }
      my_letters: { Args: never; Returns: { id: string; body: string | null; open_at: string; opened_at: string | null; created_at: string }[] }
      open_letter: { Args: { _letter: string }; Returns: undefined }
      event_counts: { Args: never; Returns: { event_id: string; going: number }[] }
      buddy_suggestions: { Args: never; Returns: { user_id: string; display_name: string; username: string | null; avatar_url: string | null; shared: string[] }[] }
      censor: { Args: { _text: string }; Returns: string }
      theme_showcase: { Args: { _theme: string }; Returns: { id: string; kind: string; body: string | null; image_path: string | null; maker: string | null; created_at: string }[] }
      is_coach: { Args: { _user: string }; Returns: boolean }
      add_coach: { Args: { _username: string; _title: string }; Returns: string }
      coach_questions: { Args: never; Returns: { id: string; body: string; age_group: Database["public"]["Enums"]["age_group"]; status: string; answer: string | null; published: boolean; answered_by_name: string | null; created_at: string }[] }
      start_chat_game: { Args: { _game: string; _group: string | null; _conv: string | null; _state: Json; _body: string }; Returns: Json }
      join_chat_game: { Args: { _game: string }; Returns: { conversation_id: string | null; created_at: string; created_by: string; game: string; group_id: string | null; id: string; moves: number; players: string[]; state: Json; status: string; turn: string | null; updated_at: string; winner: string | null } }
      chat_game_move: { Args: { _game: string; _moves: number; _state: Json; _again: boolean; _finished: boolean; _winner: number | null }; Returns: { conversation_id: string | null; created_at: string; created_by: string; game: string; group_id: string | null; id: string; moves: number; players: string[]; state: Json; status: string; turn: string | null; updated_at: string; winner: string | null } }
      stop_chat_game: { Args: { _game: string }; Returns: { conversation_id: string | null; created_at: string; created_by: string; game: string; group_id: string | null; id: string; moves: number; players: string[]; state: Json; status: string; turn: string | null; updated_at: string; winner: string | null } }
      can_play_in: { Args: { _group: string | null; _conv: string | null }; Returns: boolean }
      request_return: { Args: { _order: string; _reason: string; _email: string }; Returns: string }
      set_return_status: { Args: { _return: string; _status: string; _note?: string }; Returns: string }
      impact_stats: { Args: never; Returns: Json }
      needs_care: { Args: { _text: string }; Returns: boolean }
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
      my_age: { Args: never; Returns: number }
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
