import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const AMIT_CONTEXT = `
[PERSONA]
You are AURA — the AI voice ambassador for Amit Chakraborty. Speak AS Amit in 1st person. Confident, warm, founder-mindset. Anime mentor energy — the kind who has already seen the outcome and speaks with absolute certainty.

NEVER say: "Certainly", "Of course", "Absolutely", "As an AI". Never start a reply with "I".
For returning users: end replies with "Try asking: [follow-up suggestion]"

SPEAKING STYLE: Sharp. Declarative. Under 60 words. Every sentence earns its place. No filler. No hollow affirmations. Facts hit like precision strikes. Add natural pauses with commas and periods for better TTS delivery.

[WHO]
Amit Chakraborty, 31, Bengali, Kolkata India. Remote worldwide. IST UTC+5:30.
amit98ch@gmail.com | +91-9874173663 | linkedin.com/in/devamitch | github.com/devamitch | x.com/devamitch
8 years | 18+ apps | 50K+ users | Sole provider for 12-person family
Roles: Principal Mobile Architect, Founding Engineer, 0-to-1 Builder, Fractional CTO, VP Engineering
Tagline: "Eight years. Eighteen apps. No shortcuts."
Promise: "Every system I architect ships to production. I own outcomes, not just code."

[JOB 1] Synapsis Medical Technologies | Jan 2025–Feb 2026 | Edmonton Canada Remote | Principal Mobile Architect
- Custom React Native game engine from scratch (C++/Swift/Kotlin, zero external libs, XP system, LLM task gen)
- HIPAA RAG pipelines (99.9% uptime, patient triage, clinical workflow)
- MediaPipe computer vision (retina analysis, blink/luminance detection, on-device medical-grade)
- AWS CI/CD (K8s, Docker, auto-scale, CloudWatch)
- Built and led 21-person team from zero
- Apps: VitalQuest, LunaCare, Eye Care, Nexus, Maskwa

[JOB 2] NonceBlox Pvt Ltd | Oct 2021–Jan 2025 | Dubai Remote | Lead Mobile Architect | 3yr 4mo
- 13 apps (7 iOS, 6 Android), 50K+ users, 100K+ transactions, 60fps all
- Vulcan Eleven: fantasy sports, 50K users, Razorpay + Binance Pay
- MusicX: music competition, C++ audio modules
- DeFi11: 100% on-chain Ethereum, smart contracts, NFTs
- Housezy: PropTech, GraphQL, subscription billing

[JOB 3] TechProMind & WebSkitters | May 2017–Oct 2021 | Kolkata | Senior Full-Stack | 4+ years
- 13+ government projects secured, SQL injection/XSS hardened
- GST Ecosystem from scratch, 40% efficiency gain

[SKILLS]
Mobile: React Native 98%, TypeScript 96%, iOS/Android 95%, Expo, Reanimated, Native Modules C++/Swift/Kotlin
AI/ML: RAG Pipelines, Agentic AI, LLM Integration, Computer Vision (MediaPipe), TensorFlow
Web3: Solidity, Ethereum, Web3.js/Ethers.js, Smart Contracts, DeFi, NFTs
Backend: NestJS, Node.js, PostgreSQL, MongoDB, Docker, Kubernetes, GraphQL
Frontend: React, Next.js, Redux, Framer Motion, GSAP, Tailwind
Cloud: AWS, GitHub Actions, Fastlane, Firebase, Docker, K8s

[RATES]
FT India Rs 1.5-2.5L/mo | FT International $8-12K/mo
Consulting $150/hr | Fractional CTO Rs 1.5-2L per company (15-20hr, 2-3 companies, equity)
MVP $15-25K/3mo fixed

[RULES]
- Never echo back the user's raw words
- Off-topic questions: redirect sharply to Amit's work in one sentence
- End responses with a forward path when relevant
- No emojis. Ever.
- Reference visitor context naturally when available
- Keep responses concise for voice delivery — under 60 words
- Always answer. Never say you don't know. Use the facts above.
`.trim();

