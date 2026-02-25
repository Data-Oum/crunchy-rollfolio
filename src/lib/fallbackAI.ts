/**
 * src/lib/fallbackAI.ts
 *
 * COMPREHENSIVE LOCAL BRAIN — zero network, zero API.
 * Handles every conversation scenario when Gemini is unavailable.
 *
 * WHAT THIS NOW HANDLES:
 *   - Greetings & small talk
 *   - About Aura / "who are you"
 *   - All Amit career topics (deep)
 *   - Technical deep-dives
 *   - Confused / unclear users
 *   - Frustrated users
 *   - Compliments / sarcasm
 *   - Questions about the AI itself
 *   - Intent detection → tailored response path
 *   - Role-specific deep variants
 *   - Language/accent variations
 *   - Questions we can't answer → graceful redirect
 *   - Voice command echoes that slipped through
 *
 * PHILOSOPHY: Aura speaks AS Amit. First person. Punchy. Under 60 words. No markdown.
 */

import { auraD } from "./diagnostics";

// ─── Types ────────────────────────────────────────────────────────────────────
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
  lastIntent?: string;
  frustrationCount: number;
}

// ─── Intent classification ────────────────────────────────────────────────────
type Intent =
  | "greeting"
  | "farewell"
  | "about_aura"
  | "about_amit"
  | "medical_work"
  | "web3_work"
  | "tech_stack"
  | "team_leadership"
  | "contact"
  | "rates_pricing"
  | "location_availability"
  | "achievements"
  | "why_hire"
  | "projects_portfolio"
  | "ai_ml_work"
  | "freelance_availability"
  | "early_career"
  | "family_personal"
  | "web_frontend"
  | "backend_infra"
  | "confusion"
  | "frustration"
  | "compliment"
  | "small_talk"
  | "meta_question"
  | "help_what_to_ask"
  | "comparison"
  | "unknown";

interface IntentRule {
  intent: Intent;
  patterns: RegExp[];
  priority: number; // higher = checked first
}

