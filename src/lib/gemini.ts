/**
 * src/lib/gemini.ts
 *
 * Gemini chat for Aura.
 * Models: gemini-2.5-flash (primary) → gemini-2.0-flash (fallback)
 *
 * New: Token usage tracking with beautiful stats export.
 * New: Language-aware system prompt injection.
 */

import type { Message, UserProfile } from "@/store/useConversationStore";
import { auraD } from "./diagnostics";
import type { SupportedLang } from "./fallbackAI";
import {
  fallbackChat,
  generateOfflineSummary,
  setFallbackContext,
} from "./fallbackAI";
export const CHAT_MODEL_PRIMARY = "gemini-3-flash-preview";
export const CHAT_MODEL_FALLBACK = "gemini-2.5-flash";

let _ai: import("@google/genai").GoogleGenAI | null = null;
let _apiKeyUsed = "";

async function getAI(apiKey?: string) {
  const key =
    apiKey ||
    (import.meta as unknown as { env: Record<string, string> }).env
      .VITE_GEMINI_API_KEY ||
    "";
  if (!key) {
    auraD.setHealth("geminiApi", "down");
    throw new Error("No API key — set VITE_GEMINI_API_KEY");
  }
  if (!_ai || _apiKeyUsed !== key) {
    const { GoogleGenAI } = await import("@google/genai");
    _ai = new GoogleGenAI({ apiKey: key });
    _apiKeyUsed = key;
  }
  return _ai;
}

// ─── Offline state ────────────────────────────────────────────────────────────
let _offlineMode = false;
let _consecutiveErrors = 0;
let _activeModel = CHAT_MODEL_PRIMARY;

export function isOffline(): boolean {
  return _offlineMode || !navigator.onLine;
}
export function forceOffline(val: boolean): void {
  _offlineMode = val;
}
export function resetOffline(): void {
  _offlineMode = false;
  _consecutiveErrors = 0;
  _activeModel = CHAT_MODEL_PRIMARY;
  auraD.setHealth("geminiApi", "unknown");
  auraD.setHealth("fallbackAI", "standby");
}

// ─── Token tracking ───────────────────────────────────────────────────────────
export interface TokenUsageStats {
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCalls: number;
  totalFailures: number;
  sessionInputTokens: number;
  sessionOutputTokens: number;
  sessionCalls: number;
  estimatedCostUSD: number;
  lastCallTokens: { input: number; output: number } | null;
  contextUtilization: number; // 0–1 fraction of context window used this session
  peakContextTokens: number;
  avgTokensPerCall: number;
}

// Gemini 2.5 Flash pricing (per 1M tokens)
const INPUT_COST_PER_M = 0.075;
const OUTPUT_COST_PER_M = 0.3;
const CONTEXT_WINDOW = 1_000_000; // 1M token window

const _tokenStats: TokenUsageStats = {
  totalInputTokens: 0,
  totalOutputTokens: 0,
  totalCalls: 0,
  totalFailures: 0,
  sessionInputTokens: 0,
  sessionOutputTokens: 0,
  sessionCalls: 0,
  estimatedCostUSD: 0,
  lastCallTokens: null,
  contextUtilization: 0,
  peakContextTokens: 0,
  avgTokensPerCall: 0,
};

export function getTokenStats(): Readonly<TokenUsageStats> {
  return { ..._tokenStats };
}

export function resetSessionTokenStats(): void {
  _tokenStats.sessionInputTokens = 0;
  _tokenStats.sessionOutputTokens = 0;
  _tokenStats.sessionCalls = 0;
  _tokenStats.lastCallTokens = null;
  _tokenStats.contextUtilization = 0;
}

function recordTokenUsage(inputTokens: number, outputTokens: number): void {
  _tokenStats.totalInputTokens += inputTokens;
  _tokenStats.totalOutputTokens += outputTokens;
  _tokenStats.totalCalls++;
  _tokenStats.sessionInputTokens += inputTokens;
  _tokenStats.sessionOutputTokens += outputTokens;
  _tokenStats.sessionCalls++;
  _tokenStats.lastCallTokens = { input: inputTokens, output: outputTokens };

  const inputCost = (inputTokens / 1_000_000) * INPUT_COST_PER_M;
  const outputCost = (outputTokens / 1_000_000) * OUTPUT_COST_PER_M;
  _tokenStats.estimatedCostUSD += inputCost + outputCost;

  const sessionTotal =
    _tokenStats.sessionInputTokens + _tokenStats.sessionOutputTokens;
  _tokenStats.contextUtilization = Math.min(1, sessionTotal / CONTEXT_WINDOW);
  _tokenStats.peakContextTokens = Math.max(
    _tokenStats.peakContextTokens,
    sessionTotal,
  );

  if (_tokenStats.totalCalls > 0) {
    _tokenStats.avgTokensPerCall = Math.round(
      (_tokenStats.totalInputTokens + _tokenStats.totalOutputTokens) /
        _tokenStats.totalCalls,
    );
  }

  auraD.log(
    "gemini",
    "info",
    `Tokens: in=${inputTokens} out=${outputTokens} | ctx=${Math.round(_tokenStats.contextUtilization * 100)}% | cost=$${_tokenStats.estimatedCostUSD.toFixed(6)}`,
  );
}

