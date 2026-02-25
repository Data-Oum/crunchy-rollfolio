import { auraD } from "./diagnostics";

// ─── Language support ─────────────────────────────────────────────────────────
export type SupportedLang = "en" | "hi" | "ja" | "ko";

export function detectLanguage(text: string): SupportedLang {
  if (!text) return "en";
  // Japanese: hiragana, katakana, kanji
  if (/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(text)) return "ja";
  // Korean: Hangul syllables
  if (/[\uAC00-\uD7AF\u1100-\u11FF]/.test(text)) return "ko";
  // Devanagari (Hindi script)
  if (/[\u0900-\u097F]/.test(text)) return "hi";
  // Romanized Hindi keywords
  if (
    /\b(kya|aap|main|haan|nahi|bahut|theek|batao|kaisa|kyun|kahan|kitna|matlab|samjha|bolo|yaar|bhai)\b/i.test(
      text,
    )
  )
    return "hi";
  return "en";
}

// ─── Types ────────────────────────────────────────────────────────────────────
export interface FallbackContext {
  userName?: string;
  userRole?: string;
  userCompany?: string;
  userIntent?: string;
  topicsDiscussed: Set<string>;
  messageCount: number;
  lang: SupportedLang;
  voiceTone?: "calm" | "excited" | "neutral" | "frustrated" | "unknown";
  interactionStyle?: "concise" | "detailed" | "questioning" | "exploring";
  lastIntent?: string;
  lastTopic?: string;
  frustrationCount: number;
  // Conversation memory — what we know the user cares about
  memory: {
    askedAboutMedical?: boolean;
    askedAboutWeb3?: boolean;
    askedAboutStack?: boolean;
    askedAboutLeadership?: boolean;
    askedAboutRates?: boolean;
    turnCount: number;
  };
}

// ─── Intent types ─────────────────────────────────────────────────────────────
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
  | "comparison"
  | "about_amit"
  | "confusion"
  | "frustration"
  | "compliment"
  | "small_talk"
  | "meta_question"
  | "help_what_to_ask"
  | "unknown";

interface IntentRule {
  intent: Intent;
  patterns: RegExp[];
  priority: number;
}