const INTENT_RULES: IntentRule[] = [
  {
    intent: "greeting",
    patterns: [
      /^(hi|hey|hello|hiya|howdy|good\s?(morning|afternoon|evening|day)|namaste|what'?s\s+up|yo\s*$|greetings|sup\b)/i,
    ],
    priority: 100,
  },
  {
    intent: "farewell",
    patterns: [
      /\b(bye|goodbye|see\s+you|later|ciao|take\s+care|good\s+night|gotta\s+go|signing\s+off|talk\s+soon)\b/i,
    ],
    priority: 95,
  },
  {
    intent: "about_aura",
    patterns: [
      /\b(who\s+are\s+you|what\s+are\s+you|are\s+you\s+(an?\s+)?ai|are\s+you\s+human|are\s+you\s+real|what.?s\s+your\s+name|tell\s+me\s+about\s+yourself|aura|this\s+(ai|bot|assistant)|how\s+do\s+you\s+work|what\s+can\s+you\s+do|your\s+capabilities)\b/i,
    ],
    priority: 90,
  },
  {
    intent: "help_what_to_ask",
    patterns: [
      /\b(help|what\s+should\s+i\s+ask|don.?t\s+know\s+what|where\s+do\s+i\s+start|how\s+does\s+this\s+work|guide\s+me|what.?s\s+available|options|menu|topics)\b/i,
    ],
    priority: 85,
  },
  {
    intent: "frustration",
    patterns: [
      /\b(not\s+working|broken|useless|terrible|awful|wrong|incorrect|bad\s+(response|answer)|you.?re\s+(wrong|bad|useless)|stop\s+repeating|same\s+answer|don.?t\s+understand\s+me|that.?s\s+not\s+what|didn.?t\s+answer|ignored\s+my)\b/i,
    ],
    priority: 80,
  },
  {
    intent: "compliment",
    patterns: [
      /\b(amazing|impressive|incredible|wow|great|awesome|brilliant|excellent|perfect|love\s+(this|it)|cool|nice|fantastic|well\s+done|good\s+job|you.?re\s+(good|great|amazing))\b/i,
    ],
    priority: 75,
  },
  {
    intent: "small_talk",
    patterns: [
      /\b(how\s+are\s+you|how.?s\s+it\s+going|what.?s\s+new|how.?s\s+your\s+day|you\s+okay|doing\s+well|how\s+have\s+you\s+been|enjoying|having\s+fun)\b/i,
    ],
    priority: 72,
  },
  {
    intent: "meta_question",
    patterns: [
      /\b(can\s+you|could\s+you|do\s+you\s+know|are\s+you\s+able|is\s+it\s+possible|can\s+this|does\s+(this|he)\s+do)\b/i,
    ],
    priority: 68,
  },
  {
    intent: "contact",
    patterns: [
      /\b(contact|email|reach\s+(out|amit)|linkedin|github|phone|call|message\s+(amit|him)|get\s+in\s+touch|how\s+to\s+hire|connect\s+with)\b/i,
    ],
    priority: 65,
  },
  {
    intent: "rates_pricing",
    patterns: [
      /\b(rate|salary|cost|charge|fee|compensation|pay\b|pricing|budget|how\s+much|afford|expensive|cheap|price|invoice|bill|quote)\b/i,
    ],
    priority: 65,
  },
  {
    intent: "freelance_availability",
    patterns: [
      /\b(freelanc|available|availability|when\s+can|start\s+immediately|contract|hire\s+now|open\s+to\s+work|actively\s+looking|job\s+(search|hunt)|unemployed|between\s+jobs|looking\s+for\s+work)\b/i,
    ],
    priority: 60,
  },
  {
    intent: "location_availability",
    patterns: [
      /\b(where|location|based|remote|timezone|india|kolkata|utc|work\s+(from|remotely)|country|city|relocat)\b/i,
    ],
    priority: 58,
  },
  {
    intent: "medical_work",
    patterns: [
      /\b(vitalquest|lunacare|maskwa|nexus\s+app|synapsis|clinical|patient|hipaa|medical|health\s+app|game\s+engine|retina|eye\s+care|therapeutic|mediapipe|blink\s+detection|triage)\b/i,
    ],
    priority: 55,
  },
  {
    intent: "web3_work",
    patterns: [
      /\b(web3|defi|blockchain|nft|solidity|vulcan\s+eleven|ethereum|crypto|smart\s+contract|binance|on.?chain|tokenomics|dapp|nonce\s+blox)\b/i,
    ],
    priority: 55,
  },
  {
    intent: "ai_ml_work",
    patterns: [
      /\b(ai\b|machine\s+learning|rag\s+pipeline|rag\b|llm|mediapipe|tensorflow|computer\s+vision|on.?device|inference|embedding|vector|model\s+training|agentic)\b/i,
    ],
    priority: 55,
  },
  {
    intent: "tech_stack",
    patterns: [
      /\b(stack|skills?|technologies|react\s+native|typescript|node|nestjs|graphql|kubernetes|docker|aws|swift|kotlin|c\+\+|flutter|next\.?js|postgresql|redis|mongodb|firebase)\b/i,
    ],
    priority: 50,
  },
  {
    intent: "team_leadership",
    patterns: [
      /\b(team|leadership|manage|hire|built\s+(a\s+)?team|engineers|people|lead|org|culture|process|21\s+engineers|head\s+of|cto|vp\s+eng)\b/i,
    ],
    priority: 50,
  },
  {
    intent: "achievements",
    patterns: [
      /\b(impressive|best\s+(work|project)|achievement|proud|biggest|hardest|most\s+complex|highlight|standout|difficult|challenge|milestone)\b/i,
    ],
    priority: 48,
  },
  {
    intent: "why_hire",
    patterns: [
      /\b(why\s+(hire|choose|pick|work\s+with)|reason\s+to\s+hire|what\s+makes|different|unique|stand\s+out|value\s+add|advantage|differentiator|why\s+amit)\b/i,
    ],
    priority: 48,
  },
  {
    intent: "projects_portfolio",
    patterns: [
      /\b(project|portfolio|built|shipped|product|app|mvp|startup|case\s+study|demo|show\s+me|examples?|what\s+has\s+he\s+built|previous\s+work|past\s+work)\b/i,
    ],
    priority: 45,
  },
  {
    intent: "web_frontend",
    patterns: [
      /\b(react\b|next\.?js|framer|gsap|tailwind|frontend|ui|ux|animation|canvas|web\s+app|website|landing\s+page|dashboard)\b/i,
    ],
    priority: 42,
  },
  {
    intent: "backend_infra",
    patterns: [
      /\b(backend|server|api\b|database|postgres|mongo|redis|nestjs|node|kubernetes|k8s|docker|aws|cloud|devops|ci.?cd|github\s+actions|cloudwatch)\b/i,
    ],
    priority: 42,
  },
  {
    intent: "early_career",
    patterns: [
      /\b(early|first\s+job|government|gst|webskitter|techpromind|started|beginning|how\s+did\s+he\s+start|origin|background|history)\b/i,
    ],
    priority: 40,
  },
  {
    intent: "family_personal",
    patterns: [
      /\b(family|personal|life|motivation|drive|why\s+(does\s+he\s+)?work|12\s+people|provider|bengali|kolkata\s+life)\b/i,
    ],
    priority: 40,
  },
  {
    intent: "comparison",
    patterns: [
      /\b(vs\b|versus|compare|better\s+than|difference\s+between|over\s+(flutter|java)|compared\s+to)\b/i,
    ],
    priority: 38,
  },
  {
    intent: "about_amit",
    patterns: [
      /\b(tell\s+me\s+about\s+(amit|him)|who\s+is\s+amit|about\s+amit|amit.?s?\s+(story|background|career|experience|profile)|introduce|summary)\b/i,
    ],
    priority: 35,
  },
  {
    intent: "confusion",
    patterns: [
      /\b(what\?|huh\?|sorry\?|didn.?t\s+(get|understand|follow)|confused|unclear|say\s+that\s+again|repeat|pardon|come\s+again|i\s+don.?t\s+get\s+it)\b/i,
    ],
    priority: 30,
  },
];

// ─── Response bank — keyed by intent ─────────────────────────────────────────
type RoleBank = Partial<
  Record<
    "Recruiter" | "Engineer" | "Founder" | "Investor" | "Explorer",
    string[]
  >
>;

interface ResponseEntry {
  responses: string[];
  roleVariants?: RoleBank;
  followUp?: string[];
  contextFollowUp?: string; // used after first mention
}

const RESPONSES: Record<Intent, ResponseEntry> = {
  greeting: {
    responses: [
      "Hey. Aura here — Amit Chakraborty's voice AI. Ask me anything about his work, his stack, or how to hire him.",
      "Good to hear from you. I'm Aura. Eight years of engineering, 18 production apps, 50K users. What do you want to know?",
      "Hello. Aura — Amit's AI. Ask about the medical game engine, Web3 work, or how to get him on your team.",
    ],
    followUp: [
      "What brings you here today?",
      "What are you looking to find out?",
    ],
  },

  farewell: {
    responses: [
      "Good talking. Amit's at amit98ch@gmail.com when you're ready to connect.",
      "Take care. If you want to follow up: amit98ch@gmail.com or LinkedIn at linkedin.com/in/devamitch.",
      "Until next time. Amit's available immediately — reach him at amit98ch@gmail.com.",
    ],
  },

  about_aura: {
    responses: [
      "I'm Aura — a voice AI built into Amit Chakraborty's portfolio. I speak AS Amit. Ask me about his projects, tech depth, rates, or availability. I know everything.",
      "Aura. Amit's personal AI assistant on his portfolio site. I can tell you about 8 years of engineering, 18 shipped apps, a custom game engine, medical AI, Web3 — anything. What do you want to know?",
      "Think of me as Amit's voice. I'm not a generic chatbot. I'm trained on his actual career, projects, and approach. Ask specifically — I'll give you specifics back.",
    ],
    followUp: ["What do you want to know about Amit?"],
  },

  help_what_to_ask: {
    responses: [
      "Good question. Here's what I know: Amit's projects — medical AI, Web3, game engine. His tech stack. Why you'd hire him. His rates. How to reach him. Pick one.",
      "Start anywhere. The medical game engine is wild. The Web3 work was 50K users. Or ask about his rates, his team building, or why he's better than most architects you've talked to.",
      "Try: 'Tell me about the game engine', 'What's his tech stack', 'What does he charge', or 'How do I contact him'. I'll give you the full picture.",
    ],
  },

  about_amit: {
    responses: [
      "Amit Chakraborty. 31. Bengali. Kolkata. Eight years engineering. 18 production apps. 50,000 real users. Built a game engine from scratch. Led 21 engineers from zero. Currently open to the right opportunity.",
      "Eight years. React Native specialist. Medical AI. Web3 at scale. Custom game engine. Team builder. Sole provider for a 12-person family — every decision carries real weight. What angle interests you most?",
      "Amit's the kind of engineer who doesn't need a manager. Built HIPAA systems, DeFi products with 50K users, and a game engine nobody would attempt solo. All while remote, all delivered on time.",
    ],
    roleVariants: {
      Recruiter: [
        "Amit Chakraborty. 8 years. Led 21 engineers with zero HR support. Built medical-grade AI on mobile under HIPAA. 99.9% uptime. Zero post-launch critical bugs on flagship products. What role are you trying to fill?",
      ],
      Engineer: [
        "Fellow engineer? The most interesting thing is probably the game engine — custom React Native, pure C++, Swift, Kotlin, zero external libraries. Powers 5 clinical apps in production. Want to go deep on the architecture?",
      ],
      Founder: [
        "Amit's done the 0-to-1 thing 18 times across medical, Web3, PropTech, music tech. No existing codebase. No team. No template. Just shipping. That's the profile you're looking at.",
      ],
      Investor: [
        "The numbers: 50,000 users. 99.9% uptime. HIPAA-compliant. 18 apps on time. Zero critical post-launch bugs on flagships. 100,000+ Web3 transactions. No legacy debt. That's the ROI track record.",
      ],
    },
    followUp: ["What specifically do you want to dig into?"],
  },

  medical_work: {
    responses: [
      "VitalQuest runs on a game engine I built from scratch. React Native at the core, pure C++, Swift, Kotlin. No Unity, no third-party libs. HIPAA RAG pipeline. 99.9% uptime. Real patients. Real clinical triage.",
      "Five apps at Synapsis Medical: VitalQuest, LunaCare, Eye Care, Nexus, Maskwa. MediaPipe for on-device retina analysis and blink detection. Zero cloud dependency for the vision pipeline. All production, all HIPAA-compliant.",
      "The medical work is the most demanding thing I've built. Clinical-grade AI, a custom game engine for therapeutic apps, and I hired and led the 21-engineer team from nothing. Jan 2025 to Feb 2026, Edmonton remote.",
    ],
    roleVariants: {
      Engineer: [
        "The architecture question everyone asks: why a custom game engine instead of Unity? HIPAA compliance. Can't have a Unity dependency in a clinical system. So I wrote the render loop in C++, Swift for iOS, Kotlin for Android, React Native bridging all of it. Want the breakdown?",
      ],
      Recruiter: [
        "Principal Mobile Architect at Synapsis Medical. Five clinical apps. HIPAA RAG pipelines. 21-engineer team built from zero. 99.9% uptime on systems with real patients depending on them. That's the level.",
      ],
    },
    followUp: [
      "Which part interests you — architecture, the AI pipeline, or the team I built?",
    ],
    contextFollowUp:
      "You want more on the medical work? Ask about the game engine, the RAG pipeline, or the team.",
  },

  web3_work: {
    responses: [
      "DeFi11 is 100% on-chain. Ethereum smart contracts, NFT prize pools, real money — not testnet. Vulcan Eleven hit 50,000 active users with Razorpay and Binance Pay integrations. Both shipped on time, zero critical bugs post-launch.",
      "Three years of Web3 at Nonce Blox in Dubai. 13 apps total. Vulcan Eleven — fantasy sports at 50K users. MusicX — custom C++ audio. DeFi11 — on-chain Ethereum. Housezy — PropTech. Consistent 60fps across all of them.",
      "The Web3 work was real stakes. Smart contracts handling actual funds. NFT marketplace with real collections and real prize pools. 100,000+ transactions processed. And I maintained 60fps on mobile through all of it.",
    ],
    roleVariants: {
      Engineer: [
        "The interesting technical problem in Web3 mobile: keeping 60fps while handling on-chain state transitions. I built a local state prediction layer that optimistically updates the UI, then reconciles with chain state. No jank, no lag. Want to go deeper?",
      ],
    },
    followUp: [
      "Interested in the smart contract architecture, the mobile-blockchain integration, or the scale?",
    ],
    contextFollowUp:
      "More on Web3? Ask about DeFi11 specifically, Vulcan Eleven scale, or the on-chain architecture.",
  },

  ai_ml_work: {
    responses: [
      "HIPAA-compliant RAG pipelines for clinical triage at Synapsis. MediaPipe for on-device retina analysis and blink detection — zero cloud dependency, everything runs locally on the device. TensorFlow for classification. All production.",
      "The AI work is production-grade, not demo-ware. RAG pipelines handling real patient data under HIPAA constraints. MediaPipe running on-device for eye care diagnostics. Built the entire pipeline end-to-end. No ML engineers — just me.",
      "Agentic AI, RAG, computer vision, on-device inference. The constraint that made it interesting: HIPAA means patient data can't leave the device for the vision pipeline. So MediaPipe runs entirely locally. Real-time, 30fps analysis.",
    ],
    roleVariants: {
      Engineer: [
        "The RAG pipeline architecture: embeddings stored locally for offline triage, with a sync layer to cloud when network is available. HIPAA means you can't send raw patient data to an LLM endpoint. So the pipeline does local retrieval + generation with a fine-tuned model. Happy to go deep.",
      ],
    },
    followUp: [
      "Want to know about the RAG architecture, the on-device vision, or how it fits into the clinical workflow?",
    ],
  },

  tech_stack: {
    responses: [
      "React Native — 8 years, production scale, custom native modules. TypeScript everywhere. Backend: NestJS, Node, PostgreSQL, GraphQL, Redis. Cloud: AWS, Kubernetes, Docker, GitHub Actions. AI: RAG, MediaPipe, TensorFlow. Web3: Solidity, Ethereum. Frontend: React, Next.js, Framer, GSAP.",
      "Full vertical. Mobile to backend to cloud to AI to blockchain. The game engine alone required C++, Swift, and Kotlin running simultaneously. Not side projects — 18 production apps with real users.",
      "Primary expertise is React Native — 8 years, every version, every native bridge pattern. TypeScript-first. AWS for infra. But the honest answer is I pick what the problem needs. I've shipped production with 20+ different technologies.",
    ],
    roleVariants: {
      Engineer: [
        "From the ground up: C++/Swift/Kotlin for native, React Native as the cross-platform layer, TypeScript business logic, NestJS backend, PostgreSQL primary DB, Redis for caching, GraphQL API layer, AWS EKS for infra. MediaPipe and TensorFlow for AI. Solidity when Web3 is involved. The game engine is custom across all three native layers.",
      ],
    },
    followUp: ["Want to go deep on any specific part of the stack?"],
  },

  team_leadership: {
    responses: [
      "Hired 21 engineers at Synapsis from absolute zero. No HR department. No playbook. No existing team. Found them, evaluated them, onboarded them, set the culture, built the process. All while simultaneously architecting 5 clinical apps.",
      "Leadership isn't about titles. At Synapsis there was nothing — I built the entire engineering org from a blank page. 21 people. Defined how we work, what quality means, how we ship. That's the kind of ownership most architects don't touch.",
      "Building a team from scratch while shipping production systems is a different category entirely from managing an existing team. Both happened simultaneously at Synapsis. 21 engineers. 5 production clinical apps. Jan 2025 to Feb 2026.",
    ],
    roleVariants: {
      Recruiter: [
        "Leadership evidence: 21 engineers hired and led personally at Synapsis. No HR support. I wrote the job specs, conducted interviews, made offers, set up onboarding, defined the engineering culture, and led sprints — while being the principal architect on 5 clinical apps. That's the full picture.",
      ],
      Founder: [
        "If you're hiring a fractional CTO or engineering lead: I've done it from zero. Not theory — I built a 21-person engineering org at Synapsis from nothing. I know how to hire, how to build culture, how to ship under clinical-grade constraints. Currently open to that kind of engagement.",
      ],
    },
    followUp: [
      "Interested in the hiring process, how I built the culture, or the org structure?",
    ],
  },

  contact: {
    responses: [
      "Email is fastest: amit98ch@gmail.com. LinkedIn: linkedin.com/in/devamitch. GitHub: github.com/devamitch. Phone: +91-9874173663. He usually responds within a few hours.",
      "Best ways to reach Amit: email at amit98ch@gmail.com, LinkedIn at linkedin.com/in/devamitch, or call directly at +91-9874173663. He's active and responsive.",
      "amit98ch@gmail.com is the direct line. LinkedIn works too: linkedin.com/in/devamitch. GitHub for the code: github.com/devamitch. He's available immediately.",
    ],
    followUp: ["Should Amit reach out first, or would you prefer email?"],
  },

  rates_pricing: {
    responses: [
      "Freelance consulting: $100 to $150 per hour. MVP builds: $12K to $25K fixed, 3-month delivery. Fractional CTO: negotiable, equity preferred. Full-time remote internationally: $6K to $10K per month. Currently available and flexible.",
      "Rates depend on engagement model. Freelance hourly is $100 to $150. Fixed project starts at $12K. Full-time remote is $6K to $10K monthly. Fractional CTO is equity-first. All of it negotiable for the right mission.",
      "Currently open and flexible on terms. Freelance at $100 to $150 per hour. Full-time internationally $6K to $10K depending on scope. MVP builds $12K fixed. For the right long-term engagement, everything is negotiable.",
    ],
    followUp: [
      "What kind of engagement are you thinking — freelance, full-time, or a project?",
    ],
    contextFollowUp:
      "The rates I mentioned — what engagement model were you considering?",
  },

  location_availability: {
    responses: [
      "Kolkata, India. UTC plus 5:30. Fully remote for 6 years. Worked async with teams in Canada, Dubai, US, UK. No timezone has ever been a problem. Available immediately.",
      "Based in Kolkata. Remote-first. 6 years of distributed teamwork — async is second nature. Currently available. Can start immediately on the right opportunity.",
      "India, UTC plus 5:30. Remote since 2019. Every project for the last 6 years has been distributed across timezones. Currently available, flexible on start date.",
    ],
    followUp: ["When do you need someone to start?"],
  },

  achievements: {
    responses: [
      "Two things stand out. The game engine — custom React Native, pure C++, Swift, Kotlin, zero external libraries, powering 5 clinical apps serving real patients. And building 21 engineers from nothing while shipping those apps simultaneously.",
      "The hardest thing: HIPAA-compliant medical AI on mobile with zero cloud dependency for the vision pipeline. Real patients, real clinical stakes, no margin for error. While simultaneously leading a team I built from scratch.",
      "Most engineers wouldn't attempt a custom game engine solo. I did it for clinical-grade apps under HIPAA constraints. The technical constraint made it harder and more interesting. That's probably the most complex thing in the portfolio.",
    ],
    roleVariants: {
      Investor: [
        "50,000 users. 99.9% uptime. HIPAA-compliant systems. 18 apps shipped on deadline. Zero critical post-launch bugs on flagship products. 100,000+ Web3 transactions. No legacy debt. Those are the metrics.",
      ],
    },
  },

  why_hire: {
    responses: [
      "The combination is genuinely rare: deep mobile architecture, AI in production, Web3 at scale, team building from zero. All simultaneously. Not sequentially. Currently available and looking for the right fit.",
      "Not just an engineer. An architect who leads, a founder who codes, a builder who ships under real constraints. Medical-grade AI. 50K-user Web3 products. 21-person team. 6 years remote. Available now.",
      "Most engineers specialize. Mobile OR backend OR AI OR Web3 OR leadership. I've shipped production in all of those simultaneously while being the sole architect. That's a rare combination.",
    ],
    roleVariants: {
      Recruiter: [
        "The leadership plus depth combination. 21 engineers hired and led. Principal architect on 5 clinical apps. HIPAA compliance. 99.9% uptime. 8 years of React Native at production scale. The person who doesn't need a tech manager because they ARE the tech manager.",
      ],
      Founder: [
        "If you need someone who takes ownership and ships without a playbook: I've done 0-to-1 eighteen times. No hand-holding. No existing codebase to lean on. Just defining the architecture, building the team, and delivering. Currently available for the right mission.",
      ],
    },
    followUp: [
      "What specifically are you evaluating for — a role, a project, or a longer-term engagement?",
    ],
  },

  projects_portfolio: {
    responses: [
      "18 apps shipped. Highlights: VitalQuest — medical game engine, clinical triage, HIPAA. Vulcan Eleven — fantasy sports, 50K users, Binance Pay. DeFi11 — 100% on-chain Ethereum. MusicX — custom C++ audio. Housezy — PropTech GraphQL. All production.",
      "The portfolio spans medical AI, fantasy sports, DeFi, music tech, and PropTech. Common thread: every single one is in production with real users, delivered on time, zero critical post-launch bugs on flagships.",
      "Across two companies: 5 clinical apps at Synapsis Medical, 13 apps at Nonce Blox in Dubai. 8 years, 18 total. 50,000 users. 100,000+ Web3 transactions. Game engine. AI pipelines. Blockchain. All mobile-native.",
    ],
    followUp: [
      "Which domain interests you most — medical, Web3, or something else?",
    ],
    contextFollowUp:
      "Want to go deeper on a specific project? VitalQuest, Vulcan Eleven, or DeFi11 each have a lot of story.",
  },

  freelance_availability: {
    responses: [
      "Currently available and actively looking. Open to freelance, contract, full-time remote, or fractional CTO. Can start immediately. Flexible on terms for the right mission.",
      "Available now. Just completed the role at Synapsis Medical. Open to: freelance hourly, fixed-price projects, full-time remote, or fractional CTO. What's the scope you're working with?",
      "Immediately available. Six years of remote-only work — no ramp-up needed, no timezone adjustment period. Freelance starts at $100 per hour. Fixed projects from $12K. What do you need built?",
    ],
    followUp: ["What's the project or role you're considering?"],
  },

  web_frontend: {
    responses: [
      "React and Next.js for web. Framer Motion, GSAP for animations. Canvas API for custom rendering — this portfolio's plasma orb is pure Canvas. Tailwind for styling. I build things that move and feel alive, not static pages.",
      "Frontend work spans React, Next.js, Framer Motion, GSAP, and raw Canvas. The animated elements on this portfolio — the plasma orb, the transitions — are custom Canvas implementations. Not library defaults.",
    ],
    followUp: ["Need a web app built, or are you evaluating for a role?"],
  },

  backend_infra: {
    responses: [
      "Backend: NestJS, Node.js, PostgreSQL, MongoDB, GraphQL, Redis. Infrastructure: AWS, Kubernetes, Docker, GitHub Actions, CloudWatch. Built auto-scaling systems at Synapsis that maintained 99.9% uptime under clinical load.",
      "Full-stack infra ownership. NestJS APIs, PostgreSQL at scale, Redis caching, GraphQL for complex data graphs. AWS + Kubernetes + Docker for deployment. CloudWatch for observability. I've owned the infra end-to-end, not just the app layer.",
    ],
    followUp: [
      "Specific stack question, or evaluating for a backend/infra role?",
    ],
  },

  early_career: {
    responses: [
      "Started at Techpromind and Webskitters — 2017 to 2021. 13 government contracts. Built the GST ecosystem platform from scratch. 40% efficiency gain over the legacy system. Security hardening, SQL injection prevention, XSS mitigation. That's where I learned ownership matters more than titles.",
    ],
    followUp: ["Want to know more about what came after the government work?"],
  },

  family_personal: {
    responses: [
      "Sole provider for a 12-person family. Every decision I make — which project, which client, which trade-off — carries that weight. It's why I don't take things lightly and why I deliver on time. The stakes are always real.",
    ],
    followUp: ["Anything else you want to know about what drives the work?"],
  },

  comparison: {
    responses: [
      "React Native vs Flutter: for production scale with custom native modules, React Native wins. The bridge is more mature, the native interop is more flexible, and 8 years of depth means I know every edge case. Flutter is fine for simpler apps.",
      "The honest comparison: I've shipped 18 production apps with React Native. That's not a preference — it's 8 years of evidence at scale. I know what breaks, what doesn't, and how to push past framework limits when needed.",
    ],
  },

  confusion: {
    responses: [
      "No worries. Ask about anything: Amit's projects, his tech stack, his rates, how to contact him, or why you'd hire him. Any of those work.",
      "Let me try again. I know everything about Amit Chakraborty's work and career. Projects, stack, availability, rates, contact — just ask directly and I'll give you a direct answer.",
      "Totally fine. Try a simpler question: 'What has he built?', 'What does he charge?', or 'How do I contact him?' I'll give you a straight answer.",
    ],
  },

  frustration: {
    responses: [
      "Fair — let me be more direct. What specifically do you want to know? I'll give you a one-sentence answer if that's what you need.",
      "Understood. Ask me one specific question and I'll give you the clearest answer I can. What are you actually trying to find out?",
      "I hear you. Let's reset. One question, one direct answer. What do you need to know?",
    ],
  },

  compliment: {
    responses: [
      "Glad it's useful. Amit built this — fitting that the portfolio AI reflects the same attention to detail as his apps. What else do you want to know?",
      "Thanks. There's a lot more to dig into. What's the part of Amit's work that actually interests you?",
      "Appreciate it. There's more depth if you want it — the game engine, the medical AI, the team building. Ask anything.",
    ],
  },

  small_talk: {
    responses: [
      "Doing well. Ready to help you find out anything about Amit. What brought you here?",
      "All good. More interested in what you came here to learn. What are you looking for?",
      "Good. Let's get into it — what do you want to know about Amit or his work?",
    ],
  },

  meta_question: {
    responses: [
      "Yes — ask me anything about Amit Chakraborty. His projects, stack, availability, rates, contact info. I know it all. What specifically?",
      "I can cover his entire career — 8 years, 18 apps, game engine, medical AI, Web3, team building, rates, how to contact him. What do you want?",
    ],
  },

  unknown: {
    responses: [
      "That's outside what I know best. Try asking about Amit's projects, his tech stack, rates, or how to hire him. I'm specific to his career.",
      "Not my area. Ask me about the game engine, Web3 work, medical AI, his rates, or how to reach him — those I can answer in depth.",
      "I'm focused on Amit's work and career. Ask about a specific project, technology, or how to work with him and I'll give you a real answer.",
    ],
  },
};

// ─── Greeting variants ────────────────────────────────────────────────────────
const RETURNING_GREETINGS = [
  (name: string, time: string) =>
    `Good ${time}, ${name}. What do you need today?`,
  (name: string) =>
    `${name}. Good to hear from you again. What's on your mind?`,
  (name: string) => `Back again, ${name}. Ask me anything.`,
  (name: string, time: string) => `${name}, good ${time}. Let's get into it.`,
  (name: string) => `${name}. Ready when you are.`,
];

const FIRST_TIME_GREETINGS = [
  (time: string) =>
    `Good ${time}. I'm Aura — Amit Chakraborty's portfolio AI. What's your name?`,
  () => `Hey. Amit Chakraborty's voice AI. What should I call you?`,
  (time: string) =>
    `Good ${time}. Aura here. Tell me your name and I'll personalize this.`,
  () =>
    `Hello. I'm Aura. I know everything about Amit's career and work. Who am I speaking with?`,
];

// ─── Context ──────────────────────────────────────────────────────────────────
const ctx: FallbackContext = {
  topicsDiscussed: new Set(),
  messageCount: 0,
  frustrationCount: 0,
};

let usedResponseIndices: Record<string, number> = {};
let usedGreetingIdx = -1;

export function resetFallbackContext(): void {
  ctx.topicsDiscussed.clear();
  ctx.messageCount = 0;
  ctx.frustrationCount = 0;
  ctx.lastTopic = undefined;
  ctx.lastIntent = undefined;
  usedResponseIndices = {};
  usedGreetingIdx = -1;
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
    const idx = (sessionCount - 1) % RETURNING_GREETINGS.length;
    return RETURNING_GREETINGS[idx](name, time);
  }

  usedGreetingIdx = (usedGreetingIdx + 1) % FIRST_TIME_GREETINGS.length;
  return FIRST_TIME_GREETINGS[usedGreetingIdx](time);
}

