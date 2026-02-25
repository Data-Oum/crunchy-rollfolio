import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  console.log(`[AuraSummary] Incoming request: ${req.method} ${req.url}`);

  if (req.method === "OPTIONS") {
    console.log("[AuraSummary] OPTIONS preflight");
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const bodyText = await req.text();
    console.log(`[AuraSummary] Body length: ${bodyText.length}`);

    let body;
    try {
      body = JSON.parse(bodyText);
    } catch (e) {
      console.error("[AuraSummary] JSON Parse Error:", e);
      return new Response(JSON.stringify({ summary: "" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { messages, userName } = body;
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    console.log(`[AuraSummary] Secret present: ${!!GEMINI_API_KEY}`);

    if (!GEMINI_API_KEY) {
      console.error(
        "[AuraSummary] GEMINI_API_KEY is missing from Supabase secrets",
      );
      return new Response(JSON.stringify({ summary: "" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate messages
    if (!Array.isArray(messages) || messages.length < 2) {
      console.log("[AuraSummary] Not enough history for summary");
      return new Response(JSON.stringify({ summary: "" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build clean transcript
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

    const nativeRequestBody = {
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        maxOutputTokens: 120,
        temperature: 0.7,
      },
    };

    console.log(`[AuraSummary] Calling Gemini Native (1.5-flash)`);

    let response: Response;
    try {
      response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(nativeRequestBody),
        },
      );
    } catch (fetchError) {
      console.error(
        "[AuraSummary] Network error calling Gemini Native:",
        fetchError,
      );
      return new Response(JSON.stringify({ summary: "" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        `[AuraSummary] Gemini Native API error ${response.status}:`,
        errorText,
      );
      return new Response(JSON.stringify({ summary: "" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const summary =
      data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";

    console.log("[AuraSummary] Summary generated successfully");
    return new Response(JSON.stringify({ summary }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[AuraSummary] FATAL ERROR:", e);
    return new Response(JSON.stringify({ summary: "" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
