/**
 * src/lib/fallbackAI.ts
 *
 * Aura's LOCAL brain — zero network, zero API.
 * Handles full conversations when Gemini is unavailable.
 *
 * Features:
 *   - Context-aware responses (tracks what was discussed)
 *   - Voice profile integration (adapts to gender/tone/style)
 *   - Role-based personality (recruiter vs engineer vs founder)
 *   - Conversation memory within session
 *   - Natural follow-ups, never repeats
 *   - Onboarding flow works fully offline
 *   - Smart topic detection with fuzzy matching
 *
 * Philosophy: Aura speaks AS Amit. First person. Punchy. Under 60 words.
 */

import { auraD } from "./diagnostics";

// ── Types ────────────────────────────────────────────────────────────────────
export interface FallbackContext {
  userName?: string;
  userRole?: string;
  userCompany?: string;
  userIntent?: string;
  topicsDiscussed: Set<string>;
  messageCount: number;
  voiceGender?: "male" | "female" | "neutral" | "unknown";
  voiceTone?: "calm" | "excited" | "neutral" | "frustrated" | "unknown";
  interactionStyle?:
    | "concise"
    | "detailed"
    | "questioning"
    | "exploring"
    | "unknown";
  language?: string;
  lastTopic?: string;
}

// ── Topic database ───────────────────────────────────────────────────────────
interface TopicEntry {
  id: string;
  patterns: RegExp[];
  responses: string[]; // multiple variants to avoid repetition
  roleVariants?: Record<string, string[]>; // role-specific responses
  followUp?: string;
}

