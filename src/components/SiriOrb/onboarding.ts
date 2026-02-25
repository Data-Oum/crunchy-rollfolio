/**
 * src/components/SiriOrb/onboarding.ts
 * Onboarding step definitions and extraction helpers.
 */

import type { Message } from "@/store/useConversationStore";

export type OnboardStep =
  | "welcome"
  | "ask_name"
  | "ask_company"
  | "ask_role"
  | "ask_intent"
  | "ready";

const COMMON_WORDS = new Set([
  "i",
  "me",
  "my",
  "am",
  "im",
  "is",
  "its",
  "the",
  "a",
  "an",
  "and",
  "or",
  "but",
  "hi",
  "hey",
  "hello",
  "yo",
  "name",
  "call",
  "just",
  "people",
  "they",
  "you",
  "can",
  "ok",
  "okay",
  "yeah",
  "yes",
  "no",
  "not",
  "please",
  "thanks",
  "thank",
  "well",
  "so",
  "um",
  "uh",
  "like",
  "actually",
  "basically",
  "really",
]);

export function extractName(raw: string): string {
  const s = raw.replace(/[.,!?;:'"]/g, "").trim();
  const patterns = [
    /(?:i'?m|i\s+am|my\s+name\s+is|they\s+call\s+me|call\s+me|it'?s)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i,
    /^([A-Z][a-z]{1,15})$/,
  ];
  for (const p of patterns) {
    const m = s.match(p);
    if (m?.[1] && !COMMON_WORDS.has(m[1].toLowerCase()))
      return toTitleCase(m[1].split(/\s+/)[0]);
  }
  const words = s.split(/\s+/);
  for (const w of words) {
    const clean = w.replace(/[^a-zA-Z]/g, "");
    if (
      clean.length >= 2 &&
      clean.length <= 20 &&
      /^[A-Z]/.test(clean) &&
      !COMMON_WORDS.has(clean.toLowerCase())
    )
      return toTitleCase(clean);
  }
  for (const w of words) {
    const clean = w.replace(/[^a-zA-Z]/g, "");
    if (
      clean.length >= 2 &&
      clean.length <= 20 &&
      !COMMON_WORDS.has(clean.toLowerCase())
    )
      return toTitleCase(clean);
  }
  return "";
}

export function extractCompany(raw: string): string {
  const s = raw.replace(/[.,!?;:'"]/g, "").trim();
  const patterns = [
    /(?:from|at|with|work\s+(?:at|for)|company\s+is|represent)\s+(.+)/i,
    /^([A-Z][\w\s&.-]{1,40})$/,
  ];
  for (const p of patterns) {
    const m = s.match(p);
    if (m?.[1]) return toTitleCase(m[1].trim().slice(0, 50));
  }
  return "";
}

export function extractRole(raw: string): string {
  const l = raw.toLowerCase();
  if (/recruit|hr|talent|hiring|people\s*op/i.test(l)) return "Recruiter";
  if (
    /engineer|dev|program|code|tech|architect|full.?stack|front.?end|back.?end/i.test(
      l,
    )
  )
    return "Engineer";
  if (/found|ceo|cto|co.?found|startup|entrepreneur|build.*company/i.test(l))
    return "Founder";
  if (/invest|vc|angel|capital|fund/i.test(l)) return "Investor";
  if (/design|ux|ui|product\s*design/i.test(l)) return "Designer";
  if (/product|pm|project|manage/i.test(l)) return "Product";
  if (/student|learn|study|academ|research/i.test(l)) return "Student";
  if (/explor|curiou|just\s*look|brows/i.test(l)) return "Explorer";
  return "";
}

export function extractIntent(raw: string): string {
  const l = raw.toLowerCase();
  if (/hire|recruit|role|position|job|opening|candidate/i.test(l))
    return "Hiring";
  if (/project|build|freelan|contract|consult|mvp|develop/i.test(l))
    return "Project";
  if (/partner|collab|together|joint|co-/i.test(l)) return "Partnership";
  if (/invest|fund|seed|series/i.test(l)) return "Investment";
  if (/explor|curiou|learn|check|look|see/i.test(l)) return "Exploring";
  return "General";
}

export function extractInterests(msgs: Message[]): string[] {
  const all = msgs.map((m) => m.text.toLowerCase()).join(" ");
  const topics: string[] = [];
  if (/game.?engine|vital|medical|health|hipaa/i.test(all))
    topics.push("Medical AI");
  if (/web3|defi|nft|blockchain|ethereum/i.test(all)) topics.push("Web3");
  if (/react.?native|mobile|ios|android|app/i.test(all)) topics.push("Mobile");
  if (/ai|ml|rag|mediapipe|tensor/i.test(all)) topics.push("AI/ML");
  if (/team|lead|manage|hire/i.test(all)) topics.push("Leadership");
  if (/rate|salary|cost|price/i.test(all)) topics.push("Rates");
  if (/freelan|contract|available|open/i.test(all)) topics.push("Freelance");
  return topics.slice(0, 5);
}

function toTitleCase(s: string): string {
  return s.replace(
    /\w\S*/g,
    (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase(),
  );
}
export { toTitleCase as toTitleCaseExport };
