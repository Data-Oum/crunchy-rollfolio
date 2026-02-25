import { PROFILE } from "@/data/profile";
import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";

// ═══════════════════════════════════════════════════════════════════════════════
//  CONFIG — outside component so these are never recreated
// ═══════════════════════════════════════════════════════════════════════════════
const GEMINI_KEY =
  (import.meta as any).env?.VITE_GEMINI_API_KEY ??
  (window as any).__ENV__?.GEMINI_API_KEY;
const GEMINI_MODEL = "gemini-2.0-flash";
const DAILY_LIMIT = 2;
const BMC_URL = "https://buymeacoffee.com/amithellmab";
const getStorage = () => (window as any).storage as any;

// Static chip/suggestion data — never changes
const SUGGESTIONS = [
  "What's the most impressive thing you've built?",
  "Tell me about your React Native expertise",
  "Why should I hire Amit?",
] as const;
const CHIPS = [
  "Who is Amit?",
  "Biggest project?",
  "Tech stack?",
  "Why hire him?",
  "Contact?",
] as const;
const ORB = 80,
  PW = 390,
  PH = 590;

// CSS injected once at module level
const GLOBAL_CSS = `
  @keyframes orbFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
  @keyframes haloGlow{0%,100%{opacity:.35;transform:scale(1.1)}50%{opacity:.7;transform:scale(1.35)}}
  @keyframes waveBar{0%,100%{transform:scaleY(.25);opacity:.4}50%{transform:scaleY(1);opacity:1}}
  @keyframes spin{to{transform:rotate(360deg)}}
  @keyframes blink{0%,100%{opacity:.6}50%{opacity:1}}
  @keyframes typeDot{0%,80%,100%{transform:translateY(0);opacity:.4}40%{transform:translateY(-5px);opacity:1}}
  @keyframes slideIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
  @keyframes fadeSlideUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
  @keyframes onboardPulse{0%,100%{box-shadow:0 0 0 0 rgba(123,47,190,0)}50%{box-shadow:0 0 0 5px rgba(123,47,190,.1)}}
  .ai-sc::-webkit-scrollbar{width:2px}
  .ai-sc::-webkit-scrollbar-thumb{background:rgba(244,117,33,.16);border-radius:99px}
  .ai-inp{background:transparent!important;color:#fff!important;border:none!important;outline:none!important;}
  .ai-inp::placeholder{color:rgba(255,255,255,.18)!important}
  .ai-chip:hover{border-color:rgba(244,117,33,.5)!important;color:#F47521!important}
  .ai-sug:hover{background:rgba(244,117,33,.07)!important;border-color:rgba(244,117,33,.28)!important}
  .ai-send:hover:not(:disabled){box-shadow:inset 0 1px 0 rgba(255,255,255,.35),0 0 20px rgba(244,117,33,.38)!important;transform:scale(1.05)!important}
  .ai-send:active:not(:disabled){transform:scale(.92)!important}
  .ai-send:disabled{opacity:.22;cursor:not-allowed}
  .ai-ib:hover{background:rgba(255,255,255,.07)!important}
  .msg-in{animation:slideIn .25s cubic-bezier(.34,1.4,.64,1) forwards}
  .ob-inp{animation:onboardPulse 2.4s ease-in-out infinite}
`;

// Inject CSS once
if (
  typeof document !== "undefined" &&
  !document.getElementById("siri-orb-css")
) {
  const s = document.createElement("style");
  s.id = "siri-orb-css";
  s.textContent = GLOBAL_CSS;
  document.head.appendChild(s);
}

// ═══════════════════════════════════════════════════════════════════════════════
//  TYPES
// ═══════════════════════════════════════════════════════════════════════════════
interface UserProfile {
  name: string;
  company: string;
  role: string;
  intent: string;
  sessionCount: number;
  firstSeen: string;
  lastSeen: string;
  totalMessages: number;
  interests: string[];
}
interface StoredConversation {
  id: string;
  date: string;
  messages: Message[];
  summary: string;
}
interface DailyUsage {
  date: string;
  count: number;
  ids: string[];
}
type Message = { role: "user" | "ai"; text: string };
type OrbMode = "idle" | "listening" | "thinking" | "speaking";
type OnboardStep =
  | "welcome"
  | "ask_name"
  | "ask_company"
  | "ask_role"
  | "ask_intent"
  | "ready";
type Phase = "orb" | "morphing" | "chat" | "closing";
type VoiceState = "idle" | "listening" | "thinking" | "speaking";

// ═══════════════════════════════════════════════════════════════════════════════
//  MESSAGES REDUCER — batch updates, stable identity
// ═══════════════════════════════════════════════════════════════════════════════
type MsgAction =
  | { type: "ADD"; msg: Message }
  | { type: "SET"; msgs: Message[] }
  | { type: "RESET" };

