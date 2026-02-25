/**
 * src/integrations/supabase/client.ts
 *
 * Supabase client + helpers for Aura conversation persistence.
 * All operations are fire-and-forget — never blocks the voice pipeline.
 */

import { auraD } from "@/lib/diagnostics";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

const SUPABASE_URL =
  (import.meta as unknown as { env: Record<string, string> }).env
    .VITE_SUPABASE_URL ||
  (import.meta as unknown as { env: Record<string, string> }).env
    .SUPABASE_URL ||
  "";
const SUPABASE_KEY =
  (import.meta as unknown as { env: Record<string, string> }).env
    .VITE_SUPABASE_ANON_KEY ||
  (import.meta as unknown as { env: Record<string, string> }).env
    .SUPABASE_PUBLISHABLE_KEY ||
  "";

let _supabase: ReturnType<typeof createClient<Database>> | null = null;

function getSupabase() {
  if (!_supabase && SUPABASE_URL && SUPABASE_KEY) {
    _supabase = createClient<Database>(SUPABASE_URL, SUPABASE_KEY, {
      auth: { persistSession: true, autoRefreshToken: true },
    });
    auraD.setHealth("supabase", "ok");
    auraD.log("supabase", "info", "Client initialized");
  }
  return _supabase;
}

export { getSupabase as supabase };

// ── Save conversation ────────────────────────────────────────────────────────
export async function saveConversationToDB(opts: {
  visitorName?: string;
  visitorEmail?: string;
  visitorCompany?: string;
  visitorRole?: string;
  visitorIntent?: string;
  summary?: string;
  metadata?: Record<string, unknown>;
}): Promise<string | null> {
  const sb = getSupabase();
  if (!sb) {
    auraD.log("supabase", "warn", "No Supabase client — skipping save");
    return null;
  }

  try {
    const { data, error } = await sb
      .from("conversations")
      .insert({
        visitor_name: opts.visitorName ?? null,
        visitor_email: opts.visitorEmail ?? null,
        visitor_company: opts.visitorCompany ?? null,
        visitor_role: opts.visitorRole ?? null,
        visitor_intent: opts.visitorIntent ?? null,
        summary: opts.summary ?? null,
        metadata: opts.metadata ?? {},
      })
      .select("id")
      .single();

    if (error) {
      auraD.log("supabase", "warn", `saveConversation: ${error.message}`);
      return null;
    }
    auraD.log("supabase", "info", `Conversation saved: ${data?.id}`);
    auraD.increment("supabase.conversations_saved");
    return data?.id ?? null;
  } catch (e) {
    auraD.error("supabase", e, "saveConversation");
    auraD.setHealth("supabase", "down");
    return null;
  }
}

// ── Save messages ────────────────────────────────────────────────────────────
export async function saveMessagesToDB(
  conversationId: string,
  messages: Array<{ role: "user" | "ai"; text: string; ts: number }>,
): Promise<void> {
  const sb = getSupabase();
  if (!sb || !conversationId || !messages.length) return;

  try {
    const rows = messages.map((m) => ({
      conversation_id: conversationId,
      role: m.role === "ai" ? "assistant" : "user",
      content: m.text,
      metadata: { ts: m.ts },
    }));
    const { error } = await sb.from("messages").insert(rows);
    if (error) {
      auraD.log("supabase", "warn", `saveMessages: ${error.message}`);
    } else {
      auraD.log(
        "supabase",
        "info",
        `${messages.length} messages saved to ${conversationId}`,
      );
      auraD.increment("supabase.messages_saved");
    }
  } catch (e) {
    auraD.error("supabase", e, "saveMessages");
  }
}

// ── Save full session (conversation + messages in one call) ──────────────────
export async function saveFullSession(opts: {
  visitorName?: string;
  visitorCompany?: string;
  visitorRole?: string;
  visitorIntent?: string;
  summary?: string;
  messages: Array<{ role: "user" | "ai"; text: string; ts: number }>;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  const convoId = await saveConversationToDB({
    visitorName: opts.visitorName,
    visitorCompany: opts.visitorCompany,
    visitorRole: opts.visitorRole,
    visitorIntent: opts.visitorIntent,
    summary: opts.summary,
    metadata: {
      ...opts.metadata,
      messageCount: opts.messages.length,
      sessionEnd: new Date().toISOString(),
    },
  });

  if (convoId && opts.messages.length) {
    await saveMessagesToDB(convoId, opts.messages);
  }
}
