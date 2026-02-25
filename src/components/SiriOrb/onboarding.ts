/**
 * src/components/SiriOrb/onboarding.ts
 * Pure string extractors — zero side effects, easily unit-testable.
 */

export type OnboardStep =
  | "welcome"
  | "ask_name"
  | "ask_company"
  | "ask_role"
  | "ask_intent"
  | "ready";

export function toTitleCaseExport(s: string): string {
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}

const NAME_STOPWORDS = new Set([
  "hi",
  "hey",
  "hello",
  "my",
  "name",
  "is",
  "i",
  "am",
  "its",
  "it's",
  "the",
  "call",
  "me",
  "they",
  "them",
]);

export function extractName(raw: string): string {
  const words = raw
    .trim()
    .replace(/[^a-zA-Z\s'-]/g, "")
    .split(/\s+/)
    .filter((w) => w.length > 1 && !NAME_STOPWORDS.has(w.toLowerCase()));
  if (!words.length) return "";
  const name = toTitleCaseExport(words[0]);
  return name.length > 1 ? name : "";
}

const COMPANY_PATTERNS = [
  /(?:at|from|with|for|@)\s+([A-Z][a-zA-Z0-9\s&.,''-]{1,40})/i,
  /([A-Z][a-zA-Z0-9]{2,}(?:\s+[A-Z][a-zA-Z0-9]+)*)/,
];

export function extractCompany(raw: string): string {
  const trimmed = raw.trim();
  if (
    /^(no|none|na|n\/a|freelance|self[\s-]?employed|independent)$/i.test(
      trimmed,
    )
  )
    return trimmed;
  for (const pat of COMPANY_PATTERNS) {
    const m = trimmed.match(pat);
    if (m?.[1]?.length > 1) return toTitleCaseExport(m[1].trim());
  }
  return "";
}

const ROLE_MAP: Record<string, string> = {
  recruit: "Recruiter",
  hr: "HR",
  talent: "Recruiter",
  hire: "Recruiter",
  hiring: "Recruiter",
  engineer: "Engineer",
  dev: "Engineer",
  developer: "Engineer",
  swe: "Engineer",
  software: "Engineer",
  coder: "Engineer",
  founder: "Founder",
  ceo: "CEO",
  cofounder: "Co-Founder",
  cto: "CTO",
  coo: "COO",
  vp: "VP",
  investor: "Investor",
  vc: "Investor",
  venture: "Investor",
  angel: "Angel Investor",
  product: "Product Manager",
  pm: "Product Manager",
  manager: "Manager",
  design: "Designer",
  designer: "Designer",
  ux: "Designer",
  student: "Student",
  intern: "Intern",
  consultant: "Consultant",
  freelance: "Freelancer",
  partner: "Partner",
  bd: "Business Dev",
};

export function extractRole(raw: string): string {
  const lower = raw.toLowerCase();
  for (const [key, label] of Object.entries(ROLE_MAP)) {
    if (lower.includes(key)) return label;
  }
  if (raw.trim().length > 2 && raw.trim().length < 40)
    return toTitleCaseExport(raw.trim());
  return "";
}

const INTENT_MAP: Record<string, string> = {
  hire: "Hiring",
  recruit: "Hiring",
  job: "Hiring",
  position: "Hiring",
  invest: "Investment",
  funding: "Investment",
  partner: "Partnership",
  collab: "Collaboration",
  collaborate: "Collaboration",
  explore: "Exploring",
  curious: "Exploring",
  learn: "Exploring",
  browse: "Exploring",
  project: "Project Inquiry",
  build: "Project Inquiry",
  contract: "Contract Work",
  consult: "Consulting",
  advice: "Consulting",
};

export function extractIntent(raw: string): string {
  const lower = raw.toLowerCase();
  for (const [key, label] of Object.entries(INTENT_MAP)) {
    if (lower.includes(key)) return label;
  }
  return "Exploring";
}

export function extractInterests(
  msgs: { role: string; text: string }[],
): string[] {
  const topics = new Set<string>();
  const patterns: [RegExp, string][] = [
    [/\b(react\s*native|mobile|ios|android)\b/i, "Mobile Dev"],
    [/\b(ai|ml|llm|rag|machine\s*learning|gemini|openai)\b/i, "AI/ML"],
    [/\b(web3|defi|nft|blockchain|solidity|ethereum)\b/i, "Web3"],
    [/\b(aws|kubernetes|docker|k8s|devops|cloud)\b/i, "Cloud/DevOps"],
    [/\b(typescript|javascript|react|next\.?js|node)\b/i, "Frontend/Backend"],
    [/\b(hire|hiring|job|position|role|recruit)\b/i, "Hiring"],
    [/\b(rate|salary|cost|price|contract|consulting)\b/i, "Rates"],
    [/\b(project|build|startup|mvp|product)\b/i, "Project Work"],
  ];
  for (const msg of msgs) {
    if (msg.role !== "user") continue;
    for (const [pat, topic] of patterns) {
      if (pat.test(msg.text)) topics.add(topic);
    }
  }
  return [...topics];
}