function msgsReducer(state: Message[], action: MsgAction): Message[] {
  switch (action.type) {
    case "ADD":
      return [...state, action.msg];
    case "SET":
      return action.msgs;
    case "RESET":
      return [];
    default:
      return state;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  STORAGE helpers
// ═══════════════════════════════════════════════════════════════════════════════
const sg = async (key: string) => {
  try {
    const r = await getStorage()?.get(key);
    return r ? JSON.parse(r.value) : null;
  } catch {
    return null;
  }
};
const ss = async (key: string, val: unknown) => {
  try {
    await getStorage()?.set(key, JSON.stringify(val));
  } catch {}
};
const loadUserProfile = (): Promise<UserProfile | null> =>
  sg("aura_visitor_profile");
const saveUserProfile = (p: UserProfile) => ss("aura_visitor_profile", p);
const getDailyUsage = async (): Promise<DailyUsage> => {
  const today = new Date().toISOString().slice(0, 10);
  const stored = await sg("aura_daily_usage");
  if (stored?.date === today) return stored;
  return { date: today, count: 0, ids: [] };
};
const recordConversationStart = async (id: string) => {
  const usage = await getDailyUsage();
  usage.count++;
  usage.ids.push(id);
  await ss("aura_daily_usage", usage);
};
const saveConversation = async (convo: StoredConversation) => {
  const existing: StoredConversation[] = (await sg("aura_conversations")) || [];
  await ss("aura_conversations", [...existing, convo].slice(-20));
};
const getRecentHistory = async (limit = 6): Promise<Message[]> => {
  const all: StoredConversation[] = (await sg("aura_conversations")) || [];
  if (!all.length) return [];
  return all[all.length - 1].messages.slice(-limit);
};

// ═══════════════════════════════════════════════════════════════════════════════
//  EXTRACTORS
// ═══════════════════════════════════════════════════════════════════════════════
const toTitleCase = (s: string) =>
  s.replace(
    /\w\S*/g,
    (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase(),
  );

const JUNK = new Set([
  "idiot",
  "stupid",
  "dumb",
  "hate",
  "you are",
  "what",
  "why",
  "how",
  "yes",
  "no",
  "maybe",
  "idk",
  "dunno",
  "nothing",
  "nope",
  "nah",
  "ok",
  "okay",
  "lol",
  "wtf",
  "hmm",
  "huh",
  "ugh",
  "meh",
  "whatever",
  "skip",
  "pass",
  "none",
  "na",
  "n/a",
]);
const isJunk = (s: string) => {
  const l = s.toLowerCase().trim();
  return [...JUNK].some((b) => l.includes(b)) || l.length < 2;
};
const extractName = (raw: string): string | null => {
  const s = raw.trim();
  const m =
    s.match(
      /(?:my name is|i(?:'m| am| go by)|call me|name(?:'s|is)?)\s+([a-zA-Z]+)/i,
    ) || s.match(/^([a-zA-Z]{2,20})(?:\s+[a-zA-Z]+)?$/);
  if (!m) return null;
  const c = m[1].trim();
  return isJunk(c) ? null : toTitleCase(c.split(" ")[0]);
};
const extractCompany = (raw: string): string | null => {
  const s = raw.trim();
  const m =
    s.match(
      /(?:work(?:ing)?\s+(?:at|in|for|with)|from|at|with)\s+(.+?)(?:\.|,|$)/i,
    ) ||
    s.match(
      /^(.+?)\s+(?:Inc|LLC|Ltd|Co|Corp|Medical|Tech|Health|Labs?|Group|Solutions)\.?$/i,
    );
  if (m) {
    const c = m[1].trim();
    return isJunk(c) ? null : toTitleCase(c);
  }
  if (s.length > 1 && s.length < 60 && !isJunk(s)) return toTitleCase(s);
  return null;
};
const KNOWN_ROLES = [
  "recruiter",
  "founder",
  "co-founder",
  "engineer",
  "developer",
  "dev",
  "designer",
  "investor",
  "cto",
  "ceo",
  "vp",
  "director",
  "manager",
  "product manager",
  "pm",
  "hr",
  "architect",
  "lead",
  "freelancer",
  "consultant",
  "researcher",
  "student",
  "intern",
  "analyst",
  "executive",
];
const extractRole = (raw: string): string | null => {
  const s = raw.toLowerCase().trim();
  for (const r of KNOWN_ROLES) if (s.includes(r)) return toTitleCase(r);
  if (s.split(" ").length <= 4 && !isJunk(s))
    return toTitleCase(s.split(" ").slice(0, 3).join(" "));
  return null;
};
const extractIntent = (raw: string): string => {
  const s = raw.toLowerCase();
  if (s.match(/hire|hiring|recruit|talent|job|opportunity/)) return "hiring";
  if (s.match(/partner|collab|build together/)) return "partnership";
  if (s.match(/invest|fund/)) return "investing";
  if (s.match(/consult|freelance/)) return "consulting";
  return "exploring";
};
const INTEREST_KW = [
  "react native",
  "mobile",
  "web3",
  "blockchain",
  "ai",
  "ml",
  "llm",
  "vitalquest",
  "hipaa",
  "typescript",
  "aws",
  "kubernetes",
  "nestjs",
  "graphql",
  "solidity",
  "tensorflow",
  "next.js",
  "go",
  "rust",
  "defi",
  "nft",
  "health",
  "fintech",
  "game engine",
];
const extractInterests = (msgs: Message[]): string[] => {
  const set = new Set<string>();
  msgs.forEach((m) => {
    const l = m.text.toLowerCase();
    INTEREST_KW.forEach((k) => {
      if (l.includes(k)) set.add(k);
    });
  });
  return Array.from(set);
};

// ═══════════════════════════════════════════════════════════════════════════════
//  TTS PREPROCESSING
// ═══════════════════════════════════════════════════════════════════════════════
const toNaturalSpeech = (text: string): string =>
  text
    .replace(/Next\.js/gi, "Next dot jay ess")
    .replace(/NestJS/gi, "Nest jay ess")
    .replace(/Node\.js/gi, "Node jay ess")
    .replace(/Web3\.js/gi, "Web three jay ess")
    .replace(/TypeScript/gi, "Type Script")
    .replace(/\bK8s\b/gi, "Kubernetes")
    .replace(/\bAWS\b/g, "Amazon Web Services")
    .replace(/\bAPI\b/g, "A P I")
    .replace(/\bRAG\b/g, "Retrieval Augmented Generation")
    .replace(/\bLLMs?\b/g, "large language models")
    .replace(/\bVP\b/g, "V P")
    .replace(/\bCTO\b/g, "C T O")
    .replace(/\bCEO\b/g, "C E O")
    .replace(/\bDeFi\b/gi, "Decentralized Finance")
    .replace(/\bNFTs?\b/g, "N F T s")
    .replace(/50K\+?/g, "50 thousand plus")
    .replace(/99\.9%/g, "99 point 9 percent")
    .replace(/\b21\b/g, "twenty one")
    .replace(/—/g, ", ")
    .replace(/·/g, ", ")
    .replace(/https?:\/\/\S+/g, "")
    .replace(/[*_`#]/g, "")
    .trim();

// ═══════════════════════════════════════════════════════════════════════════════
//  GEMINI
// ═══════════════════════════════════════════════════════════════════════════════
const buildSystem = (user: UserProfile | null, interests: string[]): string => {
  const visitorCtx = user?.name
    ? `\n\nVISITOR: ${user.name} | ${user.company || "company unknown"} | ${user.role || "role unknown"} | Intent: ${user.intent || "exploring"} | Session #${user.sessionCount} | Interests: ${interests.join(", ") || "none yet"}. Reference their context naturally.`
    : "";
  return `You are Aura — the AI voice of Amit Chakraborty's work. Not a hype machine. A commander who has already won battles and shipped production systems.

SPEAKING STYLE: Sharp. Declarative. Confident. Anime mentor energy — the kind who has already seen the outcome and speaks from that certainty. Under 60 words. Every sentence earns its place. No filler words. No hollow affirmations. Facts hit like precision strikes.${visitorCtx}

AMIT'S DATA:
Name: ${PROFILE.name} | Title: ${PROFILE.title} | Location: ${PROFILE.location}
Contact: ${PROFILE.email} | ${PROFILE.linkedin} | ${PROFILE.github}
Open to: VP Engineering, CTO, Principal Architect
Stats: 8 years, 18 apps, 50K users

Projects:
- VitalQuest [FLAGSHIP]: Health tech engine built from zero. No external deps. LLM task gen, HIPAA RAG pipeline, XP system. Recruited and led 21-person team. 5 apps on it. 99.9% uptime.
- Nexus [AI PLATFORM]: Enterprise AI orchestration unifying Meta, TikTok, Shopify. Autonomous campaign optimization.
- Vulcan Eleven [SPORTS/FINTECH]: Fantasy sports at 60fps. Razorpay + Binance Pay. 50K users. 35% transaction growth.
- DeFi11 [WEB3]: 100% on-chain decentralized fantasy sports. Smart contract prize pools. NFT marketplace on Ethereum.

Journey: 2017=PHP, 13 govt projects | 2019=MCA 8.61 CGPA | 2021=NonceBlox, Web3 | 2023=Lead, 50K users | 2025=AI+Health, VP-level | Now=Open.
Stack: React Native, Next.js, NestJS, TypeScript, AWS, Kubernetes, GraphQL, TensorFlow, Solidity, Web3.js, Go, Rust.
Skills: Mobile(React Native 98%), AI/ML(RAG, LLMs, TensorFlow), Web3(Solidity, DeFi, NFTs), Backend(NestJS, K8s, PostgreSQL), Frontend(Next.js, Framer Motion).

RULES:
- Never echo back user's raw words
- Off-topic questions: redirect sharply to Amit's work in one sentence
- End responses with a forward path when relevant
- No emojis. Ever.`;
};

const askGemini = async (
  msg: string,
  user: UserProfile | null,
  history: Message[],
): Promise<string> => {
  const contents = [
    ...history.slice(-4).map((m) => ({
      role: m.role === "user" ? "user" : "model",
      parts: [{ text: m.text }],
    })),
    { role: "user", parts: [{ text: msg }] },
  ];
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: {
          parts: [{ text: buildSystem(user, extractInterests(history)) }],
        },
        contents,
        generationConfig: { maxOutputTokens: 160, temperature: 0.82 },
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
      }),
    },
  );
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const d = await res.json();
  if (d?.candidates?.[0]?.finishReason === "SAFETY") return localFallback(msg);
  return (
    d?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? localFallback(msg)
  );
};

