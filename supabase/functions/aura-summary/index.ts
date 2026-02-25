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
    const { messages, userName } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const transcript = messages
      .map((m: any) => `${m.role === "user" ? "Visitor" : "Aura"}: ${m.text}`)
      .join("\n");

    const name = userName || "this visitor";

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-lite",
          messages: [
            {
              role: "user",
              content: `Conversation:\n${transcript}\n\nIn under 35 words, write 1-2 sharp sentences: what ${name} likely needs from Amit and why Amit is the right person. No emojis. Declarative tone.`,
            },
          ],
          max_tokens: 80,
          temperature: 0.7,
        }),
      },
    );

    if (!response.ok) {
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
    console.error("aura-summary error:", e);
    return new Response(JSON.stringify({ summary: "" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