// ─── Intent detection ─────────────────────────────────────────────────────────
function detectIntent(msg: string): Intent {
  const lower = msg.toLowerCase().trim();

  // Sort by priority descending
  const sorted = [...INTENT_RULES].sort((a, b) => b.priority - a.priority);

  for (const rule of sorted) {
    for (const pattern of rule.patterns) {
      if (pattern.test(lower)) {
        return rule.intent;
      }
    }
  }

  // Fuzzy fallback — test individual words > 3 chars
  const words = lower.split(/\s+/).filter((w) => w.length > 3);
  for (const rule of sorted) {
    for (const pattern of rule.patterns) {
      for (const word of words) {
        if (pattern.test(word)) {
          return rule.intent;
        }
      }
    }
  }

  return "unknown";
}

// ─── Pick response variant ────────────────────────────────────────────────────
function pickResponse(intent: Intent, entry: ResponseEntry): string {
  // Role-specific variant first
  let pool = entry.responses;
  if (entry.roleVariants && ctx.userRole) {
    const rolePool = entry.roleVariants[ctx.userRole as keyof RoleBank];
    if (rolePool?.length) pool = [...rolePool, ...pool];
  }

  const key = intent;
  const prevIdx = usedResponseIndices[key] ?? -1;
  // Rotate through variants, skip if repeated topic
  const alreadyDiscussed = ctx.topicsDiscussed.has(intent);
  const step = alreadyDiscussed && pool.length > 2 ? 2 : 1;
  const idx = (prevIdx + step) % pool.length;
  usedResponseIndices[key] = idx;

  return pool[idx];
}