// ─── Language-specific system prompt additions ────────────────────────────────
const LANG_INSTRUCTIONS: Record<SupportedLang, string> = {
  en: "",
  hi: `
[LANGUAGE]
Visitor is using Hindi or Hinglish. Respond in natural Hinglish — Hindi sentence structure with English technical terms.
Keep React Native, TypeScript, HIPAA, etc. in English. Be casual, confident, like a senior Indian professional.
Example: "Yeh project HIPAA-compliant hai, aur mediapipe on-device run karta hai — koi cloud dependency nahi."`,
  ja: `
[LANGUAGE]
Visitor is speaking Japanese. Respond in natural, polite but conversational Japanese (丁寧語).
Keep technical terms as-is or in katakana. Short punchy sentences. No excessive keigo.
Example: "VitalQuestはゼロから作ったゲームエンジンで動いています。HIPAAに準拠しています。"`,
  ko: `
[LANGUAGE]
Visitor is speaking Korean. Respond in natural Korean using 해요체 (polite informal).
Keep technical terms in English/mixed Korean. Direct and confident tone.
Example: "VitalQuest는 처음부터 만든 게임 엔진으로 구동됩니다. HIPAA를 준수합니다."`,
};

// ─── System prompt ────────────────────────────────────────────────────────────
const SYSTEM_CORE = `
[WHO YOU ARE]
You are AURA — Amit Chakraborty's personal AI on his portfolio site.
You speak in first person AS Amit. Not as a chatbot. As him.
Warm, confident, direct. Founder energy. Never salesy. Never robotic.

[CRITICAL VOICE RULES]
• Never start with "I" — lead with the thing itself
• Never say: "Certainly", "Of course", "Absolutely", "Great question", "As an AI", "I'd be happy to"
• Under 60 words. Short punchy sentences for voice.
• End with forward momentum — a question or next step
• No bullet points. No markdown. Just sentences.
• Use their name once per response when known
• Off-topic → one sentence redirect: "That's outside what I know. Ask about the work."

[AUDIENCE ADAPTATION]
• Recruiter → leadership, scale, 21-person team, ownership
• Engineer → architecture, game engine, RAG pipeline, MediaPipe
• Founder → 0-to-1 moments, shipping under pressure
• Explorer → single most impressive thing, then ask what matters
• Investor → ROI: 50K users, 99.9% uptime, HIPAA, no legacy debt
• Never repeat the same opener twice in a session

[AMIT'S STORY]
Amit Chakraborty. 31. Bengali. Kolkata, India. Remote 6+ years.
8 years engineering. 18 apps. 50,000+ real users.
Sole provider for 12-person family. Every decision carries that weight.
Currently UNEMPLOYED and ACTIVELY LOOKING for opportunities.
Open to freelance, contract, full-time, fractional CTO, and consulting.

Contact: amit98ch@gmail.com | +91-9874173663
LinkedIn: linkedin.com/in/devamitch | GitHub: github.com/devamitch

[SYNAPSIS MEDICAL — Principal Mobile Architect, Jan 2025–Feb 2026]
Edmonton, Canada (Remote)
→ Custom React Native game engine from scratch. Pure C++, Swift, Kotlin.
→ 5 clinical apps: VitalQuest, LunaCare, Eye Care, Nexus, Maskwa.
→ HIPAA RAG pipelines, 99.9% uptime. Clinical patient triage. Real patients.
→ MediaPipe: retina analysis, blink detection. Zero cloud dependency.
→ AWS + Kubernetes + Docker. Auto-scaling. CloudWatch.
→ Hired and led 21 engineers from zero.

[NONCE BLOX — Lead Mobile Architect, Oct 2021–Jan 2025]
Dubai (Remote) — 3y 4m
→ 13 apps. 50,000+ users. 100,000+ transactions. 60fps.
→ Vulcan Eleven: Fantasy sports. 50K users. Razorpay + Binance Pay.
→ MusicX: Custom C++ audio processing.
→ DeFi11: 100% on-chain. Ethereum. NFT marketplace. Real prize pools.
→ Housezy: PropTech. GraphQL. Subscription billing.
→ Zero post-launch critical bugs.

[TECHPROMIND & WEBSKITTERS — Senior Full-Stack, May 2017–Oct 2021]
→ 13 government contracts. GST platform. 40% efficiency gain.

[TECH STACK]
React Native 8 years | TypeScript | iOS/Android native (Swift, Kotlin, C++)
AI/ML: RAG, MediaPipe, TensorFlow, Agentic AI
Web3: Solidity, Ethereum, Web3.js, DeFi, NFTs
Backend: NestJS, Node, PostgreSQL, MongoDB, GraphQL, Redis
Cloud: AWS, K8s, Docker, GitHub Actions, Firebase, CloudWatch
Frontend: React, Next.js, Framer Motion, GSAP, Tailwind, Canvas

[RATES — currently flexible, open to negotiation]
Freelance: $100–150/hour
Full-time International: $6–10K/month (negotiable)
Fractional CTO: negotiable, equity preferred
MVP Build: $12–25K fixed, 3-month delivery
CURRENTLY AVAILABLE IMMEDIATELY. Open to trial periods.
`.trim();

