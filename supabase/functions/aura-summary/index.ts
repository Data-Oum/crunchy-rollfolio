import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ── Gemini call with hard timeout ────────────────────────────────────────────
async function callGemini(
  requestBody: object,
  apiKey: string,
  timeoutMs = 15000,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      },
    );
    clearTimeout(timer);
    return res;
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}

serve(async (req) => {
  console.log(`[AuraSummary] ${req.method} ${req.url}`);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // ── Parse body ──────────────────────────────────────────────────────────
    let body: { messages?: unknown; userName?: unknown };
    try {
      body = await req.json();
    } catch {
      console.error("[AuraSummary] JSON parse error");
      return new Response(JSON.stringify({ summary: "" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { messages, userName } = body as {
      messages: Array<{ role: string; text: string }>;
      userName?: string;
    };

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      console.error("[AuraSummary] GEMINI_API_KEY missing");
      return new Response(JSON.stringify({ summary: "" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Validate ────────────────────────────────────────────────────────────
    if (!Array.isArray(messages) || messages.length < 2) {
      console.log("[AuraSummary] Not enough messages for summary");
      return new Response(JSON.stringify({ summary: "" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Build transcript (cap at last 10 messages to keep prompt small) ─────
    const recentMessages = messages.slice(-10);
    const transcript = recentMessages
      .filter((m) => m?.text && typeof m.text === "string")
      .map(
        (m) =>
          `${m.role === "user" ? "Visitor" : "Aura"}: ${String(m.text).trim()}`,
      )
      .join("\n");

    if (!transcript.trim()) {
      return new Response(JSON.stringify({ summary: "" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const name =
      userName && typeof userName === "string" && userName.trim()
        ? userName.trim()
        : "this visitor";

    const prompt =
      `Conversation:\n${transcript}\n\n` +
      `In under 30 words, write 1 sharp sentence: what ${name} likely needs from Amit ` +
      `and why Amit is the right person for it. No emojis. Declarative tone. No preamble.`;

    // ── Call Gemini (15s hard timeout) ──────────────────────────────────────
    const geminiBody = {
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        maxOutputTokens: 80, // ↓ from 120 — summaries are short
        temperature: 0.65,
      },
    };

    console.log("[AuraSummary] Calling Gemini...");
    let response: Response;
    try {
      response = await callGemini(geminiBody, GEMINI_API_KEY, 15000);
    } catch (fetchErr: unknown) {
      const isTimeout =
        fetchErr instanceof Error && fetchErr.name === "AbortError";
      console.error("[AuraSummary] Gemini fetch error:", fetchErr);
      // Summary is non-critical — return empty gracefully
      return new Response(
        JSON.stringify({
          summary: "",
          error: isTimeout ? "timeout" : "network_error",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (!response.ok) {
      const errText = await response.text();
      console.error(`[AuraSummary] Gemini HTTP ${response.status}:`, errText);
      return new Response(JSON.stringify({ summary: "" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const summary =
      data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";

    console.log("[AuraSummary] Success. Summary length:", summary.length);
    return new Response(JSON.stringify({ summary }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[AuraSummary] FATAL:", e);
    return new Response(JSON.stringify({ summary: "" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
