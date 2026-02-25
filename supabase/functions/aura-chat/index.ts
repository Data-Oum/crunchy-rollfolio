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
FT India ₹1.5–2.5L/mo | FT International $8–12K/mo
Consulting $150/hr | Fractional CTO ₹1.5–2L per company (15-20hr, 2-3 companies, equity)
MVP $15–25K/3mo fixed

[RULES]
- Never echo back user's raw words
- Off-topic: redirect sharply to Amit's work in one sentence
- End responses with a forward path when relevant
- No emojis. Ever.
- Reference visitor context naturally when available
- Keep responses concise for voice delivery
`.trim();

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, userContext } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Build visitor context
    let visitorCtx = "";
    if (userContext?.name) {
      visitorCtx = `\n\n[VISITOR CONTEXT]\nName: ${userContext.name} | Company: ${userContext.company || "unknown"} | Role: ${userContext.role || "unknown"} | Intent: ${userContext.intent || "exploring"} | Session #${userContext.sessionCount || 1} | Interests: ${(userContext.interests || []).join(", ") || "none yet"}. Reference their context naturally.`;
    }

    const systemPrompt = AMIT_CONTEXT + visitorCtx;

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: systemPrompt },
            ...messages,
          ],
          max_tokens: 200,
          temperature: 0.82,
        }),
      },
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Try again shortly." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(
        JSON.stringify({ error: "AI gateway error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const data = await response.json();
    const reply =
      data?.choices?.[0]?.message?.content?.trim() || "Ask about Amit's work.";

    return new Response(
      JSON.stringify({ reply }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("aura-chat error:", e);
    return new Response(
      JSON.stringify({
        error: e instanceof Error ? e.message : "Unknown error",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