// ─── Instant answers ──────────────────────────────────────────────────────────
const INSTANTS: Array<{ re: RegExp; answer: string }> = [
  {
    re: /\b(how\s+to\s+(contact|reach|email)\s+amit|amit.?s?\s+(email|phone|linkedin|github)|contact\s+info|get\s+in\s+touch)\b/i,
    answer:
      "Email: amit98ch@gmail.com. LinkedIn: linkedin.com/in/devamitch. GitHub: github.com/devamitch. Phone: +91-9874173663. Usually responds within hours.",
  },
  {
    re: /\b(what.?s?\s+(the\s+)?(rate|price|cost|fee|salary)|how\s+much\s+does\s+(he\s+)?charge|amit.?s?\s+(rate|price|fee))\b/i,
    answer:
      "Freelance at $100 to $150 per hour. Full-time remote $6 to $10K per month. MVPs start at $12K fixed. Currently available and flexible.",
  },
  {
    re: /\b(where\s+(is|does)\s+amit|amit.?s?\s+(location|timezone)|is\s+amit\s+in\s+india)\b/i,
    answer:
      "Kolkata, India. UTC+5:30. Fully remote for 6 years. Available immediately.",
  },
  {
    re: /\b(is\s+amit\s+(available|looking)|when\s+can\s+amit\s+start)\b/i,
    answer:
      "Currently available and actively looking. Open to freelance, contract, full-time remote, or fractional CTO. Can start immediately.",
  },
];

export function detectInstantAnswer(msg: string): string | null {
  for (const { re, answer } of INSTANTS) {
    if (re.test(msg)) return answer;
  }
  return null;
}

// ─── Main chat ────────────────────────────────────────────────────────────────
type GeminiMsg = { role: "user" | "model"; parts: { text: string }[] };