const generateSummary = async (
  user: UserProfile | null,
  msgs: Message[],
): Promise<string> => {
  if (msgs.length < 2) return "";
  const name = user?.name || "this visitor";
  const transcript = msgs
    .map((m) => `${m.role === "user" ? "Visitor" : "Aura"}: ${m.text}`)
    .join("\n");
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [
                {
                  text: `Conversation:\n${transcript}\n\nIn under 35 words, write 1-2 sharp sentences: what ${name} likely needs from Amit and why Amit is the right person. No emojis. Declarative tone.`,
                },
              ],
            },
          ],
          generationConfig: { maxOutputTokens: 80, temperature: 0.7 },
        }),
      },
    );
    const d = await res.json();
    return d?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "";
  } catch {
    return "";
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
//  LOCAL FALLBACK
// ═══════════════════════════════════════════════════════════════════════════════
const localFallback = (msg: string): string => {
  const q = msg.toLowerCase();
  if (q.match(/who|about|introduce/))
    return `Amit Chakraborty. Principal Mobile Architect. 8 years. 18 apps. 50 thousand users. Built a health tech engine from scratch, no external libs, 21-person team. Based in Kolkata.`;
  if (q.match(/vital|health/))
    return `VitalQuest — proprietary health tech engine. Zero dependencies. LLM task generation, HIPAA RAG pipeline, XP system. 21 engineers. 5 apps on it. 99.9 percent uptime.`;
  if (q.match(/tech|stack/))
    return `React Native, Next dot JS, Nest JS, TypeScript, AWS, Kubernetes, GraphQL, TensorFlow, Solidity, Web3, Go, Rust. Mobile, AI and Web3 at production scale simultaneously.`;
  if (q.match(/hire|why/))
    return `8 years. 18 apps. 50 thousand real users. HIPAA AI pipelines from nothing. Spans Mobile, AI and Web3. Led 21 engineers. Reach him at ${PROFILE.email}.`;
  if (q.match(/contact|email/))
    return `${PROFILE.email}. LinkedIn at linkedin.com/in/devamitch. Open for VP Engineering, CTO, Principal Architect.`;
  if (q.match(/web3|defi|nft|blockchain/))
    return `DeFi11 — 100 percent on-chain. Smart contract prize pools. NFT marketplace on Ethereum. Vulcan Eleven — 50 thousand users, Binance Pay integration. Amit built both.`;
  return `Ask about Amit's projects, tech stack, or how to hire him.`;
};

const detectQueryIntent = (
  msg: string,
): { local: boolean; answer?: string } => {
  const q = msg.toLowerCase();
  if (q.match(/\b(contact|email|reach|linkedin|github|connect)\b/))
    return {
      local: true,
      answer: `${PROFILE.email}\nLinkedIn: linkedin.com/in/devamitch\nGitHub: github.com/devamitch\nOpen for VP Engineering, CTO and Principal Architect roles.`,
    };
  if (q.match(/\b(salary|rate|compensation|cost|charge)\b/))
    return {
      local: true,
      answer: `Expectations align with VP/CTO-level experience. Reach out at ${PROFILE.email} directly.`,
    };
  if (q.match(/\b(location|where|based|remote|timezone)\b/))
    return {
      local: true,
      answer: `${PROFILE.location}. Works globally. Timezone flexible, async-first. Remote preferred, open to hybrid for the right mission.`,
    };
  return { local: false };
};

// ═══════════════════════════════════════════════════════════════════════════════
//  VOICE
// ═══════════════════════════════════════════════════════════════════════════════
let _voiceCache: SpeechSynthesisVoice | null = null;

const getPreferredVoice = async (): Promise<SpeechSynthesisVoice | null> => {
  if (_voiceCache) return _voiceCache;
  const voices = await new Promise<SpeechSynthesisVoice[]>((resolve) => {
    const v = window.speechSynthesis.getVoices();
    if (v.length) return resolve(v);
    window.speechSynthesis.onvoiceschanged = () =>
      resolve(window.speechSynthesis.getVoices());
    setTimeout(() => resolve(window.speechSynthesis.getVoices()), 1200);
  });
  const priority = [
    (v: SpeechSynthesisVoice) => v.name === "Google UK English Male",
    (v: SpeechSynthesisVoice) =>
      v.name.includes("Daniel") && v.lang.startsWith("en"),
    (v: SpeechSynthesisVoice) =>
      v.name.includes("Arthur") && v.lang.startsWith("en"),
    (v: SpeechSynthesisVoice) =>
      v.name.includes("Thomas") && v.lang.startsWith("en"),
    (v: SpeechSynthesisVoice) =>
      v.name.toLowerCase().includes("david") && v.lang.startsWith("en"),
    (v: SpeechSynthesisVoice) =>
      v.name.toLowerCase().includes("james") && v.lang.startsWith("en"),
    (v: SpeechSynthesisVoice) =>
      v.name.includes("Male") && v.lang.startsWith("en"),
    (v: SpeechSynthesisVoice) => v.lang === "en-US",
    (v: SpeechSynthesisVoice) => v.lang.startsWith("en"),
  ];
  for (const p of priority) {
    const f = voices.find(p);
    if (f) {
      _voiceCache = f;
      return f;
    }
  }
  _voiceCache = voices[0] || null;
  return _voiceCache;
};

// ═══════════════════════════════════════════════════════════════════════════════
//  PLASMA ORB — memo + modeRef pattern = NO animation restarts on mode change
// ═══════════════════════════════════════════════════════════════════════════════
const PlasmaOrb = memo(({ size, mode }: { size: number; mode: OrbMode }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef(0);
  // ★ KEY FIX: modeRef lets the animation loop read current mode
  //   WITHOUT mode being a useEffect dependency — animation never restarts
  const modeRef = useRef<OrbMode>(mode);

  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  // Animation loop only depends on `size` — starts once, runs forever
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d")!;
    const CX = size / 2,
      CY = size / 2,
      R = size * 0.42;

    const blobs = Array.from({ length: 6 }, (_, i) => ({
      angle: (i / 6) * Math.PI * 2,
      r: R * (0.15 + Math.random() * 0.2),
      speed: 0.007 + Math.random() * 0.008,
      phase: Math.random() * Math.PI * 2,
      hue: [28, 270, 28, 270, 45, 300][i] as number,
      sz: R * (0.25 + Math.random() * 0.3),
    }));
    const particles = Array.from({ length: 50 }, (_, i) => ({
      angle: (i / 50) * Math.PI * 2,
      orbitR: R * (0.65 + Math.random() * 0.4),
      orbitTilt: (Math.random() - 0.5) * 0.6,
      orbitSpeed: 0.004 + Math.random() * 0.008,
      sz: 0.7 + Math.random() * 1.4,
      opacity: 0.3 + Math.random() * 0.6,
      hue: Math.random() > 0.5 ? 28 : 270,
      front: Math.random() > 0.45,
    }));
    const tendrils = Array.from({ length: 8 }, (_, i) => ({
      baseAngle: (i / 8) * Math.PI * 2,
      phase: Math.random() * Math.PI * 2,
      speed: 0.012 + Math.random() * 0.008,
      length: R * (0.3 + Math.random() * 0.5),
      width: 0.6 + Math.random() * 1.0,
      hue: i % 2 === 0 ? 28 : 270,
    }));

    let t = 0;
    let energyVal = 0.5;

    const draw = () => {
      t++;
      // Read mode from ref — no deps needed
      const currentMode = modeRef.current;
      const targetE =
        currentMode === "idle"
          ? 0.45
          : currentMode === "listening"
            ? 0.9
            : currentMode === "thinking"
              ? 0.65
              : 0.8;
      energyVal += (targetE - energyVal) * 0.04;
      const E = energyVal;
      ctx.clearRect(0, 0, size, size);

      const amb = ctx.createRadialGradient(CX, CY, 0, CX, CY, R * 1.5);
      amb.addColorStop(0, `rgba(244,117,33,${0.08 * E})`);
      amb.addColorStop(0.5, `rgba(123,47,190,${0.04 * E})`);
      amb.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = amb;
      ctx.fillRect(0, 0, size, size);

      particles
        .filter((p) => !p.front)
        .forEach((p) => {
          p.angle += p.orbitSpeed;
          const x = CX + Math.cos(p.angle) * p.orbitR * Math.cos(p.orbitTilt);
          const y = CY + Math.sin(p.angle) * p.orbitR;
          const d = (Math.cos(p.angle) * Math.cos(p.orbitTilt) + 1) / 2;
          if (d < 0.5) {
            ctx.beginPath();
            ctx.arc(x, y, p.sz * d, 0, Math.PI * 2);
            ctx.fillStyle = `hsla(${p.hue},85%,65%,${p.opacity * d * 0.25 * E})`;
            ctx.fill();
          }
        });

      const glass = ctx.createRadialGradient(
        CX - R * 0.2,
        CY - R * 0.25,
        R * 0.04,
        CX,
        CY,
        R,
      );
      glass.addColorStop(0, "rgba(12,8,18,0.97)");
      glass.addColorStop(0.6, "rgba(5,3,10,0.98)");
      glass.addColorStop(1, "rgba(2,1,5,0.99)");
      ctx.beginPath();
      ctx.arc(CX, CY, R, 0, Math.PI * 2);
      ctx.fillStyle = glass;
      ctx.fill();

      ctx.save();
      ctx.beginPath();
      ctx.arc(CX, CY, R - 1, 0, Math.PI * 2);
      ctx.clip();

      blobs.forEach((b, i) => {
        b.angle += b.speed + E * 0.004;
        const bx =
          CX +
          Math.cos(b.angle + b.phase) *
            b.r *
            (1 + Math.sin(t * 0.02 + i) * 0.25);
        const by =
          CY +
          Math.sin(b.angle * 1.2 + b.phase) *
            b.r *
            (1 + Math.cos(t * 0.016 + i) * 0.2);
        const pr = b.sz * (0.85 + Math.sin(t * 0.03 + i * 1.1) * 0.15) * E;
        const pg = ctx.createRadialGradient(bx, by, 0, bx, by, pr);
        const a = 0.15 + E * 0.22;
        if (b.hue === 28 || b.hue === 45) {
          pg.addColorStop(0, `rgba(255,160,60,${a * 1.4})`);
          pg.addColorStop(0.4, `rgba(244,117,33,${a})`);
        } else {
          pg.addColorStop(0, `rgba(160,80,255,${a * 1.1})`);
          pg.addColorStop(0.4, `rgba(123,47,190,${a})`);
        }
        pg.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = pg;
        ctx.beginPath();
        ctx.arc(bx, by, pr, 0, Math.PI * 2);
        ctx.fill();
      });

      const core = ctx.createRadialGradient(CX, CY, 0, CX, CY, R * 0.5);
      core.addColorStop(0, `rgba(255,140,50,${0.07 + E * 0.1})`);
      core.addColorStop(0.5, `rgba(120,40,200,${0.04 + E * 0.05})`);
      core.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = core;
      ctx.fillRect(CX - R, CY - R, R * 2, R * 2);

      const pulse = 0.6 + Math.sin(t * 0.055) * 0.2 + E * 0.2;
      if (currentMode === "listening") {
        for (let ring = 0; ring < 3; ring++) {
          const ringR =
            R *
            (0.2 + ring * 0.18) *
            (1 + Math.sin(t * 0.05 + ring * 1.2) * 0.12);
          ctx.beginPath();
          ctx.arc(CX, CY, ringR, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(244,117,33,${(0.4 - ring * 0.1) * pulse})`;
          ctx.lineWidth = 1.5 - ring * 0.4;
          ctx.stroke();
        }
        ctx.strokeStyle = `rgba(255,200,100,${0.7 * pulse})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(CX - 7, CY - 14, 14, 20, 7);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(CX, CY + 10, 10, Math.PI, 0);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(CX, CY + 20);
        ctx.lineTo(CX, CY + 25);
        ctx.stroke();
      } else if (currentMode === "thinking") {
        for (let d = 0; d < 4; d++) {
          const da = (d / 4) * Math.PI * 2 + t * 0.06;
          ctx.beginPath();
          ctx.arc(
            CX + Math.cos(da) * R * 0.28,
            CY + Math.sin(da) * R * 0.28,
            3.5,
            0,
            Math.PI * 2,
          );
          ctx.fillStyle = `rgba(244,117,33,${0.5 + d * 0.12})`;
          ctx.fill();
        }
      } else if (currentMode === "speaking") {
        const bars = 9,
          barW = 3,
          totalW = bars * barW + (bars - 1) * 3;
        for (let b = 0; b < bars; b++) {
          const bh =
            R * 0.28 * (0.3 + Math.abs(Math.sin(t * 0.1 + b * 0.9)) * 0.8) * E;
          ctx.fillStyle = `rgba(244,117,33,${0.6 + (b % 2) * 0.2})`;
          ctx.beginPath();
          ctx.roundRect(
            CX - totalW / 2 + b * (barW + 3),
            CY - bh / 2,
            barW,
            bh,
            1.5,
          );
          ctx.fill();
        }
      } else {
        ctx.font = `800 ${Math.round(size * 0.115)}px 'Courier New',monospace`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.shadowColor = `rgba(244,117,33,${0.4 * pulse})`;
        ctx.shadowBlur = 12;
        ctx.fillStyle = `rgba(255,200,120,${0.75 * pulse})`;
        ctx.fillText("AURA", CX, CY - 2);
        ctx.shadowBlur = 0;
      }
      ctx.restore();

      tendrils.forEach((tn) => {
        tn.phase += tn.speed;
        const ang = tn.baseAngle + Math.sin(tn.phase) * 0.35;
        const extR =
          R + tn.length * E * (0.25 + Math.sin(tn.phase * 1.1) * 0.2);
        const tx1 = CX + Math.cos(ang) * R * 0.92,
          ty1 = CY + Math.sin(ang) * R * 0.92;
        const tx2 = CX + Math.cos(ang + Math.sin(tn.phase) * 0.2) * extR;
        const ty2 = CY + Math.sin(ang + Math.sin(tn.phase) * 0.2) * extR;
        const tg = ctx.createLinearGradient(tx1, ty1, tx2, ty2);
        tg.addColorStop(
          0,
          tn.hue === 28
            ? `rgba(244,117,33,${0.5 * E})`
            : `rgba(123,47,190,${0.4 * E})`,
        );
        tg.addColorStop(1, "rgba(0,0,0,0)");
        ctx.beginPath();
        ctx.moveTo(tx1, ty1);
        ctx.quadraticCurveTo(
          CX + Math.cos(ang + 0.15) * (R + extR) * 0.42,
          CY + Math.sin(ang + 0.15) * (R + extR) * 0.42,
          tx2,
          ty2,
        );
        ctx.strokeStyle = tg;
        ctx.lineWidth = tn.width * E;
        ctx.stroke();
      });

      const rim = ctx.createRadialGradient(CX, CY, R * 0.82, CX, CY, R);
      rim.addColorStop(0, "rgba(0,0,0,0)");
      rim.addColorStop(0.6, `rgba(244,117,33,${0.08 + E * 0.06})`);
      rim.addColorStop(0.88, `rgba(244,117,33,${0.18 + E * 0.1})`);
      rim.addColorStop(1, `rgba(123,47,190,${0.08})`);
      ctx.beginPath();
      ctx.arc(CX, CY, R, 0, Math.PI * 2);
      ctx.fillStyle = rim;
      ctx.fill();
      ctx.strokeStyle = `rgba(244,117,33,${0.18 + E * 0.15})`;
      ctx.lineWidth = 0.8;
      ctx.stroke();

      particles
        .filter((p) => p.front)
        .forEach((p) => {
          const x = CX + Math.cos(p.angle) * p.orbitR * Math.cos(p.orbitTilt);
          const y = CY + Math.sin(p.angle) * p.orbitR;
          const d = (Math.cos(p.angle) * Math.cos(p.orbitTilt) + 1) / 2;
          if (d >= 0.5) {
            const pg = ctx.createRadialGradient(x, y, 0, x, y, p.sz * 2.2);
            pg.addColorStop(0, `hsla(${p.hue},88%,72%,${p.opacity * d * E})`);
            pg.addColorStop(1, "hsla(0,0%,0%,0)");
            ctx.beginPath();
            ctx.arc(x, y, p.sz * 1.8, 0, Math.PI * 2);
            ctx.fillStyle = pg;
            ctx.fill();
          }
        });

      rafRef.current = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(rafRef.current);
  }, [size]); // ★ size only — mode never restarts the loop

  return (
    <canvas
      ref={canvasRef}
      style={{ display: "block", width: size, height: size }}
    />
  );
});
PlasmaOrb.displayName = "PlasmaOrb";

// ═══════════════════════════════════════════════════════════════════════════════
//  SPRING — stable hook, no external deps
// ═══════════════════════════════════════════════════════════════════════════════
function useSpring() {
  const mR = useRef(0),
    vR = useRef(0),
    tR = useRef(0),
    rafR = useRef(0);
  const [v, setV] = useState(0);
  const cbR = useRef<(() => void) | null>(null);
  const doneR = useRef(false);
  const springTo = useCallback((target: number, onDone?: () => void) => {
    tR.current = target;
    cbR.current = onDone ?? null;
    doneR.current = false;
    cancelAnimationFrame(rafR.current);
    const tick = () => {
      const d = tR.current - mR.current;
      vR.current = vR.current * 0.72 + d * 0.045;
      mR.current += vR.current;
      setV(mR.current);
      if (Math.abs(vR.current) < 0.0004 && Math.abs(d) < 0.0004) {
        mR.current = tR.current;
        setV(tR.current);
        if (!doneR.current && cbR.current) {
          doneR.current = true;
          cbR.current();
        }
      } else {
        rafR.current = requestAnimationFrame(tick);
      }
    };
    rafR.current = requestAnimationFrame(tick);
  }, []);
  useEffect(() => () => cancelAnimationFrame(rafR.current), []);
  return { mp: v, springTo };
}

// ═══════════════════════════════════════════════════════════════════════════════
//  MEMOIZED SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════════
const EndScreen = memo(
  ({
    name,
    summary,
    onDismiss,
  }: {
    name: string;
    summary: string;
    onDismiss: () => void;
  }) => (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 10001,
        background: "rgba(3,2,8,0.94)",
        backdropFilter: "blur(28px)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: 28,
        animation: "fadeSlideUp .4s cubic-bezier(.34,1.4,.64,1) forwards",
      }}
    >
      <div
        style={{
          maxWidth: 360,
          width: "100%",
          display: "flex",
          flexDirection: "column",
          gap: 22,
          alignItems: "center",
        }}
      >
        <div
          style={{
            width: 54,
            height: 54,
            borderRadius: "38% 62% 52% 48%/48% 52% 48% 52%",
            background: "linear-gradient(135deg,#F47521,#7B2FBE)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 0 30px rgba(244,117,33,.38)",
          }}
        >
          <svg
            width="21"
            height="21"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#fff"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" />
            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
            <line x1="12" y1="19" x2="12" y2="23" />
          </svg>
        </div>
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              fontSize: 19,
              fontWeight: 800,
              color: "#fff",
              letterSpacing: "-.02em",
              marginBottom: summary ? 8 : 0,
            }}
          >
            {name ? `Thanks, ${name}.` : "Conversation complete."}
          </div>
          {summary && (
            <div
              style={{
                fontSize: 13,
                color: "rgba(255,255,255,.5)",
                lineHeight: 1.68,
                maxWidth: 310,
              }}
            >
              {summary}
            </div>
          )}
        </div>
        <div
          style={{
            width: "100%",
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          <a
            href={`mailto:${PROFILE.email}`}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 9,
              padding: "14px 20px",
              borderRadius: 14,
              background: "linear-gradient(135deg,#F47521,#c45e16)",
              border: "1px solid rgba(244,117,33,.3)",
              color: "#fff",
              fontSize: 13,
              fontWeight: 700,
              textDecoration: "none",
              boxShadow: "0 0 22px rgba(244,117,33,.25)",
            }}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
            >
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
              <polyline points="22,6 12,13 2,6" />
            </svg>
            Connect with Amit
          </a>
          <a
            href={PROFILE.linkedin}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 9,
              padding: "14px 20px",
              borderRadius: 14,
              background: "rgba(10,102,194,.16)",
              border: "1px solid rgba(10,102,194,.32)",
              color: "rgba(255,255,255,.8)",
              fontSize: 13,
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="rgba(100,160,255,.9)"
            >
              <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
              <rect x="2" y="9" width="4" height="12" />
              <circle cx="4" cy="4" r="2" />
            </svg>
            View LinkedIn Profile
          </a>
          <a
            href={BMC_URL}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 9,
              padding: "14px 20px",
              borderRadius: 14,
              background: "rgba(255,213,0,.08)",
              border: "1px solid rgba(255,213,0,.22)",
              color: "rgba(255,213,50,.88)",
              fontSize: 13,
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <path d="M18 8h1a4 4 0 0 1 0 8h-1" />
              <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" />
              <line x1="6" y1="1" x2="6" y2="4" />
              <line x1="10" y1="1" x2="10" y2="4" />
              <line x1="14" y1="1" x2="14" y2="4" />
            </svg>
            Buy Amit a Coffee
          </a>
        </div>
        <button
          onClick={onDismiss}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "rgba(255,255,255,.25)",
            fontSize: 12,
            padding: "6px 16px",
          }}
        >
          Close
        </button>
      </div>
    </div>
  ),
);
EndScreen.displayName = "EndScreen";

