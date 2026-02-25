export const COLORS = {
  bg: "#0A0B0F",
  bg2: "#121318",
  bg3: "#1A1C22",
  text: "#FFFFFF",
  dim: "rgba(255,255,255,0.68)",
  faint: "rgba(255,255,255,0.42)",
  vfaint: "rgba(255,255,255,0.24)",
  ghost: "rgba(255,255,255,0.10)",
  border: "rgba(255,255,255,0.07)",
  card: "rgba(255,255,255,0.025)",
  orange: "#F47521",
  orangeL: "#FF9B4A",
  orangeD: "rgba(244,117,33,0.32)",
  orangeF: "rgba(244,117,33,0.08)",
  orangeG: "linear-gradient(135deg,#F47521 0%,#FF9B4A 50%,#E8600A 100%)",
  green: "#34D399",
  blue: "#4FC3F7",
  red: "#FF4444",
  purple: "#C084FC",
} as const;

export const GRID = "rgba(244,117,33,0.022)" as const;
export const HN = "'Helvetica Neue',Helvetica,Arial,sans-serif" as const;
export const MONO = "'JetBrains Mono','Space Mono',monospace" as const;
export const EASE_X = [0.18, 1, 0.3, 1] as const;

export const PROFILE = {
  name: "Amit Chakraborty",
  nameFirst: "Amit",
  nameLast: "Chakraborty",
  title: "Principal Mobile Architect",
  tagline: "Eight years. Eighteen apps. No shortcuts.",
  subtitle: "0-to-1 Builder · VP Engineering · Fractional CTO",
  email: "amit98ch@gmail.com",
  phone: "+91-9874173663",
  github: "https://github.com/devamitch",
  githubAlt: "https://github.com/techamit95ch",
  linkedin: "https://linkedin.com/in/devamitch",
  twitter: "https://x.com/devamitch",
  medium: "https://devamitch.medium.com/",
  location: "Kolkata, India",
  timezone: "IST (UTC+5:30)",
  profileImage: "/images/amit-profile.jpg",
  profileFallback: "https://github.com/devamitch.png",
  started: "2017-05-01",

  stats: [
    { value: "8+", label: "Years" },
    { value: "18+", label: "Apps" },
    { value: "50K+", label: "Users" },
  ],

  roles: [
    "VP Engineering",
    "Principal Architect",
    "CTO",
    "Technical Lead",
    "0-to-1 Builder",
  ],

  techStack: [
    "React Native", "Next.js", "NestJS", "TypeScript", "Node.js",
    "AWS", "Docker", "Kubernetes", "PostgreSQL", "MongoDB",
    "Redis", "GraphQL", "GSAP", "Framer Motion", "TensorFlow",
    "MediaPipe", "Pinecone", "Solidity", "Web3.js", "Fastlane",
    "React.js", "Python", "Rust", "Go", "Firebase",
  ],

  projects: [
    {
      id: "spyk", name: "VitalQuest", role: "Principal Architect",
      badge: "FLAGSHIP · HEALTHTECH", featured: true,
      tagline: "A game engine I built from nothing.",
      desc: "Proprietary game engine from scratch — zero deps. LLM health task generation, XP system, HIPAA RAG pipeline, computer vision retina analysis.",
      impact: "21 engineers · 5 apps · 99.9% uptime",
      tech: ["React Native", "C++/Swift/Kotlin", "LLMs", "RAG Pipelines", "MediaPipe"],
      color: "#F47521",
    },
    {
      id: "thoth", name: "Nexus", role: "Enterprise Architect",
      badge: "AI PLATFORM", featured: true,
      tagline: "One brain for all your marketing.",
      desc: "Enterprise AI orchestration — Meta, TikTok, Shopify unified. Autonomous campaign optimization, real-time cross-channel analytics.",
      impact: "5+ platforms unified",
      tech: ["React Native", "Next.js", "Agentic AI", "Real-time Analytics"],
      color: "#FF9B4A",
    },
    {
      id: "myteal", name: "LunaCare", role: "Lead Mobile Architect",
      badge: "WOMEN'S HEALTH", featured: true,
      tagline: "Wellness that finally understands women.",
      desc: "Privacy-first women's health ecosystem with AI-driven wellness algorithms. Cycle tracking, mood journaling, adaptive meditation.",
      impact: "AI-driven · Privacy-first · Zero 3rd-party data",
      tech: ["React Native", "Node.js", "AI/ML", "Encrypted Storage", "Health APIs"],
      color: "#E8B4B8",
    },
    {
      id: "vulcan", name: "Vulcan Eleven", role: "Lead Mobile Engineer",
      badge: "SPORTS · FINTECH", featured: false,
      tagline: "50,000 users. Zero downtime.",
      desc: "Fantasy sports — 60fps, Razorpay + Binance Pay, 35% transaction growth.",
      impact: "50K+ users · 35% growth",
      tech: ["React Native", "Reanimated", "C++", "Razorpay", "Binance Pay"],
      color: "#FF6B35",
    },
    {
      id: "defi11", name: "DeFi11", role: "Web3 Architect",
      badge: "WEB3 · DEFI", featured: false,
      tagline: "Fully on-chain. No compromise.",
      desc: "Decentralized fantasy sports — smart contract prize pools, NFT marketplace on Ethereum.",
      impact: "100% on-chain",
      tech: ["Solidity", "Web3.js", "NFTs", "Smart Contracts", "Ethereum"],
      color: "#F47521",
    },
    {
      id: "olo", name: "Eye Care", role: "Technical Lead",
      badge: "MEDTECH", featured: false,
      tagline: "Your phone becomes a medical device.",
      desc: "Real-time eye health monitoring using MediaPipe. Retina analysis, blink detection, redness assessment on-device.",
      impact: "Medical-grade CV on mobile",
      tech: ["React Native", "MediaPipe", "Computer Vision", "Gumlet API"],
      color: "#2196F3",
    },
  ],

  story: [
    { yr: "2017", title: "起源 The Origin", color: "#F47521", icon: "◈", desc: "PHP developer. 13 government projects secured. GST portals from zero." },
    { yr: "2019", title: "修行 MCA & Upskill", color: "#FF9B4A", icon: "◉", desc: "8.61 CGPA. React, React Native, Web3 foundations." },
    { yr: "2021", title: "闘争 Web3 Era", color: "#E8600A", icon: "◆", desc: "NonceBlox. Solidity, DeFi, NFTs. 13+ apps in 3 years." },
    { yr: "2023", title: "覚醒 Lead Role", color: "#FF6B35", icon: "●", desc: "50K+ users. MusicX, Housezy, Vulcan. C++ Native Modules." },
    { yr: "2025", title: "進化 AI + Health", color: "#F47521", icon: "◈", desc: "Health tech engine from scratch. RAG pipelines. VP-level ops." },
    { yr: "Now", title: "無限 Open", color: "#FF9B4A", icon: "→", desc: "VP Eng · CTO · Principal Architect. Mission over title." },
  ],

  journey: [
    { yr: "2017", title: "起源 The Origin", desc: "PHP developer. 13 government projects secured. GST portals from zero." },
    { yr: "2019", title: "修行 MCA & Upskill", desc: "8.61 CGPA. React, React Native, Web3 foundations." },
    { yr: "2021", title: "闘争 Web3 Era", desc: "NonceBlox. Solidity, DeFi, NFTs. 13+ apps in 3 years." },
    { yr: "2023", title: "覚醒 Lead Role", desc: "50K+ users. MusicX, Housezy, Vulcan. C++ Native Modules." },
    { yr: "2025", title: "進化 AI + Health", desc: "Health tech engine from scratch. RAG pipelines. VP-level ops." },
    { yr: "Now", title: "無限 Open", desc: "VP Eng · CTO · Principal Architect. Mission over title." },
  ],

  skills: [
    {
      cat: "Mobile", color: "#F47521",
      items: [
        { name: "React Native (Expert)", level: 98 },
        { name: "Expo", level: 90 },
        { name: "TypeScript", level: 96 },
        { name: "Native C++/Swift/Kotlin", level: 85 },
        { name: "Reanimated", level: 92 },
        { name: "iOS & Android", level: 95 },
      ],
    },
    {
      cat: "AI & ML", color: "#FF9B4A",
      items: [
        { name: "RAG Pipelines", level: 88 },
        { name: "Agentic AI", level: 84 },
        { name: "LLM Integration", level: 90 },
        { name: "Computer Vision", level: 82 },
        { name: "TensorFlow", level: 75 },
      ],
    },
    {
      cat: "Blockchain", color: "#E8600A",
      items: [
        { name: "Solidity", level: 85 },
        { name: "Ethereum", level: 85 },
        { name: "Web3.js", level: 88 },
        { name: "Smart Contracts", level: 86 },
        { name: "DeFi & NFT", level: 83 },
      ],
    },
    {
      cat: "Backend", color: "#FF6B35",
      items: [
        { name: "NestJS / Node.js", level: 90 },
        { name: "GraphQL / REST", level: 94 },
        { name: "PostgreSQL / MongoDB", level: 88 },
        { name: "Docker / Kubernetes", level: 80 },
        { name: "CI/CD Fastlane", level: 88 },
      ],
    },
    {
      cat: "Frontend", color: "#4FC3F7",
      items: [
        { name: "React.js", level: 94 },
        { name: "Next.js", level: 92 },
        { name: "Framer Motion", level: 88 },
        { name: "GSAP", level: 85 },
        { name: "Tailwind CSS", level: 86 },
      ],
    },
    {
      cat: "Leadership", color: "#34D399",
      items: [
        { name: "Team Building", level: 94 },
        { name: "Technical Mentorship", level: 95 },
        { name: "0-to-1 Architecture", level: 98 },
        { name: "VP-Level Ops", level: 86 },
        { name: "Agile/Scrum", level: 92 },
      ],
    },
  ],

  testimonials: [
    {
      name: "Kartik Kalia",
      role: "Full Stack Developer · AWS",
      company: "NonceBlox",
      seniority: "直属上司 DIRECT MANAGER",
      col: "#F47521",
      rel: "Managed Amit · 3 years",
      date: "Nov 2024",
      text: "I had the pleasure of working with Amit for three years and witnessed his impressive growth from Front-End Developer to Front-End Lead. His expertise and dedication make him a valuable asset to any team.",
      li: "https://linkedin.com/in/kartikkalia/",
    },
    {
      name: "Neha Goel",
      role: "HR Professional · 15+ Years",
      company: "NonceBlox",
      seniority: "幹部 SENIOR LEADERSHIP",
      col: "#FF9B4A",
      rel: "Senior colleague",
      date: "Oct 2024",
      text: "Amit had been an amicable and diligent developer, one of the most dependable Engineers when it comes to delivery or urgent closures. His capability to rebuild any project from scratch is remarkable.",
      li: "https://linkedin.com/in/neha-goel/",
    },
    {
      name: "Varun Chodha",
      role: "Senior Full-Stack · MERN",
      company: "NonceBlox",
      seniority: "弟子 MENTEE → SENIOR",
      col: "#E8600A",
      rel: "Grew under Amit's guidance",
      date: "Oct 2024",
      text: "Amit played a pivotal role in mentoring me, sharing his profound knowledge of Redux, React Native, and frontend concepts. His enthusiasm for coding and pursuit for perfection are truly inspiring.",
      li: "https://linkedin.com/in/varun-chodha/",
    },
  ],

  services: [
    {
      id: "pitch", icon: "◈", title: "Pitch Your Idea",
      sub: "Turn a concept into a roadmap", color: "#F47521",
      items: ["30-min discovery call", "Technical feasibility analysis", "MVP scope definition", "Tech stack recommendation", "Timeline + cost estimate", "Architecture blueprint"],
      cta: "Submit Your Idea", price: "Free to pitch", note: "No commitment. Just clarity.",
    },
    {
      id: "consult", icon: "◉", title: "Consulting",
      sub: "Architecture · Strategy · Reviews", color: "#FF9B4A",
      items: ["Architecture design & review", "Technical due diligence", "Codebase audit", "Team structure advisory", "Ongoing strategic advisory", "1:1 mentorship sessions"],
      cta: "Book a Session", price: "From $150/hr", note: "Or fixed retainer for ongoing work.",
    },
    {
      id: "build", icon: "◆", title: "End-to-End Build",
      sub: "From zero to production", color: "#E8600A",
      items: ["Full 0-to-1 product build", "React Native + Next.js + NestJS", "AI/ML integrations", "Team recruitment & training", "CI/CD setup", "Post-launch support"],
      cta: "Start a Project", price: "Fixed scope", note: "Quoted after discovery call.",
    },
  ],

  narrations: [
    "Welcome. I'm Amit Chakraborty — Principal Mobile Architect with 8 years of battle scars.",
    "18 apps shipped. 50,000 real users. Zero outsourced decisions. I build systems that outlast the hype.",
    "From government PHP portals to HIPAA-compliant AI pipelines — every system I architect ships to production.",
    "VitalQuest — I built a health tech engine from absolute scratch. C++, Swift, Kotlin. Zero external libs. 21 engineers recruited.",
    "Mobile, AI, Web3 — almost nobody spans all three at production scale. That's my unfair advantage.",
    "I'm open for the right mission. VP Engineering. CTO. Principal Architect. Let's build something legendary.",
  ],
} as const;