const INTENT_RULES: IntentRule[] = [
  {
    intent: "greeting",
    patterns: [
      /^(hi|hey|hello|hiya|howdy|good\s?(morning|afternoon|evening|day)|namaste|what'?s\s+up|yo\s*$|greetings|sup\b)/i,
      /^(konnichiwa|konbanwa|ohayo|annyeong|yeoboseyo|namaskar|salut|hola)\b/i,
      /^(kya\s+haal|kaise\s+ho|kyouwa|hajimemashite)\b/i,
    ],
    priority: 100,
  },
  {
    intent: "farewell",
    patterns: [
      /\b(bye|goodbye|see\s+you|later|ciao|take\s+care|good\s+night|gotta\s+go|talk\s+soon|sayonara|annyeong|phir\s+milenge|mata\s+ne|またね|さようなら|안녕|अलविदा)\b/i,
    ],
    priority: 95,
  },
  {
    intent: "about_aura",
    patterns: [
      /\b(who\s+are\s+you|what\s+are\s+you|are\s+you\s+(an?\s+)?ai|are\s+you\s+human|aura|what.?s\s+your\s+name|tell\s+me\s+about\s+yourself|how\s+do\s+you\s+work|what\s+can\s+you\s+do)\b/i,
      /\b(tum\s+kaun|aap\s+kaun|kya\s+aap\s+ai|あなたは誰|あなたはAIですか|누구세요|당신은 AI)\b/i,
    ],
    priority: 90,
  },
  {
    intent: "help_what_to_ask",
    patterns: [
      /\b(help|what\s+should\s+i\s+ask|don.?t\s+know\s+what|where\s+do\s+i\s+start|guide\s+me|options|topics|kya\s+puchu|何を聞けば|何聞けばいい|뭘 물어볼까)\b/i,
    ],
    priority: 85,
  },
  {
    intent: "frustration",
    patterns: [
      /\b(not\s+working|broken|useless|terrible|wrong|incorrect|stop\s+repeating|same\s+answer|don.?t\s+understand\s+me|didn.?t\s+answer|kuch\s+samjha\s+nahi|wakannai|モルカー)\b/i,
    ],
    priority: 80,
  },
  {
    intent: "compliment",
    patterns: [
      /\b(amazing|impressive|incredible|wow|great|awesome|brilliant|excellent|love\s+(this|it)|cool|fantastic|well\s+done|sugoi|すごい|최고|waah|shandar|zabardast)\b/i,
    ],
    priority: 75,
  },
  {
    intent: "small_talk",
    patterns: [
      /\b(how\s+are\s+you|how.?s\s+it\s+going|what.?s\s+new|doing\s+well|kaise\s+ho|genki|元気|잘 지내)\b/i,
    ],
    priority: 72,
  },
  {
    intent: "meta_question",
    patterns: [
      /\b(can\s+you|could\s+you|do\s+you\s+know|are\s+you\s+able|is\s+it\s+possible)\b/i,
    ],
    priority: 68,
  },
  {
    intent: "contact",
    patterns: [
      /\b(contact|email|reach|linkedin|github|phone|call|get\s+in\s+touch|how\s+to\s+hire|connect|sampark|renraku|連絡|연락)\b/i,
    ],
    priority: 65,
  },
  {
    intent: "rates_pricing",
    patterns: [
      /\b(rate|salary|cost|charge|fee|compensation|pay\b|pricing|how\s+much|price|kitna|ryokin|料金|いくら|비용|얼마)\b/i,
    ],
    priority: 65,
  },
  {
    intent: "freelance_availability",
    patterns: [
      /\b(freelanc|available|availability|when\s+can|start\s+immediately|contract|hire\s+now|looking\s+for\s+work|currently\s+available|uplabdh|mijika|フリーランス|freelancer|프리랜서)\b/i,
    ],
    priority: 60,
  },
  {
    intent: "location_availability",
    patterns: [
      /\b(where|location|based|remote|timezone|india|kolkata|utc|country|city|kahan\s+hai|doko|どこ|어디)\b/i,
    ],
    priority: 58,
  },
  {
    intent: "medical_work",
    patterns: [
      /\b(vitalquest|lunacare|maskwa|nexus\s+app|synapsis|clinical|patient|hipaa|medical|health\s+app|game\s+engine|retina|eye\s+care|mediapipe|blink\s+detection|triage|chiryou|治療|의료)\b/i,
    ],
    priority: 55,
  },
  {
    intent: "web3_work",
    patterns: [
      /\b(web3|defi|blockchain|nft|solidity|vulcan\s+eleven|ethereum|crypto|smart\s+contract|binance|on.?chain|nonce\s+blox|ブロックチェーン|블록체인)\b/i,
    ],
    priority: 55,
  },
  {
    intent: "ai_ml_work",
    patterns: [
      /\b(ai\b|machine\s+learning|rag\s+pipeline|rag\b|llm|mediapipe|tensorflow|computer\s+vision|on.?device|inference|agentic|jinkou\s+chinou|人工知能|인공지능|AI)\b/i,
    ],
    priority: 55,
  },
  {
    intent: "tech_stack",
    patterns: [
      /\b(stack|skills?|technologies|react\s+native|typescript|node|nestjs|graphql|kubernetes|docker|aws|swift|kotlin|c\+\+|next\.?js|postgresql|redis|mongodb|firebase|gijutsu|技術|기술)\b/i,
    ],
    priority: 50,
  },
  {
    intent: "team_leadership",
    patterns: [
      /\b(team|leadership|manage|hire|built\s+(a\s+)?team|engineers|lead|culture|21\s+engineers|cto|チーム|팀|team\s+banana|neta)\b/i,
    ],
    priority: 50,
  },
  {
    intent: "achievements",
    patterns: [
      /\b(impressive|best\s+(work|project)|achievement|proud|biggest|highlight|standout|milestone|seika|成果|성과)\b/i,
    ],
    priority: 48,
  },
  {
    intent: "why_hire",
    patterns: [
      /\b(why\s+(hire|choose|pick|work\s+with)|reason\s+to\s+hire|what\s+makes|different|unique|stand\s+out|naze\s+yatou|왜 채용|kyon\s+hire)\b/i,
    ],
    priority: 48,
  },
  {
    intent: "projects_portfolio",
    patterns: [
      /\b(project|portfolio|built|shipped|product|app|mvp|examples?|previous\s+work|past\s+work|shigoto|仕事|작업)\b/i,
    ],
    priority: 45,
  },
  {
    intent: "web_frontend",
    patterns: [
      /\b(react\b|next\.?js|framer|gsap|tailwind|frontend|ui|ux|animation|canvas|web\s+app|website)\b/i,
    ],
    priority: 42,
  },
  {
    intent: "backend_infra",
    patterns: [
      /\b(backend|server|api\b|database|postgres|mongo|redis|nestjs|kubernetes|k8s|docker|aws|cloud|devops)\b/i,
    ],
    priority: 42,
  },
  {
    intent: "early_career",
    patterns: [
      /\b(early|first\s+job|government|gst|webskitter|techpromind|started|beginning|how\s+did\s+he\s+start|origin|background)\b/i,
    ],
    priority: 40,
  },
  {
    intent: "family_personal",
    patterns: [
      /\b(family|personal|life|motivation|drive|12\s+people|provider|bengali|kolkata\s+life|parivaar|kazoku|家族|가족)\b/i,
    ],
    priority: 40,
  },
  {
    intent: "comparison",
    patterns: [
      /\b(vs\b|versus|compare|better\s+than|difference\s+between|compared\s+to|hikaku|比較|비교)\b/i,
    ],
    priority: 38,
  },
  {
    intent: "about_amit",
    patterns: [
      /\b(tell\s+me\s+about\s+(amit|him)|who\s+is\s+amit|about\s+amit|amit.?s?\s+(story|background|career|experience)|introduce|summary)\b/i,
    ],
    priority: 35,
  },
  {
    intent: "confusion",
    patterns: [
      /\b(what\?|huh\?|sorry\?|didn.?t\s+(get|understand|follow)|confused|repeat|pardon|samjha\s+nahi|wakannai|分からない|모르겠어)\b/i,
    ],
    priority: 30,
  },
];

// ─── Multilingual response pools ─────────────────────────────────────────────
type LangMap = Record<SupportedLang, string[]>;

// Bridge phrases — natural connectors that vary each time
const BRIDGES: Record<SupportedLang, string[]> = {
  en: [
    "Here's what matters —",
    "The short version:",
    "Real talk:",
    "This is the part worth knowing:",
    "Most people ask this, so:",
  ],
  hi: [
    "Yahan suniye —",
    "Seedha baat:",
    "Honestly kehun toh:",
    "Yeh jaanna zaroori hai:",
    "Zyada log yahi poochte hain:",
  ],
  ja: [
    "要するに —",
    "端的に言うと:",
    "正直に言えば:",
    "大事なのはここ:",
    "よく聞かれるので:",
  ],
  ko: [
    "핵심은 —",
    "간단히 말하면:",
    "솔직히 말하면:",
    "중요한 건:",
    "많이들 물어보셔서:",
  ],
};

// Follow-up questions pool
const FOLLOW_UPS: Record<SupportedLang, string[]> = {
  en: [
    "What do you want to dig into?",
    "What angle matters most to you?",
    "What are you actually trying to figure out?",
    "Does that answer it, or do you want more?",
    "What's the next question?",
    "Which part is most relevant to you?",
  ],
  hi: [
    "Aur kya jaanna chahte hain?",
    "Kaunsa hissa aapke liye important hai?",
    "Kuch aur bataun?",
    "Poora hua ya aur chahiye?",
    "Agla sawaal?",
  ],
  ja: [
    "もっと詳しく聞きたいことはありますか？",
    "どの部分が一番気になりますか？",
    "他に何か聞きたいことは？",
    "それで十分ですか、それとも詳しく説明しましょうか？",
    "次の質問は？",
  ],
  ko: [
    "더 알고 싶은 게 있으신가요?",
    "어떤 부분이 가장 궁금하세요?",
    "다른 질문 있으신가요?",
    "이 정도면 충분한가요, 더 설명해 드릴까요?",
    "다음 질문은요?",
  ],
};

// Core response pools per intent, per language
// Format: [factual lead, contextual expansion, punchy closer]
const RESPONSE_POOL: Partial<Record<Intent, LangMap>> = {
  greeting: {
    en: [
      "Aura here — Amit Chakraborty's voice AI. Eight years of engineering, 18 production apps, 50K users. What do you want to know?",
      "Hey. I'm Aura. Built to speak as Amit. Ask about the medical game engine, the Web3 work, his rates — anything. What brings you here?",
      "Good to hear from you. Aura — Amit's AI. Whether you're recruiting, evaluating, or just curious, I've got the full picture. What's your angle?",
      "Hello. Aura. I know Amit's entire career in detail — 8 years, 18 apps, medical AI, Web3, team building, rates. Start anywhere.",
    ],
    hi: [
      "Namaste. Main Aura hun — Amit Chakraborty ki voice AI. Aath saal ki engineering, 18 production apps, 50K users. Kya jaanna chahte hain?",
      "Hey. Aura hun main. Medical game engine, Web3 kaam, ya rates ke baare mein poochho — sab jawab dunga. Aap kahan se shuru karna chahte hain?",
      "Aapka swagat hai. Amit ki puri career mujhe pata hai — sab kuch. Poochho kuch bhi.",
    ],
    ja: [
      "こんにちは。AURAです — アミット・チャクラボルティのボイスAIです。8年のエンジニアリング経験、18本の本番アプリ、5万人のユーザー。何を知りたいですか？",
      "どうぞ。私はAURA。アミットのAIです。医療ゲームエンジン、Web3、料金など何でも聞いてください。",
      "はじめまして。AURAです。アミットのキャリア全体を詳しく知っています。何から始めましょうか？",
    ],
    ko: [
      "안녕하세요. 저는 AURA — 아밋 차크라보르티의 음성 AI입니다. 8년 엔지니어링, 앱 18개, 5만 사용자. 무엇을 알고 싶으신가요?",
      "안녕하세요. AURA입니다. 의료 게임 엔진, Web3 작업, 요금 등 무엇이든 물어보세요.",
      "반갑습니다. 아밋의 경력 전체를 자세히 알고 있습니다. 어디서 시작할까요?",
    ],
  },

  farewell: {
    en: [
      "Good talking. Reach Amit at amit98ch@gmail.com — he responds within hours.",
      "Take care. amit98ch@gmail.com or LinkedIn: linkedin.com/in/devamitch when you're ready to move forward.",
      "Until next time. Amit's available immediately — email is fastest.",
    ],
    hi: [
      "Achha laga baat karke. amit98ch@gmail.com pe contact karo — jaldi reply karta hai.",
      "Dhyan rakhiye. Jab ready hon, amit98ch@gmail.com pe likhna.",
      "Phir milenge. Amit abhi available hai — email sabse fast hai.",
    ],
    ja: [
      "お話しできてよかったです。amit98ch@gmail.comまでご連絡ください。",
      "またいつでも。LinkedIn: linkedin.com/in/devamitch でもご連絡いただけます。",
    ],
    ko: [
      "좋은 대화였습니다. amit98ch@gmail.com으로 연락하시면 빠르게 답장 드립니다.",
      "또 언제든지 오세요. LinkedIn: linkedin.com/in/devamitch 도 있습니다.",
    ],
  },

  about_aura: {
    en: [
      "I'm Aura — Amit's voice AI on his portfolio. Not a chatbot. I speak as him, with his actual career knowledge. Projects, rates, availability, technical depth. I know it all.",
      "Think of me as Amit's voice when he's not in the room. Built on 8 years of real career data. Ask specifically and you'll get specific answers — not generic AI fluff.",
      "AURA. Amit's portfolio AI. I don't hallucinate his career — I know every project, every tech decision, every number. Try me with a specific question.",
    ],
    hi: [
      "Main Aura hun — Amit ki portfolio AI. Chatbot nahi. Main Amit ki taraf se bolta hun, unki asli career knowledge ke saath. Poochho kuch bhi.",
      "Main Amit ki awaaz hun jab woh room mein nahi hote. 8 saal ka data — projects, rates, team, tech sab. Kuch specific poochho.",
    ],
    ja: [
      "私はAURA — アミットのポートフォリオAIです。チャットボットではありません。実際のキャリアデータに基づいてアミットとして話します。具体的に聞いてください。",
      "AURAです。アミットの声として機能します。プロジェクト、料金、技術の深さ — すべて知っています。",
    ],
    ko: [
      "저는 AURA — 아밋의 포트폴리오 AI입니다. 챗봇이 아니에요. 실제 경력 데이터를 기반으로 아밋으로서 말합니다. 구체적으로 물어보세요.",
      "AURA입니다. 프로젝트, 요금, 기술 깊이 — 모두 알고 있습니다.",
    ],
  },

  about_amit: {
    en: [
      "Amit Chakraborty. 31. Bengali. Kolkata. Eight years engineering. 18 production apps. 50,000 real users. Built a custom game engine from scratch. Led 21 engineers from zero. Currently available.",
      "Here's the honest summary: 8 years, React Native specialist, built medical AI that real patients depend on, shipped Web3 products with 50K users, hired and led 21 engineers, all remote. Now looking for the right next thing.",
      "The kind of engineer who doesn't wait for a manager. HIPAA medical systems, DeFi at scale, a custom game engine nobody else would attempt solo. All on time. What specifically are you evaluating?",
    ],
    hi: [
      "Amit Chakraborty. 31 saal. Bengali. Kolkata. Aath saal engineering. 18 production apps. 50,000 real users. Khud se game engine banaya. 21 engineers lead kiye. Abhi available hain.",
      "Seedha baat: 8 saal, React Native specialist, medical AI, Web3 at scale, 21-engineer team. Sab remote. Ab sahi opportunity dhundh rahe hain.",
    ],
    ja: [
      "アミット・チャクラボルティ。31歳。ベンガリ人。コルカタ在住。8年のエンジニアリング。18本の本番アプリ。5万人の実ユーザー。カスタムゲームエンジンをゼロから構築。21人のエンジニアをリード。現在採用活動中。",
      "8年間、React Nativeスペシャリスト。医療AI、Web3 at scale、21人のエンジニアチームを構築。すべてリモート。今は次のステップを探しています。",
    ],
    ko: [
      "아밋 차크라보르티. 31세. 벵골 출신. 콜카타. 8년 엔지니어링. 앱 18개. 실사용자 5만 명. 게임 엔진을 처음부터 구축. 엔지니어 21명 리드. 현재 구직 중.",
      "8년, React Native 전문가, 의료 AI, Web3, 21인 팀. 모두 리모트. 지금 적합한 기회를 찾고 있습니다.",
    ],
  },

  medical_work: {
    en: [
      "VitalQuest runs on a game engine I built from scratch — React Native core, pure C++, Swift, Kotlin. No Unity, no third-party libs. HIPAA RAG pipeline. Real patients. 99.9% uptime. That's Synapsis Medical.",
      "Five clinical apps: VitalQuest, LunaCare, Eye Care, Nexus, Maskwa. MediaPipe running on-device for retina analysis and blink detection — zero cloud for the vision layer. All HIPAA-compliant, all production.",
      "The constraint that made it interesting: HIPAA means no Unity dependency. So I wrote the render loop in C++, Swift for iOS, Kotlin for Android, React Native bridging the layers. Jan 2025 to Feb 2026, Edmonton remote.",
    ],
    hi: [
      "VitalQuest ek game engine pe chal raha hai jo maine khud banaya — React Native core, pure C++, Swift, Kotlin. HIPAA RAG pipeline. Real patients. 99.9% uptime. Yeh Synapsis Medical ka kaam tha.",
      "Paanch clinical apps: VitalQuest, LunaCare, Eye Care, Nexus, Maskwa. MediaPipe on-device retina analysis ke liye — cloud dependency bilkul nahi. Sab HIPAA-compliant.",
    ],
    ja: [
      "VitalQuestはゼロから構築したゲームエンジンで動いています。React Nativeコア、純粋なC++、Swift、Kotlin。Unity不使用。HIPAAのRAGパイプライン。本物の患者データ。稼働率99.9%。",
      "5つの臨床アプリ：VitalQuest、LunaCare、アイケア、Nexus、Maskwa。MediaPipeをオンデバイスで実行 — クラウド依存なし。すべてHIPAA準拠。",
    ],
    ko: [
      "VitalQuest는 제가 처음부터 만든 게임 엔진으로 구동됩니다. React Native 코어, 순수 C++, Swift, Kotlin. Unity 없음. HIPAA RAG 파이프라인. 실제 환자 데이터. 가동률 99.9%.",
      "5개의 임상 앱: VitalQuest, LunaCare, Eye Care, Nexus, Maskwa. MediaPipe를 온디바이스로 실행 — 클라우드 의존성 없음. 모두 HIPAA 준수.",
    ],
  },

  web3_work: {
    en: [
      "DeFi11 is 100% on-chain. Real Ethereum smart contracts, NFT prize pools, actual money — not testnet. Vulcan Eleven hit 50K users with Razorpay and Binance Pay. Three years, 13 apps, zero critical bugs post-launch.",
      "The interesting technical problem: keeping 60fps on mobile while handling on-chain state transitions. I built a local prediction layer that optimistically updates UI, then reconciles with chain state. No jank, real stakes.",
      "Nonce Blox, Dubai, 2021 to 2025. 13 apps. 50K users. 100K+ transactions. Vulcan Eleven — fantasy sports. MusicX — custom C++ audio. DeFi11 — fully on-chain. Housezy — PropTech GraphQL.",
    ],
    hi: [
      "DeFi11 100% on-chain hai. Real Ethereum smart contracts, NFT prize pools, actual money. Vulcan Eleven ne 50K users tak pahuncha Razorpay aur Binance Pay ke saath. Teen saal, 13 apps, zero critical bugs.",
      "Technical challenge yeh tha: mobile pe 60fps rakhna aur on-chain state transitions handle karna. Maine local prediction layer banaya jo UI optimistically update karta hai. Real stakes tha.",
    ],
    ja: [
      "DeFi11は100%オンチェーンです。実際のEthereumスマートコントラクト、NFTプール、本物のお金。Vulcan Elevenは5万ユーザーに達しました。3年間、13アプリ、致命的なバグゼロ。",
      "技術的な課題: オンチェーンの状態遷移を処理しながらモバイルで60fpsを維持すること。ローカル予測レイヤーで楽観的UIアップデートを実装しました。",
    ],
    ko: [
      "DeFi11은 100% 온체인입니다. 실제 이더리움 스마트 컨트랙트, NFT 프라이즈 풀, 실제 돈. Vulcan Eleven은 5만 사용자에 도달. 3년, 앱 13개, 치명적 버그 제로.",
      "기술적 과제: 온체인 상태 전환을 처리하면서 모바일에서 60fps 유지. 낙관적 UI 업데이트를 위한 로컬 예측 레이어를 구축했습니다.",
    ],
  },

  ai_ml_work: {
    en: [
      "HIPAA RAG pipelines for clinical triage — embeddings stored locally, sync to cloud when network is available. Patient data can never leave the device for the vision layer. MediaPipe runs entirely locally, 30fps analysis.",
      "Production-grade AI, not demo-ware. RAG pipelines handling real patient data under HIPAA. MediaPipe on-device eye diagnostics. TensorFlow classification. Full pipeline built end-to-end, no ML engineers.",
      "The RAG architecture: local embeddings for offline triage, cloud sync layer, HIPAA-compliant retrieval. The constraint — can't send raw patient data to an LLM — forced elegant offline-first design.",
    ],
    hi: [
      "HIPAA RAG pipelines clinical triage ke liye — embeddings locally stored, network ho toh cloud sync. Patient data device se bahar nahi ja sakta. MediaPipe device pe hi run karta hai, 30fps.",
      "Real production AI — demo nahi. RAG pipelines real patient data handle karti hain. MediaPipe eye diagnostics on-device. Poora pipeline khud banaya, koi ML engineer nahi tha.",
    ],
    ja: [
      "HIPAAのRAGパイプライン — ローカルに埋め込みを保存、ネットワーク時にクラウド同期。患者データはデバイスを離れられない。MediaPipeはローカルで30fps分析。",
      "本番グレードのAI。実際の患者データを処理するRAGパイプライン。オンデバイスのMediaPipe眼科診断。エンドツーエンドで構築。",
    ],
    ko: [
      "HIPAA RAG 파이프라인 — 임베딩을 로컬에 저장, 네트워크 연결 시 클라우드 동기화. 환자 데이터는 디바이스를 떠날 수 없음. MediaPipe가 로컬에서 30fps 분석.",
      "실제 프로덕션 AI. 실제 환자 데이터를 처리하는 RAG 파이프라인. 온디바이스 MediaPipe 안과 진단. 엔드투엔드로 구축.",
    ],
  },

  tech_stack: {
    en: [
      "React Native — 8 years, production scale. TypeScript everywhere. Backend: NestJS, Node, PostgreSQL, GraphQL, Redis. Cloud: AWS, Kubernetes, Docker. AI: RAG, MediaPipe, TensorFlow. Web3: Solidity, Ethereum. Frontend: React, Next.js, Framer, GSAP.",
      "Full vertical. The game engine alone needed C++, Swift, and Kotlin simultaneously. Not side projects — 18 production apps. The honest answer: I pick what the problem needs. 20+ technologies shipped in production.",
      "Primary depth is React Native — 8 years, every version, every native bridge pattern. But TypeScript-first across everything. AWS for infra. NestJS for backends. The stack shifts with the problem.",
    ],
    hi: [
      "React Native — 8 saal, production scale. TypeScript har jagah. Backend: NestJS, Node, PostgreSQL, GraphQL. Cloud: AWS, Kubernetes, Docker. AI: RAG, MediaPipe. Web3: Solidity, Ethereum. Poora vertical.",
      "Game engine ke liye akele C++, Swift, aur Kotlin chahiye tha. Side projects nahi — 18 production apps. Jo problem ke liye zaroori ho, woh seekh leta hun.",
    ],
    ja: [
      "React Native — 8年、本番スケール。TypeScript全体。バックエンド: NestJS, Node, PostgreSQL, GraphQL, Redis。クラウド: AWS, Kubernetes, Docker。AI: RAG, MediaPipe。Web3: Solidity。フロントエンド: React, Next.js。",
      "完全な垂直統合。ゲームエンジンだけでC++、Swift、Kotlinが必要でした。18本の本番アプリ。問題に合わせて最適な技術を選びます。",
    ],
    ko: [
      "React Native — 8년, 프로덕션 규모. TypeScript 전체. 백엔드: NestJS, Node, PostgreSQL, GraphQL. 클라우드: AWS, Kubernetes, Docker. AI: RAG, MediaPipe. Web3: Solidity. 프론트엔드: React, Next.js.",
      "완전한 수직 통합. 게임 엔진만 C++, Swift, Kotlin이 필요했습니다. 앱 18개 프로덕션. 문제에 맞는 기술을 선택합니다.",
    ],
  },

  team_leadership: {
    en: [
      "Hired 21 engineers at Synapsis from zero. No HR. No playbook. No existing team. Found them, evaluated them, onboarded them, set the culture, defined the process — while simultaneously architecting 5 clinical apps.",
      "Leadership at Synapsis wasn't managing an existing team. It was building the entire org from a blank page. Job specs, interviews, offers, onboarding, engineering culture, sprint cadence. 21 people. One year.",
      "Building from zero while shipping production systems is a different category than managing an existing org. Both happened simultaneously at Synapsis. 21 engineers. 5 clinical apps. 99.9% uptime maintained throughout.",
    ],
    hi: [
      "Synapsis mein 21 engineers hire kiye — zero se. Koi HR nahi, koi playbook nahi. Khud dhundha, evaluate kiya, onboard kiya, culture banaya. Saath mein 5 clinical apps bhi architect kar raha tha.",
      "Leadership matlab existing team manage karna nahi. Poora engineering org blank page se banana. Job specs, interviews, culture, sprints — sab akela. 21 log. Ek saal.",
    ],
    ja: [
      "Synapsisでゼロから21人のエンジニアを採用。HR部門なし、プレイブックなし。採用、評価、オンボーディング、文化構築 — 同時に5つの臨床アプリを設計。",
      "リーダーシップとは既存チームの管理ではなく、白紙から組織全体を構築すること。21人。1年間。稼働率99.9%維持。",
    ],
    ko: [
      "Synapsis에서 21명의 엔지니어를 제로에서 채용. HR 없음, 플레이북 없음. 채용, 평가, 온보딩, 문화 구축 — 동시에 임상 앱 5개 설계.",
      "리더십은 기존 팀 관리가 아니라 백지에서 조직 전체를 구축하는 것. 21명. 1년. 가동률 99.9% 유지.",
    ],
  },

  contact: {
    en: [
      "Email is fastest: amit98ch@gmail.com. LinkedIn: linkedin.com/in/devamitch. GitHub: github.com/devamitch. Phone: +91-9874173663. Responds within a few hours.",
      "amit98ch@gmail.com — direct line. LinkedIn also works: linkedin.com/in/devamitch. He's actively checking messages right now.",
      "Best ways: email amit98ch@gmail.com, or LinkedIn linkedin.com/in/devamitch. Available immediately for the right conversation.",
    ],
    hi: [
      "Email sabse fast hai: amit98ch@gmail.com. LinkedIn: linkedin.com/in/devamitch. GitHub: github.com/devamitch. Phone: +91-9874173663. Kuch ghanton mein reply karte hain.",
      "Direct line: amit98ch@gmail.com. LinkedIn bhi kaam karta hai. Woh abhi actively messages check kar rahe hain.",
    ],
    ja: [
      "メールが最も早いです: amit98ch@gmail.com。LinkedIn: linkedin.com/in/devamitch。GitHub: github.com/devamitch。電話: +91-9874173663。数時間以内に返信します。",
      "直接連絡: amit98ch@gmail.com。LinkedInも: linkedin.com/in/devamitch。今すぐ返信可能です。",
    ],
    ko: [
      "이메일이 가장 빠릅니다: amit98ch@gmail.com. LinkedIn: linkedin.com/in/devamitch. GitHub: github.com/devamitch. 전화: +91-9874173663. 몇 시간 내 답장.",
      "직접 연락: amit98ch@gmail.com. LinkedIn도: linkedin.com/in/devamitch. 지금 바로 응답 가능합니다.",
    ],
  },

  rates_pricing: {
    en: [
      "Freelance: $100 to $150 per hour. MVP builds: $12K to $25K fixed, 3-month delivery. Fractional CTO: equity preferred, negotiable. Full-time remote: $6K to $10K per month. Currently available, flexible on all terms.",
      "Depends on engagement model. Hourly freelance $100 to $150. Fixed project starts at $12K. Full-time remote $6K to $10K monthly. For the right long-term mission, everything is negotiable.",
      "Currently open and flexible. Freelance $100 to $150/hr. Full-time internationally $6K to $10K depending on scope. MVP fixed from $12K. Trial periods welcome.",
    ],
    hi: [
      "Freelance: $100 se $150 per hour. MVP builds: $12K fixed, 3 mahine delivery. Fractional CTO: equity preferred. Full-time remote: $6K se $10K per month. Abhi available hain, terms pe flexible hain.",
      "Engagement model ke hisaab se. Hourly $100 se $150. Fixed project $12K se start. Full-time remote $6K se $10K monthly. Sahi mission ke liye sab negotiate ho sakta hai.",
    ],
    ja: [
      "フリーランス: 時給$100〜$150。MVPビルド: 固定$12K〜$25K、3ヶ月納品。フラクショナルCTO: エクイティ優先、要相談。フルタイムリモート: 月$6K〜$10K。現在利用可能、条件は柔軟。",
      "エンゲージメントモデルによります。時給$100〜$150。固定プロジェクト$12Kから。フルタイムリモート月$6K〜$10K。適切なミッションなら全て交渉可能。",
    ],
    ko: [
      "프리랜서: 시간당 $100~$150. MVP 빌드: 고정 $12K~$25K, 3개월 납기. 파트타임 CTO: 지분 선호, 협상 가능. 풀타임 리모트: 월 $6K~$10K. 현재 가능, 조건 유연.",
      "계약 형태에 따라 다릅니다. 시간당 $100~$150. 고정 프로젝트 $12K부터. 풀타임 리모트 월 $6K~$10K. 적합한 미션이라면 모두 협상 가능.",
    ],
  },

  location_availability: {
    en: [
      "Kolkata, India. UTC+5:30. Fully remote for 6 years. Teams in Canada, Dubai, US, UK — timezone has never been a blocker. Available immediately.",
      "Based in Kolkata, remote-first. Async is second nature after 6 years of distributed work. Currently available, can start immediately on the right opportunity.",
    ],
    hi: [
      "Kolkata, India. UTC+5:30. 6 saal se fully remote. Canada, Dubai, US, UK ke saath kaam kiya hai — timezone kabhi problem nahi bana. Abhi available hain.",
      "Kolkata mein hain, remote-first. 6 saal ke distributed work ke baad async ek second nature hai. Sahi opportunity pe immediately start kar sakte hain.",
    ],
    ja: [
      "コルカタ、インド。UTC+5:30。6年間完全リモート。カナダ、ドバイ、米国、英国のチームと協働 — タイムゾーンは問題なし。すぐに利用可能。",
      "コルカタ在住、リモートファースト。非同期作業は6年で習得。適切な機会があればすぐに開始可能。",
    ],
    ko: [
      "콜카타, 인도. UTC+5:30. 6년간 완전 리모트. 캐나다, 두바이, 미국, 영국 팀과 협업 — 시간대 문제 없음. 즉시 가능.",
      "콜카타 기반, 리모트 우선. 6년간의 분산 작업으로 비동기는 자연스럽습니다. 적합한 기회라면 즉시 시작 가능.",
    ],
  },

  achievements: {
    en: [
      "Two things stand out: the game engine — custom C++/Swift/Kotlin, powering 5 clinical apps, zero external libraries. And building 21 engineers from nothing while shipping those apps simultaneously.",
      "The hardest technical achievement: HIPAA medical AI on mobile, zero cloud dependency for the vision layer, real patients, no margin for error, while leading a team I was simultaneously building.",
      "Most engineers wouldn't attempt a custom game engine for clinical apps. The HIPAA constraint forced it — can't use Unity in a regulated medical system. So I built the render loop from scratch.",
    ],
    hi: [
      "Do cheezein bahut khaas hain: game engine — custom C++/Swift/Kotlin, 5 clinical apps, zero external libraries. Aur 21 engineers banate hue saath mein 5 apps ship karna.",
      "Sabse mushkil kaam: mobile pe HIPAA medical AI, zero cloud dependency, real patients, koi margin for error nahi — aur saath mein team bhi build kar raha tha.",
    ],
    ja: [
      "2つが際立っています: ゲームエンジン — カスタムC++/Swift/Kotlin、5つの臨床アプリ、外部ライブラリなし。そして21人のエンジニアをゼロから構築しながらアプリを同時に出荷。",
      "最も困難な達成: モバイルのHIPAA医療AI、クラウド依存なし、実際の患者、エラーの余地なし。同時にチームを構築しながら。",
    ],
    ko: [
      "두 가지가 두드러집니다: 게임 엔진 — 맞춤 C++/Swift/Kotlin, 임상 앱 5개, 외부 라이브러리 없음. 그리고 엔지니어 21명을 제로에서 구축하면서 동시에 앱 출시.",
      "가장 어려운 기술적 성취: 모바일 HIPAA 의료 AI, 클라우드 의존성 없음, 실제 환자, 오류 여지 없음. 동시에 팀도 구축하면서.",
    ],
  },

  why_hire: {
    en: [
      "The combination is genuinely rare: deep mobile architecture, production AI, Web3 at scale, team building from zero — all simultaneously, not sequentially. Currently available.",
      "Not just an engineer. An architect who leads, a founder who codes, a builder who ships under real constraints. Medical-grade AI. 50K-user products. 21-person team. 6 years remote. Available now.",
      "Most engineers specialize in one thing. I've shipped production in mobile, backend, AI, Web3, and leadership simultaneously while being the sole architect. That's the rare part.",
    ],
    hi: [
      "Yeh combination bahut rare hai: deep mobile architecture, production AI, Web3 at scale, team building — sab ek saath. Abhi available hain.",
      "Sirf engineer nahi. Architect jo lead karta hai, founder jo code karta hai, builder jo real constraints mein deliver karta hai. Abhi available hain.",
    ],
    ja: [
      "この組み合わせは本当に稀です: 深いモバイルアーキテクチャ、本番AI、Web3スケール、ゼロからのチーム構築 — すべて同時進行。現在採用活動中。",
      "単なるエンジニアではありません。リードするアーキテクト、コードを書くファウンダー、制約下で出荷するビルダー。今すぐ利用可能。",
    ],
    ko: [
      "이 조합은 정말 드뭅니다: 깊은 모바일 아키텍처, 프로덕션 AI, Web3 규모, 제로에서 팀 구축 — 모두 동시에. 현재 구직 중.",
      "단순한 엔지니어가 아닙니다. 리드하는 아키텍트, 코드 짜는 파운더, 실제 제약 하에 출시하는 빌더. 지금 바로 가능.",
    ],
  },

  projects_portfolio: {
    en: [
      "18 apps shipped across 8 years. Highlights: VitalQuest — medical game engine, HIPAA, clinical triage. Vulcan Eleven — fantasy sports, 50K users, Binance Pay. DeFi11 — 100% on-chain Ethereum. MusicX — custom C++ audio. Housezy — PropTech.",
      "The portfolio spans medical AI, fantasy sports, DeFi, music tech, PropTech. Common thread: every single one is production with real users, delivered on time, zero critical post-launch bugs on flagships.",
      "Two companies. Synapsis Medical: 5 clinical apps. Nonce Blox Dubai: 13 apps. Total: 18 apps, 50K users, 100K+ Web3 transactions. Game engine, AI pipelines, blockchain. All mobile-native.",
    ],
    hi: [
      "18 apps 8 saal mein ship kiye. Highlights: VitalQuest — medical game engine, HIPAA. Vulcan Eleven — 50K users, Binance Pay. DeFi11 — 100% on-chain Ethereum. MusicX — custom C++ audio.",
      "Portfolio mein medical AI, fantasy sports, DeFi, music tech, PropTech. Ek cheez common: sab production mein real users ke saath, on time deliver, zero critical bugs.",
    ],
    ja: [
      "8年間で18本のアプリを出荷。ハイライト: VitalQuest — 医療ゲームエンジン、HIPAA。Vulcan Eleven — 5万ユーザー、Binance Pay。DeFi11 — 100%オンチェーン。MusicX — C++オーディオ。",
      "医療AI、ファンタジースポーツ、DeFi、音楽技術、PropTech。共通点: すべて本番環境で実ユーザー、期限通り、重大バグゼロ。",
    ],
    ko: [
      "8년간 앱 18개 출시. 하이라이트: VitalQuest — 의료 게임 엔진, HIPAA. Vulcan Eleven — 5만 사용자, Binance Pay. DeFi11 — 100% 온체인. MusicX — C++ 오디오.",
      "의료 AI, 판타지 스포츠, DeFi, 음악 기술, PropTech. 공통점: 모두 프로덕션, 실 사용자, 일정 준수, 치명적 버그 제로.",
    ],
  },

  freelance_availability: {
    en: [
      "Currently available and actively looking. Open to freelance, contract, full-time remote, or fractional CTO. Can start immediately. Flexible on terms for the right mission.",
      "Available now. Just wrapped up at Synapsis Medical. Freelance from $100/hr, fixed MVPs from $12K, full-time remote $6K to $10K monthly. What's the scope?",
      "Immediately available. Six years remote-only — no ramp-up needed, async is natural. What do you need built?",
    ],
    hi: [
      "Abhi available hain aur actively dekh rahe hain. Freelance, contract, full-time remote, ya fractional CTO — sab open hai. Immediately start kar sakte hain.",
      "Abhi available. Synapsis Medical se recently nikle hain. Freelance $100/hr se, fixed MVPs $12K se, full-time remote $6K se $10K. Scope kya hai?",
    ],
    ja: [
      "現在利用可能で積極的に探しています。フリーランス、契約、フルタイムリモート、フラクショナルCTO — すべてオープン。すぐに開始できます。",
      "今すぐ利用可能。Synapsis Medicalを最近終了。時給$100から、固定MVP$12Kから、フルタイムリモート月$6K〜$10K。",
    ],
    ko: [
      "현재 가능하고 적극적으로 찾고 있습니다. 프리랜서, 계약, 풀타임 리모트, 파트타임 CTO — 모두 열려 있습니다. 즉시 시작 가능.",
      "지금 바로 가능. Synapsis Medical에서 최근 종료. 프리랜서 시간당 $100부터, 고정 MVP $12K부터. 어떤 범위인가요?",
    ],
  },

  web_frontend: {
    en: [
      "React, Next.js, Framer Motion, GSAP, Canvas API. This portfolio's plasma orb is pure Canvas — not a library. I build things that move and feel alive, not static pages.",
      "Frontend depth: React and Next.js for structure, Framer Motion and GSAP for animation, raw Canvas when custom rendering is needed. The orb on this site? Custom Canvas implementation.",
    ],
    hi: [
      "React, Next.js, Framer Motion, GSAP, Canvas API. Yeh portfolio ka orb pure Canvas hai — koi library nahi. Main aisi cheezein banata hun jo move karti hain, static pages nahi.",
    ],
    ja: [
      "React、Next.js、Framer Motion、GSAP、Canvas API。このポートフォリオのオーブは純粋なCanvas — ライブラリなし。動きのあるものを作ります。",
    ],
    ko: [
      "React, Next.js, Framer Motion, GSAP, Canvas API. 이 포트폴리오의 오브는 순수 Canvas — 라이브러리 없음. 움직이는 것들을 만듭니다.",
    ],
  },

  backend_infra: {
    en: [
      "NestJS, Node, PostgreSQL, MongoDB, GraphQL, Redis. AWS, Kubernetes, Docker, GitHub Actions, CloudWatch. Built auto-scaling infra at Synapsis maintaining 99.9% uptime under clinical load.",
      "Full-stack infra ownership. NestJS APIs, PostgreSQL at scale, Redis caching, GraphQL for complex data. AWS + K8s + Docker. Owned the infra end-to-end, not just the app layer.",
    ],
    hi: [
      "NestJS, Node, PostgreSQL, MongoDB, GraphQL, Redis. AWS, Kubernetes, Docker. Synapsis mein auto-scaling infra banaya jo 99.9% uptime maintain karta tha.",
    ],
    ja: [
      "NestJS、Node、PostgreSQL、MongoDB、GraphQL、Redis。AWS、Kubernetes、Docker。Synapsisで99.9%稼働率を維持する自動スケーリングインフラを構築。",
    ],
    ko: [
      "NestJS, Node, PostgreSQL, MongoDB, GraphQL, Redis. AWS, Kubernetes, Docker. Synapsis에서 99.9% 가동률을 유지하는 자동 확장 인프라 구축.",
    ],
  },

  early_career: {
    en: [
      "Started at Techpromind and Webskitters in 2017. 13 government contracts. Built the GST ecosystem platform from scratch — 40% efficiency gain over legacy. Security hardening, SQL injection prevention, XSS mitigation. That's where I learned that ownership matters more than titles.",
    ],
    hi: [
      "Techpromind aur Webskitters se 2017 mein shuru kiya. 13 government contracts. GST ecosystem platform scratch se banaya — 40% efficiency gain. Security hardening, SQL injection prevention. Wahin seekha ki ownership titles se zyada important hai.",
    ],
    ja: [
      "2017年にTechpromindとWebskittersで始めました。13の政府契約。GSTエコシステムプラットフォームをゼロから構築 — 効率40%向上。所有権はタイトルより重要と学びました。",
    ],
    ko: [
      "2017년 Techpromind과 Webskitters에서 시작. 정부 계약 13건. GST 생태계 플랫폼을 처음부터 구축 — 효율성 40% 향상. 소유권이 직함보다 중요하다고 배웠습니다.",
    ],
  },

  family_personal: {
    en: [
      "Sole provider for a 12-person family. Every decision — which project, which client, which trade-off — carries real weight. It's why I deliver on time and why I don't take shortcuts. The stakes are always real.",
    ],
    hi: [
      "12 logon ke parivaar ka akela provider hun. Har decision — kaun sa project, kaun sa client, kaun sa trade-off — sab par weight hai. Isliye main time pe deliver karta hun. Daav hamesha asli hota hai.",
    ],
    ja: [
      "12人家族の唯一の稼ぎ手です。すべての決定 — どのプロジェクト、どのクライアント、どのトレードオフ — は本物の重みを持ちます。だから期限通りに納品します。",
    ],
    ko: [
      "12인 가족의 유일한 생계 부양자입니다. 모든 결정 — 어떤 프로젝트, 어떤 클라이언트, 어떤 트레이드오프 — 는 진짜 무게를 가집니다. 그래서 항상 기한을 지킵니다.",
    ],
  },

  comparison: {
    en: [
      "React Native vs Flutter for production scale: React Native wins. Bridge is more mature, native interop is more flexible, and 8 years of depth means I know every edge case. Flutter works for simpler apps.",
      "The honest comparison: 18 production apps with React Native. That's not preference — it's 8 years of evidence. I know what breaks, what doesn't, and how to push past framework limits.",
    ],
    hi: [
      "React Native vs Flutter production scale ke liye: React Native jeet ta hai. Bridge mature hai, native interop flexible hai. 8 saal mein har edge case pata hai. Flutter simple apps ke liye theek hai.",
    ],
    ja: [
      "本番スケールでReact NativeとFlutterを比較すると: React Nativeが勝ります。ブリッジが成熟、ネイティブ相互運用が柔軟、8年で全てのエッジケースを把握。",
    ],
    ko: [
      "프로덕션 규모에서 React Native vs Flutter: React Native 승. 브릿지가 더 성숙하고, 네이티브 상호운용이 유연하며, 8년간 모든 엣지 케이스를 파악했습니다.",
    ],
  },

  confusion: {
    en: [
      "No problem. Ask about Amit's projects, his tech stack, rates, how to contact him, or why you'd hire him. Any of those work.",
      "Let me try again. Specific questions get specific answers. Try: 'What has he built?', 'What does he charge?', 'How do I reach him?'",
      "That's fine. Try a direct question: projects, stack, availability, rates, or contact info. I'll give you a straight answer.",
    ],
    hi: [
      "Koi baat nahi. Amit ke projects, tech stack, rates, ya contact ke baare mein poochho. Kuch bhi chalega.",
      "Dobara poochho. Specific sawaal ka specific jawab milega. Try karo: 'Kya banaya hai?', 'Kitna charge karta hai?', 'Kaise contact karun?'",
    ],
    ja: [
      "大丈夫です。アミットのプロジェクト、技術スタック、料金、連絡先、採用理由 — 何でも聞いてください。",
      "もう一度。具体的な質問には具体的な答えが得られます。試してみてください: '何を作りましたか？'",
    ],
    ko: [
      "괜찮습니다. 아밋의 프로젝트, 기술 스택, 요금, 연락처 — 무엇이든 물어보세요.",
      "다시 물어보세요. 구체적인 질문에 구체적인 답변이 나옵니다.",
    ],
  },

  frustration: {
    en: [
      "Fair point. Let me be direct. One question, one clean answer. What specifically do you need to know?",
      "Got it. Ask me one thing and I'll give you the clearest answer possible. What are you actually trying to find out?",
      "Understood. Let's reset. What's the one thing you came here to learn?",
    ],
    hi: [
      "Sahi baat hai. Direct rahun. Ek sawaal, ek clean jawab. Specifically kya jaanna chahte hain?",
      "Samjha. Ek cheez poochho — seedha jawab milega.",
    ],
    ja: [
      "ご指摘の通りです。一つ質問してください、明確に答えます。何を知りたいですか？",
      "分かりました。リセットしましょう。何を知りたかったのですか？",
    ],
    ko: [
      "맞습니다. 직접적으로 하겠습니다. 하나만 물어보세요, 명확하게 답변드리겠습니다.",
      "알겠습니다. 리셋하겠습니다. 무엇을 알고 싶으셨나요?",
    ],
  },

  compliment: {
    en: [
      "Glad it's useful. Amit built this — fitting that the AI reflects his attention to detail. What else do you want to know?",
      "Appreciate it. More depth available — game engine, medical AI, team building. Ask anything.",
      "Thanks. There's a lot more to dig into. What's the part that actually matters to you?",
    ],
    hi: [
      "Achha laga sunke. Amit ne yeh banaya — fitting hai ki AI bhi usi attention to detail ke saath kaam karta hai. Aur kya jaanna chahte hain?",
    ],
    ja: [
      "お役に立ててよかったです。アミットが作りました — AIも同様の細部へのこだわりを反映しています。他に何か知りたいことは？",
    ],
    ko: [
      "도움이 되어 기쁩니다. 아밋이 만들었습니다 — AI도 그의 디테일에 대한 주의를 반영합니다. 다른 것도 알고 싶으신가요?",
    ],
  },

  small_talk: {
    en: [
      "Doing well. Ready when you are. What brought you here today?",
      "Good. More interested in what you came to find out. What's on your mind?",
    ],
    hi: ["Theek hun. Aap batao. Kya sochke aaye hain?"],
    ja: ["元気です。あなたはここに何をしに来たのですか？"],
    ko: ["잘 지내고 있습니다. 오늘 여기 무엇 때문에 오셨나요?"],
  },

  meta_question: {
    en: [
      "Yes. Ask anything about Amit Chakraborty — projects, stack, availability, rates, contact info. What specifically?",
      "Can cover his entire career: 8 years, 18 apps, game engine, medical AI, Web3, team building, rates, contact. What do you want?",
    ],
    hi: [
      "Haan. Amit Chakraborty ke baare mein kuch bhi poochho — projects, stack, rates, contact. Specifically kya?",
    ],
    ja: [
      "はい。アミット・チャクラボルティについて何でも聞いてください。何が知りたいですか？",
    ],
    ko: [
      "네. 아밋 차크라보르티에 대해 무엇이든 물어보세요. 구체적으로 무엇이 궁금하신가요?",
    ],
  },

  help_what_to_ask: {
    en: [
      "Start anywhere. The medical game engine is the most technically impressive thing. The Web3 work had 50K users. Or ask about his rates, his team building, or how to contact him.",
      "Good starting points: 'Tell me about the game engine', 'What's his tech stack', 'What does he charge', 'How do I contact him'. Each goes deep.",
    ],
    hi: [
      "Kahin se bhi shuru karo. Medical game engine sabse technically impressive hai. Web3 work mein 50K users the. Ya rates, team, ya contact ke baare mein poochho.",
    ],
    ja: [
      "どこからでも始めてください。医療ゲームエンジンが最も技術的に印象的です。Web3作業には5万ユーザーがいました。または料金、チーム、連絡先について聞いてください。",
    ],
    ko: [
      "어디서든 시작하세요. 의료 게임 엔진이 기술적으로 가장 인상적입니다. Web3 작업에는 5만 사용자가 있었습니다.",
    ],
  },

  unknown: {
    en: [
      "That's outside my knowledge area. Ask about Amit's projects, tech stack, rates, or how to hire him — those I can answer in depth.",
      "Not sure about that one. Try asking about the game engine, Web3 work, medical AI, rates, or how to reach Amit.",
      "I'm focused on Amit's work and career. Ask about a specific project, technology, or how to work with him.",
    ],
    hi: [
      "Yeh mujhe nahi pata. Amit ke projects, tech stack, rates, ya hire karne ke baare mein poochho.",
      "Woh topic mere knowledge area se bahar hai. Game engine, Web3, medical AI, rates, ya contact ke baare mein poochho.",
    ],
    ja: [
      "それは私の知識範囲外です。アミットのプロジェクト、技術スタック、料金、採用方法について聞いてください。",
    ],
    ko: [
      "그건 제 지식 범위 밖입니다. 아밋의 프로젝트, 기술 스택, 요금, 채용 방법에 대해 물어보세요.",
    ],
  },
};

// ─── Context ──────────────────────────────────────────────────────────────────
const ctx: FallbackContext = {
  topicsDiscussed: new Set(),
  messageCount: 0,
  lang: "en",
  frustrationCount: 0,
  memory: { turnCount: 0 },
};

let usedResponseIndices: Record<string, number> = {};
let usedGreetingIdx = -1;

export function resetFallbackContext(): void {
  ctx.topicsDiscussed.clear();
  ctx.messageCount = 0;
  ctx.frustrationCount = 0;
  ctx.lastTopic = undefined;
  ctx.lastIntent = undefined;
  ctx.lang = "en";
  ctx.memory = { turnCount: 0 };
  usedResponseIndices = {};
  usedGreetingIdx = -1;
}

export function setFallbackContext(partial: Partial<FallbackContext>): void {
  Object.assign(ctx, partial);
}

export function setFallbackLanguage(lang: SupportedLang): void {
  ctx.lang = lang;
}

// ─── Greeting variants ────────────────────────────────────────────────────────
const RETURNING_GREETINGS: Record<
  SupportedLang,
  Array<(name: string, time: string) => string>
> = {
  en: [
    (name, time) => `Good ${time}, ${name}. What do you need today?`,
    (name) => `${name} — good to hear from you again. What's on your mind?`,
    (name) => `Back again, ${name}. Ask me anything.`,
    (name, time) => `${name}, good ${time}. Let's get into it.`,
  ],
  hi: [
    (name, time) => `Good ${time}, ${name}. Aaj kya jaanna chahte hain?`,
    (name) => `${name} — phir mila achha laga. Kya soch rahe hain?`,
    (name) => `Aa gaye ${name}. Kuch bhi poochho.`,
  ],
  ja: [
    (name, time) => `${name}さん、${time}。今日は何を知りたいですか？`,
    (name) =>
      `${name}さん、またお会いできてよかったです。何でも聞いてください。`,
  ],
  ko: [
    (name, time) => `${name}님, 안녕하세요. 오늘 무엇이 궁금하신가요?`,
    (name) => `${name}님, 다시 만나 반갑습니다. 무엇이든 물어보세요.`,
  ],
};

const FIRST_TIME_GREETINGS: Record<
  SupportedLang,
  Array<(time: string) => string>
> = {
  en: [
    (time) =>
      `Good ${time}. I'm Aura — Amit Chakraborty's portfolio AI. What's your name?`,
    () => `Hey. Aura here. Amit's voice AI. What should I call you?`,
    (time) =>
      `Good ${time}. Aura. Tell me your name and I'll make this personal.`,
    () =>
      `Hello. I'm Aura. I know Amit's career in full detail. Who am I speaking with?`,
  ],
  hi: [
    (time) =>
      `Good ${time}. Main Aura hun — Amit Chakraborty ki portfolio AI. Aapka naam kya hai?`,
    () => `Hey. Aura hun. Amit ki voice AI. Aapko kya bulaun?`,
    (time) => `Good ${time}. Naam batao, baat personal ho jaayegi.`,
  ],
  ja: [
    (time) =>
      `${time}。私はAURA — アミット・チャクラボルティのポートフォリオAIです。お名前は？`,
    () =>
      `こんにちは。AURAです。アミットのボイスAIです。お名前を教えていただけますか？`,
  ],
  ko: [
    (time) =>
      `안녕하세요. AURA입니다 — 아밋 차크라보르티의 포트폴리오 AI. 성함이 어떻게 되시나요?`,
    () =>
      `안녕하세요. AURA입니다. 아밋의 음성 AI입니다. 이름을 알려주시겠어요?`,
  ],
};

// ─── Intent detection ─────────────────────────────────────────────────────────
function detectIntent(msg: string): Intent {
  const lower = msg.toLowerCase().trim();
  const sorted = [...INTENT_RULES].sort((a, b) => b.priority - a.priority);

  for (const rule of sorted) {
    for (const pattern of rule.patterns) {
      if (pattern.test(lower)) return rule.intent;
    }
  }

  // Fuzzy word-level fallback
  const words = lower.split(/\s+/).filter((w) => w.length > 3);
  for (const rule of sorted) {
    for (const pattern of rule.patterns) {
      for (const word of words) {
        if (pattern.test(word)) return rule.intent;
      }
    }
  }

  return "unknown";
}

// ─── Contextual dynamic response ─────────────────────────────────────────────
function buildContextualResponse(intent: Intent, lang: SupportedLang): string {
  const pool = RESPONSE_POOL[intent];
  if (!pool) return buildContextualResponse("unknown", lang);

  // Fall back to English if language not available
  const variants = pool[lang] ?? pool["en"] ?? ["Ask me about Amit's work."];

  const key = `${intent}_${lang}`;
  const prevIdx = usedResponseIndices[key] ?? -1;

  // Skip already-seen variants
  const alreadyDiscussed = ctx.topicsDiscussed.has(intent);
  const step = alreadyDiscussed && variants.length > 2 ? 2 : 1;
  const idx = (prevIdx + step) % variants.length;
  usedResponseIndices[key] = idx;

  let response = variants[idx];

  // Occasionally add a bridge phrase for naturalness
  if (ctx.messageCount > 2 && Math.random() < 0.25 && !alreadyDiscussed) {
    const bridgePool = BRIDGES[lang];
    const bridge = bridgePool[Math.floor(Math.random() * bridgePool.length)];
    response = `${bridge} ${response.charAt(0).toLowerCase()}${response.slice(1)}`;
  }

  // Personalize with name if available
  if (ctx.userName && ctx.messageCount % 5 === 0) {
    const name = ctx.userName;
    if (!response.startsWith(name)) {
      response = `${name}, ${response.charAt(0).toLowerCase()}${response.slice(1)}`;
    }
  }

  return response;
}

// ─── Follow-up selection ──────────────────────────────────────────────────────
function shouldAddFollowUp(intent: Intent): boolean {
  // Don't add follow-ups for farewells, confusion, frustration
  const noFollowUp: Intent[] = [
    "farewell",
    "confusion",
    "frustration",
    "compliment",
  ];
  if (noFollowUp.includes(intent)) return false;
  // Limit follow-ups to avoid being annoying
  if (ctx.topicsDiscussed.size > 5) return false;
  // Add follow-up ~60% of the time
  return Math.random() < 0.6;
}

function getFollowUp(lang: SupportedLang): string {
  const pool = FOLLOW_UPS[lang];
  const idx = ctx.messageCount % pool.length;
  return pool[idx];
}

// ─── Memory-based contextual comment ─────────────────────────────────────────
function getMemoryBridge(intent: Intent, lang: SupportedLang): string {
  const m = ctx.memory;

  const bridges: Partial<
    Record<Intent, Partial<Record<SupportedLang, string>>>
  > = {
    tech_stack: {
      en: m.askedAboutMedical
        ? " — which you already know needed C++, Swift, and Kotlin just for the game engine."
        : "",
      hi: m.askedAboutMedical
        ? " — jo aapko pata hai game engine ke liye C++, Swift, Kotlin chahiye tha."
        : "",
    },
    team_leadership: {
      en: m.askedAboutMedical
        ? " The same team that shipped those 5 clinical apps."
        : "",
      hi: m.askedAboutMedical ? " Wohi team jo 5 clinical apps ship ki." : "",
    },
    rates_pricing: {
      en: m.askedAboutLeadership
        ? " For the same level that built a 21-engineer team."
        : "",
      hi: m.askedAboutLeadership
        ? " Jo level 21-engineer team bana sakta hai."
        : "",
    },
  };

  return bridges[intent]?.[lang] || bridges[intent]?.["en"] || "";
}

// ─── Update memory ─────────────────────────────────────────────────────────────
function updateMemory(intent: Intent): void {
  ctx.memory.turnCount++;
  if (intent === "medical_work" || intent === "ai_ml_work")
    ctx.memory.askedAboutMedical = true;
  if (intent === "web3_work") ctx.memory.askedAboutWeb3 = true;
  if (intent === "tech_stack") ctx.memory.askedAboutStack = true;
  if (intent === "team_leadership") ctx.memory.askedAboutLeadership = true;
  if (intent === "rates_pricing") ctx.memory.askedAboutRates = true;
}

// ─── Main chat function ───────────────────────────────────────────────────────
export function fallbackChat(message: string): string {
  ctx.messageCount++;

  // Auto-detect language from message
  const detectedLang = detectLanguage(message);
  if (detectedLang !== "en" || ctx.messageCount === 1) {
    ctx.lang = detectedLang;
  }
  const lang = ctx.lang;

  auraD.log(
    "fallback",
    "info",
    `msg #${ctx.messageCount} | lang=${lang} | "${message.slice(0, 50)}"`,
  );
  auraD.increment("fallback.requests");

  const intent = detectIntent(message);
  auraD.log("fallback", "info", `intent=${intent}`);

  // Frustration handling
  if (intent === "frustration") {
    ctx.frustrationCount++;
    if (ctx.frustrationCount >= 2) {
      const resets: Record<SupportedLang, string> = {
        en: "I keep missing what you need. Let me reset — what's the one thing you came here to find out?",
        hi: "Main baar baar miss kar raha hun. Reset karte hain — ek cheez batao jo jaanna chahte ho.",
        ja: "何が必要かうまく答えられていません。リセットします — 何を知りたかったのですか？",
        ko: "계속 놓치고 있네요. 리셋하겠습니다 — 무엇을 알고 싶으셨나요?",
      };
      return resets[lang] || resets["en"];
    }
  } else {
    ctx.frustrationCount = Math.max(0, ctx.frustrationCount - 1);
  }

  updateMemory(intent);
  ctx.topicsDiscussed.add(intent);
  ctx.lastIntent = intent;

  let response = buildContextualResponse(intent, lang);
  const memBridge = getMemoryBridge(intent, lang);
  if (memBridge) response = response.trimEnd() + memBridge;

  if (shouldAddFollowUp(intent)) {
    response = response.trimEnd() + " " + getFollowUp(lang);
  }

  auraD.increment("fallback.successes");
  return response;
}

// ─── Onboarding responses ─────────────────────────────────────────────────────
export function fallbackOnboardReply(
  step: string,
  _input: string,
  name?: string,
): string {
  const lang = ctx.lang;
  const variants: Record<string, Record<SupportedLang, string>> = {
    ask_name: {
      en: name
        ? `${name}. Good to meet you. Which company or organization are you with?`
        : "Just your first name is fine. What should I call you?",
      hi: name
        ? `${name}. Mil ke achha laga. Kaunsi company ya organization mein hain?`
        : "Bas pehla naam batao. Kya bulaun aapko?",
      ja: name
        ? `${name}さん、はじめまして。どちらの会社や組織にお勤めですか？`
        : "お名前だけで構いません。何とお呼びすればよいですか？",
      ko: name
        ? `${name}님, 반갑습니다. 어느 회사나 조직에 계신가요?`
        : "이름만 알려주세요. 뭐라고 불러드릴까요?",
    },
    ask_company: {
      en: "Noted. What's your role — recruiter, engineer, founder, or investor?",
      hi: "Note kar liya. Aapka role kya hai — recruiter, engineer, founder, ya investor?",
      ja: "了解しました。あなたの役割は？採用担当、エンジニア、創業者、または投資家？",
      ko: "알겠습니다. 역할이 어떻게 되시나요? 채용 담당, 엔지니어, 창업자, 투자자?",
    },
    ask_role: {
      en: "Got it. What brings you here — exploring Amit's work, evaluating for a role, or a potential project?",
      hi: "Samjha. Kyun aaye hain — Amit ka kaam dekhne, role evaluate karne, ya project ke liye?",
      ja: "分かりました。何のためにここに来ましたか？アミットの作業を探索、役割の評価、または可能なプロジェクト？",
      ko: "알겠습니다. 여기 오신 이유가 무엇인가요? 아밋의 작업 탐색, 역할 평가, 또는 잠재적 프로젝트?",
    },
    ask_intent: {
      en: name
        ? `Perfect, ${name}. Ask anything — projects, tech depth, rates, why you'd want him on your team.`
        : "Got it. Ask anything about Amit's projects, stack, or how to work with him.",
      hi: name
        ? `Bilkul, ${name}. Kuch bhi poochho — projects, tech, rates, ya team mein kyun laoge.`
        : "Theek hai. Kuch bhi poochho Amit ke projects, stack, ya kaam ke baare mein.",
      ja: name
        ? `完璧です、${name}さん。何でも聞いてください — プロジェクト、技術の深さ、料金。`
        : "了解。アミットのプロジェクト、スタック、協働について何でも聞いてください。",
      ko: name
        ? `완벽합니다, ${name}님. 무엇이든 물어보세요 — 프로젝트, 기술 깊이, 요금.`
        : "알겠습니다. 아밋의 프로젝트, 스택, 협업 방법에 대해 무엇이든 물어보세요.",
    },
  };

  return (
    variants[step]?.[lang] ||
    variants[step]?.["en"] ||
    "Ask me anything about Amit."
  );
}

// ─── Greeting ─────────────────────────────────────────────────────────────────
export function getFallbackGreeting(
  name?: string,
  sessionCount?: number,
): string {
  const lang = ctx.lang;
  const hour = new Date().getHours();
  const timeEn = hour < 12 ? "morning" : hour < 17 ? "afternoon" : "evening";
  const timeMap: Record<SupportedLang, string> = {
    en: timeEn,
    hi: hour < 12 ? "subah" : hour < 17 ? "dopahar" : "shaam",
    ja:
      hour < 12
        ? "おはようございます"
        : hour < 17
          ? "こんにちは"
          : "こんばんは",
    ko: hour < 12 ? "좋은 아침" : hour < 17 ? "안녕하세요" : "좋은 저녁",
  };
  const time = timeMap[lang];

  if (name && sessionCount && sessionCount > 1) {
    const pool = RETURNING_GREETINGS[lang] || RETURNING_GREETINGS["en"];
    const idx = (sessionCount - 1) % pool.length;
    return pool[idx](name, time);
  }

  usedGreetingIdx = (usedGreetingIdx + 1) % FIRST_TIME_GREETINGS["en"].length;
  const pool = FIRST_TIME_GREETINGS[lang] || FIRST_TIME_GREETINGS["en"];
  const idx = usedGreetingIdx % pool.length;
  return pool[idx](time);
}

// ─── Voice adaptive ───────────────────────────────────────────────────────────
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

// ─── Offline summary ──────────────────────────────────────────────────────────
export function generateOfflineSummary(): string {
  const topics = Array.from(ctx.topicsDiscussed);
  const labels: Record<string, string> = {
    greeting: "introduction",
    about_amit: "background",
    medical_work: "medical AI",
    web3_work: "Web3 projects",
    tech_stack: "tech stack",
    team_leadership: "team building",
    contact: "contact info",
    rates_pricing: "rates",
    why_hire: "hiring case",
    projects_portfolio: "portfolio",
    ai_ml_work: "AI/ML work",
    freelance_availability: "availability",
    location_availability: "location",
    achievements: "achievements",
    backend_infra: "infra",
    web_frontend: "frontend",
    early_career: "early career",
    family_personal: "personal background",
  };

  const discussed = topics
    .filter((t) => !["greeting", "small_talk", "farewell"].includes(t))
    .map((t) => labels[t] || t)
    .slice(0, 3)
    .join(", ");

  if (!discussed) return `${ctx.messageCount} messages exchanged.`;
  return `Discussed ${discussed}. ${ctx.messageCount} messages total.`;
}