const TOPICS: TopicEntry[] = [
  {
    id: "intro",
    patterns: [/who|about|intro|yourself|amit|tell me/i],
    responses: [
      "Amit Chakraborty. 31. Principal Mobile Architect. 8 years, 18 apps, 50,000 users. Built a game engine from scratch. Led 21 engineers from zero. What angle interests you?",
      "Eight years of shipping. 18 production apps. A custom game engine most engineers wouldn't attempt solo. Currently open to the right opportunity. What do you want to know?",
      "Amit. Kolkata-based, fully remote for 6 years. Sole provider for a 12-person family. Every project I take, I own completely. That's the short version.",
    ],
    roleVariants: {
      Recruiter: [
        "Amit Chakraborty. 8 years. Led 21 engineers. Built medical-grade AI on mobile. HIPAA production systems. The kind of engineer who doesn't need a manager. What role are you filling?",
      ],
      Engineer: [
        "The game engine is probably the most interesting thing. Custom React Native, pure C++, Swift, Kotlin. No external libraries. Powers 5 clinical apps. Want the architecture breakdown?",
      ],
      Founder: [
        "I've been the 0-to-1 person on every project. No team, no playbook, no template. Built and shipped 18 apps that way. That's what I bring to early-stage work.",
      ],
    },
  },
  {
    id: "medical",
    patterns: [
      /vital|health|medical|hipaa|synapsis|clinical|patient|care|eye|retina|game.?engine/i,
    ],
    responses: [
      "VitalQuest runs on a game engine I built from scratch. React Native, pure C++, Swift, Kotlin. No Unity, no external libs. HIPAA RAG pipeline with 99.9% uptime. Real patients, real stakes.",
      "Built 5 clinical apps at Synapsis. VitalQuest, LunaCare, Eye Care, Nexus, Maskwa. MediaPipe for on-device retina analysis. Zero cloud dependency for the vision pipeline. All in production.",
      "The medical work is the most technically demanding thing I've done. HIPAA compliance, clinical-grade triage, a game engine powering therapeutic apps. And I built the team from nothing.",
    ],
    followUp:
      "Want to know about the architecture, the team I built, or the AI pipeline?",
  },
  {
    id: "web3",
    patterns: [
      /web3|defi|blockchain|nft|solidity|vulcan|ethereum|crypto|smart.?contract|binance/i,
    ],
    responses: [
      "DeFi11. 100% on-chain. Ethereum smart contracts, NFT prize pools, real money. Vulcan Eleven hit 50,000 active users with Binance Pay. Both shipped on time, zero critical bugs.",
      "Three years of Web3 at Nonce Blox. 13 apps. Fantasy sports, music competitions, DeFi. Vulcan Eleven alone processes 100,000+ transactions. Consistent 60fps across all of them.",
      "The DeFi work was all real stakes. Not testnets. Smart contracts handling actual funds. NFT marketplaces with real collections. 50,000 users trusting the code I wrote.",
    ],
    followUp:
      "Interested in the smart contract architecture or the mobile integration?",
  },
  {
    id: "stack",
    patterns: [/stack|skill|tech|language|typescript|react|tools?|framework/i],
    responses: [
      "React Native for 8 years. Production scale. Custom native modules. TypeScript everywhere. AWS, Kubernetes, Docker for infra. RAG pipelines, MediaPipe for AI. Solidity for Web3. Not prototypes. Shipped products.",
      "Primary: React Native, TypeScript. Backend: NestJS, Node, PostgreSQL, GraphQL. Cloud: AWS, K8s, Docker. AI: RAG, MediaPipe, TensorFlow. Web3: Solidity, Ethereum. I don't just use these. I've shipped production with all of them.",
      "Full vertical. Mobile to backend to cloud to AI to blockchain. The game engine alone required C++, Swift, and Kotlin simultaneously. That's the range.",
    ],
  },
  {
    id: "team",
    patterns: [/team|lead|manage|hire|people|engineer|built.?team|leadership/i],
    responses: [
      "Hired 21 engineers from zero at Synapsis. No HR. No playbook. No existing team to absorb into. Found them, evaluated them, onboarded them, led them. That's ownership.",
      "Leadership isn't a title thing. At Synapsis there was nothing. I built the entire engineering org. 21 people. Defined the culture, the process, the standards. From blank page to production team.",
      "Anyone can manage an existing team. Building one from scratch, while simultaneously architecting 5 clinical apps, is a different category entirely.",
    ],
    roleVariants: {
      Recruiter: [
        "21 engineers hired and led personally. No existing team, no HR support. Built the entire engineering organization while shipping 5 clinical apps simultaneously. That's the leadership evidence.",
      ],
    },
  },
  {
    id: "contact",
    patterns: [
      /contact|email|reach|linkedin|github|connect|phone|call|talk|message/i,
    ],
    responses: [
      "Email is fastest: amit98ch@gmail.com. LinkedIn at linkedin.com/in/devamitch. GitHub at github.com/devamitch. Phone: +91-9874173663. Usually responds within hours.",
      "Best way: amit98ch@gmail.com. He's responsive. LinkedIn works too: linkedin.com/in/devamitch. Or call directly: +91-9874173663.",
    ],
  },
  {
    id: "rates",
    patterns: [
      /rate|salary|cost|charge|fee|compensation|pay|pricing|budget|afford|cheap|expensive/i,
    ],
    responses: [
      "Freelance consulting at $100 to $150 per hour. MVP builds start at $12K for a 3-month delivery. Fractional CTO work is negotiable, equity-first preferred. Full-time internationally, $6 to $10K per month. Currently open and flexible on terms.",
      "Currently open to opportunities. Freelance: $100 to $150 per hour. Full-time remote: $6K to $10K per month depending on scope. MVP builds: $12K to $25K fixed. Everything is negotiable for the right mission.",
      "Rates depend on the engagement. Freelance hourly, full-time monthly, project-based fixed. Currently available and flexible. What model works for you?",
    ],
    followUp:
      "What kind of engagement are you thinking — freelance, full-time, or project-based?",
  },
  {
    id: "location",
    patterns: [
      /where|location|based|remote|timezone|india|kolkata|available|when/i,
    ],
    responses: [
      "Kolkata, India. UTC plus 5:30. Fully remote for 6 years. Worked with teams across Canada, Dubai, US, UK. Timezone flexible. Currently available immediately.",
      "Based in Kolkata. Remote-first for 6 years. Async communication is second nature. No timezone has been a problem yet. Available now.",
    ],
  },
  {
    id: "impressive",
    patterns: [
      /impress|best|biggest|proud|achievement|hardest|complex|difficult|challenging/i,
    ],
    responses: [
      "The game engine. Custom React Native, pure C++, Swift, Kotlin. No external libraries. Most mobile engineers wouldn't attempt it solo. It powers 5 clinical apps serving real patients. That and building 21 engineers from nothing.",
      "Two things stand out. The game engine nobody would build solo. And hiring 21 engineers with no team, no playbook, no template. Both happened simultaneously. Both are in production.",
      "Building HIPAA-compliant medical AI on mobile while simultaneously creating a custom game engine. Real patients. Real stakes. That's the hardest thing I've done.",
    ],
  },
  {
    id: "hire",
    patterns: [
      /why|hire|reason|worth|special|different|unique|stand.?out|advantage/i,
    ],
    responses: [
      "Not just an engineer. An architect who leads, a founder who codes. Medical-grade AI on mobile. 21 people hired and led. 6 years remote, no hand-holding. Currently available and looking for the right fit.",
      "The combination is rare. Deep mobile architecture. AI in production. Web3 shipped. Team building from zero. All of it simultaneously, not sequentially. Currently open to opportunities.",
      "Most engineers specialize. Mobile OR backend OR AI OR Web3. I've shipped production in all four. Simultaneously. While leading a team I built from scratch. That's the differentiator.",
    ],
    roleVariants: {
      Investor: [
        "50,000 users. 99.9% uptime. HIPAA compliance. No legacy debt. 18 apps shipped on time. Zero critical post-launch bugs on flagship products. That's the ROI case.",
      ],
    },
  },
  {
    id: "projects",
    patterns: [/project|build|startup|mvp|product|app|portfolio|work|ship/i],
    responses: [
      "18 apps shipped. VitalQuest — medical game engine. Vulcan Eleven — 50K user fantasy sports. DeFi11 — on-chain Ethereum. MusicX — custom C++ audio. Housezy — PropTech. All production, all delivered on time.",
      "The portfolio spans medical AI, fantasy sports, DeFi, music tech, and PropTech. 18 apps total. The common thread: every one is in production with real users.",
    ],
    followUp:
      "Which domain interests you most? Medical, Web3, or something else?",
  },
  {
    id: "ai",
    patterns: [
      /\bai\b|ml|machine.?learn|rag|pipeline|mediapipe|tensor|llm|gpt|model|vision|computer.?vision/i,
    ],
    responses: [
      "HIPAA-compliant RAG pipelines for clinical triage. MediaPipe for on-device computer vision — retina analysis, blink detection. Zero cloud dependency for the vision pipeline. TensorFlow for classification. All production.",
      "The AI work is production-grade, not demo-ware. RAG pipelines processing real patient data under HIPAA. MediaPipe running on-device for eye care diagnostics. Built the entire pipeline end-to-end.",
    ],
  },
  {
    id: "freelance",
    patterns: [
      /freelan|contract|consult|part.?time|gig|outsourc|availab|open|looking/i,
    ],
    responses: [
      "Currently open to freelance work. $100 to $150 per hour. Available immediately. Can also do fixed-price MVPs or fractional CTO engagements. What do you need built?",
      "Available for freelance right now. Flexible on structure — hourly, project-based, or ongoing advisory. What's the scope you're thinking?",
      "Open to freelance, consulting, and contract work. Can start immediately. Whether it's a 2-week sprint or a 6-month build, I deliver on time.",
    ],
    followUp:
      "What's the project? I can give you a realistic timeline and scope.",
  },
  {
    id: "nonce",
    patterns: [/nonce|blox|dubai|fantasy|music.?x|housezy|proptech/i],
    responses: [
      "Nonce Blox was 3 years in Dubai. 13 apps. Vulcan Eleven hit 50K users. MusicX had custom C++ audio processing. Housezy was full PropTech with GraphQL and subscription billing. All delivered on time.",
      "Three years, 13 apps. 7 iOS, 6 Android. 50K users, 100K transactions. Consistent 60fps. Zero post-launch critical bugs. That was Nonce Blox.",
    ],
  },
  {
    id: "government",
    patterns: [
      /government|gst|tax|legacy|webskitter|techpromind|security|early/i,
    ],
    responses: [
      "Started with government contracts. 13 projects. Built the GST ecosystem platform from scratch — 40% efficiency gain over legacy. Security hardening, SQL injection prevention, XSS. That's where I learned ownership matters more than titles.",
    ],
  },
  {
    id: "family",
    patterns: [/family|personal|life|home|motivation|drive|why.?work/i],
    responses: [
      "Sole provider for a 12-person family. Every decision carries that weight. It's why I don't take projects lightly and why I deliver on time. The stakes are always real for me.",
    ],
  },
];