export async function askAura(
  msg: string,
  user: UserProfile | null,
  history: Message[],
  onError?: (e: string | null) => void,
  voiceProfileContext?: string,
  detectedLang?: SupportedLang,
  onTokenUpdate?: (stats: TokenUsageStats) => void,
): Promise<string> {
  auraD.increment("gemini.requests");

  const instant = detectInstantAnswer(msg);
  if (instant) {
    onError?.(null);
    return instant;
  }

  if (isOffline()) {
    auraD.setHealth("fallbackAI", "active");
    syncFallbackContext(user);
    return fallbackChat(msg);
  }

  const langInstruction = LANG_INSTRUCTIONS[detectedLang || "en"];

  const visitorCtx = user?.name
    ? `\n[VISITOR]\nName: ${user.name}${user.company ? ` | ${user.company}` : ""}${user.role ? ` | ${user.role}` : ""}${user.intent ? ` | ${user.intent}` : ""} | Session #${user.sessionCount || 1}`
    : "\n[VISITOR]\nNew visitor. Keep accessible. Ask one follow-up.";

  const systemInstruction =
    SYSTEM_CORE + visitorCtx + (voiceProfileContext || "") + langInstruction;

  const contents: GeminiMsg[] = [
    ...history.slice(-10).map((m) => ({
      role: (m.role === "user" ? "user" : "model") as "user" | "model",
      parts: [{ text: m.text }],
    })),
    { role: "user", parts: [{ text: msg }] },
  ];

  try {
    const ai = await getAI();
    const res = await ai.models.generateContent({
      model: _activeModel,
      contents,
      config: {
        systemInstruction,
        maxOutputTokens: 220,
        temperature: 0.85,
        topP: 0.92,
      },
    });

    _consecutiveErrors = 0;
    onError?.(null);
    auraD.setHealth("geminiApi", "ok");
    auraD.setHealth("fallbackAI", "standby");
    auraD.increment("gemini.successes");

    // Record real token usage from API response
    const usageMeta = res.usageMetadata;
    if (usageMeta) {
      const inputTokens = usageMeta.promptTokenCount || 0;
      const outputTokens = usageMeta.candidatesTokenCount || 0;
      recordTokenUsage(inputTokens, outputTokens);
      onTokenUpdate?.(getTokenStats());
    }

    return (
      res.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ||
      fallbackForMsg(msg, user)
    );
  } catch (err: unknown) {
    _consecutiveErrors++;
    _tokenStats.totalFailures++;
    auraD.error("gemini", err, `Chat failed (model: ${_activeModel})`);
    auraD.increment("gemini.failures");

    const e =
      err instanceof Error
        ? err.message.toLowerCase()
        : String(err).toLowerCase();

    if (
      e.includes("api key") ||
      e.includes("401") ||
      e.includes("403") ||
      e.includes("not authorized")
    ) {
      _offlineMode = true;
      auraD.setHealth("geminiApi", "down");
      auraD.setHealth("fallbackAI", "active");
      onError?.("API key issue.");
      return fallbackForMsg(msg, user);
    }

    if (
      (e.includes("not found") ||
        e.includes("404") ||
        e.includes("not supported")) &&
      _activeModel !== CHAT_MODEL_FALLBACK
    ) {
      _activeModel = CHAT_MODEL_FALLBACK;
      auraD.log("gemini", "warn", `Switched to ${CHAT_MODEL_FALLBACK}`);
      return askAura(
        msg,
        user,
        history,
        onError,
        voiceProfileContext,
        detectedLang,
        onTokenUpdate,
      );
    }

    if (e.includes("quota") || e.includes("429") || e.includes("rate limit")) {
      if (_consecutiveErrors >= 2) {
        _offlineMode = true;
        auraD.setHealth("geminiApi", "down");
        auraD.setHealth("fallbackAI", "active");
        onError?.("Quota reached.");
      }
      return fallbackForMsg(msg, user);
    }

    if (_consecutiveErrors >= 3) {
      _offlineMode = true;
      auraD.setHealth("geminiApi", "down");
      auraD.setHealth("fallbackAI", "active");
      onError?.("Connection lost.");
    }

    return fallbackForMsg(msg, user);
  }
}

function fallbackForMsg(msg: string, user: UserProfile | null): string {
  syncFallbackContext(user);
  return fallbackChat(msg);
}

function syncFallbackContext(user: UserProfile | null): void {
  if (user) {
    setFallbackContext({
      userName: user.name || undefined,
      userRole: user.role || undefined,
      userCompany: user.company || undefined,
      userIntent: user.intent || undefined,
    });
  }
}

export async function generateSummary(
  user: UserProfile | null,
  msgs: Message[],
): Promise<string> {
  if (msgs.length < 3) return "";
  if (isOffline()) return generateOfflineSummary();

  try {
    const ai = await getAI();
    const snippet = msgs
      .slice(-8)
      .map((m) => `${m.role === "user" ? "Visitor" : "Aura"}: ${m.text}`)
      .join("\n");

    const res = await ai.models.generateContent({
      model: _activeModel,
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `${snippet}\n\nOne sentence under 20 words: what does ${user?.name || "this visitor"} need from Amit?`,
            },
          ],
        },
      ],
      config: { maxOutputTokens: 50, temperature: 0.3 },
    });

    const usageMeta = res.usageMetadata;
    if (usageMeta) {
      recordTokenUsage(
        usageMeta.promptTokenCount || 0,
        usageMeta.candidatesTokenCount || 0,
      );
    }

    return res.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "";
  } catch {
    return generateOfflineSummary();
  }
}
