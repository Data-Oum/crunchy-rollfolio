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
  linkedin: "https://linkedin.com/in/devamitch",
  twitter: "https://x.com/devamitch",
  medium: "https://devamitch.medium.com/",
  location: "Kolkata, India",
  
  stats: [
    { value: "8+", label: "Years" },
    { value: "18+", label: "Apps Shipped" },
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
    "Redis", "GraphQL", "Framer Motion", "TensorFlow", "MediaPipe",
    "Solidity", "Web3.js", "Python", "Rust", "Go",
  ],

  projects: [
    {
      name: "VitalQuest",
      badge: "FLAGSHIP · HEALTHTECH",
      tagline: "A game engine I built from nothing.",
      desc: "Proprietary game engine — zero deps. LLM task gen, XP system, HIPAA RAG pipeline. 21-person team recruited & trained.",
      tech: ["React Native", "C++/Swift/Kotlin", "LLMs", "RAG", "MediaPipe"],
      impact: "21 engineers · 5 apps · 99.9% uptime",
    },
    {
      name: "Nexus",
      badge: "AI PLATFORM",
      tagline: "One brain for all your marketing.",
      desc: "Enterprise AI orchestration — Meta, TikTok, Shopify unified. Autonomous campaign optimization.",
      tech: ["React Native", "Next.js", "Agentic AI", "Real-time Analytics"],
      impact: "5+ platforms unified",
    },
    {
      name: "Vulcan Eleven",
      badge: "SPORTS · FINTECH",
      tagline: "50,000 users. Zero downtime.",
      desc: "Fantasy sports — 60fps, Razorpay + Binance Pay, 35% transaction growth.",
      tech: ["React Native", "Reanimated", "C++", "Razorpay"],
      impact: "50K+ users · 35% growth",
    },
    {
      name: "DeFi11",
      badge: "WEB3 · DEFI",
      tagline: "Fully on-chain. No compromise.",
      desc: "Decentralized fantasy sports — smart contract prize pools, NFT marketplace on Ethereum.",
      tech: ["Solidity", "Web3.js", "NFTs", "Ethereum"],
      impact: "100% on-chain",
    },
  ],

  journey: [
    { yr: "2017", title: "The Origin", desc: "PHP dev. 13 govt projects secured. GST portals from zero." },
    { yr: "2019", title: "MCA & Upskill", desc: "8.61 CGPA. React, React Native, Web3 foundations." },
    { yr: "2021", title: "Web3 Era", desc: "NonceBlox. Solidity, DeFi, NFTs. 13+ apps in 3 years." },
    { yr: "2023", title: "Lead Role", desc: "50K+ users. MusicX, Housezy, Vulcan. C++ Native Modules." },
    { yr: "2025", title: "AI + Health", desc: "Game engine from scratch. RAG pipelines. VP-level ops." },
    { yr: "Now", title: "Open", desc: "VP Eng · CTO · Principal Architect. Mission over title." },
  ],

  skills: [
    { cat: "Mobile", items: ["React Native 98%", "Expo", "TypeScript", "Native C++/Swift/Kotlin", "iOS & Android"] },
    { cat: "AI & ML", items: ["RAG Pipelines", "Agentic AI", "LLMs", "Computer Vision", "TensorFlow"] },
    { cat: "Web3", items: ["Solidity", "Ethereum", "Web3.js", "Smart Contracts", "DeFi & NFT"] },
    { cat: "Backend", items: ["NestJS", "Node.js", "PostgreSQL", "MongoDB", "Docker/K8s"] },
    { cat: "Frontend", items: ["React", "Next.js", "Framer Motion", "GSAP", "Tailwind"] },
  ],

  narrations: [
    "Welcome. I'm Amit Chakraborty — Principal Mobile Architect with 8 years of battle scars.",
    "18 apps shipped. 50,000 real users. Zero outsourced decisions. I build systems that outlast the hype.",
    "From government PHP portals to HIPAA-compliant AI pipelines — every system I architect ships to production.",
    "VitalQuest — I built a game engine from absolute scratch. C++, Swift, Kotlin. Zero external libs. 21 engineers recruited.",
    "Mobile, AI, Web3 — almost nobody spans all three at production scale. That's my unfair advantage.",
    "I'm open for the right mission. VP Engineering. CTO. Principal Architect. Let's build something legendary.",
  ],
} as const;
