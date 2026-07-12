export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      attendance_records: {
        Row: {
          id: string;
          organization_id: string;
          session_id: string;
          child_id: string;
          status: "present" | "absent" | null;
          qt_completed: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          session_id: string;
          child_id: string;
          status?: "present" | "absent" | null;
          qt_completed?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          session_id?: string;
          child_id?: string;
          status?: "present" | "absent" | null;
          qt_completed?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      attendance_memos: {
        Row: {
          id: string;
          organization_id: string;
          session_date: string;
          class_id: string | null;
          teacher_id: string | null;
          note: string;
          is_secret: boolean;
          acknowledged_at: string | null;
          acknowledged_by_teacher_id: string | null;
          saved_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          session_date: string;
          class_id?: string | null;
          teacher_id?: string | null;
          note: string;
          is_secret?: boolean;
          acknowledged_at?: string | null;
          acknowledged_by_teacher_id?: string | null;
          saved_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          session_date?: string;
          class_id?: string | null;
          teacher_id?: string | null;
          note?: string;
          is_secret?: boolean;
          acknowledged_at?: string | null;
          acknowledged_by_teacher_id?: string | null;
          saved_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      attendance_sessions: {
        Row: {
          id: string;
          organization_id: string;
          session_date: string;
          note: string;
          share_with_pastor: boolean;
          saved_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          session_date: string;
          note?: string;
          share_with_pastor?: boolean;
          saved_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          session_date?: string;
          note?: string;
          share_with_pastor?: boolean;
          saved_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      child_parents: {
        Row: {
          id: string;
          organization_id: string;
          child_id: string;
          relation: "father" | "mother" | "other";
          name: string;
          phone: string;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          organization_id: string;
          child_id: string;
          relation?: "father" | "mother" | "other";
          name?: string;
          phone?: string;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          child_id?: string;
          relation?: "father" | "mother" | "other";
          name?: string;
          phone?: string;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      children: {
        Row: {
          id: string;
          organization_id: string;
          class_id: string | null;
          name: string;
          photo_data_url: string | null;
          gender: "male" | "female" | "unspecified";
          birth_date: string | null;
          birth_year: number | null;
          birth_month: number | null;
          birth_day: number | null;
          address: string | null;
          email: string | null;
          registered_at: string | null;
          notes: string | null;
          is_active: boolean;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          organization_id: string;
          class_id?: string | null;
          name: string;
          photo_data_url?: string | null;
          gender?: "male" | "female" | "unspecified";
          birth_date?: string | null;
          birth_year?: number | null;
          birth_month?: number | null;
          birth_day?: number | null;
          address?: string | null;
          email?: string | null;
          registered_at?: string | null;
          notes?: string | null;
          is_active?: boolean;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          class_id?: string | null;
          name?: string;
          photo_data_url?: string | null;
          gender?: "male" | "female" | "unspecified";
          birth_date?: string | null;
          birth_year?: number | null;
          birth_month?: number | null;
          birth_day?: number | null;
          address?: string | null;
          email?: string | null;
          registered_at?: string | null;
          notes?: string | null;
          is_active?: boolean;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      classes: {
        Row: {
          id: string;
          organization_id: string;
          name: string;
          teacher_id: string | null;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          organization_id: string;
          name: string;
          teacher_id?: string | null;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          name?: string;
          teacher_id?: string | null;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
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
      organizations: {
        Row: {
          id: string;
          slug: string;
          name: string;
          department: string | null;
          timezone: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          name: string;
          department?: string | null;
          timezone?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          slug?: string;
          name?: string;
          department?: string | null;
          timezone?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      teachers: {
        Row: {
          id: string;
          organization_id: string;
          name: string;
          photo_data_url: string | null;
          birth_date: string | null;
          birth_month: number | null;
          birth_day: number | null;
          phone: string | null;
          is_admin: boolean;
          is_active: boolean;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          organization_id: string;
          name: string;
          photo_data_url?: string | null;
          birth_date?: string | null;
          birth_month?: number | null;
          birth_day?: number | null;
          phone?: string | null;
          is_admin?: boolean;
          is_active?: boolean;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          name?: string;
          photo_data_url?: string | null;
          birth_date?: string | null;
          birth_month?: number | null;
          birth_day?: number | null;
          phone?: string | null;
          is_admin?: boolean;
          is_active?: boolean;
          sort_order?: number;
          created_at?: string;
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
