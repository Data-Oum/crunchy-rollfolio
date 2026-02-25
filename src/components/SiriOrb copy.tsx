import { PROFILE } from "@/data/profile";
import { useCallback, useEffect, useRef, useState } from "react";

// ═══════════════════════════════════════════════════════════════════════════════
//  Google Gemini Free — no credit card, $0 forever
//  Get key: https://aistudio.google.com/app/apikey (sign in with Google, 10 sec)
// ═══════════════════════════════════════════════════════════════════════════════
const GEMINI_KEY = process.env.GEMINI_KEY;
const GEMINI_MODEL = "gemini-2.5-flash";

const SYSTEM = `You are Amit Chakraborty's AI hype-man on his portfolio.
Answer in UNDER 60 words. Punchy. Energetic. Like an anime battle announcer.
Never say "I don't know" — always answer from facts below.

Name:${PROFILE.name} | Title:${PROFILE.title} | Location:${PROFILE.location}
Contact:${PROFILE.email} | ${PROFILE.linkedin} | ${PROFILE.github}
Open to: VP Engineering · CTO · Principal Architect
Stats: 8+ yrs · 18 apps · 50K+ users
Stack: ${PROFILE.techStack.join(", ")}
Projects: ${PROFILE.projects.map((p) => `${p.name}[${p.badge}]:${p.desc}→${p.impact}`).join(" | ")}
Journey: ${PROFILE.journey.map((j) => `${j.yr}:${j.title}`).join(" · ")}
Skills: ${PROFILE.skills.map((s) => `${s.cat}(${s.items.slice(0, 3).join(",")})`).join(" | ")}`;

async function askGemini(msg: string): Promise<string> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: SYSTEM }] },
        contents: [{ role: "user", parts: [{ text: msg }] }],
        generationConfig: { maxOutputTokens: 180, temperature: 0.9 },
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
  if (d?.candidates?.[0]?.finishReason === "SAFETY") return fallback(msg);
  return d?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? fallback(msg);
}

function fallback(msg: string): string {
  const q = msg.toLowerCase();
  if (q.match(/who|about|introduce/))
    return `🔥 Amit Chakraborty — Principal Mobile Architect. 8 years. 18 apps. 50K users. Built a game engine from SCRATCH. Zero external libs. 21-person team. VP-level ops. Based in ${PROFILE.location}.`;
  if (q.match(/vital/))
    return `⚡ VitalQuest — Amit's crown jewel. Custom game engine, zero deps. LLM task gen, HIPAA RAG pipeline, XP system. 21 engineers. 5 apps running on it. 99.9% uptime. Legendary.`;
  if (q.match(/tech|stack/))
    return `💻 React Native · Next.js · NestJS · TypeScript · AWS · K8s · GraphQL · TensorFlow · Solidity · Web3.js · Go · Rust. Mobile + AI + Web3 at production scale.`;
  if (q.match(/hire|why/))
    return `🎯 8 years. 18 apps. 50K users. Zero shortcuts. HIPAA AI pipelines from nothing. Spans Mobile + AI + Web3. Recruited 21 engineers. Treats your product like his own.`;
  if (q.match(/contact|email/))
    return `📬 ${PROFILE.email} — or LinkedIn: linkedin.com/in/devamitch. Open for VP Engineering, CTO, Principal Architect.`;
  return `🔥 "${PROFILE.tagline}" — Ask me about projects, stack, or why you should hire Amit!`;
}

// ─── TTS helpers ────────────────────────────────────────────────────────────
async function getVoices(): Promise<SpeechSynthesisVoice[]> {
  return new Promise((resolve) => {
    const v = window.speechSynthesis.getVoices();
    if (v.length) return resolve(v);
    window.speechSynthesis.onvoiceschanged = () =>
      resolve(window.speechSynthesis.getVoices());
    setTimeout(() => resolve(window.speechSynthesis.getVoices()), 1200);
  });
}

// ─── Speech Recognition type shim ────────────────────────────────────────────
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

