/**
 * src/integrations/supabase/types.ts
 * Auto-generated Supabase types for the conversations/messages tables.
 */

export interface Database {
  public: {
    Tables: {
      conversations: {
        Row: {
          id: string;
          created_at: string;
          visitor_name: string | null;
          visitor_email: string | null;
          visitor_company: string | null;
          visitor_role: string | null;
          visitor_intent: string | null;
          summary: string | null;
          metadata: Record<string, unknown>;
        };
        Insert: {
          id?: string;
          created_at?: string;
          visitor_name?: string | null;
          visitor_email?: string | null;
          visitor_company?: string | null;
          visitor_role?: string | null;
          visitor_intent?: string | null;
          summary?: string | null;
          metadata?: Record<string, unknown>;
        };
        Update: {
          visitor_name?: string | null;
          visitor_email?: string | null;
          visitor_company?: string | null;
          visitor_role?: string | null;
          visitor_intent?: string | null;
          summary?: string | null;
          metadata?: Record<string, unknown>;
        };
      };
      messages: {
        Row: {
          id: string;
          conversation_id: string;
          created_at: string;
          role: string;
          content: string;
          metadata: Record<string, unknown>;
        };
        Insert: {
          id?: string;
          conversation_id?: string;
          created_at?: string;
          role: string;
          content: string;
          metadata?: Record<string, unknown>;
        };
        Update: {
          role?: string;
          content?: string;
          metadata?: Record<string, unknown>;
        };
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}