// ── Greetings (never repeat) ─────────────────────────────────────────────────
const GREETING_VARIANTS = {
  returning: [
    (name: string, time: string) =>
      `Good ${time}, ${name}. What do you need today?`,
    (name: string) => `${name}. Good to hear from you. What's on your mind?`,
    (name: string) => `Back again, ${name}. Ask me anything.`,
    (name: string, time: string) => `${name}, good ${time}. Let's get into it.`,
  ],
  firstTime: [
    (time: string) =>
      `Good ${time}. I'm Aura. I know everything about Amit Chakraborty. What's your name?`,
    () => `Hey. Amit Chakraborty's portfolio AI. What should I call you?`,
    (time: string) =>
      `Good ${time}. Aura here. Tell me your name and I'll make this personal.`,
  ],
};

// ── Response variants for unknown topics ─────────────────────────────────────
const UNKNOWN_RESPONSES = [
  "That's outside what I know best. Ask me about Amit's projects, tech stack, or how to work with him.",
  "Not sure I can help with that one. Try asking about the medical AI work, Web3 projects, or Amit's rates.",
  "My expertise is Amit's work and career. Ask about his architecture decisions, team building, or availability.",
];

// ── Main fallback engine ─────────────────────────────────────────────────────
const ctx: FallbackContext = {
  topicsDiscussed: new Set(),
  messageCount: 0,
};