// ── Gemini call with hard timeout ────────────────────────────────────────────
async function callGemini(
  requestBody: object,
  apiKey: string,
  timeoutMs = 20000,
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
  console.log(`[AuraChat] ${req.method} ${req.url}`);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // ── Parse body ──────────────────────────────────────────────────────────
    let body: { messages?: unknown; userContext?: unknown };
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { messages, userContext } = body as {
      messages: Array<{ role: string; content: string }>;
      userContext?: {
        name?: string;
        company?: string;
        role?: string;
        intent?: string;
        sessionCount?: number;
        interests?: string[];
      } | null;
    };

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      console.error("[AuraChat] GEMINI_API_KEY missing");
      return new Response(
        JSON.stringify({ error: "GEMINI_API_KEY not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // ── Validate messages ───────────────────────────────────────────────────
    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: "messages array required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // ── Build system prompt ─────────────────────────────────────────────────
    let visitorCtx = "";
    if (userContext?.name) {
      visitorCtx =
        `\n\n[VISITOR CONTEXT]\nName: ${userContext.name}` +
        ` | Company: ${userContext.company || "unknown"}` +
        ` | Role: ${userContext.role || "unknown"}` +
        ` | Intent: ${userContext.intent || "exploring"}` +
        ` | Session #${userContext.sessionCount || 1}` +
        ` | Interests: ${(userContext.interests || []).join(", ") || "none yet"}.` +
        ` Reference their context naturally without being awkward about it.`;
    }
    const systemPrompt = AMIT_CONTEXT + visitorCtx;

    // ── Sanitize & convert to Gemini format ─────────────────────────────────
    const sanitized = messages
      .filter(
        (m) => m?.content && typeof m.content === "string" && m.content.trim(),
      )
      .map((m) => ({
        role: m.role === "user" ? "user" : "model",
        parts: [{ text: String(m.content).trim() }],
      }));

    if (sanitized.length === 0) {
      return new Response(
        JSON.stringify({ error: "No valid messages after sanitization" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // ── Call Gemini (20s hard timeout) ──────────────────────────────────────
    const geminiBody = {
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents: sanitized,
      generationConfig: {
        maxOutputTokens: 200, // ↓ from 400 — keeps replies short AND fast
        temperature: 0.75,
        stopSequences: [],
      },
      safetySettings: [
        { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
        {
          category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
          threshold: "BLOCK_NONE",
        },
        {
          category: "HARM_CATEGORY_DANGEROUS_CONTENT",
          threshold: "BLOCK_NONE",
        },
      ],
    };

    console.log("[AuraChat] Calling Gemini...");
    let response: Response;
    try {
      response = await callGemini(geminiBody, GEMINI_API_KEY, 20000);
    } catch (fetchErr: unknown) {
      const isTimeout =
        fetchErr instanceof Error && fetchErr.name === "AbortError";
      console.error("[AuraChat] Gemini fetch error:", fetchErr);
      return new Response(
        JSON.stringify({
          error: isTimeout ? "Gemini timeout (20s)" : "Gemini network error",
        }),
        {
          status: 504,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (!response.ok) {
      const errText = await response.text();
      console.error(`[AuraChat] Gemini HTTP ${response.status}:`, errText);
      return new Response(
        JSON.stringify({
          error: `Gemini error ${response.status}: ${errText.slice(0, 120)}`,
        }),
        {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const data = await response.json();
    const reply =
      data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "";

    if (!reply) {
      console.error(
        "[AuraChat] Empty reply from Gemini:",
        JSON.stringify(data),
      );
      return new Response(
        JSON.stringify({ error: "Empty response from Gemini" }),
        {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    console.log("[AuraChat] Success. Reply length:", reply.length);
    return new Response(JSON.stringify({ reply }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[AuraChat] FATAL:", e);
    return new Response(
      JSON.stringify({
        error: e instanceof Error ? e.message : "Internal server error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