const LimitScreen = memo(({ onClose }: { onClose: () => void }) => (
  <div
    style={{
      position: "absolute",
      inset: 0,
      zIndex: 20,
      background: "rgba(3,2,8,0.97)",
      backdropFilter: "blur(20px)",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: 20,
      padding: 28,
      textAlign: "center",
    }}
  >
    <div
      style={{
        width: 46,
        height: 46,
        borderRadius: "50%",
        background: "rgba(244,117,33,.1)",
        border: "1px solid rgba(244,117,33,.28)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <svg
        width="19"
        height="19"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#F47521"
        strokeWidth="2"
        strokeLinecap="round"
      >
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
    </div>
    <div>
      <div
        style={{
          fontSize: 15,
          fontWeight: 800,
          color: "#fff",
          marginBottom: 7,
        }}
      >
        Daily limit reached
      </div>
      <div
        style={{
          fontSize: 12,
          color: "rgba(255,255,255,.38)",
          lineHeight: 1.72,
        }}
      >
        {DAILY_LIMIT} conversations per day. Resets at midnight.
        <br />
        If this was useful, Amit would appreciate your support.
      </div>
    </div>
    <div
      style={{
        width: "100%",
        display: "flex",
        flexDirection: "column",
        gap: 9,
      }}
    >
      <a
        href={BMC_URL}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          padding: "12px 20px",
          borderRadius: 12,
          background: "rgba(255,213,0,.09)",
          border: "1px solid rgba(255,213,0,.22)",
          color: "rgba(255,213,50,.88)",
          fontSize: 13,
          fontWeight: 600,
          textDecoration: "none",
        }}
      >
        Buy Amit a Coffee
      </a>
      <a
        href={`mailto:${PROFILE.email}`}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "12px 20px",
          borderRadius: 12,
          background: "rgba(244,117,33,.1)",
          border: "1px solid rgba(244,117,33,.22)",
          color: "#F47521",
          fontSize: 13,
          fontWeight: 600,
          textDecoration: "none",
        }}
      >
        Contact Amit directly
      </a>
    </div>
    <button
      onClick={onClose}
      style={{
        background: "none",
        border: "none",
        cursor: "pointer",
        color: "rgba(255,255,255,.22)",
        fontSize: 12,
      }}
    >
      Dismiss
    </button>
  </div>
));
LimitScreen.displayName = "LimitScreen";