let usedResponseIndices: Record<string, number> = {};
let unknownIndex = 0;

export function resetFallbackContext(): void {
  ctx.topicsDiscussed.clear();
  ctx.messageCount = 0;
  ctx.lastTopic = undefined;
  usedResponseIndices = {};
  unknownIndex = 0;
}

export function setFallbackContext(partial: Partial<FallbackContext>): void {
  Object.assign(ctx, partial);
}

export function getFallbackGreeting(
  name?: string,
  sessionCount?: number,
): string {
  const hour = new Date().getHours();
  const time = hour < 12 ? "morning" : hour < 17 ? "afternoon" : "evening";

  if (name && sessionCount && sessionCount > 1) {
    const idx = (sessionCount - 1) % GREETING_VARIANTS.returning.length;
    return GREETING_VARIANTS.returning[idx](name, time);
  }

  const idx = Math.floor(Math.random() * GREETING_VARIANTS.firstTime.length);
  return GREETING_VARIANTS.firstTime[idx](time);
}

export function fallbackChat(message: string): string {
  ctx.messageCount++;
  auraD.log(
    "fallback",
    "info",
    `Processing: "${message.slice(0, 60)}..." (msg #${ctx.messageCount})`,
  );
  auraD.increment("fallback.requests");

  const msg = message.toLowerCase().trim();

  // ── Find matching topic ────────────────────────────────────────────────
  let bestMatch: TopicEntry | null = null;
  let bestScore = 0;

  for (const topic of TOPICS) {
    for (const pattern of topic.patterns) {
      if (pattern.test(msg)) {
        // Score based on number of keyword matches
        const matches = msg.match(pattern);
        const score = matches
          ? matches.length + (topic.id === ctx.lastTopic ? -0.5 : 0)
          : 0;
        if (score > bestScore) {
          bestScore = score;
          bestMatch = topic;
        }
      }
    }
  }

  if (!bestMatch) {
    // Fuzzy: check for partial word matches
    const words = msg.split(/\s+/).filter((w) => w.length > 3);
    for (const topic of TOPICS) {
      for (const pattern of topic.patterns) {
        for (const word of words) {
          if (pattern.test(word)) {
            bestMatch = topic;
            break;
          }
        }
        if (bestMatch) break;
      }
      if (bestMatch) break;
    }
  }

  if (!bestMatch) {
    auraD.log("fallback", "info", "No topic match — using unknown response");
    const resp = UNKNOWN_RESPONSES[unknownIndex % UNKNOWN_RESPONSES.length];
    unknownIndex++;
    return resp;
  }

  // ── Select response variant (never repeat consecutively) ───────────────
  ctx.topicsDiscussed.add(bestMatch.id);
  ctx.lastTopic = bestMatch.id;

  // Check for role-specific variant first
  let pool = bestMatch.responses;
  if (bestMatch.roleVariants && ctx.userRole) {
    const rolePool = bestMatch.roleVariants[ctx.userRole];
    if (rolePool?.length) pool = [...rolePool, ...pool];
  }

  const prevIdx = usedResponseIndices[bestMatch.id] ?? -1;
  let idx = (prevIdx + 1) % pool.length;
  // If we've discussed this before, skip ahead more
  if (ctx.topicsDiscussed.has(bestMatch.id) && pool.length > 2) {
    idx = (prevIdx + 2) % pool.length;
  }
  usedResponseIndices[bestMatch.id] = idx;

  let response = pool[idx];

  // ── Personalize with name ──────────────────────────────────────────────
  if (ctx.userName && ctx.messageCount % 3 === 0) {
    // Insert name naturally every 3rd message
    response = `${ctx.userName}, ${response.charAt(0).toLowerCase()}${response.slice(1)}`;
  }

  // ── Add follow-up if first time discussing topic ───────────────────────
  if (bestMatch.followUp && ctx.topicsDiscussed.size <= 3) {
    response = `${response} ${bestMatch.followUp}`;
  }

  auraD.log(
    "fallback",
    "info",
    `Matched topic: ${bestMatch.id}, variant: ${idx}`,
  );
  auraD.increment("fallback.successes");

  return response;
}

