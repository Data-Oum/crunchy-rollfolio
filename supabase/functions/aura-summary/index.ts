import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { messages, userName } = body;

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      console.error("GEMINI_API_KEY is not set in Supabase secrets");
      // Return empty summary gracefully — don't crash the close flow
      return new Response(JSON.stringify({ summary: "" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate messages
    if (!Array.isArray(messages) || messages.length < 2) {
      return new Response(JSON.stringify({ summary: "" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build clean transcript — only user + ai messages
    const transcript = messages
      .filter((m: any) => m?.text && typeof m.text === "string")
      .map(
        (m: any) =>
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
      `In under 35 words, write 1-2 sharp sentences: what ${name} likely needs from Amit ` +
      `and why Amit is the right person for it. No emojis. Declarative tone. No preamble.`;

    console.log("Calling Gemini API (summary) with model: gemini-1.5-flash");

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${GEMINI_API_KEY}`,
          "x-goog-api-key": GEMINI_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gemini-1.5-flash",
          messages: [{ role: "user", content: prompt }],
          max_tokens: 120,
          temperature: 0.7,
        }),
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`aura-summary Gemini error ${response.status}:`, errorText);
      // Return empty gracefully — summary is non-critical
      return new Response(JSON.stringify({ summary: "" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const summary = data?.choices?.[0]?.message?.content?.trim() || "";

    return new Response(JSON.stringify({ summary }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("aura-summary unhandled error:", e);
    // Always return valid JSON — never crash the close/save flow
    return new Response(JSON.stringify({ summary: "" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