const UserBadge = memo(
  ({ user, convoLeft }: { user: UserProfile | null; convoLeft: number }) => {
    if (!user?.name) return null;
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 5,
          padding: "3px 8px",
          borderRadius: 99,
          background: "rgba(123,47,190,.1)",
          border: "1px solid rgba(123,47,190,.2)",
        }}
      >
        <div
          style={{
            width: 16,
            height: 16,
            borderRadius: "50%",
            flexShrink: 0,
            background: "linear-gradient(135deg,#7B2FBE,#F47521)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 8,
            color: "#fff",
            fontWeight: 800,
          }}
        >
          {user.name.charAt(0).toUpperCase()}
        </div>
        <span
          style={{
            fontSize: 10,
            color: "rgba(255,255,255,.55)",
            fontWeight: 600,
            maxWidth: 90,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {user.name}
          {user.company ? ` · ${user.company}` : ""}
        </span>
        {convoLeft < DAILY_LIMIT && (
          <span
            style={{
              fontSize: 8,
              color: convoLeft === 0 ? "#ef4444" : "#F47521",
              background:
                convoLeft === 0
                  ? "rgba(239,68,68,.14)"
                  : "rgba(244,117,33,.14)",
              padding: "1px 5px",
              borderRadius: 99,
              fontWeight: 700,
            }}
          >
            {convoLeft}/{DAILY_LIMIT}
          </span>
        )}
      </div>
    );
  },
);
UserBadge.displayName = "UserBadge";