// ─── Personalization ──────────────────────────────────────────────────────────
function personalize(response: string): string {
  if (ctx.userName && ctx.messageCount % 4 === 0) {
    // Insert name naturally (avoid double-naming)
    if (!response.startsWith(ctx.userName)) {
      return `${ctx.userName}, ${response.charAt(0).toLowerCase()}${response.slice(1)}`;
    }
  }
  return response;
}

// ─── Follow-up selection ──────────────────────────────────────────────────────
function getFollowUp(entry: ResponseEntry, intent: Intent): string {
  // Use contextFollowUp if topic was already discussed
  if (ctx.topicsDiscussed.has(intent) && entry.contextFollowUp) {
    return ` ${entry.contextFollowUp}`;
  }
  // Only add follow-up if fewer than 4 topics discussed (avoid being annoying)
  if (entry.followUp && ctx.topicsDiscussed.size < 4) {
    const idx = ctx.messageCount % entry.followUp.length;
    return ` ${entry.followUp[idx]}`;
  }
  return "";
}

// ─── Main chat function ───────────────────────────────────────────────────────
export function fallbackChat(message: string): string {
  ctx.messageCount++;
  auraD.log(
    "fallback",
    "info",
    `Processing: "${message.slice(0, 60)}" (msg #${ctx.messageCount})`,
  );
  auraD.increment("fallback.requests");

  const intent = detectIntent(message);
  auraD.log("fallback", "info", `Intent: ${intent}`);

  // Track frustration
  if (intent === "frustration") {
    ctx.frustrationCount++;
    if (ctx.frustrationCount >= 2) {
      // Offer to help them restart
      return "I keep missing what you need. Let me try differently — what's the one thing you came here to find out? I'll give you a direct answer.";
    }
  } else {
    ctx.frustrationCount = Math.max(0, ctx.frustrationCount - 1);
  }

  const entry = RESPONSES[intent] || RESPONSES.unknown;

  ctx.topicsDiscussed.add(intent);
  ctx.lastIntent = intent;

  let response = pickResponse(intent, entry);
  response = personalize(response);

  // Add follow-up for conversational flow
  const followUp = getFollowUp(entry, intent);
  if (followUp) response += followUp;

  auraD.increment("fallback.successes");
  return response;
}

