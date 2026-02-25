/**
 * src/lib/gemini.ts
 *
 * FIX: (import.meta as unknown as { env: Record<string, string> }).env.VITE_GEMINI_KEY → import.meta.env.VITE_GEMINI_API_KEY
 * Vite ONLY exposes import.meta.env.VITE_* at runtime.
 * (import.meta as unknown as { env: Record<string, string> }).env is Node.js — it's undefined in the browser build.
 */
import { PROFILE } from "@/data/profile";
import type { Message, UserProfile } from "@/store/useConversationStore";
import { GoogleGenAI } from "@google/genai";

// ─── KEY FIX ────────────────────────────────────────────────────────────────
const GEMINI_KEY =
  (import.meta as unknown as { env: Record<string, string> }).env
    .VITE_GEMINI_API_KEY ?? "";

export const CHAT_MODEL = "gemini-2.5-flash";
export const TTS_MODEL = "gemini-2.5-flash-preview-tts";

let _client: GoogleGenAI | null = null;
export function getGenAI(): GoogleGenAI {
  if (!_client) _client = new GoogleGenAI({ apiKey: GEMINI_KEY });
  return _client;
}

// ─── Amit's persona ──────────────────────────────────────────────────────────
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

// ─── Local fallbacks (no API) ─────────────────────────────────────────────────
const LOCAL_FALLBACKS: Record<string, string> = {
  "who|about|introduce": `Amit Chakraborty. Principal Mobile Architect. 8 years. 18 apps. 50 thousand plus users. Built a health tech engine from scratch, no external libs, 21-person team. Based in Kolkata.`,
  "vital|health": `VitalQuest. Proprietary health tech engine. Zero dependencies. LLM task generation, HIPAA RAG pipeline, XP system. 21 engineers. 5 apps on it. 99.9 percent uptime.`,
  "tech|stack": `React Native, Next JS, Nest JS, TypeScript, AWS, Kubernetes, GraphQL, TensorFlow, Solidity, Web3. Mobile, AI, and Web3 at production scale simultaneously.`,
  "hire|why": `8 years. 18 apps. 50 thousand real users. HIPAA AI pipelines from nothing. Mobile, AI, and Web3. Led 21 engineers. Reach him at ${PROFILE.email}.`,
  "contact|email": `${PROFILE.email}. LinkedIn at linkedin.com/in/devamitch. Open for VP Engineering, CTO, Principal Architect.`,
  "web3|defi|nft": `DeFi11, 100 percent on-chain. Smart contract prize pools. NFT marketplace on Ethereum. Vulcan Eleven, 50 thousand users, Binance Pay. Amit built both.`,
};

function localFallback(msg: string): string {
  const q = msg.toLowerCase();
  for (const [pattern, reply] of Object.entries(LOCAL_FALLBACKS)) {
    if (new RegExp(`\\b(${pattern})\\b`).test(q)) return reply;
  }
  return `Ask about Amit's projects, tech stack, or how to hire him.`;
}

// ─── Instant answers (zero API round-trip) ────────────────────────────────────
const INSTANT_ANSWERS: Array<{
  pattern: RegExp;
  answer: (email: string, location: string) => string;
}> = [
  {
    pattern: /\b(contact|email|reach|linkedin|github|connect)\b/,
    answer: (email) =>
      `${email}. LinkedIn: linkedin.com/in/devamitch. GitHub: github.com/devamitch. Open for VP Engineering, CTO, and Principal Architect roles.`,
  },
  {
    pattern: /\b(salary|rate|compensation|cost|charge)\b/,
    answer: (email) =>
      `Expectations align with VP and CTO level experience. Reach out at ${email} directly.`,
  },
  {
    pattern: /\b(location|where|based|remote|timezone)\b/,
    answer: (_email, location) =>
      `${location}. Works globally. Timezone flexible, async-first. Remote preferred, open to hybrid for the right mission.`,
  },
];

export function detectInstantAnswer(msg: string): string | null {
  const q = msg.toLowerCase();
  for (const { pattern, answer } of INSTANT_ANSWERS) {
    if (pattern.test(q)) return answer(PROFILE.email, PROFILE.location);
  }
  return null;
}

// ─── Main chat ────────────────────────────────────────────────────────────────
interface GeminiMsg {
  role: "user" | "model";
  parts: { text: string }[];
}

export async function askAura(
  msg: string,
  user: UserProfile | null,
  historyBeforeMsg: Message[],
  onError?: (e: string | null) => void,
): Promise<string> {
  const visitorCtx = user?.name
    ? `\n\n[VISITOR]\nName: ${user.name} | Company: ${user.company || "unknown"} | Role: ${user.role || "unknown"} | Intent: ${user.intent || "exploring"} | Session #${user.sessionCount || 1}`
    : "";

  const contents: GeminiMsg[] = [
    ...historyBeforeMsg.slice(-8).map((m) => ({
      role: m.role === "user" ? ("user" as const) : ("model" as const),
      parts: [{ text: m.text }],
    })),
    { role: "user" as const, parts: [{ text: msg }] },
  ];

  try {
    const resp = await getGenAI().models.generateContent({
      model: CHAT_MODEL,
      contents,
      config: {
        systemInstruction: AMIT_CONTEXT + visitorCtx,
        maxOutputTokens: 240,
        temperature: 0.75,
      },
    });
    onError?.(null);
    return (
      resp.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ??
      localFallback(msg)
    );
  } catch (err: unknown) {
    const msg2 =
      err instanceof Error ? err.message.slice(0, 40) : "Unknown error";
    console.warn("[Gemini chat] error:", err);
    onError?.(`Issue: ${msg2}`);
    return localFallback(msg);
  }
}

// ─── Summary ──────────────────────────────────────────────────────────────────
export async function generateSummary(
  user: UserProfile | null,
  msgs: Message[],
): Promise<string> {
  if (msgs.length < 2) return "";
  const transcript = msgs
    .slice(-10)
    .map((m) => `${m.role === "user" ? "Visitor" : "Aura"}: ${m.text}`)
    .join("\n");
  const name = user?.name || "this visitor";
  const prompt = `Conversation:\n${transcript}\n\nSummarize what ${name} needs from Amit in 1 sentence under 30 words.`;
  try {
    const resp = await getGenAI().models.generateContent({
      model: CHAT_MODEL,
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: {
        systemInstruction: `Summarize in exactly 1 sentence under 30 words.`,
        maxOutputTokens: 80,
        temperature: 0.5,
      },
    });
    return resp.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "";
  } catch {
    return "";
  }
}