// ── Onboarding responses (work fully offline) ────────────────────────────────
export function fallbackOnboardReply(
  step: string,
  input: string,
  name?: string,
): string {
  switch (step) {
    case "ask_name":
      return name
        ? `${name}. Good to meet you. Which company or organization?`
        : "Just your first name. What should I call you?";
    case "ask_company":
      return `Noted. And your role? Recruiter, engineer, founder, or investor?`;
    case "ask_role":
      return `Got it. What brings you here? Exploring Amit's work, evaluating for a role, or a potential partnership?`;
    case "ask_intent":
      return name
        ? `Perfect, ${name}. Ask me anything. What Amit has built, his tech depth, or why you'd want him on your team.`
        : "Got it. Ask me anything about Amit's projects, stack, or how to work with him.";
    default:
      return "Ask me anything about Amit.";
  }
}

// ── Voice-adaptive response modifier ─────────────────────────────────────────
export function adaptToVoice(
  response: string,
  context: FallbackContext,
): string {
  // Shorter responses for concise speakers
  if (context.interactionStyle === "concise" && response.length > 120) {
    const sentences = response.split(/\.\s+/);
    return sentences.slice(0, 2).join(". ") + ".";
  }

  // More technical depth for detailed speakers
  if (context.interactionStyle === "detailed") {
    // Don't truncate, add the follow-up
    return response;
  }

  return response;
}

// ── Session summary (offline) ────────────────────────────────────────────────
export function generateOfflineSummary(): string {
  const topics = Array.from(ctx.topicsDiscussed);
  if (!topics.length) return "";
  const topicNames: Record<string, string> = {
    intro: "Amit's background",
    medical: "medical AI work",
    web3: "Web3 projects",
    stack: "tech stack",
    team: "team building",
    contact: "contact info",
    rates: "rates",
    hire: "hiring reasons",
    projects: "project portfolio",
    ai: "AI work",
    freelance: "freelance availability",
    location: "location",
    impressive: "achievements",
    nonce: "Nonce Blox work",
    government: "early career",
    family: "personal background",
  };
  const discussed = topics
    .map((t) => topicNames[t] || t)
    .slice(0, 3)
    .join(", ");
  return `Discussed: ${discussed}. ${ctx.messageCount} messages exchanged.`;
}