// ═══════════════════════════════════════════════════════════════════════════════
//  MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
export const SiriOrb = () => {
  const [phase, setPhase] = useState<Phase>("orb");
  const [voiceState, setVoiceState] = useState<VoiceState>("idle");
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [messages, dispatch] = useReducer(msgsReducer, []);
  const [autoSpeak, setAutoSpeak] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [onboardStep, setOnboardStep] = useState<OnboardStep>("welcome");
  const [isReturning, setIsReturning] = useState(false);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [convoLeft, setConvoLeft] = useState(DAILY_LIMIT);
  const [limitHit, setLimitHit] = useState(false);
  const [showEndScreen, setShowEndScreen] = useState(false);
  const [endSummary, setEndSummary] = useState("");

  const { mp, springTo } = useSpring();

  // Stable refs — let callbacks always read latest values without re-creating
  const autoSpeakRef = useRef(autoSpeak);
  const userProfileRef = useRef<UserProfile | null>(null);
  const msgsRef = useRef<Message[]>([]);
  const isLoadingRef = useRef(false);
  const onboardStepRef = useRef<OnboardStep>("welcome");
  const isReturningRef = useRef(false);
  const profileLoadedRef = useRef(false);
  const limitHitRef = useRef(false);
  const keepAlive = useRef<ReturnType<typeof setInterval> | null>(null);
  const recogRef = useRef<any>(null);
  const chatEnd = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const convoId = useRef(
    `c_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
  );

  // Keep refs in sync
  useEffect(() => {
    autoSpeakRef.current = autoSpeak;
  }, [autoSpeak]);
  useEffect(() => {
    userProfileRef.current = userProfile;
  }, [userProfile]);
  useEffect(() => {
    msgsRef.current = messages;
  }, [messages]);
  useEffect(() => {
    isLoadingRef.current = isLoading;
  }, [isLoading]);
  useEffect(() => {
    onboardStepRef.current = onboardStep;
  }, [onboardStep]);
  useEffect(() => {
    isReturningRef.current = isReturning;
  }, [isReturning]);
  useEffect(() => {
    profileLoadedRef.current = profileLoaded;
  }, [profileLoaded]);
  useEffect(() => {
    limitHitRef.current = limitHit;
  }, [limitHit]);

  useEffect(() => {
    const c = () => setIsMobile(window.innerWidth <= 640);
    c();
    window.addEventListener("resize", c);
    return () => window.removeEventListener("resize", c);
  }, []);

  useEffect(() => {
    chatEnd.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Init profile
  useEffect(() => {
    const init = async () => {
      const [profile, usage] = await Promise.all([
        loadUserProfile(),
        getDailyUsage(),
      ]);
      const remaining = Math.max(0, DAILY_LIMIT - usage.count);
      setConvoLeft(remaining);
      if (remaining === 0) setLimitHit(true);
      if (profile) {
        const updated = {
          ...profile,
          sessionCount: profile.sessionCount + 1,
          lastSeen: new Date().toISOString(),
        };
        setUserProfile(updated);
        setIsReturning(true);
        setOnboardStep("ready");
        await saveUserProfile(updated);
      }
      setProfileLoaded(true);
    };
    init();
  }, []);

  // ── TTS — stable, reads from autoSpeakRef ─────────────────────────────────
  const speak = useCallback(async (rawText: string) => {
    if (!window.speechSynthesis || !autoSpeakRef.current) return;
    window.speechSynthesis.cancel();
    if (keepAlive.current) clearInterval(keepAlive.current);
    const text = toNaturalSpeech(rawText);
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 0.83;
    u.pitch = 0.52;
    u.volume = 1.0;
    const voice = await getPreferredVoice();
    if (voice) u.voice = voice;
    u.onstart = () => {
      setVoiceState("speaking");
      keepAlive.current = setInterval(() => {
        if (window.speechSynthesis.paused) window.speechSynthesis.resume();
      }, 4000);
    };
    const done = () => {
      if (keepAlive.current) clearInterval(keepAlive.current);
      setVoiceState("idle");
    };
    u.onend = done;
    u.onerror = done;
    window.speechSynthesis.speak(u);
  }, []); // ★ no deps — reads autoSpeakRef

  const stopSpeak = useCallback(() => {
    window.speechSynthesis?.cancel();
    if (keepAlive.current) clearInterval(keepAlive.current);
    setVoiceState("idle");
  }, []);

  // ── Open — stable ─────────────────────────────────────────────────────────
  const open = useCallback(() => {
    if (!profileLoadedRef.current) return;
    setPhase("morphing");
    springTo(1, async () => {
      setPhase("chat");
      if (limitHitRef.current) return;
      await recordConversationStart(convoId.current);
      const usage = await getDailyUsage();
      setConvoLeft(Math.max(0, DAILY_LIMIT - usage.count));
      setTimeout(() => inputRef.current?.focus(), 80);
      setTimeout(async () => {
        let greeting: string;
        const profile = userProfileRef.current;
        if (isReturningRef.current && profile) {
          const recent = await getRecentHistory(4);
          const prevTopics = extractInterests(recent);
          greeting = prevTopics.length
            ? `${profile.name}. Session ${profile.sessionCount}. Last time you were asking about ${prevTopics.slice(0, 2).join(" and ")}. What do you need today?`
            : `${profile.name}. Session ${profile.sessionCount}. What can I help you with today?`;
        } else {
          greeting = `I'm Aura, Amit Chakraborty's AI. Before we start — what's your name?`;
          setOnboardStep("ask_name");
        }
        dispatch({ type: "SET", msgs: [{ role: "ai", text: greeting }] });
        speak(greeting);
      }, 400);
    });
  }, [springTo, speak]); // ★ minimal stable deps

  // ── Close — stable ────────────────────────────────────────────────────────
  const close = useCallback(async () => {
    window.speechSynthesis?.cancel();
    recogRef.current?.abort();
    setVoiceState("idle");
    const msgs = msgsRef.current;
    if (msgs.length > 1) {
      const summary = await generateSummary(userProfileRef.current, msgs);
      setEndSummary(summary);
      await saveConversation({
        id: convoId.current,
        date: new Date().toISOString(),
        messages: msgs,
        summary,
      });
      setShowEndScreen(true);
    }
    setPhase("closing");
    springTo(0, () => setPhase("orb"));
    dispatch({ type: "RESET" });
    setOnboardStep("welcome");
  }, [springTo]); // ★ stable

  // ── Send message — stable via ref-read pattern ────────────────────────────
  const sendMessage = useCallback(
    async (text: string) => {
      const msg = text.trim();
      if (!msg || isLoadingRef.current) return;
      setInputText("");
      setTranscript("");
      dispatch({ type: "ADD", msg: { role: "user", text: msg } });

      const step = onboardStepRef.current;
      const isOnboarding = step !== "ready";

      // ── ONBOARDING ──
      if (isOnboarding) {
        let np: UserProfile = userProfileRef.current ?? {
          name: "",
          company: "",
          role: "",
          intent: "",
          sessionCount: 1,
          firstSeen: new Date().toISOString(),
          lastSeen: new Date().toISOString(),
          totalMessages: 0,
          interests: [],
        };
        let nextStep: OnboardStep = step;
        let reply = "";

        if (step === "ask_name") {
          const name = extractName(msg);
          if (name) {
            np = { ...np, name };
            nextStep = "ask_company";
            reply = `${name}, which company or organization are you with?`;
          } else reply = `Just your first name — what should I call you?`;
        } else if (step === "ask_company") {
          const company = extractCompany(msg);
          if (company) {
            np = { ...np, company };
            nextStep = "ask_role";
            reply = `What is your role there?`;
          } else if (msg.trim().length > 1 && msg.trim().length < 60) {
            np = { ...np, company: toTitleCase(msg.trim()) };
            nextStep = "ask_role";
            reply = `Your role — recruiter, engineer, founder, investor?`;
          } else reply = `Which company or organization are you with?`;
        } else if (step === "ask_role") {
          const role = extractRole(msg);
          if (role) {
            np = { ...np, role };
            nextStep = "ask_intent";
            reply = `What brings you here — exploring Amit's work, hiring, or partnership?`;
          } else
            reply = `Your role — recruiter, founder, engineer, or investor?`;
        } else if (step === "ask_intent") {
          const intent = extractIntent(msg);
          np = { ...np, intent, totalMessages: 0 };
          nextStep = "ready";
          await saveUserProfile(np);
          reply = `Got it. Ask me anything.`;
        }

        setUserProfile(np);
        setOnboardStep(nextStep);
        setTimeout(() => {
          dispatch({ type: "ADD", msg: { role: "ai", text: reply } });
          speak(reply);
        }, 280);
        return;
      }

      // ── Update interests ──
      setUserProfile((prev) => {
        if (!prev) return prev;
        const interests = extractInterests([
          ...msgsRef.current,
          { role: "user", text: msg },
        ]);
        const updated = {
          ...prev,
          totalMessages: (prev.totalMessages || 0) + 1,
          interests,
          lastSeen: new Date().toISOString(),
        };
        saveUserProfile(updated);
        return updated;
      });

      // ── Local answers ──
      const { local, answer } = detectQueryIntent(msg);
      if (local && answer) {
        setTimeout(() => {
          dispatch({ type: "ADD", msg: { role: "ai", text: answer } });
          speak(answer);
        }, 100);
        return;
      }

      // ── LLM ──
      setIsLoading(true);
      setVoiceState("thinking");
      try {
        const reply = await askGemini(
          msg,
          userProfileRef.current,
          msgsRef.current,
        );
        dispatch({ type: "ADD", msg: { role: "ai", text: reply } });
        speak(reply);
      } catch {
        const fb = localFallback(msg);
        dispatch({ type: "ADD", msg: { role: "ai", text: fb } });
        speak(fb);
      } finally {
        setIsLoading(false);
        setVoiceState("idle");
      }
    },
    [speak],
  ); // ★ only `speak` — everything else read from refs

  // ── Voice recognition ─────────────────────────────────────────────────────
  const SR = (window.SpeechRecognition ||
    (window as any).webkitSpeechRecognition) as any;
  const canVoice = !!SR;

  const startListening = useCallback(() => {
    if (!canVoice) return;
    window.speechSynthesis?.cancel();
    if (keepAlive.current) clearInterval(keepAlive.current);
    setVoiceState("listening");
    setTranscript("");
    const r = new SR();
    recogRef.current = r;
    r.continuous = false;
    r.interimResults = true;
    r.lang = "en-US";
    r.onresult = (e: any) => {
      const t = Array.from(e.results as ArrayLike<any>)
        .map((res: any) => res[0].transcript)
        .join("");
      setTranscript(t);
      if (e.results[e.results.length - 1].isFinal) {
        r.stop();
        sendMessage(t);
      }
    };
    r.onerror = () => {
      setVoiceState("idle");
      setTranscript("");
    };
    r.onend = () => {
      setVoiceState((v) => (v === "listening" ? "idle" : v));
    };
    r.start();
  }, [canVoice, sendMessage]);

  const stopListening = useCallback(() => {
    recogRef.current?.stop();
    setVoiceState("idle");
    setTranscript("");
  }, []);

  // ── Stable chip/suggestion handler ───────────────────────────────────────
  const handleChip = useCallback((c: string) => sendMessage(c), [sendMessage]);
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" && !isLoadingRef.current) sendMessage(inputText);
    },
    [sendMessage, inputText],
  );
  const handleToggleSpeak = useCallback(() => {
    setAutoSpeak((v) => !v);
    stopSpeak();
  }, [stopSpeak]);
  const handleDismissEnd = useCallback(() => setShowEndScreen(false), []);

  // ── Derived values ─────────────────────────────────────────────────────────
  const isOnboarding = onboardStep !== "ready";
  const orbMode = useMemo<OrbMode>(() => {
    if (voiceState === "listening") return "listening";
    if (voiceState === "thinking") return "thinking";
    if (voiceState === "speaking") return "speaking";
    return "idle";
  }, [voiceState]);

  const isOrb = phase === "orb";
  const isChat = phase === "chat";
  const pc = Math.max(0, Math.min(1, mp));
  const targetW = isMobile ? window.innerWidth : PW;
  const targetH = isMobile ? window.innerHeight : PH;
  const W = isOrb ? ORB : isChat ? targetW : ORB + (targetW - ORB) * pc;
  const H = isOrb ? ORB : isChat ? targetH : ORB + (targetH - ORB) * pc;
  const BR = isOrb
    ? ORB / 2
    : isChat
      ? isMobile
        ? 0
        : 20
      : Math.max(0, (ORB / 2) * (1 - pc * 1.6));
  const bgA = isOrb ? 0 : isChat ? 1 : pc;
  const panelO = isChat ? 1 : Math.max(0, (pc - 0.5) / 0.5);
  const orbO = isOrb ? 1 : isChat ? 0 : Math.max(0, 1 - pc * 3);
  const isVoiceActive = voiceState === "listening" || voiceState === "speaking";
  const showBMCChip = messages.filter((m) => m.role === "user").length >= 3;

  const ONBOARD_STEPS: OnboardStep[] = [
    "ask_name",
    "ask_company",
    "ask_role",
    "ask_intent",
  ];
  const onboardIdx = ONBOARD_STEPS.indexOf(onboardStep);

  const inputPlaceholder = isOnboarding
    ? onboardStep === "ask_name"
      ? "Your first name..."
      : onboardStep === "ask_company"
        ? "Company or organization..."
        : onboardStep === "ask_role"
          ? "Your role..."
          : "What brings you here..."
    : "Ask anything about Amit...";

  return (
    <>
      {showEndScreen && (
        <EndScreen
          name={userProfile?.name || ""}
          summary={endSummary}
          onDismiss={handleDismissEnd}
        />
      )}

      <div
        style={{
          position: "fixed",
          zIndex: 9999,
          ...(isMobile && !isOrb
            ? { top: 0, left: 0, right: 0, bottom: 0 }
            : phase === "orb"
              ? { bottom: 24, right: 24 }
              : { bottom: 20, right: 20 }),
          transition: isOrb ? "none" : "all .35s cubic-bezier(.4,0,.2,1)",
        }}
      >
        {/* Halo */}
        {(isOrb || (phase === "morphing" && pc < 0.3)) && (
          <div
            style={{
              position: "absolute",
              width: ORB,
              height: ORB,
              borderRadius: "50%",
              background:
                "radial-gradient(circle,rgba(244,117,33,.22) 0%,transparent 70%)",
              filter: "blur(14px)",
              transform: "scale(1.6)",
              animation: "haloGlow 3.8s ease-in-out infinite",
              pointerEvents: "none",
              opacity: isOrb ? 1 : Math.max(0, 1 - pc * 4),
            }}
          />
        )}

        {/* Badge on orb */}
        {isOrb && convoLeft < DAILY_LIMIT && (
          <div
            style={{
              position: "absolute",
              top: -4,
              right: -4,
              zIndex: 1,
              width: 18,
              height: 18,
              borderRadius: "50%",
              background: convoLeft === 0 ? "#ef4444" : "#F47521",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 9,
              fontWeight: 800,
              color: "#fff",
              boxShadow: "0 0 8px rgba(244,117,33,.55)",
            }}
          >
            {convoLeft}
          </div>
        )}

        <div
          onClick={isOrb ? open : undefined}
          style={{
            position: "relative",
            width: W,
            height: H,
            borderRadius: BR,
            background: `rgba(7,4,12,${0.94 * bgA})`,
            backdropFilter:
              bgA > 0
                ? `blur(${Math.round(28 * bgA)}px) saturate(${1 + 0.8 * bgA})`
                : "none",
            border:
              bgA > 0.05 && !isMobile
                ? `1px solid rgba(244,117,33,${0.12 * bgA})`
                : "none",
            boxShadow:
              bgA > 0.1 && !isMobile
                ? `0 32px 90px rgba(0,0,0,${0.9 * bgA}),inset 0 1px 0 rgba(255,255,255,${0.03 * bgA})`
                : "none",
            overflow: "hidden",
            cursor: isOrb ? "pointer" : "default",
            animation: isOrb ? "orbFloat 4.2s ease-in-out infinite" : "none",
            willChange: "width,height,border-radius",
            fontFamily: "inherit",
          }}
        >
          {/* Plasma Orb — memoized, only re-renders if orbMode changes */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: ORB,
              height: ORB,
              opacity: orbO,
              pointerEvents: "none",
            }}
          >
            <PlasmaOrb size={ORB} mode={orbMode} />
          </div>

          {/* Chat panel */}
          {!isOrb && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                opacity: panelO,
                display: "flex",
                flexDirection: "column",
                pointerEvents: isChat ? "auto" : "none",
              }}
            >
              {limitHit && isChat && <LimitScreen onClose={close} />}

              {/* Header */}
              <div
                style={{
                  flexShrink: 0,
                  padding: isMobile ? "52px 15px 12px" : "12px 15px",
                  background:
                    "linear-gradient(180deg,rgba(244,117,33,.065) 0%,transparent 100%)",
                  borderBottom: "1px solid rgba(255,255,255,.05)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                  <div
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: "38% 62% 52% 48%/48% 52% 48% 52%",
                      background: "linear-gradient(135deg,#F47521,#7B2FBE)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      boxShadow: "0 0 12px rgba(244,117,33,.4)",
                      flexShrink: 0,
                    }}
                  >
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#fff"
                      strokeWidth="2.4"
                      strokeLinecap="round"
                    >
                      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" />
                      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                      <line x1="12" y1="19" x2="12" y2="23" />
                    </svg>
                  </div>
                  <div>
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 700,
                        color: "#fff",
                        letterSpacing: "-.01em",
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      Aura
                      {isOnboarding && (
                        <span
                          style={{
                            fontSize: 8,
                            color: "#7B2FBE",
                            fontWeight: 600,
                            letterSpacing: ".08em",
                            textTransform: "uppercase",
                          }}
                        >
                          Onboarding
                        </span>
                      )}
                    </div>
                    <div
                      style={{
                        fontSize: 8,
                        fontWeight: 600,
                        letterSpacing: ".08em",
                        textTransform: "uppercase",
                        color:
                          voiceState !== "idle"
                            ? "#F47521"
                            : "rgba(244,117,33,.4)",
                        animation:
                          voiceState !== "idle"
                            ? "blink 1.2s ease-in-out infinite"
                            : "none",
                      }}
                    >
                      {voiceState === "listening"
                        ? "Listening"
                        : voiceState === "thinking"
                          ? "Thinking"
                          : voiceState === "speaking"
                            ? "Speaking"
                            : "Ready"}
                    </div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 3, alignItems: "center" }}>
                  <UserBadge user={userProfile} convoLeft={convoLeft} />
                  <button
                    className="ai-ib"
                    onClick={handleToggleSpeak}
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 7,
                      border: "none",
                      cursor: "pointer",
                      background: autoSpeak
                        ? "rgba(244,117,33,.12)"
                        : "transparent",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <svg
                      width="13"
                      height="13"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke={autoSpeak ? "#F47521" : "rgba(255,255,255,.3)"}
                      strokeWidth="2"
                      strokeLinecap="round"
                    >
                      {autoSpeak ? (
                        <>
                          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                          <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
                        </>
                      ) : (
                        <>
                          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                          <line x1="23" y1="9" x2="17" y2="15" />
                          <line x1="17" y1="9" x2="23" y2="15" />
                        </>
                      )}
                    </svg>
                  </button>
                  {voiceState === "speaking" && (
                    <button
                      className="ai-ib"
                      onClick={stopSpeak}
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 7,
                        border: "none",
                        cursor: "pointer",
                        background: "rgba(244,117,33,.1)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <svg
                        width="10"
                        height="10"
                        viewBox="0 0 24 24"
                        fill="#F47521"
                      >
                        <rect x="4" y="4" width="16" height="16" rx="2" />
                      </svg>
                    </button>
                  )}
                  <button
                    className="ai-ib"
                    onClick={close}
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 7,
                      border: "none",
                      cursor: "pointer",
                      background: "transparent",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <svg
                      width="13"
                      height="13"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="rgba(255,255,255,.38)"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                    >
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Onboard progress */}
              {isOnboarding && (
                <div
                  style={{
                    flexShrink: 0,
                    padding: "6px 15px 4px",
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                    background: "rgba(123,47,190,.03)",
                    borderBottom: "1px solid rgba(123,47,190,.08)",
                  }}
                >
                  <span
                    style={{
                      fontSize: 8,
                      color: "rgba(255,255,255,.28)",
                      textTransform: "uppercase",
                      letterSpacing: ".1em",
                      marginRight: 4,
                    }}
                  >
                    Identifying
                  </span>
                  {ONBOARD_STEPS.map((_, i) => (
                    <div
                      key={i}
                      style={{
                        width: i === onboardIdx ? 14 : 5,
                        height: 5,
                        borderRadius: 99,
                        transition: "width .3s ease",
                        background:
                          i < onboardIdx
                            ? "#F47521"
                            : i === onboardIdx
                              ? "#7B2FBE"
                              : "rgba(255,255,255,.1)",
                      }}
                    />
                  ))}
                </div>
              )}

              {/* Messages */}
              <div
                className="ai-sc"
                style={{ flex: 1, overflowY: "auto", padding: "12px 12px 6px" }}
              >
                {messages.length === 0 && (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      height: "100%",
                      gap: 14,
                      padding: 18,
                      textAlign: "center",
                    }}
                  >
                    <div
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: "38% 62% 52% 48%/48% 52% 48% 52%",
                        background: "linear-gradient(135deg,#F47521,#7B2FBE)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        boxShadow: "0 0 22px rgba(244,117,33,.38)",
                      }}
                    >
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#fff"
                        strokeWidth="2"
                        strokeLinecap="round"
                      >
                        <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" />
                        <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                        <line x1="12" y1="19" x2="12" y2="23" />
                      </svg>
                    </div>
                    <div>
                      <p
                        style={{
                          fontSize: 16,
                          fontWeight: 800,
                          color: "#F47521",
                          margin: "0 0 5px",
                          letterSpacing: "-.02em",
                        }}
                      >
                        Aura
                      </p>
                      <p
                        style={{
                          fontSize: 12,
                          color: "rgba(255,255,255,.35)",
                          margin: 0,
                          lineHeight: 1.65,
                        }}
                      >
                        Amit Chakraborty's AI. Ask anything or tap the mic.
                      </p>
                    </div>
                    {!isOnboarding && (
                      <div
                        style={{
                          width: "100%",
                          display: "flex",
                          flexDirection: "column",
                          gap: 5,
                        }}
                      >
                        <p
                          style={{
                            fontSize: 8,
                            color: "rgba(255,255,255,.28)",
                            textTransform: "uppercase",
                            letterSpacing: ".14em",
                            margin: "2px 0 0",
                            textAlign: "left",
                          }}
                        >
                          Suggested
                        </p>
                        {SUGGESTIONS.map((s) => (
                          <button
                            key={s}
                            className="ai-sug"
                            onClick={() => handleChip(s)}
                            style={{
                              width: "100%",
                              textAlign: "left",
                              padding: "8px 12px",
                              borderRadius: 9,
                              background: "rgba(244,117,33,.04)",
                              border: "1px solid rgba(244,117,33,.12)",
                              color: "rgba(255,255,255,.58)",
                              fontSize: 12,
                              cursor: "pointer",
                              transition: "all .15s",
                            }}
                          >
                            <span
                              style={{
                                color: "rgba(244,117,33,.65)",
                                marginRight: 6,
                                fontSize: 10,
                              }}
                            >
                              &#9656;
                            </span>
                            {s}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {messages.map((m, i) => (
                  <div
                    key={i}
                    className="msg-in"
                    style={{
                      display: "flex",
                      justifyContent:
                        m.role === "user" ? "flex-end" : "flex-start",
                      marginBottom: 8,
                    }}
                  >
                    {m.role === "ai" && (
                      <div
                        style={{
                          width: 24,
                          height: 24,
                          flexShrink: 0,
                          marginRight: 6,
                          marginTop: 2,
                          borderRadius: "38% 62% 52% 48%/48% 52% 48% 52%",
                          background: "linear-gradient(135deg,#F47521,#7B2FBE)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <svg
                          width="10"
                          height="10"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="#fff"
                          strokeWidth="2.4"
                          strokeLinecap="round"
                        >
                          <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" />
                          <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                          <line x1="12" y1="19" x2="12" y2="23" />
                        </svg>
                      </div>
                    )}
                    <div
                      style={{
                        maxWidth: "78%",
                        borderRadius:
                          m.role === "user"
                            ? "16px 16px 4px 16px"
                            : "16px 16px 16px 4px",
                        padding: "9px 13px",
                        fontSize: 12.5,
                        lineHeight: 1.65,
                        ...(m.role === "user"
                          ? {
                              background: "rgba(244,117,33,.15)",
                              border: "1px solid rgba(244,117,33,.22)",
                              color: "#fed7aa",
                            }
                          : {
                              background: "#0F0C18",
                              border: isOnboarding
                                ? "1px solid rgba(123,47,190,.2)"
                                : "1px solid rgba(255,255,255,.055)",
                              color: "rgba(255,255,255,.86)",
                            }),
                      }}
                    >
                      {m.text}
                    </div>
                  </div>
                ))}

                {isLoading && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 6,
                      marginBottom: 8,
                    }}
                  >
                    <div
                      style={{
                        width: 24,
                        height: 24,
                        flexShrink: 0,
                        borderRadius: "38% 62% 52% 48%/48% 52% 48% 52%",
                        background: "linear-gradient(135deg,#F47521,#7B2FBE)",
                        marginTop: 2,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <svg
                        width="10"
                        height="10"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#fff"
                        strokeWidth="2.4"
                        strokeLinecap="round"
                      >
                        <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" />
                        <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                        <line x1="12" y1="19" x2="12" y2="23" />
                      </svg>
                    </div>
                    <div
                      style={{
                        padding: "10px 14px",
                        borderRadius: "16px 16px 16px 4px",
                        background: "#0F0C18",
                        border: "1px solid rgba(255,255,255,.055)",
                        display: "flex",
                        gap: 5,
                        alignItems: "center",
                      }}
                    >
                      {[0, 160, 320].map((d) => (
                        <span
                          key={d}
                          style={{
                            width: 5,
                            height: 5,
                            borderRadius: "50%",
                            background: "#F47521",
                            display: "inline-block",
                            animation: `typeDot 1.2s ${d}ms infinite`,
                          }}
                        />
                      ))}
                    </div>
                  </div>
                )}
                <div ref={chatEnd} />
              </div>

              {/* Chips */}
              {messages.length > 0 && !isOnboarding && (
                <div
                  style={{
                    flexShrink: 0,
                    padding: "5px 12px",
                    borderTop: "1px solid rgba(255,255,255,.04)",
                    display: "flex",
                    gap: 4,
                    flexWrap: "wrap",
                    alignItems: "center",
                  }}
                >
                  {CHIPS.map((c) => (
                    <button
                      key={c}
                      className="ai-chip"
                      onClick={() => handleChip(c)}
                      disabled={isLoading}
                      style={{
                        fontSize: 8,
                        fontFamily: "monospace",
                        padding: "2px 7px",
                        borderRadius: 99,
                        background: "transparent",
                        border: "1px solid rgba(244,117,33,.15)",
                        color: "rgba(244,117,33,.65)",
                        cursor: "pointer",
                        transition: "all .15s",
                      }}
                    >
                      {c}
                    </button>
                  ))}
                  {showBMCChip && (
                    <a
                      href={BMC_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        marginLeft: "auto",
                        fontSize: 8,
                        fontFamily: "monospace",
                        padding: "2px 8px",
                        borderRadius: 99,
                        background: "rgba(255,213,0,.07)",
                        border: "1px solid rgba(255,213,0,.18)",
                        color: "rgba(255,210,40,.7)",
                        textDecoration: "none",
                      }}
                    >
                      Buy coffee
                    </a>
                  )}
                </div>
              )}

              {/* Input bar */}
              <div
                style={{
                  flexShrink: 0,
                  background: "rgba(5,3,9,.94)",
                  backdropFilter: "blur(28px) saturate(150%)",
                  borderTop: isOnboarding
                    ? "1px solid rgba(123,47,190,.15)"
                    : "1px solid rgba(255,255,255,.05)",
                  padding: isMobile
                    ? `12px 12px max(20px,env(safe-area-inset-bottom,20px))`
                    : "11px 12px 14px",
                }}
              >
                <div style={{ position: "relative", height: 48 }}>
                  {/* Text layer */}
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      display: "flex",
                      alignItems: "center",
                      gap: 7,
                      opacity: isVoiceActive ? 0 : 1,
                      transform: isVoiceActive
                        ? "translateY(5px) scale(.97)"
                        : "translateY(0) scale(1)",
                      transition:
                        "opacity .22s, transform .22s cubic-bezier(.4,0,.2,1)",
                      pointerEvents: isVoiceActive ? "none" : "auto",
                    }}
                  >
                    <div
                      className={isOnboarding ? "ob-inp" : ""}
                      style={{
                        flex: 1,
                        height: 48,
                        display: "flex",
                        alignItems: "center",
                        borderRadius: 24,
                        background: "rgba(255,255,255,.038)",
                        border: isOnboarding
                          ? "1px solid rgba(123,47,190,.35)"
                          : "1px solid rgba(255,255,255,.065)",
                        boxShadow: "inset 0 2px 5px rgba(0,0,0,.3)",
                        overflow: "hidden",
                      }}
                      onClick={() => inputRef.current?.focus()}
                    >
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          startListening();
                        }}
                        style={{
                          flexShrink: 0,
                          width: 44,
                          height: 48,
                          background: "none",
                          border: "none",
                          cursor: canVoice ? "pointer" : "default",
                          opacity: canVoice ? 1 : 0.3,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: isOnboarding ? "#7B2FBE" : "#F47521",
                        }}
                      >
                        <svg
                          width="13"
                          height="13"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.2"
                          strokeLinecap="round"
                        >
                          <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                          <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                          <line x1="12" y1="19" x2="12" y2="23" />
                          <line x1="8" y1="23" x2="16" y2="23" />
                        </svg>
                      </button>
                      <div
                        style={{
                          width: 1,
                          height: 14,
                          background: "rgba(255,255,255,.05)",
                          flexShrink: 0,
                        }}
                      />
                      <input
                        ref={inputRef}
                        className="ai-inp"
                        type="text"
                        placeholder={inputPlaceholder}
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        onKeyDown={handleKeyDown}
                        disabled={isLoading}
                        style={{
                          flex: 1,
                          height: "100%",
                          padding: "0 11px",
                          background: "transparent",
                          border: "none",
                          color: "#fff",
                          fontSize: 13,
                          fontFamily: "inherit",
                        }}
                      />
                    </div>
                    <button
                      className="ai-send"
                      onClick={() => sendMessage(inputText)}
                      disabled={isLoading || !inputText.trim()}
                      style={{
                        flexShrink: 0,
                        width: 48,
                        height: 48,
                        borderRadius: "50%",
                        background: isOnboarding
                          ? "linear-gradient(155deg,#7B2FBE 0%,#5a1fa0 60%,#3d1070 100%)"
                          : "linear-gradient(155deg,#F47521 0%,#d4661a 60%,#a84e10 100%)",
                        border: isOnboarding
                          ? "1px solid rgba(123,47,190,.3)"
                          : "1px solid rgba(200,90,20,.3)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                        transition: "all .22s cubic-bezier(.34,1.4,.64,1)",
                        boxShadow:
                          "inset 0 1px 0 rgba(255,255,255,.28),0 0 14px rgba(244,117,33,.15)",
                      }}
                    >
                      {isLoading ? (
                        <div
                          style={{
                            width: 15,
                            height: 15,
                            border: "2px solid rgba(255,255,255,.2)",
                            borderTopColor: "#fff",
                            borderRadius: "50%",
                            animation: "spin 1s linear infinite",
                          }}
                        />
                      ) : (
                        <svg
                          width="13"
                          height="13"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="#fff"
                          strokeWidth="2.6"
                          strokeLinecap="round"
                        >
                          <line x1="22" y1="2" x2="11" y2="13" />
                          <polygon points="22 2 15 22 11 13 2 9 22 2" />
                        </svg>
                      )}
                    </button>
                  </div>

                  {/* Voice layer */}
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      display: "flex",
                      alignItems: "center",
                      opacity: isVoiceActive ? 1 : 0,
                      transform: isVoiceActive
                        ? "translateY(0) scale(1)"
                        : "translateY(5px) scale(.97)",
                      transition:
                        "opacity .22s, transform .22s cubic-bezier(.4,0,.2,1)",
                      pointerEvents: isVoiceActive ? "auto" : "none",
                    }}
                  >
                    <div
                      style={{
                        flex: 1,
                        height: 48,
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        borderRadius: 24,
                        padding: "0 7px",
                        background:
                          voiceState === "listening"
                            ? "rgba(244,117,33,.055)"
                            : "rgba(34,197,94,.045)",
                        border: `1px solid ${voiceState === "listening" ? "rgba(244,117,33,.16)" : "rgba(34,197,94,.14)"}`,
                        transition: "background .3s, border-color .3s",
                      }}
                    >
                      <button
                        onClick={
                          voiceState === "listening" ? stopListening : stopSpeak
                        }
                        style={{
                          flexShrink: 0,
                          width: 34,
                          height: 34,
                          borderRadius: "50%",
                          border: "none",
                          background:
                            voiceState === "listening"
                              ? "rgba(244,117,33,.1)"
                              : "rgba(34,197,94,.08)",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color:
                            voiceState === "listening" ? "#F47521" : "#22c55e",
                          animation: "blink 1.6s ease-in-out infinite",
                        }}
                      >
                        {voiceState === "listening" ? (
                          <svg
                            width="11"
                            height="11"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.2"
                            strokeLinecap="round"
                          >
                            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                            <line x1="12" y1="19" x2="12" y2="23" />
                          </svg>
                        ) : (
                          <svg
                            width="11"
                            height="11"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                          >
                            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                            <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                          </svg>
                        )}
                      </button>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 2,
                          flexShrink: 0,
                        }}
                      >
                        {[
                          0.55, 1, 0.38, 0.85, 0.48, 0.95, 0.65, 0.42, 0.78,
                          0.55,
                        ].map((h, i) => (
                          <span
                            key={i}
                            style={{
                              display: "inline-block",
                              width: 2.5,
                              height: Math.round(h * 17),
                              borderRadius: 3,
                              background:
                                voiceState === "listening"
                                  ? "#F47521"
                                  : "#22c55e",
                              transformOrigin: "center",
                              animation: `waveBar ${0.5 + (i % 3) * 0.18}s ${i * 55}ms ease-in-out infinite`,
                            }}
                          />
                        ))}
                      </div>
                      <span
                        style={{
                          flex: 1,
                          fontSize: 12,
                          fontWeight: 500,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          color:
                            voiceState === "listening" ? "#F47521" : "#22c55e",
                        }}
                      >
                        {voiceState === "listening"
                          ? transcript || "Listening..."
                          : "Speaking..."}
                      </span>
                      <button
                        onClick={
                          voiceState === "listening" ? stopListening : stopSpeak
                        }
                        style={{
                          flexShrink: 0,
                          width: 34,
                          height: 34,
                          borderRadius: "50%",
                          border: "none",
                          background: "rgba(255,255,255,.04)",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "rgba(255,255,255,.32)",
                        }}
                      >
                        <svg
                          width="10"
                          height="10"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.2"
                          strokeLinecap="round"
                        >
                          <line x1="18" y1="6" x2="6" y2="18" />
                          <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};
