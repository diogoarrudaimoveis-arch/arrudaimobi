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
      amenities: {
        Row: {
          created_at: string
          icon: string | null
          id: string
          name: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          icon?: string | null
          id?: string
          name: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          icon?: string | null
          id?: string
          name?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "amenities_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_post_tags: {
        Row: {
          id: string
          post_id: string
          tag_id: string
        }
        Insert: {
          id?: string
          post_id: string
          tag_id: string
        }
        Update: {
          id?: string
          post_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "blog_post_tags_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "blog_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blog_post_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "blog_tags"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_posts: {
        Row: {
          author_id: string
          content: string
          cover_image_url: string | null
          created_at: string
          excerpt: string | null
          id: string
          published: boolean
          published_at: string | null
          slug: string
          tenant_id: string
          title: string
          updated_at: string
        }
        Insert: {
          author_id: string
          content?: string
          cover_image_url?: string | null
          created_at?: string
          excerpt?: string | null
          id?: string
          published?: boolean
          published_at?: string | null
          slug: string
          tenant_id: string
          title: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          content?: string
          cover_image_url?: string | null
          created_at?: string
          excerpt?: string | null
          id?: string
          published?: boolean
          published_at?: string | null
          slug?: string
          tenant_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "blog_posts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_tags: {
        Row: {
          created_at: string
          id: string
          name: string
          slug: string
          tenant_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          slug: string
          tenant_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          slug?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "blog_tags_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          agent_id: string | null
          created_at: string
          email: string | null
          id: string
          message: string | null
          name: string
          phone: string | null
          property_id: string | null
          status: Database["public"]["Enums"]["contact_status"] | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          agent_id?: string | null
          created_at?: string
          email?: string | null
          id?: string
          message?: string | null
          name: string
          phone?: string | null
          property_id?: string | null
          status?: Database["public"]["Enums"]["contact_status"] | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          agent_id?: string | null
          created_at?: string
          email?: string | null
          id?: string
          message?: string | null
          name?: string
          phone?: string | null
          property_id?: string | null
          status?: Database["public"]["Enums"]["contact_status"] | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contacts_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contacts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      cookie_consents: {
        Row: {
          action: string
          consent_version: string
          created_at: string
          id: string
          ip_address: string | null
          preferences: Json
          session_id: string
          user_id: string | null
        }
        Insert: {
          action?: string
          consent_version?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          preferences?: Json
          session_id: string
          user_id?: string | null
        }
        Update: {
          action?: string
          consent_version?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          preferences?: Json
          session_id?: string
          user_id?: string | null
        }
        Relationships: []
      }
      email_campaign_recipients: {
        Row: {
          campaign_id: string
          contact_id: string | null
          created_at: string
          email: string
          error_message: string | null
          id: string
          name: string | null
          sent_at: string | null
          status: string
        }
        Insert: {
          campaign_id: string
          contact_id?: string | null
          created_at?: string
          email: string
          error_message?: string | null
          id?: string
          name?: string | null
          sent_at?: string | null
          status?: string
        }
        Update: {
          campaign_id?: string
          contact_id?: string | null
          created_at?: string
          email?: string
          error_message?: string | null
          id?: string
          name?: string | null
          sent_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_campaign_recipients_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "email_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_campaign_recipients_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      email_campaigns: {
        Row: {
          created_at: string
          created_by: string
          failed_count: number
          html_body: string
          id: string
          sent_count: number
          status: string
          subject: string
          tenant_id: string
          total_recipients: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          failed_count?: number
          html_body: string
          id?: string
          sent_count?: number
          status?: string
          subject: string
          tenant_id: string
          total_recipients?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          failed_count?: number
          html_body?: string
          id?: string
          sent_count?: number
          status?: string
          subject?: string
          tenant_id?: string
          total_recipients?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_campaigns_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      evolution_config: {
        Row: {
          api_key: string
          base_url: string
          created_at: string
          id: string
          instance_name: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          api_key: string
          base_url: string
          created_at?: string
          id?: string
          instance_name?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          api_key?: string
          base_url?: string
          created_at?: string
          id?: string
          instance_name?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "evolution_config_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      media_library: {
        Row: {
          alt: string | null
          created_at: string
          filename: string
          id: string
          mime_type: string | null
          size_bytes: number | null
          tenant_id: string
          updated_at: string
          uploaded_by: string
          url: string
        }
        Insert: {
          alt?: string | null
          created_at?: string
          filename: string
          id?: string
          mime_type?: string | null
          size_bytes?: number | null
          tenant_id: string
          updated_at?: string
          uploaded_by: string
          url: string
        }
        Update: {
          alt?: string | null
          created_at?: string
          filename?: string
          id?: string
          mime_type?: string | null
          size_bytes?: number | null
          tenant_id?: string
          updated_at?: string
          uploaded_by?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "media_library_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          contact_id: string | null
          created_at: string
          error_message: string | null
          id: string
          message: string
          phone_raw: string | null
          phone_sanitized: string
          sent_by: string
          status: string
          tenant_id: string
        }
        Insert: {
          contact_id?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          message: string
          phone_raw?: string | null
          phone_sanitized: string
          sent_by: string
          status?: string
          tenant_id: string
        }
        Update: {
          contact_id?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          message?: string
          phone_raw?: string | null
          phone_sanitized?: string
          sent_by?: string
          status?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      password_reset_tokens: {
        Row: {
          created_at: string
          email: string
          expires_at: string
          id: string
          tenant_id: string
          token: string
          used: boolean
          user_id: string
        }
        Insert: {
          created_at?: string
          email: string
          expires_at: string
          id?: string
          tenant_id: string
          token: string
          used?: boolean
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          tenant_id?: string
          token?: string
          used?: boolean
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "password_reset_tokens_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          full_name: string | null
          id: string
          phone: string | null
          tenant_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          tenant_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          tenant_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      properties: {
        Row: {
          address: string | null
          agent_id: string | null
          area: number | null
          bathrooms: number | null
          bedrooms: number | null
          city: string | null
          created_at: string
          currency: string | null
          description: string | null
          featured: boolean | null
          garages: number | null
          id: string
          latitude: number | null
          longitude: number | null
          neighborhood: string | null
          price: number
          purpose: Database["public"]["Enums"]["property_purpose"]
          state: string | null
          status: Database["public"]["Enums"]["property_status"]
          tenant_id: string
          title: string
          type_id: string | null
          updated_at: string
          zip_code: string | null
        }
        Insert: {
          address?: string | null
          agent_id?: string | null
          area?: number | null
          bathrooms?: number | null
          bedrooms?: number | null
          city?: string | null
          created_at?: string
          currency?: string | null
          description?: string | null
          featured?: boolean | null
          garages?: number | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          neighborhood?: string | null
          price?: number
          purpose?: Database["public"]["Enums"]["property_purpose"]
          state?: string | null
          status?: Database["public"]["Enums"]["property_status"]
          tenant_id: string
          title: string
          type_id?: string | null
          updated_at?: string
          zip_code?: string | null
        }
        Update: {
          address?: string | null
          agent_id?: string | null
          area?: number | null
          bathrooms?: number | null
          bedrooms?: number | null
          city?: string | null
          created_at?: string
          currency?: string | null
          description?: string | null
          featured?: boolean | null
          garages?: number | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          neighborhood?: string | null
          price?: number
          purpose?: Database["public"]["Enums"]["property_purpose"]
          state?: string | null
          status?: Database["public"]["Enums"]["property_status"]
          tenant_id?: string
          title?: string
          type_id?: string | null
          updated_at?: string
          zip_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "properties_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "properties_type_id_fkey"
            columns: ["type_id"]
            isOneToOne: false
            referencedRelation: "property_types"
            referencedColumns: ["id"]
          },
        ]
      }
      property_amenities: {
        Row: {
          amenity_id: string
          id: string
          property_id: string
        }
        Insert: {
          amenity_id: string
          id?: string
          property_id: string
        }
        Update: {
          amenity_id?: string
          id?: string
          property_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_amenities_amenity_id_fkey"
            columns: ["amenity_id"]
            isOneToOne: false
            referencedRelation: "amenities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_amenities_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      property_images: {
        Row: {
          alt: string | null
          created_at: string
          display_order: number | null
          id: string
          property_id: string
          url: string
        }
        Insert: {
          alt?: string | null
          created_at?: string
          display_order?: number | null
          id?: string
          property_id: string
          url: string
        }
        Update: {
          alt?: string | null
          created_at?: string
          display_order?: number | null
          id?: string
          property_id?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_images_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      property_types: {
        Row: {
          active: boolean | null
          created_at: string
          icon: string | null
          id: string
          name: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          active?: boolean | null
          created_at?: string
          icon?: string | null
          id?: string
          name: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          active?: boolean | null
          created_at?: string
          icon?: string | null
          id?: string
          name?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_types_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      rate_limits: {
        Row: {
          action_type: string
          blocked_until: string | null
          count: number
          created_at: string
          expires_at: string
          id: string
          identifier: string
          window_start: string
        }
        Insert: {
          action_type: string
          blocked_until?: string | null
          count?: number
          created_at?: string
          expires_at: string
          id?: string
          identifier: string
          window_start?: string
        }
        Update: {
          action_type?: string
          blocked_until?: string | null
          count?: number
          created_at?: string
          expires_at?: string
          id?: string
          identifier?: string
          window_start?: string
        }
        Relationships: []
      }
      smtp_settings: {
        Row: {
          created_at: string
          encryption: string | null
          host: string | null
          id: string
          password_encrypted: string | null
          port: number | null
          product_email_html: string | null
          product_email_subject: string | null
          sender_email: string | null
          sender_name: string | null
          tenant_id: string
          updated_at: string
          username: string | null
        }
        Insert: {
          created_at?: string
          encryption?: string | null
          host?: string | null
          id?: string
          password_encrypted?: string | null
          port?: number | null
          product_email_html?: string | null
          product_email_subject?: string | null
          sender_email?: string | null
          sender_name?: string | null
          tenant_id: string
          updated_at?: string
          username?: string | null
        }
        Update: {
          created_at?: string
          encryption?: string | null
          host?: string | null
          id?: string
          password_encrypted?: string | null
          port?: number | null
          product_email_html?: string | null
          product_email_subject?: string | null
          sender_email?: string | null
          sender_name?: string | null
          tenant_id?: string
          updated_at?: string
          username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "smtp_settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      smtp_test_rate_limits: {
        Row: {
          id: string
          sent_at: string
          tenant_id: string
          user_id: string
        }
        Insert: {
          id?: string
          sent_at?: string
          tenant_id: string
          user_id: string
        }
        Update: {
          id?: string
          sent_at?: string
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "smtp_test_rate_limits_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          created_at: string
          id: string
          name: string
          settings: Json | null
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          settings?: Json | null
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          settings?: Json | null
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          tenant_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          tenant_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_rate_limit: {
        Args: {
          _action_type: string
          _block_seconds?: number
          _identifier: string
          _max_requests: number
          _window_seconds: number
        }
        Returns: Json
      }
      cleanup_rate_limits: { Args: never; Returns: undefined }
      get_user_tenant_id: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      has_tenant_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _tenant_id: string
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "agent" | "user"
      contact_status: "new" | "read" | "replied" | "archived"
      property_purpose: "sale" | "rent"
      property_status: "available" | "sold" | "rented" | "pending"
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
      app_role: ["admin", "agent", "user"],
      contact_status: ["new", "read", "replied", "archived"],
      property_purpose: ["sale", "rent"],
      property_status: ["available", "sold", "rented", "pending"],
    },
  },
} as const