// ─── Onboarding responses ─────────────────────────────────────────────────────
export function fallbackOnboardReply(
  step: string,
  _input: string,
  name?: string,
): string {
  switch (step) {
    case "ask_name":
      return name
        ? `${name}. Good to meet you. Which company or organization are you with?`
        : "Just your first name is fine. What should I call you?";
    case "ask_company":
      return "Noted. What's your role — recruiter, engineer, founder, or investor?";
    case "ask_role":
      return "Got it. What brings you here — exploring Amit's work, evaluating for a role, or a potential project?";
    case "ask_intent":
      return name
        ? `Perfect, ${name}. Ask me anything — what Amit's built, his tech depth, his rates, or why you'd want him on your team.`
        : "Got it. Ask me anything about Amit's projects, stack, availability, or how to work with him.";
    default:
      return "Ask me anything about Amit.";
  }
}

// ─── Voice-adaptive modifier ──────────────────────────────────────────────────
export function adaptToVoice(
  response: string,
  context: FallbackContext,
): string {
  if (context.interactionStyle === "concise" && response.length > 120) {
    const sentences = response.split(/\.\s+/);
    return sentences.slice(0, 2).join(". ") + ".";
  }
  return response;
}

// ─── Offline session summary ──────────────────────────────────────────────────
export function generateOfflineSummary(): string {
  const topics = Array.from(ctx.topicsDiscussed);
  if (!topics.length) return "";

  const topicLabels: Record<string, string> = {
    greeting: "introduction",
    about_amit: "Amit's background",
    medical_work: "medical AI work",
    web3_work: "Web3 projects",
    tech_stack: "tech stack",
    team_leadership: "team building",
    contact: "contact info",
    rates_pricing: "rates",
    why_hire: "hiring case",
    projects_portfolio: "project portfolio",
    ai_ml_work: "AI/ML work",
    freelance_availability: "freelance availability",
    location_availability: "location",
    achievements: "achievements",
    backend_infra: "backend/infra",
    web_frontend: "frontend work",
    early_career: "early career",
    family_personal: "personal background",
  };

  const discussed = topics
    .filter((t) => t !== "greeting" && t !== "small_talk" && t !== "farewell")
    .map((t) => topicLabels[t] || t)
    .slice(0, 3)
    .join(", ");

  if (!discussed) return `${ctx.messageCount} messages exchanged.`;
  return `Discussed ${discussed}. ${ctx.messageCount} messages.`;
}