// ─── Plasma Orb Canvas ───────────────────────────────────────────────────────
type OrbMode = "idle" | "listening" | "thinking" | "speaking";

function PlasmaOrb({ size, mode }: { size: number; mode: OrbMode }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef(0);
  const tRef = useRef(0);
  const energyRef = useRef(0.5);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d")!;
    const CX = size / 2,
      CY = size / 2,
      R = size * 0.42;

    // Blob config — orange/purple for Crunchyroll palette
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

    const draw = () => {
      tRef.current++;
      const t = tRef.current;

      // Energy target based on mode
      const targetEnergy =
        mode === "idle"
          ? 0.45
          : mode === "listening"
            ? 0.9
            : mode === "thinking"
              ? 0.65
              : 0.8; // speaking
      energyRef.current += (targetEnergy - energyRef.current) * 0.04;
      const E = energyRef.current;

      ctx.clearRect(0, 0, size, size);

      // Ambient glow
      const amb = ctx.createRadialGradient(CX, CY, 0, CX, CY, R * 1.5);
      amb.addColorStop(0, `rgba(244,117,33,${0.08 * E})`);
      amb.addColorStop(0.5, `rgba(123,47,190,${0.04 * E})`);
      amb.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = amb;
      ctx.fillRect(0, 0, size, size);

      // Back particles
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

      // Core glass sphere
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

      // Inner blobs (clipped)
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
          pg.addColorStop(1, "rgba(0,0,0,0)");
        } else {
          pg.addColorStop(0, `rgba(160,80,255,${a * 1.1})`);
          pg.addColorStop(0.4, `rgba(123,47,190,${a})`);
          pg.addColorStop(1, "rgba(0,0,0,0)");
        }
        ctx.fillStyle = pg;
        ctx.beginPath();
        ctx.arc(bx, by, pr, 0, Math.PI * 2);
        ctx.fill();
      });

      // Central glow
      const core = ctx.createRadialGradient(CX, CY, 0, CX, CY, R * 0.5);
      core.addColorStop(0, `rgba(255,140,50,${0.07 + E * 0.1})`);
      core.addColorStop(0.5, `rgba(120,40,200,${0.04 + E * 0.05})`);
      core.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = core;
      ctx.fillRect(CX - R, CY - R, R * 2, R * 2);

      // Mode-based inner visual
      const pulse = 0.6 + Math.sin(t * 0.055) * 0.2 + E * 0.2;
      if (mode === "listening") {
        // Listening rings
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
        // Mic icon
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
      } else if (mode === "thinking") {
        // Thinking: rotating dots
        for (let d = 0; d < 4; d++) {
          const da = (d / 4) * Math.PI * 2 + t * 0.06;
          const dx = CX + Math.cos(da) * R * 0.28;
          const dy = CY + Math.sin(da) * R * 0.28;
          ctx.beginPath();
          ctx.arc(dx, dy, 3.5, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(244,117,33,${0.5 + d * 0.12})`;
          ctx.fill();
        }
      } else if (mode === "speaking") {
        // Speaking: wave bars
        const bars = 9;
        const barW = 3;
        const totalW = bars * barW + (bars - 1) * 3;
        for (let b = 0; b < bars; b++) {
          const bh =
            R * 0.28 * (0.3 + Math.abs(Math.sin(t * 0.1 + b * 0.9)) * 0.8) * E;
          const bx = CX - totalW / 2 + b * (barW + 3);
          ctx.fillStyle = `rgba(244,117,33,${0.6 + (b % 2) * 0.2})`;
          ctx.beginPath();
          ctx.roundRect(bx, CY - bh / 2, barW, bh, 1.5);
          ctx.fill();
        }
      } else {
        // Idle: AURA label
        ctx.font = `800 ${Math.round(size * 0.12)}px 'Courier New',monospace`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.shadowColor = `rgba(244,117,33,${0.4 * pulse})`;
        ctx.shadowBlur = 12;
        ctx.fillStyle = `rgba(255,200,120,${0.75 * pulse})`;
        ctx.fillText("AMIT", CX, CY - 4);
        ctx.shadowBlur = 0;
        ctx.font = `600 ${Math.round(size * 0.058)}px 'Courier New',monospace`;
        ctx.fillStyle = `rgba(244,117,33,${0.4 + E * 0.2})`;
        ctx.fillText("AI", CX, CY + size * 0.12);
      }

      ctx.restore();

      // Tendrils
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

      // Rim glow
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

      // Front particles
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
  }, [size, mode]);

  return (
    <canvas
      ref={canvasRef}
      style={{ display: "block", width: size, height: size }}
    />
  );
}

// ─── Spring morph util ────────────────────────────────────────────────────────
function useSpring() {
  const morphRef = useRef(0);
  const velRef = useRef(0);
  const targetRef = useRef(0);
  const rafRef = useRef(0);
  const [v, setV] = useState(0);
  const cbRef = useRef<(() => void) | null>(null);
  const doneRef = useRef(false);

  const springTo = useCallback((target: number, onDone?: () => void) => {
    targetRef.current = target;
    cbRef.current = onDone ?? null;
    doneRef.current = false;
    cancelAnimationFrame(rafRef.current);
    const tick = () => {
      const delta = targetRef.current - morphRef.current;
      velRef.current = velRef.current * 0.72 + delta * 0.045;
      morphRef.current += velRef.current;
      setV(morphRef.current);
      const done =
        Math.abs(velRef.current) < 0.0004 && Math.abs(delta) < 0.0004;
      if (!done) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        morphRef.current = targetRef.current;
        setV(targetRef.current);
        if (!doneRef.current && cbRef.current) {
          doneRef.current = true;
          cbRef.current();
        }
      }
    };
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);
  return { mp: v, springTo };
}

// ─── Suggestions ────────────────────────────────────────────────────────────
const SUGGESTIONS = [
  "What's the most impressive thing you've built?",
  "Tell me about React Native expertise",
  "Why should I hire Amit?",
];

const CHIPS = [
  "Who is Amit?",
  "What did he build?",
  "His stack?",
  "Why hire him?",
  "VitalQuest?",
];

const ORB = 80;
const PW = 360;
const PH = 560;

// ═══════════════════════════════════════════════════════════════════════════════
export const SiriOrbPreviousWOrkingOLdButmisisngthings = () => {
  type Phase = "orb" | "morphing" | "chat" | "closing";
  type VoiceState = "idle" | "listening" | "thinking" | "speaking";

  const [phase, setPhase] = useState<Phase>("orb");
  const [voiceState, setVoiceState] = useState<VoiceState>("idle");
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [messages, setMessages] = useState<
    { role: "user" | "ai"; text: string }[]
  >([]);
  const [autoSpeak, setAutoSpeak] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  const { mp, springTo } = useSpring();
  const chatEnd = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const keepAlive = useRef<ReturnType<typeof setInterval> | null>(null);
  const recogRef = useRef<any>(null);
  const spokenIds = useRef(new Set<number>());

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 640);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    chatEnd.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ── Orb mode derived ─────────────────────────────────────────────────────
  const orbMode: OrbMode =
    voiceState === "listening"
      ? "listening"
      : voiceState === "thinking"
        ? "thinking"
        : voiceState === "speaking"
          ? "speaking"
          : "idle";

  // ── Open / Close ─────────────────────────────────────────────────────────
  const open = useCallback(() => {
    setPhase("morphing");
    springTo(1, () => {
      setPhase("chat");
      setTimeout(() => inputRef.current?.focus(), 80);
    });
  }, [springTo]);

  const close = useCallback(() => {
    window.speechSynthesis?.cancel();
    recogRef.current?.abort();
    setVoiceState("idle");
    setPhase("closing");
    springTo(0, () => setPhase("orb"));
  }, [springTo]);

  // ── TTS ──────────────────────────────────────────────────────────────────
  const speak = useCallback(
    async (text: string) => {
      if (!window.speechSynthesis || !autoSpeak) return;
      window.speechSynthesis.cancel();
      if (keepAlive.current) clearInterval(keepAlive.current);

      const u = new SpeechSynthesisUtterance(text);
      u.rate = 0.92;
      u.pitch = 0.88;
      u.volume = 1.0;

      const voices = await getVoices();
      const voice =
        voices.find(
          (v) => v.name.toLowerCase().includes("google") && v.lang === "en-US",
        ) ||
        voices.find((v) => v.lang.startsWith("en-US")) ||
        voices.find((v) => v.lang.startsWith("en")) ||
        voices[0];
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
    },
    [autoSpeak],
  );

  const stopSpeak = useCallback(() => {
    window.speechSynthesis?.cancel();
    if (keepAlive.current) clearInterval(keepAlive.current);
    setVoiceState("idle");
  }, []);

  // ── Voice input ───────────────────────────────────────────────────────────
  const SR = (window.SpeechRecognition ||
    window.webkitSpeechRecognition) as any;
  const canVoice = !!SR;

  const stopListening = useCallback(() => {
    recogRef.current?.stop();
    setVoiceState("idle");
    setTranscript("");
  }, []);

  // ── Send ──────────────────────────────────────────────────────────────────
  const sendMessage = useCallback(
    async (text: string) => {
      const msg = text.trim();
      if (!msg || isLoading) return;

      setInputText("");
      setTranscript("");
      setMessages((p) => [...p, { role: "user", text: msg }]);
      setIsLoading(true);
      setVoiceState("thinking");

      try {
        const reply = await askGemini(msg);
        const idx = Date.now();
        setMessages((p) => [...p, { role: "ai", text: reply }]);
        if (!spokenIds.current.has(idx)) {
          spokenIds.current.add(idx);
          speak(reply);
        }
      } catch {
        const fb = fallback(msg);
        setMessages((p) => [...p, { role: "ai", text: fb }]);
        speak(fb);
      } finally {
        setIsLoading(false);
        setVoiceState("idle");
      }
    },
    [isLoading, speak],
  );
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
      if (voiceState === "listening") setVoiceState("idle");
    };
    r.start();
  }, [SR, canVoice, sendMessage, voiceState]);

  // ── Geometry ─────────────────────────────────────────────────────────────
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

  return (
    <>
      <style>{`
        @keyframes orbFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
        @keyframes haloGlow{0%,100%{opacity:.35;transform:scale(1.1)}50%{opacity:.7;transform:scale(1.35)}}
        @keyframes waveBar{0%,100%{transform:scaleY(.25);opacity:.4}50%{transform:scaleY(1);opacity:1}}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes blink{0%,100%{opacity:.6}50%{opacity:1}}
        @keyframes typeDot{0%,80%,100%{transform:translateY(0);opacity:.4}40%{transform:translateY(-5px);opacity:1}}
        .ai-scroll::-webkit-scrollbar{width:3px}
        .ai-scroll::-webkit-scrollbar-thumb{background:rgba(244,117,33,.2);border-radius:999px}
        .ai-inp{background:transparent!important;color:#fff!important;border:none!important;outline:none!important;}
        .ai-inp::placeholder{color:rgba(255,255,255,.22)!important}
        .ai-chip:hover{border-color:rgba(244,117,33,.5)!important;color:#F47521!important}
        .ai-sug:hover{background:rgba(244,117,33,.07)!important;border-color:rgba(244,117,33,.28)!important}
        .ai-send:hover:not(:disabled){box-shadow:inset 0 1px 0 rgba(255,255,255,.4), 0 0 24px rgba(244,117,33,.45)!important;transform:scale(1.06)!important}
        .ai-send:active:not(:disabled){transform:scale(.93)!important}
        .ai-send:disabled{opacity:.28;cursor:not-allowed}
        .ai-ib:hover{background:rgba(255,255,255,.1)!important}
      `}</style>

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

        {/* Morphing container */}
        <div
          onClick={isOrb ? open : undefined}
          style={{
            position: "relative",
            width: W,
            height: H,
            borderRadius: BR,
            background: `rgba(8,5,12,${0.93 * bgA})`,
            backdropFilter:
              bgA > 0
                ? `blur(${Math.round(28 * bgA)}px) saturate(${1 + 0.8 * bgA})`
                : "none",
            border:
              bgA > 0.05 && !isMobile
                ? `1px solid rgba(244,117,33,${0.14 * bgA})`
                : "none",
            boxShadow:
              bgA > 0.1 && !isMobile
                ? `0 32px 90px rgba(0,0,0,${0.88 * bgA}), 0 0 0 1px rgba(244,117,33,${0.06 * bgA}), inset 0 1px 0 rgba(255,255,255,${0.04 * bgA})`
                : "none",
            overflow: "hidden",
            cursor: isOrb ? "pointer" : "default",
            animation: isOrb ? "orbFloat 4.2s ease-in-out infinite" : "none",
            willChange: "width,height,border-radius",
            fontFamily: "inherit",
          }}
        >
          {/* Plasma orb */}
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
          ></div>

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
              {/* ── Header ── */}
              <div
                style={{
                  flexShrink: 0,
                  padding: isMobile ? "52px 16px 14px" : "14px 16px",
                  background:
                    "linear-gradient(180deg,rgba(244,117,33,.08) 0%,transparent 100%)",
                  borderBottom: "1px solid rgba(244,117,33,.12)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  {/* Mini orb in header */}
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: "38% 62% 52% 48%/48% 52% 48% 52%",
                      background: "linear-gradient(135deg,#F47521,#7B2FBE)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      boxShadow: "0 0 14px rgba(244,117,33,.5)",
                      flexShrink: 0,
                    }}
                  >
                    <svg
                      width="13"
                      height="13"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#fff"
                      strokeWidth="2.4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" />
                      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                      <line x1="12" y1="19" x2="12" y2="23" />
                    </svg>
                  </div>
                  <div>
                    <div
                      style={{
                        fontSize: 14,
                        fontWeight: 700,
                        color: "#fff",
                        letterSpacing: "-.01em",
                      }}
                    >
                      AMIT AI
                    </div>
                    <div
                      style={{
                        fontSize: 9,
                        fontWeight: 600,
                        letterSpacing: ".07em",
                        textTransform: "uppercase",
                        color:
                          voiceState !== "idle"
                            ? "#F47521"
                            : "rgba(244,117,33,.5)",
                        animation:
                          voiceState !== "idle"
                            ? "blink 1.2s ease-in-out infinite"
                            : "none",
                      }}
                    >
                      {voiceState === "listening"
                        ? "Listening…"
                        : voiceState === "thinking"
                          ? "Thinking…"
                          : voiceState === "speaking"
                            ? "Speaking…"
                            : "Voice Ready"}
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                  {/* Auto-speak toggle */}
                  <button
                    className="ai-ib"
                    onClick={() => {
                      setAutoSpeak((v) => !v);
                      stopSpeak();
                    }}
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: 8,
                      border: "none",
                      cursor: "pointer",
                      background: autoSpeak
                        ? "rgba(244,117,33,.15)"
                        : "transparent",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke={autoSpeak ? "#F47521" : "rgba(255,255,255,.4)"}
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

                  {/* Stop speaking */}
                  {voiceState === "speaking" && (
                    <button
                      className="ai-ib"
                      onClick={stopSpeak}
                      style={{
                        width: 30,
                        height: 30,
                        borderRadius: 8,
                        border: "none",
                        cursor: "pointer",
                        background: "rgba(244,117,33,.12)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <svg
                        width="12"
                        height="12"
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
                      width: 30,
                      height: 30,
                      borderRadius: 8,
                      border: "none",
                      cursor: "pointer",
                      background: "transparent",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <svg
                      width="15"
                      height="15"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="rgba(255,255,255,.45)"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                    >
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* ── Messages ── */}
              <div
                className="ai-scroll"
                style={{ flex: 1, overflowY: "auto", padding: "14px 14px 8px" }}
              >
                {messages.length === 0 && (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      height: "100%",
                      gap: 16,
                      padding: 20,
                      textAlign: "center",
                    }}
                  >
                    <div
                      style={{
                        width: 52,
                        height: 52,
                        borderRadius: "38% 62% 52% 48%/48% 52% 48% 52%",
                        background: "linear-gradient(135deg,#F47521,#7B2FBE)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        boxShadow: "0 0 26px rgba(244,117,33,.45)",
                      }}
                    >
                      <svg
                        width="20"
                        height="20"
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
                          fontSize: 18,
                          fontWeight: 800,
                          color: "#F47521",
                          margin: "0 0 6px",
                          letterSpacing: "-.02em",
                        }}
                      >
                        Hey, I'm AMIT AI
                      </p>
                      <p
                        style={{
                          fontSize: 12,
                          color: "rgba(255,255,255,.4)",
                          margin: 0,
                          lineHeight: 1.6,
                        }}
                      >
                        Ask me anything — or tap the mic and just speak.
                      </p>
                    </div>
                    <div
                      style={{
                        width: "100%",
                        display: "flex",
                        flexDirection: "column",
                        gap: 6,
                      }}
                    >
                      <p
                        style={{
                          fontSize: 9,
                          color: "rgba(255,255,255,.35)",
                          textTransform: "uppercase",
                          letterSpacing: ".14em",
                          margin: "4px 0 0",
                          textAlign: "left",
                        }}
                      >
                        Try asking
                      </p>
                      {SUGGESTIONS.map((s) => (
                        <button
                          key={s}
                          className="ai-sug"
                          onClick={() => sendMessage(s)}
                          style={{
                            width: "100%",
                            textAlign: "left",
                            padding: "9px 13px",
                            borderRadius: 10,
                            background: "rgba(244,117,33,.05)",
                            border: "1px solid rgba(244,117,33,.15)",
                            color: "rgba(255,255,255,.65)",
                            fontSize: 12,
                            cursor: "pointer",
                            transition: "all .15s",
                            boxShadow: "0 2px 8px rgba(0,0,0,.3)",
                          }}
                        >
                          <span style={{ color: "#F47521", marginRight: 6 }}>
                            ▸
                          </span>
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {messages.map((m, i) => (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      justifyContent:
                        m.role === "user" ? "flex-end" : "flex-start",
                      marginBottom: 10,
                    }}
                  >
                    {m.role === "ai" && (
                      <div
                        style={{
                          width: 26,
                          height: 26,
                          flexShrink: 0,
                          marginRight: 7,
                          marginTop: 2,
                          borderRadius: "38% 62% 52% 48%/48% 52% 48% 52%",
                          background: "linear-gradient(135deg,#F47521,#7B2FBE)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <svg
                          width="11"
                          height="11"
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
                        maxWidth: "80%",
                        borderRadius:
                          m.role === "user"
                            ? "18px 18px 4px 18px"
                            : "18px 18px 18px 4px",
                        padding: "10px 14px",
                        fontSize: 12.5,
                        lineHeight: 1.6,
                        ...(m.role === "user"
                          ? {
                              background: "rgba(244,117,33,.18)",
                              border: "1px solid rgba(244,117,33,.28)",
                              color: "#fed7aa",
                            }
                          : {
                              background: "#0F0D14",
                              border: "1px solid rgba(255,255,255,.07)",
                              color: "rgba(255,255,255,.88)",
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
                      gap: 7,
                      marginBottom: 10,
                    }}
                  >
                    <div
                      style={{
                        width: 26,
                        height: 26,
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
                        width="11"
                        height="11"
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
                        padding: "12px 16px",
                        borderRadius: "18px 18px 18px 4px",
                        background: "#0F0D14",
                        border: "1px solid rgba(255,255,255,.07)",
                        display: "flex",
                        gap: 5,
                        alignItems: "center",
                      }}
                    >
                      {[0, 160, 320].map((d) => (
                        <span
                          key={d}
                          style={{
                            width: 6,
                            height: 6,
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

              {/* Quick chips */}
              {messages.length > 0 && (
                <div
                  style={{
                    flexShrink: 0,
                    padding: "6px 14px",
                    borderTop: "1px solid rgba(255,255,255,.04)",
                    display: "flex",
                    gap: 5,
                    flexWrap: "wrap",
                  }}
                >
                  {CHIPS.map((c) => (
                    <button
                      key={c}
                      className="ai-chip"
                      onClick={() => sendMessage(c)}
                      disabled={isLoading}
                      style={{
                        fontSize: 9,
                        fontFamily: "monospace",
                        padding: "2px 8px",
                        borderRadius: 99,
                        background: "transparent",
                        border: "1px solid rgba(244,117,33,.18)",
                        color: "rgba(244,117,33,.75)",
                        cursor: "pointer",
                        transition: "all .15s",
                      }}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              )}

              {/* ── Bottom bar ── */}
              <div
                style={{
                  flexShrink: 0,
                  background: "rgba(5,3,9,.92)",
                  backdropFilter: "blur(28px) saturate(160%)",
                  borderTop: "1px solid rgba(255,255,255,.06)",
                  padding: isMobile
                    ? `14px 14px max(20px, env(safe-area-inset-bottom,20px))`
                    : "12px 14px 16px",
                }}
              >
                <div style={{ position: "relative", height: 50 }}>
                  {/* Layer A — text input */}
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      opacity: isVoiceActive ? 0 : 1,
                      transform: isVoiceActive
                        ? "translateY(6px) scale(.97)"
                        : "translateY(0) scale(1)",
                      transition:
                        "opacity .24s ease, transform .24s cubic-bezier(.4,0,.2,1)",
                      pointerEvents: isVoiceActive ? "none" : "auto",
                    }}
                  >
                    {/* Input trough */}
                    <div
                      style={{
                        flex: 1,
                        height: 50,
                        display: "flex",
                        alignItems: "center",
                        borderRadius: 25,
                        background: "rgba(255,255,255,.044)",
                        border: "1px solid rgba(255,255,255,.08)",
                        boxShadow:
                          "inset 0 2px 6px rgba(0,0,0,.4), inset 0 1px 0 rgba(0,0,0,.18)",
                        overflow: "hidden",
                      }}
                      onClick={() => inputRef.current?.focus()}
                    >
                      {/* Mic button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          startListening();
                        }}
                        style={{
                          flexShrink: 0,
                          width: 48,
                          height: 50,
                          background: "none",
                          border: "none",
                          cursor: canVoice ? "pointer" : "default",
                          opacity: canVoice ? 1 : 0.3,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "#F47521",
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
                          strokeLinejoin="round"
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
                          height: 16,
                          background: "rgba(255,255,255,.06)",
                          flexShrink: 0,
                        }}
                      />

                      <input
                        ref={inputRef}
                        className="ai-inp"
                        type="text"
                        placeholder="Ask anything about Amit…"
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        onKeyDown={(e) =>
                          e.key === "Enter" && sendMessage(inputText)
                        }
                        disabled={isLoading}
                        style={{
                          flex: 1,
                          height: "100%",
                          padding: "0 12px",
                          background: "transparent",
                          border: "none",
                          color: "#fff",
                          fontSize: 13,
                          fontFamily: "inherit",
                        }}
                      />
                    </div>

                    {/* Send disc */}
                    <button
                      className="ai-send"
                      onClick={() => sendMessage(inputText)}
                      disabled={isLoading || !inputText.trim()}
                      style={{
                        flexShrink: 0,
                        width: 50,
                        height: 50,
                        borderRadius: "50%",
                        background:
                          "linear-gradient(155deg,#F47521 0%,#d4661a 60%,#a84e10 100%)",
                        border: "1px solid rgba(200,90,20,.35)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                        transition: "all .22s cubic-bezier(.34,1.4,.64,1)",
                        boxShadow:
                          "inset 0 1px 0 rgba(255,255,255,.36), 0 0 18px rgba(244,117,33,.22)",
                      }}
                    >
                      {isLoading ? (
                        <div
                          style={{
                            width: 18,
                            height: 18,
                            border: "2px solid rgba(0,0,0,.3)",
                            borderTopColor: "#000",
                            borderRadius: "50%",
                            animation: "spin 1s linear infinite",
                          }}
                        />
                      ) : (
                        <svg
                          width="15"
                          height="15"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="#000"
                          strokeWidth="2.6"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <line x1="22" y1="2" x2="11" y2="13" />
                          <polygon points="22 2 15 22 11 13 2 9 22 2" />
                        </svg>
                      )}
                    </button>
                  </div>

                  {/* Layer B — voice active */}
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      display: "flex",
                      alignItems: "center",
                      opacity: isVoiceActive ? 1 : 0,
                      transform: isVoiceActive
                        ? "translateY(0) scale(1)"
                        : "translateY(6px) scale(.97)",
                      transition:
                        "opacity .24s ease, transform .24s cubic-bezier(.4,0,.2,1)",
                      pointerEvents: isVoiceActive ? "auto" : "none",
                    }}
                  >
                    <div
                      style={{
                        flex: 1,
                        height: 50,
                        display: "flex",
                        alignItems: "center",
                        gap: 9,
                        borderRadius: 25,
                        padding: "0 8px",
                        background:
                          voiceState === "listening"
                            ? "rgba(244,117,33,.07)"
                            : "rgba(34,197,94,.06)",
                        border: `1px solid ${voiceState === "listening" ? "rgba(244,117,33,.2)" : "rgba(34,197,94,.18)"}`,
                        transition: "background .3s, border-color .3s",
                      }}
                    >
                      {/* Stop button */}
                      <button
                        onClick={
                          voiceState === "listening" ? stopListening : stopSpeak
                        }
                        style={{
                          flexShrink: 0,
                          width: 36,
                          height: 36,
                          borderRadius: "50%",
                          border: "none",
                          background:
                            voiceState === "listening"
                              ? "rgba(244,117,33,.12)"
                              : "rgba(34,197,94,.1)",
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
                          </svg>
                        ) : (
                          <svg
                            width="13"
                            height="13"
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

                      {/* Wave bars */}
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 2.5,
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
                              height: Math.round(h * 20),
                              borderRadius: 3,
                              background:
                                voiceState === "listening"
                                  ? "#F47521"
                                  : "#22c55e",
                              transformOrigin: "center",
                              animation: `waveBar ${0.5 + (i % 3) * 0.18}s ${i * 55}ms ease-in-out infinite`,
                              filter:
                                voiceState === "listening"
                                  ? "drop-shadow(0 0 3px rgba(244,117,33,.7))"
                                  : "drop-shadow(0 0 3px rgba(34,197,94,.7))",
                            }}
                          />
                        ))}
                      </div>

                      {/* Transcript / Speaking label */}
                      <span
                        style={{
                          flex: 1,
                          fontSize: 13,
                          fontWeight: 500,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          color:
                            voiceState === "listening" ? "#F47521" : "#22c55e",
                        }}
                      >
                        {voiceState === "listening"
                          ? transcript || "Listening…"
                          : "Speaking…"}
                      </span>

                      {/* Cancel X */}
                      <button
                        onClick={
                          voiceState === "listening" ? stopListening : stopSpeak
                        }
                        style={{
                          flexShrink: 0,
                          width: 36,
                          height: 36,
                          borderRadius: "50%",
                          border: "none",
                          background: "rgba(255,255,255,.05)",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "rgba(255,255,255,.4)",
                        }}
                      >
                        <svg
                          width="12"
                          height="12"
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
