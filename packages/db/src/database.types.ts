
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "allowed_users": {
                  Row: {
                    "created_at": string,"email": string,"note": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"email": string,"note"?: string | null
                  }
                  Update: {
                    "created_at"?: string,"email"?: string,"note"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"cards": {
                  Row: {
                    "artist": string | null,"collector_number": string,"content_hash": string,"domains": (string)[],"energy": number | null,"image_back": string | null,"image_large": string | null,"image_normal": string | null,"image_small": string | null,"image_source": string | null,"keywords": (string)[],"legalities": Json | null,"might": number | null,"name": string,"oracle_id": string,"orientation": string | null,"power": number | null,"printing_id": string,"rarity": string | null,"rules_html": string | null,"rules_text": string | null,"set_code": string,"supertype": string | null,"tags": (string)[],"type": string,"updated_at": string,"variant": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "artist"?: string | null,"collector_number": string,"content_hash": string,"domains"?: (string)[],"energy"?: number | null,"image_back"?: string | null,"image_large"?: string | null,"image_normal"?: string | null,"image_small"?: string | null,"image_source"?: string | null,"keywords"?: (string)[],"legalities"?: Json | null,"might"?: number | null,"name": string,"oracle_id": string,"orientation"?: string | null,"power"?: number | null,"printing_id": string,"rarity"?: string | null,"rules_html"?: string | null,"rules_text"?: string | null,"set_code": string,"supertype"?: string | null,"tags"?: (string)[],"type": string,"updated_at"?: string,"variant"?: string | null
                  }
                  Update: {
                    "artist"?: string | null,"collector_number"?: string,"content_hash"?: string,"domains"?: (string)[],"energy"?: number | null,"image_back"?: string | null,"image_large"?: string | null,"image_normal"?: string | null,"image_small"?: string | null,"image_source"?: string | null,"keywords"?: (string)[],"legalities"?: Json | null,"might"?: number | null,"name"?: string,"oracle_id"?: string,"orientation"?: string | null,"power"?: number | null,"printing_id"?: string,"rarity"?: string | null,"rules_html"?: string | null,"rules_text"?: string | null,"set_code"?: string,"supertype"?: string | null,"tags"?: (string)[],"type"?: string,"updated_at"?: string,"variant"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"catalog_meta": {
                  Row: {
                    "id": boolean,"updated_at": string,"version": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "id"?: boolean,"updated_at"?: string,"version"?: string | null
                  }
                  Update: {
                    "id"?: boolean,"updated_at"?: string,"version"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"decks": {
                  Row: {
                    "cards": (string)[],"created_at": string,"id": string,"name": string,"owner_id": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "cards"?: (string)[],"created_at"?: string,"id"?: string,"name": string,"owner_id"?: string,"updated_at"?: string
                  }
                  Update: {
                    "cards"?: (string)[],"created_at"?: string,"id"?: string,"name"?: string,"owner_id"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"match_replays": {
                  Row: {
                    "actions": NonNullable<Json>,"match_id": string,"setup": NonNullable<Json>
                  }
                  ComputedFields: never
                  Insert: {
                    "actions": NonNullable<Json>,"match_id": string,"setup": NonNullable<Json>
                  }
                  Update: {
                    "actions"?: NonNullable<Json>,"match_id"?: string,"setup"?: NonNullable<Json>
                  }
                  Relationships: [
                    {
      foreignKeyName: "match_replays_match_id_fkey"
      columns: ["match_id"]
isOneToOne: true
      referencedRelation: "matches"
      referencedColumns: ["id"]
    }
                  ]
                },"matches": {
                  Row: {
                    "finished_at": string,"id": string,"player_one": string,"player_two": string,"seed": number,"turns": number,"winner": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "finished_at"?: string,"id": string,"player_one": string,"player_two": string,"seed": number,"turns": number,"winner"?: string | null
                  }
                  Update: {
                    "finished_at"?: string,"id"?: string,"player_one"?: string,"player_two"?: string,"seed"?: number,"turns"?: number,"winner"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"profiles": {
                  Row: {
                    "avatar_url": string | null,"created_at": string,"display_name": string,"id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "avatar_url"?: string | null,"created_at"?: string,"display_name": string,"id": string
                  }
                  Update: {
                    "avatar_url"?: string | null,"created_at"?: string,"display_name"?: string,"id"?: string
                  }
                  Relationships: [
                    
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "hook_restrict_signup":
{ Args: { "event": Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            
          }
        }
} as const
