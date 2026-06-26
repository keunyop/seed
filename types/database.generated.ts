export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      family_open_app_state: {
        Row: {
          id: string;
          state: Json;
          updated_at: string;
        };
        Insert: {
          id?: string;
          state: Json;
          updated_at?: string;
        };
        Update: {
          id?: string;
          state?: Json;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
