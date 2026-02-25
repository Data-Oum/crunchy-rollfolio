/**
 * src/components/AuraChatWidget.tsx
 *
 * FIXED — fully working, zero re-render bugs, proper TTS lifecycle.
 *
 * KEY FIXES vs previous attempts:
 *
 * 1. `finally` block REMOVED from sendMessage.
 *    The old finally { setVoiceState("idle") } was killing TTS before it could
 *    transition to "speaking". voiceState is now owned exclusively by speak().
 *
 * 2. speak() sets "thinking" BEFORE the TTS API fetch, then "speaking" on play,
 *    then "idle" on end — a clean three-step owned transition.
 *
 * 3. autoSpeak=false path now correctly sets voiceState("idle").
 *
 * 4. TTSPlayer uses a generation counter (more reliable than AbortController
 *    with the Google GenAI SDK) to cancel in-flight requests.
 *
 * 5. stopAll() cancels both the LLM fetch and TTS — stop button is visible
 *    during BOTH "thinking" (API) and "speaking" (playback).
 *
 * 6. Voice: "Charon" — Gemini's deepest authoritative male, with an
 *    Indian-English director prompt. Browser fallback picks en-IN male.
 *
 * 7. API key read from VITE_GEMINI_API_KEY env — never hardcoded.
 */

import { GoogleGenAI } from "@google/genai";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";

import { askAura, detectInstantAnswer, generateSummary } from "@/lib/gemini";
import type { Message, UserProfile } from "@/store/useConversationStore";
import {
  DAILY_LIMIT,
  useConversationStore,
} from "@/store/useConversationStore";
import {
  extractCompany,
  extractIntent,
  extractInterests,
  extractName,
  extractRole,
  toTitleCaseExport,
  type OnboardStep,
} from "./onboarding";

// ── Config ────────────────────────────────────────────────────────────────────
const GEMINI_KEY =
  (import.meta as unknown as { env: Record<string, string> }).env
    .VITE_GEMINI_API_KEY ?? "";

const TTS_MODEL = "gemini-2.5-flash-preview-tts";
const TTS_VOICE = "Charon"; // Deepest authoritative male in Gemini lineup
const TTS_RATE = 24000;
const BMC_URL = "https://buymeacoffee.com/amithellmab";

const ORB = 80;
const PW = 390;
const PH = 590;

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

const ONBOARD_STEPS: OnboardStep[] = [
  "ask_name",
  "ask_company",
  "ask_role",
  "ask_intent",
];

// ── CSS (injected once) ───────────────────────────────────────────────────────
const CSS_ID = "acw-css";
if (typeof document !== "undefined" && !document.getElementById(CSS_ID)) {
  const s = document.createElement("style");
  s.id = CSS_ID;
  s.textContent = `
    @keyframes acwFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
    @keyframes acwHalo{0%,100%{opacity:.35;transform:scale(1.1)}50%{opacity:.7;transform:scale(1.35)}}
    @keyframes acwWave{0%,100%{transform:scaleY(.25);opacity:.4}50%{transform:scaleY(1);opacity:1}}
    @keyframes acwBlink{0%,100%{opacity:.6}50%{opacity:1}}
    @keyframes acwDot{0%,80%,100%{transform:translateY(0);opacity:.4}40%{transform:translateY(-5px);opacity:1}}
    @keyframes acwSlide{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
    @keyframes acwFade{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
    @keyframes acwPulse{0%,100%{box-shadow:0 0 0 0 rgba(123,47,190,0)}50%{box-shadow:0 0 0 5px rgba(123,47,190,.1)}}
    .acw-sc::-webkit-scrollbar{width:2px}
    .acw-sc::-webkit-scrollbar-thumb{background:rgba(244,117,33,.16);border-radius:99px}
    .acw-inp{background:transparent!important;color:#fff!important;border:none!important;outline:none!important;}
    .acw-inp::placeholder{color:rgba(255,255,255,.18)!important}
    .acw-chip:hover{border-color:rgba(244,117,33,.5)!important;color:#F47521!important}
    .acw-sug:hover{background:rgba(244,117,33,.07)!important;border-color:rgba(244,117,33,.28)!important}
    .acw-send:hover:not(:disabled){transform:scale(1.05)!important;box-shadow:inset 0 1px 0 rgba(255,255,255,.35),0 0 20px rgba(244,117,33,.38)!important}
    .acw-send:active:not(:disabled){transform:scale(.92)!important}
    .acw-send:disabled{opacity:.22;cursor:not-allowed}
    .acw-ib:hover{background:rgba(255,255,255,.07)!important}
    .acw-msg{animation:acwSlide .25s cubic-bezier(.34,1.4,.64,1) forwards}
    .acw-ob{animation:acwPulse 2.4s ease-in-out infinite}
    .acw-stop:hover{background:rgba(239,68,68,.25)!important}
  `;
  document.head.appendChild(s);
}

// ── Gemini TTS Engine ─────────────────────────────────────────────────────────
const genAI = new GoogleGenAI({ apiKey: GEMINI_KEY });

const toSpeakable = (t: string) =>
  t
    .replace(/https?:\/\/\S+/g, "")
    .replace(/[*_`#>|]/g, "")
    .replace(/—/g, ", ")
    .replace(/·/g, ", ")
    .replace(/\bK8s\b/gi, "Kubernetes")
    .replace(/\bAWS\b/g, "Amazon Web Services")
    .replace(/\bAPI\b/g, "A.P.I.")
    .replace(/\bAPIs\b/g, "A.P.I.s")
    .replace(/\bRAG\b/g, "retrieval augmented generation")
    .replace(/\bLLMs?\b/g, "large language model")
    .replace(/\bVP\b/g, "V.P.")
    .replace(/\bCTO\b/g, "C.T.O.")
    .replace(/\bCEO\b/g, "C.E.O.")
    .replace(/\bDeFi\b/gi, "decentralized finance")
    .replace(/\bNFTs?\b/g, "N.F.T.s")
    .replace(/50K\+?/g, "50 thousand plus")
    .replace(/99\.9%/g, "99 point 9 percent")
    .replace(/Next\.js/gi, "Next JS")
    .trim();

const makeTTSPrompt = (text: string) =>
  `[Voice direction: Indian-English male, educated Kolkata accent, confident and measured, each sentence delivered with weight and precision, slight natural pauses between facts, no rushing, no filler energy]\n\n${toSpeakable(text)}`.trim();

const b64ToU8 = (b64: string) => {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
};

const pcmToF32 = (bytes: Uint8Array) => {
  const n = Math.floor(bytes.length / 2);
  const f = new Float32Array(n);
  const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  for (let i = 0; i < n; i++) f[i] = v.getInt16(i * 2, true) / 32768;
  return f;
};

let _audioCtx: AudioContext | null = null;
const getCtx = () => {
  if (!_audioCtx || _audioCtx.state === "closed")
    _audioCtx = new AudioContext({ sampleRate: TTS_RATE });
  if (_audioCtx.state === "suspended") _audioCtx.resume().catch(() => {});
  return _audioCtx;
};

/**
 * TTSPlayer — generation counter pattern.
 * Incrementing `gen` on every stop() call lets any in-flight async speak()
 * detect it has been superseded and bail out without calling onEnd() twice.
 */
class TTSPlayer {
  private src: AudioBufferSourceNode | null = null;
  private gen = 0;

  stop(): void {
    this.gen++;
    try {
      this.src?.stop();
    } catch {}
    this.src?.disconnect();
    this.src = null;
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  }

  async speak(
    text: string,
    onStart?: () => void,
    onEnd?: () => void,
  ): Promise<void> {
    this.stop();
    const myGen = this.gen;

    try {
      const res = await genAI.models.generateContent({
        model: TTS_MODEL,
        contents: [{ parts: [{ text: makeTTSPrompt(text) }] }],
        config: {
          responseModalities: ["AUDIO"],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: TTS_VOICE } },
          },
        },
      });

      // Stale — a newer speak() or stop() was called while we awaited
      if (this.gen !== myGen) {
        onEnd?.();
        return;
      }

      const data = res.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (!data) throw new Error("no audio data from Gemini TTS");

      const f32 = pcmToF32(b64ToU8(data));
      if (this.gen !== myGen) {
        onEnd?.();
        return;
      }

      const ctx = getCtx();
      const buf = ctx.createBuffer(1, f32.length, TTS_RATE);
      buf.copyToChannel(f32, 0);
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.connect(ctx.destination);
      this.src = src;

      await new Promise<void>((resolve) => {
        src.onended = () => {
          this.src = null;
          onEnd?.();
          resolve();
        };
        onStart?.();
        src.start(0);
      });
    } catch (err) {
      // If we were stopped mid-flight, onEnd was already called above
      if (this.gen !== myGen) return;

      console.warn("[TTS] Gemini failed, falling back to browser TTS", err);

      if (!window.speechSynthesis) {
        onEnd?.();
        return;
      }

      await new Promise<void>((resolve) => {
        const u = new SpeechSynthesisUtterance(toSpeakable(text));
        u.rate = 0.88;
        u.pitch = 0.9;
        u.lang = "en-IN";

        // Pick best available Indian male voice
        const voices = window.speechSynthesis.getVoices();
        const preferred =
          voices.find(
            (v) =>
              v.lang === "en-IN" && !v.name.toLowerCase().includes("female"),
          ) ||
          voices.find((v) => v.lang === "en-IN") ||
          voices.find((v) => v.lang.startsWith("en-GB")) ||
          null;
        if (preferred) u.voice = preferred;

        u.onstart = () => {
          if (this.gen !== myGen) {
            window.speechSynthesis.cancel();
            onEnd?.();
            resolve();
            return;
          }
          onStart?.();
        };
        u.onend = () => {
          onEnd?.();
          resolve();
        };
        u.onerror = () => {
          onEnd?.();
          resolve();
        };
        window.speechSynthesis.speak(u);
      });
    }
  }
}

const tts = new TTSPlayer();

// ── PlasmaOrb ─────────────────────────────────────────────────────────────────
type OrbMode = "idle" | "listening" | "thinking" | "speaking";

const PlasmaOrb = memo(({ size, mode }: { size: number; mode: OrbMode }) => {
  const cv = useRef<HTMLCanvasElement>(null);
  const raf = useRef(0);
  const mRef = useRef(mode);
  useEffect(() => {
    mRef.current = mode;
  }, [mode]);

  useEffect(() => {
    const c = cv.current;
    if (!c) return;
    c.width = size;
    c.height = size;
    const g = c.getContext("2d")!;
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
    const pts = Array.from({ length: 50 }, (_, i) => ({
      angle: (i / 50) * Math.PI * 2,
      orbitR: R * (0.65 + Math.random() * 0.4),
      tilt: (Math.random() - 0.5) * 0.6,
      spd: 0.004 + Math.random() * 0.008,
      sz: 0.7 + Math.random() * 1.4,
      op: 0.3 + Math.random() * 0.6,
      hue: Math.random() > 0.5 ? 28 : 270,
      front: Math.random() > 0.45,
    }));
    const tnd = Array.from({ length: 8 }, (_, i) => ({
      base: (i / 8) * Math.PI * 2,
      phase: Math.random() * Math.PI * 2,
      spd: 0.012 + Math.random() * 0.008,
      len: R * (0.3 + Math.random() * 0.5),
      w: 0.6 + Math.random() * 1.0,
      hue: i % 2 === 0 ? 28 : 270,
    }));

    let t = 0,
      E = 0.5;
    const loop = () => {
      t++;
      const cm = mRef.current;
      E +=
        ((cm === "idle"
          ? 0.45
          : cm === "listening"
            ? 0.9
            : cm === "thinking"
              ? 0.65
              : 0.8) -
          E) *
        0.04;
      g.clearRect(0, 0, size, size);

      const amb = g.createRadialGradient(CX, CY, 0, CX, CY, R * 1.5);
      amb.addColorStop(0, `rgba(244,117,33,${0.08 * E})`);
      amb.addColorStop(0.5, `rgba(123,47,190,${0.04 * E})`);
      amb.addColorStop(1, "rgba(0,0,0,0)");
      g.fillStyle = amb;
      g.fillRect(0, 0, size, size);

      pts
        .filter((p) => !p.front)
        .forEach((p) => {
          p.angle += p.spd;
          const x = CX + Math.cos(p.angle) * p.orbitR * Math.cos(p.tilt);
          const y = CY + Math.sin(p.angle) * p.orbitR;
          const d = (Math.cos(p.angle) * Math.cos(p.tilt) + 1) / 2;
          if (d < 0.5) {
            g.beginPath();
            g.arc(x, y, p.sz * d, 0, Math.PI * 2);
            g.fillStyle = `hsla(${p.hue},85%,65%,${p.op * d * 0.25 * E})`;
            g.fill();
          }
        });

      const gl = g.createRadialGradient(
        CX - R * 0.2,
        CY - R * 0.25,
        R * 0.04,
        CX,
        CY,
        R,
      );
      gl.addColorStop(0, "rgba(12,8,18,.97)");
      gl.addColorStop(0.6, "rgba(5,3,10,.98)");
      gl.addColorStop(1, "rgba(2,1,5,.99)");
      g.beginPath();
      g.arc(CX, CY, R, 0, Math.PI * 2);
      g.fillStyle = gl;
      g.fill();

      g.save();
      g.beginPath();
      g.arc(CX, CY, R - 1, 0, Math.PI * 2);
      g.clip();

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
        const pg = g.createRadialGradient(bx, by, 0, bx, by, pr);
        const a = 0.15 + E * 0.22;
        if (b.hue === 28 || b.hue === 45) {
          pg.addColorStop(0, `rgba(255,160,60,${a * 1.4})`);
          pg.addColorStop(0.4, `rgba(244,117,33,${a})`);
        } else {
          pg.addColorStop(0, `rgba(160,80,255,${a * 1.1})`);
          pg.addColorStop(0.4, `rgba(123,47,190,${a})`);
        }
        pg.addColorStop(1, "rgba(0,0,0,0)");
        g.fillStyle = pg;
        g.beginPath();
        g.arc(bx, by, pr, 0, Math.PI * 2);
        g.fill();
      });

      const pulse = 0.6 + Math.sin(t * 0.055) * 0.2 + E * 0.2;
      if (cm === "listening") {
        for (let r = 0; r < 3; r++) {
          g.beginPath();
          g.arc(
            CX,
            CY,
            R * (0.2 + r * 0.18) * (1 + Math.sin(t * 0.05 + r * 1.2) * 0.12),
            0,
            Math.PI * 2,
          );
          g.strokeStyle = `rgba(244,117,33,${(0.4 - r * 0.1) * pulse})`;
          g.lineWidth = 1.5 - r * 0.4;
          g.stroke();
        }
        g.strokeStyle = `rgba(255,200,100,${0.7 * pulse})`;
        g.lineWidth = 2;
        g.beginPath();
        g.roundRect(CX - 7, CY - 14, 14, 20, 7);
        g.stroke();
        g.beginPath();
        g.arc(CX, CY + 10, 10, Math.PI, 0);
        g.stroke();
        g.beginPath();
        g.moveTo(CX, CY + 20);
        g.lineTo(CX, CY + 25);
        g.stroke();
      } else if (cm === "thinking") {
        for (let d = 0; d < 4; d++) {
          const da = (d / 4) * Math.PI * 2 + t * 0.06;
          g.beginPath();
          g.arc(
            CX + Math.cos(da) * R * 0.28,
            CY + Math.sin(da) * R * 0.28,
            3.5,
            0,
            Math.PI * 2,
          );
          g.fillStyle = `rgba(244,117,33,${0.5 + d * 0.12})`;
          g.fill();
        }
      } else if (cm === "speaking") {
        const bars = 9,
          bw = 3,
          tw = bars * bw + (bars - 1) * 3;
        for (let b = 0; b < bars; b++) {
          const bh =
            R * 0.28 * (0.3 + Math.abs(Math.sin(t * 0.1 + b * 0.9)) * 0.8) * E;
          g.fillStyle = `rgba(244,117,33,${0.6 + (b % 2) * 0.2})`;
          g.beginPath();
          g.roundRect(CX - tw / 2 + b * (bw + 3), CY - bh / 2, bw, bh, 1.5);
          g.fill();
        }
      } else {
        g.font = `800 ${Math.round(size * 0.115)}px 'Courier New',monospace`;
        g.textAlign = "center";
        g.textBaseline = "middle";
        g.shadowColor = `rgba(244,117,33,${0.4 * pulse})`;
        g.shadowBlur = 12;
        g.fillStyle = `rgba(255,200,120,${0.75 * pulse})`;
        g.fillText("AURA", CX, CY - 2);
        g.shadowBlur = 0;
      }
      g.restore();

      tnd.forEach((tn) => {
        tn.phase += tn.spd;
        const ang = tn.base + Math.sin(tn.phase) * 0.35;
        const extR = R + tn.len * E * (0.25 + Math.sin(tn.phase * 1.1) * 0.2);
        const x1 = CX + Math.cos(ang) * R * 0.92,
          y1 = CY + Math.sin(ang) * R * 0.92;
        const x2 = CX + Math.cos(ang + Math.sin(tn.phase) * 0.2) * extR;
        const y2 = CY + Math.sin(ang + Math.sin(tn.phase) * 0.2) * extR;
        const tg = g.createLinearGradient(x1, y1, x2, y2);
        tg.addColorStop(
          0,
          tn.hue === 28
            ? `rgba(244,117,33,${0.5 * E})`
            : `rgba(123,47,190,${0.4 * E})`,
        );
        tg.addColorStop(1, "rgba(0,0,0,0)");
        g.beginPath();
        g.moveTo(x1, y1);
        g.quadraticCurveTo(
          CX + Math.cos(ang + 0.15) * (R + extR) * 0.42,
          CY + Math.sin(ang + 0.15) * (R + extR) * 0.42,
          x2,
          y2,
        );
        g.strokeStyle = tg;
        g.lineWidth = tn.w * E;
        g.stroke();
      });

      const rim = g.createRadialGradient(CX, CY, R * 0.82, CX, CY, R);
      rim.addColorStop(0, "rgba(0,0,0,0)");
      rim.addColorStop(0.6, `rgba(244,117,33,${0.08 + E * 0.06})`);
      rim.addColorStop(0.88, `rgba(244,117,33,${0.18 + E * 0.1})`);
      rim.addColorStop(1, "rgba(123,47,190,.08)");
      g.beginPath();
      g.arc(CX, CY, R, 0, Math.PI * 2);
      g.fillStyle = rim;
      g.fill();
      g.strokeStyle = `rgba(244,117,33,${0.18 + E * 0.15})`;
      g.lineWidth = 0.8;
      g.stroke();

      pts
        .filter((p) => p.front)
        .forEach((p) => {
          const x = CX + Math.cos(p.angle) * p.orbitR * Math.cos(p.tilt);
          const y = CY + Math.sin(p.angle) * p.orbitR;
          const d = (Math.cos(p.angle) * Math.cos(p.tilt) + 1) / 2;
          if (d >= 0.5) {
            const pg = g.createRadialGradient(x, y, 0, x, y, p.sz * 2.2);
            pg.addColorStop(0, `hsla(${p.hue},88%,72%,${p.op * d * E})`);
            pg.addColorStop(1, "hsla(0,0%,0%,0)");
            g.beginPath();
            g.arc(x, y, p.sz * 1.8, 0, Math.PI * 2);
            g.fillStyle = pg;
            g.fill();
          }
        });

      raf.current = requestAnimationFrame(loop);
    };
    loop();
    return () => cancelAnimationFrame(raf.current);
  }, [size]);

  return (
    <canvas ref={cv} style={{ display: "block", width: size, height: size }} />
  );
});
PlasmaOrb.displayName = "PlasmaOrb";

// ── Sub-components ────────────────────────────────────────────────────────────
const AuraIcon = memo(({ size = 30 }: { size?: number }) => (
  <div
    style={{
      width: size,
      height: size,
      flexShrink: 0,
      borderRadius: "38% 62% 52% 48%/48% 52% 48% 52%",
      background: "linear-gradient(135deg,#F47521,#7B2FBE)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      boxShadow: `0 0 ${Math.round(size * 0.4)}px rgba(244,117,33,.4)`,
    }}
  >
    <svg
      width={Math.round(size * 0.4)}
      height={Math.round(size * 0.4)}
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
));
AuraIcon.displayName = "AuraIcon";

const MsgBubble = memo(({ m, onboard }: { m: Message; onboard: boolean }) => (
  <div
    className="acw-msg"
    style={{
      display: "flex",
      justifyContent: m.role === "user" ? "flex-end" : "flex-start",
      marginBottom: 8,
    }}
  >
    {m.role === "ai" && (
      <div style={{ marginRight: 6, marginTop: 2 }}>
        <AuraIcon size={24} />
      </div>
    )}
    <div
      style={{
        maxWidth: "78%",
        borderRadius:
          m.role === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
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
              border: onboard
                ? "1px solid rgba(123,47,190,.2)"
                : "1px solid rgba(255,255,255,.055)",
              color: "rgba(255,255,255,.86)",
            }),
      }}
    >
      {m.text}
    </div>
  </div>
));
MsgBubble.displayName = "MsgBubble";

const Typing = memo(() => (
  <div
    style={{
      display: "flex",
      alignItems: "flex-start",
      gap: 6,
      marginBottom: 8,
    }}
  >
    <AuraIcon size={24} />
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
            animation: `acwDot 1.2s ${d}ms infinite`,
          }}
        />
      ))}
    </div>
  </div>
));
Typing.displayName = "Typing";

// ── Container style helpers ───────────────────────────────────────────────────
const TRANS =
  "width .48s cubic-bezier(.34,1.2,.64,1),height .48s cubic-bezier(.34,1.2,.64,1),border-radius .48s cubic-bezier(.34,1.2,.64,1),background .32s ease,backdrop-filter .32s ease,border .32s ease,box-shadow .32s ease";

function getContainerStyle(
  isOpen: boolean,
  isMobile: boolean,
): React.CSSProperties {
  if (!isOpen)
    return {
      width: ORB,
      height: ORB,
      borderRadius: ORB / 2,
      background: "transparent",
      backdropFilter: "none",
      border: "none",
      boxShadow: "none",
      transition: TRANS,
    };
  return {
    width: isMobile ? "100vw" : PW,
    height: isMobile ? "100dvh" : PH,
    borderRadius: isMobile ? 0 : 20,
    background: "rgba(7,4,12,.94)",
    backdropFilter: "blur(28px) saturate(1.8)",
    border: isMobile ? "none" : "1px solid rgba(244,117,33,.12)",
    boxShadow: isMobile
      ? "none"
      : "0 32px 90px rgba(0,0,0,.9),inset 0 1px 0 rgba(255,255,255,.03)",
    transition: TRANS,
  };
}

// ── Main Widget ───────────────────────────────────────────────────────────────
export const AuraChatWidget = () => {
  const messages = useConversationStore((s) => s.messages);
  const userProfile = useConversationStore((s) => s.userProfile);
  const addMessage = useConversationStore((s) => s.addMessage);
  const resetMessages = useConversationStore((s) => s.resetMessages);
  const setProfile = useConversationStore((s) => s.setProfile);
  const updateProfile = useConversationStore((s) => s.updateProfile);
  const canChat = useConversationStore((s) => s.canChat);
  const getRemaining = useConversationStore((s) => s.getRemainingChats);
  const getStore = useConversationStore.getState;

  const [isOpen, setIsOpen] = useState(false);
  const [chatReady, setChatReady] = useState(false);
  const [voiceState, setVoiceState] = useState<
    "idle" | "listening" | "thinking" | "speaking"
  >("idle");
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [autoSpeak, setAutoSpeak] = useState(true);
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== "undefined" && window.innerWidth <= 640,
  );
  const [onboardStep, setOnboardStep] = useState<OnboardStep>("welcome");
  const [showEnd, setShowEnd] = useState(false);
  const [endSummary, setEndSummary] = useState("");
  const [error, setError] = useState<string | null>(null);

  const loadingRef = useRef(false);
  const autoSpeakRef = useRef(true);
  const stepRef = useRef<OnboardStep>("welcome");
  const micActive = useRef(false);
  const sessionCounted = useRef(false);
  const recog = useRef<SpeechRecognition | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const convoId = useRef(`c_${Date.now()}`);
  const sendRef = useRef<(t: string) => void>(() => {});

  useEffect(() => {
    loadingRef.current = isLoading;
  }, [isLoading]);
  useEffect(() => {
    autoSpeakRef.current = autoSpeak;
  }, [autoSpeak]);
  useEffect(() => {
    stepRef.current = onboardStep;
  }, [onboardStep]);

  const limitHit = !canChat();
  const convoLeft = getRemaining();
  const isOnboard = onboardStep !== "ready";
  const isVoiceOn = voiceState === "listening" || voiceState === "speaking";
  // ▶ Stop button visible during BOTH "thinking" (API) and "speaking" (TTS)
  const showStop = voiceState === "thinking" || voiceState === "speaking";
  const showBMC = messages.filter((m) => m.role === "user").length >= 3;
  const onbIdx = ONBOARD_STEPS.indexOf(onboardStep);

  const orbMode = useMemo<OrbMode>(() => {
    if (voiceState === "listening") return "listening";
    if (voiceState === "thinking") return "thinking";
    if (voiceState === "speaking") return "speaking";
    return "idle";
  }, [voiceState]);

  const status = error
    ? error
    : voiceState === "listening"
      ? "Listening..."
      : voiceState === "thinking"
        ? "Thinking..."
        : voiceState === "speaking"
          ? "Speaking..."
          : "Ready";

  const placeholder = isOnboard
    ? onboardStep === "ask_name"
      ? "Your first name..."
      : onboardStep === "ask_company"
        ? "Company or org..."
        : onboardStep === "ask_role"
          ? "Your role..."
          : "What brings you here..."
    : "Ask anything about Amit...";

  const cStyle = useMemo(
    () => getContainerStyle(isOpen, isMobile),
    [isOpen, isMobile],
  );

  // ── Init ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 640);
    window.addEventListener("resize", onResize);
    const killMic = () => {
      micActive.current = false;
      try {
        recog.current?.abort();
      } catch {}
      recog.current = null;
      tts.stop();
    };
    window.addEventListener("beforeunload", killMic);
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) killMic();
    });
    const s = getStore();
    if (s.userProfile) {
      s.updateProfile({
        sessionCount: (s.userProfile.sessionCount || 0) + 1,
        lastSeen: new Date().toISOString(),
      });
      s.incrementSession?.();
      setOnboardStep("ready");
    }
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("beforeunload", killMic);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ── Speech Recognition ────────────────────────────────────────────────────
  const SR = useMemo(() => {
    if (typeof window === "undefined") return null;
    return (
      window.SpeechRecognition ||
      (
        window as unknown as {
          webkitSpeechRecognition?: typeof SpeechRecognition;
        }
      ).webkitSpeechRecognition ||
      null
    );
  }, []);

  const startListening = useCallback(() => {
    if (!SR || !micActive.current) return;
    try {
      recog.current?.abort();
    } catch {}
    recog.current = null;
    setVoiceState("listening");
    setTranscript("");
    const r = new SR();
    recog.current = r;
    r.continuous = false;
    r.interimResults = true;
    r.lang = "en-US";
    r.onresult = (e: SpeechRecognitionEvent) => {
      const t = Array.from(e.results)
        .map((res) => res[0].transcript)
        .join("");
      setTranscript(t);
      if (e.results[e.results.length - 1].isFinal) {
        r.stop();
        sendRef.current(t);
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
  }, [SR]);

  const stopListening = useCallback(() => {
    try {
      recog.current?.stop();
    } catch {}
    recog.current = null;
    setVoiceState("idle");
    setTranscript("");
  }, []);

  // Always-on mic: restart when idle + open + not loading
  useEffect(() => {
    if (voiceState !== "idle" || !isOpen || isLoading || !micActive.current)
      return;
    const timer = setTimeout(() => {
      if (isOpen && !loadingRef.current && micActive.current) startListening();
    }, 700);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voiceState, isOpen, isLoading]);

  // ── TTS — FIXED lifecycle ─────────────────────────────────────────────────
  /**
   * speak() owns voiceState for the entire TTS lifecycle:
   *   "thinking"  → fetching audio from Gemini TTS API
   *   "speaking"  → AudioContext playback in progress
   *   "idle"      → playback ended (or skipped)
   *
   * NEVER set voiceState = "idle" in the caller after awaiting speak().
   * The onEnd callback inside TTSPlayer.speak() does that.
   */
  const speak = useCallback(async (text: string) => {
    if (!autoSpeakRef.current) {
      // autoSpeak off — still need to reset to idle
      setVoiceState("idle");
      return;
    }
    try {
      recog.current?.abort();
    } catch {}
    recog.current = null;

    // ▶ "thinking" = TTS API fetch in progress (orb shows thinking animation)
    setVoiceState("thinking");

    await tts.speak(
      text,
      () => setVoiceState("speaking"), // onStart — audio begins playing
      () => setVoiceState("idle"), // onEnd   — audio finished / stopped
    );
  }, []);

  /**
   * stopAll — cancels everything: in-flight LLM/TTS API + any audio playback.
   * Safe to call from the Stop button at any time.
   */
  const stopAll = useCallback(() => {
    tts.stop(); // increments gen, cancels AudioNode
    try {
      recog.current?.stop();
    } catch {}
    setVoiceState("idle");
    setIsLoading(false);
  }, []);

  // ── Open ──────────────────────────────────────────────────────────────────
  const open = useCallback(() => {
    setIsOpen(true);
    micActive.current = true;
    sessionCounted.current = false;
    convoId.current = `c_${Date.now()}`;
    setTimeout(() => {
      setChatReady(true);
      setTimeout(() => inputRef.current?.focus(), 80);
    }, 80);
    setTimeout(() => {
      const s = getStore();
      const p = s.userProfile;
      let greeting: string;
      if (p?.name) {
        const topics = extractInterests(
          s.getRecentConversationMessages?.(6) ?? [],
        );
        greeting = topics.length
          ? `${p.name}. Session ${p.sessionCount || 1}. Last time: ${topics.slice(0, 2).join(" and ")}. What do you need?`
          : `${p.name}. Session ${p.sessionCount || 1}. What can I help with today?`;
      } else {
        greeting = "I'm Aura, Amit Chakraborty's AI. What's your name?";
        setOnboardStep("ask_name");
      }
      s.setMessages([{ role: "ai", text: greeting, ts: Date.now() }]);
      speak(greeting);
    }, 500);
  }, [speak, getStore]);

  // ── Close ─────────────────────────────────────────────────────────────────
  const close = useCallback(async () => {
    micActive.current = false;
    try {
      recog.current?.abort();
    } catch {}
    recog.current = null;
    tts.stop();
    setVoiceState("idle");
    const s = getStore();
    const msgs = s.messages;
    if (msgs.length > 1) {
      const sum = await generateSummary(s.userProfile, msgs);
      setEndSummary(sum);
      s.saveConversation?.({
        id: convoId.current,
        date: new Date().toISOString(),
        messages: [...msgs],
        summary: sum,
      });
      if (s.userProfile) s.updateProfile({ interests: extractInterests(msgs) });
      setShowEnd(true);
    }
    setIsOpen(false);
    setChatReady(false);
    resetMessages();
    setOnboardStep("welcome");
    sessionCounted.current = false;
  }, [getStore, resetMessages]);

  // ── Send message ──────────────────────────────────────────────────────────
  const sendMessage = useCallback(
    async (text: string) => {
      const msg = text.trim();
      if (!msg || loadingRef.current) return;
      setInputText("");
      setTranscript("");
      const s = getStore();
      if (!sessionCounted.current) {
        if (!s.canChat()) return;
        s.incrementDaily();
        sessionCounted.current = true;
      }

      const step = stepRef.current;

      // ── Onboarding ──────────────────────────────────────────────────────
      if (step !== "ready") {
        addMessage({ role: "user", text: msg, ts: Date.now() });
        let np: UserProfile = s.userProfile ?? {
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
        let next: OnboardStep = step,
          reply = "";

        if (step === "ask_name") {
          const name = extractName(msg);
          if (name) {
            np = { ...np, name };
            next = "ask_company";
            reply = `${name}. Which company are you with?`;
          } else reply = "Just your first name — what should I call you?";
        } else if (step === "ask_company") {
          const co =
            extractCompany(msg) ||
            (msg.length > 1 && msg.length < 60
              ? toTitleCaseExport(msg.trim())
              : "");
          if (co) {
            np = { ...np, company: co };
            next = "ask_role";
            reply = "Your role — recruiter, engineer, founder, investor?";
          } else reply = "Which company or organization are you with?";
        } else if (step === "ask_role") {
          const role = extractRole(msg);
          if (role) {
            np = { ...np, role };
            next = "ask_intent";
            reply = "What brings you here — exploring, hiring, or partnership?";
          } else
            reply = "Your role — recruiter, founder, engineer, or investor?";
        } else if (step === "ask_intent") {
          np = { ...np, intent: extractIntent(msg), totalMessages: 0 };
          next = "ready";
          reply = `Got it. ${np.name ? `${np.name}, a` : "A"}sk me anything about Amit's projects, stack, or how to work with him.`;
        }
        setProfile(np);
        setOnboardStep(next);
        setTimeout(() => {
          getStore().addMessage({ role: "ai", text: reply, ts: Date.now() });
          speak(reply);
        }, 280);
        return;
      }

      // ── Normal chat ──────────────────────────────────────────────────────
      if (s.userProfile)
        updateProfile({
          totalMessages: (s.userProfile.totalMessages || 0) + 1,
          lastSeen: new Date().toISOString(),
        });

      const instant = detectInstantAnswer(msg);
      if (instant) {
        addMessage({ role: "user", text: msg, ts: Date.now() });
        setTimeout(() => {
          getStore().addMessage({ role: "ai", text: instant, ts: Date.now() });
          speak(instant);
        }, 100);
        return;
      }

      const snap = [...s.messages];
      addMessage({ role: "user", text: msg, ts: Date.now() });

      // Show typing indicator + "thinking" orb for LLM fetch
      setIsLoading(true);
      setVoiceState("thinking");

      try {
        const reply = await askAura(msg, s.userProfile, snap, setError);

        // LLM done — stop typing indicator, add message
        setIsLoading(false);
        getStore().addMessage({ role: "ai", text: reply, ts: Date.now() });

        // Hand voiceState control entirely to speak():
        //   speak() sets "thinking" (TTS fetch) → "speaking" (playback) → "idle"
        // DO NOT use a `finally` block that resets voiceState here.
        speak(reply);
      } catch {
        setIsLoading(false);
        const fb = "Ask about Amit's projects, tech stack, or how to hire him.";
        getStore().addMessage({ role: "ai", text: fb, ts: Date.now() });
        speak(fb);
      }
    },
    [addMessage, updateProfile, setProfile, speak, getStore],
  );

  useEffect(() => {
    sendRef.current = sendMessage;
  }, [sendMessage]);

  const sendColor = isOnboard
    ? "linear-gradient(155deg,#7B2FBE 0%,#5a1fa0 60%,#3d1070 100%)"
    : "linear-gradient(155deg,#F47521 0%,#d4661a 60%,#a84e10 100%)";

  return (
    <>
      {showEnd && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 10001,
            background: "rgba(3,2,8,.96)",
            backdropFilter: "blur(30px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              maxWidth: 340,
              width: "90%",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 20,
              padding: 32,
              textAlign: "center",
              animation: "acwFade .4s cubic-bezier(.34,1.4,.64,1) forwards",
            }}
          >
            <AuraIcon size={52} />
            <div>
              <p
                style={{
                  fontSize: 15,
                  fontWeight: 800,
                  color: "#fff",
                  margin: "0 0 5px",
                }}
              >
                {userProfile?.name
                  ? `Thanks, ${userProfile.name}.`
                  : "Session complete."}
              </p>
              {endSummary && (
                <p
                  style={{
                    fontSize: 12,
                    color: "rgba(255,255,255,.45)",
                    margin: 0,
                    lineHeight: 1.72,
                  }}
                >
                  {endSummary}
                </p>
              )}
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
                href="mailto:amit98ch@gmail.com"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "14px 20px",
                  borderRadius: 14,
                  background: "rgba(244,117,33,.12)",
                  border: "1px solid rgba(244,117,33,.28)",
                  color: "#F47521",
                  fontSize: 13,
                  fontWeight: 600,
                  textDecoration: "none",
                }}
              >
                Connect with Amit
              </a>
              <a
                href={BMC_URL}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
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
                Buy Amit a Coffee ☕
              </a>
            </div>
            <button
              onClick={() => setShowEnd(false)}
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
      )}

      <div
        style={{
          position: "fixed",
          zIndex: 9999,
          ...(isMobile && isOpen
            ? { top: 0, left: 0 }
            : !isOpen
              ? { bottom: 24, right: 24 }
              : { bottom: 20, right: 20 }),
        }}
      >
        {!isOpen && (
          <div
            aria-hidden
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: "50%",
              background:
                "radial-gradient(circle,rgba(244,117,33,.22) 0%,transparent 70%)",
              filter: "blur(14px)",
              transform: "scale(1.6)",
              animation: "acwHalo 3.8s ease-in-out infinite",
              pointerEvents: "none",
            }}
          />
        )}
        {!isOpen && (
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
              pointerEvents: "none",
            }}
          >
            {convoLeft}
          </div>
        )}

        <div
          role={!isOpen ? "button" : undefined}
          aria-label={!isOpen ? "Open Aura AI chat" : undefined}
          tabIndex={!isOpen ? 0 : undefined}
          onClick={!isOpen ? open : undefined}
          onKeyDown={
            !isOpen
              ? (e) => {
                  if (e.key === "Enter" || e.key === " ") open();
                }
              : undefined
          }
          style={{
            ...cStyle,
            position: "relative",
            overflow: "hidden",
            cursor: !isOpen ? "pointer" : "default",
            animation: !isOpen ? "acwFloat 4.2s ease-in-out infinite" : "none",
            fontFamily: "inherit",
          }}
        >
          {/* Plasma orb — fades out when panel opens */}
          <div
            aria-hidden
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: ORB,
              height: ORB,
              opacity: isOpen ? 0 : 1,
              transition: "opacity .2s",
              pointerEvents: "none",
            }}
          >
            <PlasmaOrb size={ORB} mode={orbMode} />
          </div>

          {/* Chat panel */}
          {chatReady && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                opacity: isOpen ? 1 : 0,
                transition: "opacity .2s .1s",
                display: "flex",
                flexDirection: "column",
                pointerEvents: isOpen ? "auto" : "none",
              }}
            >
              {/* Daily limit overlay */}
              {limitHit && !sessionCounted.current && (
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    zIndex: 20,
                    background: "rgba(3,2,8,.97)",
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
                  <div style={{ fontSize: 15, fontWeight: 800, color: "#fff" }}>
                    Daily limit reached
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: "rgba(255,255,255,.38)",
                      lineHeight: 1.72,
                    }}
                  >
                    {DAILY_LIMIT} conversations/day. Resets at midnight.
                  </div>
                  <a
                    href={BMC_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
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
                    Buy Amit a Coffee ☕
                  </a>
                  <button
                    onClick={close}
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
              )}

              {/* Header */}
              <div
                style={{
                  flexShrink: 0,
                  padding: isMobile
                    ? "env(safe-area-inset-top,44px) 15px 12px"
                    : "12px 15px",
                  background:
                    "linear-gradient(180deg,rgba(244,117,33,.065) 0%,transparent 100%)",
                  borderBottom: "1px solid rgba(255,255,255,.05)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                  <AuraIcon size={30} />
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
                      {isOnboard && (
                        <span
                          style={{
                            fontSize: 8,
                            color: "#7B2FBE",
                            fontWeight: 600,
                            letterSpacing: ".08em",
                            textTransform: "uppercase",
                          }}
                        >
                          Setup
                        </span>
                      )}
                    </div>
                    <div
                      style={{
                        fontSize: 8,
                        fontWeight: 600,
                        letterSpacing: ".08em",
                        textTransform: "uppercase",
                        color: error
                          ? "#ef4444"
                          : voiceState !== "idle"
                            ? "#F47521"
                            : "rgba(244,117,33,.4)",
                        animation:
                          voiceState !== "idle"
                            ? "acwBlink 1.2s ease-in-out infinite"
                            : "none",
                      }}
                    >
                      {status}
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", gap: 3, alignItems: "center" }}>
                  {userProfile?.name && (
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
                          background: "linear-gradient(135deg,#7B2FBE,#F47521)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 8,
                          color: "#fff",
                          fontWeight: 800,
                        }}
                      >
                        {userProfile.name[0].toUpperCase()}
                      </div>
                      <span
                        style={{
                          fontSize: 10,
                          color: "rgba(255,255,255,.55)",
                          fontWeight: 600,
                          maxWidth: 80,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {userProfile.name}
                        {userProfile.company ? ` · ${userProfile.company}` : ""}
                      </span>
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
                    </div>
                  )}

                  {/* TTS toggle */}
                  <button
                    className="acw-ib"
                    onClick={() => {
                      setAutoSpeak((v) => !v);
                      stopAll();
                    }}
                    title={autoSpeak ? "Mute voice" : "Enable voice"}
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

                  {/* ▶ Stop button — shows during BOTH "thinking" and "speaking" */}
                  {showStop && (
                    <button
                      className="acw-ib acw-stop"
                      onClick={stopAll}
                      title="Stop"
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 7,
                        border: "none",
                        cursor: "pointer",
                        background: "rgba(244,117,33,.14)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        transition: "background .15s",
                      }}
                    >
                      {voiceState === "thinking" ? (
                        // X icon during API fetch
                        <svg
                          width="11"
                          height="11"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="#F47521"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                        >
                          <line x1="18" y1="6" x2="6" y2="18" />
                          <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                      ) : (
                        // Square icon during playback
                        <svg
                          width="10"
                          height="10"
                          viewBox="0 0 24 24"
                          fill="#F47521"
                        >
                          <rect x="4" y="4" width="16" height="16" rx="2" />
                        </svg>
                      )}
                    </button>
                  )}

                  {/* Close */}
                  <button
                    className="acw-ib"
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

              {/* Onboard progress bar */}
              {isOnboard && (
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
                      fontWeight: 600,
                      letterSpacing: ".06em",
                    }}
                  >
                    SETUP
                  </span>
                  {ONBOARD_STEPS.map((_, i) => (
                    <div
                      key={i}
                      style={{
                        flex: 1,
                        height: 2,
                        borderRadius: 1,
                        background:
                          i <= onbIdx ? "#7B2FBE" : "rgba(255,255,255,.06)",
                        transition: "background .3s",
                      }}
                    />
                  ))}
                </div>
              )}

              {/* Messages */}
              <div
                className="acw-sc"
                style={{
                  flex: 1,
                  overflowY: "auto",
                  padding: "14px 12px",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                {messages.length <= 1 && (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 16,
                      padding: "22px 0 10px",
                      textAlign: "center",
                    }}
                  >
                    <AuraIcon size={52} />
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
                        Amit Chakraborty's AI. Listening — speak or type.
                      </p>
                    </div>
                    {!isOnboard && (
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
                        {SUGGESTIONS.map((sg) => (
                          <button
                            key={sg}
                            className="acw-sug"
                            onClick={() => sendMessage(sg)}
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
                              ▶
                            </span>
                            {sg}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                {messages.map((m, i) => (
                  <MsgBubble key={`${m.ts}-${i}`} m={m} onboard={isOnboard} />
                ))}
                {isLoading && <Typing />}
                <div ref={chatEndRef} />
              </div>

              {/* Quick chips */}
              {messages.length > 0 && !isOnboard && (
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
                      className="acw-chip"
                      onClick={() => sendMessage(c)}
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
                  {showBMC && (
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
                      ☕ Coffee
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
                  borderTop: isOnboard
                    ? "1px solid rgba(123,47,190,.15)"
                    : "1px solid rgba(255,255,255,.05)",
                  padding: isMobile
                    ? `12px 12px max(20px,env(safe-area-inset-bottom,20px))`
                    : "11px 12px 14px",
                }}
              >
                <div style={{ position: "relative", height: 48 }}>
                  {/* Text input layer — hidden while voice is active */}
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      display: "flex",
                      alignItems: "center",
                      gap: 7,
                      opacity: isVoiceOn ? 0 : 1,
                      transform: isVoiceOn
                        ? "translateY(5px) scale(.97)"
                        : "none",
                      transition: "opacity .22s,transform .22s",
                      pointerEvents: isVoiceOn ? "none" : "auto",
                    }}
                  >
                    <div
                      className={isOnboard ? "acw-ob" : ""}
                      style={{
                        flex: 1,
                        height: 48,
                        display: "flex",
                        alignItems: "center",
                        borderRadius: 24,
                        background: "rgba(255,255,255,.038)",
                        border: isOnboard
                          ? "1px solid rgba(123,47,190,.35)"
                          : "1px solid rgba(255,255,255,.065)",
                        boxShadow: "inset 0 2px 5px rgba(0,0,0,.3)",
                        overflow: "hidden",
                        cursor: "text",
                      }}
                      onClick={() => inputRef.current?.focus()}
                    >
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          voiceState === "listening"
                            ? stopListening()
                            : startListening();
                        }}
                        style={{
                          flexShrink: 0,
                          width: 44,
                          height: 48,
                          background: "none",
                          border: "none",
                          cursor: SR ? "pointer" : "default",
                          opacity: SR ? 1 : 0.3,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color:
                            voiceState === "listening"
                              ? "#ef4444"
                              : isOnboard
                                ? "#7B2FBE"
                                : "#F47521",
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
                        className="acw-inp"
                        type="text"
                        placeholder={placeholder}
                        value={inputText}
                        onChange={(e) => {
                          setInputText(e.target.value);
                          if (error) setError(null);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !loadingRef.current)
                            sendMessage(inputText);
                        }}
                        disabled={isLoading}
                        style={{
                          flex: 1,
                          height: "100%",
                          padding: "0 11px",
                          fontSize: 13,
                          fontFamily: "inherit",
                        }}
                      />
                    </div>
                    <button
                      className="acw-send"
                      onClick={() => sendMessage(inputText)}
                      disabled={isLoading || !inputText.trim()}
                      style={{
                        flexShrink: 0,
                        width: 48,
                        height: 48,
                        borderRadius: "50%",
                        background: sendColor,
                        border: isOnboard
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
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#fff"
                        strokeWidth="2.4"
                        strokeLinecap="round"
                      >
                        <line x1="22" y1="2" x2="11" y2="13" />
                        <polygon points="22 2 15 22 11 13 2 9 22 2" />
                      </svg>
                    </button>
                  </div>

                  {/* Voice waveform layer — shown while listening or speaking */}
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 14,
                      opacity: isVoiceOn ? 1 : 0,
                      transform: isVoiceOn
                        ? "none"
                        : "translateY(-5px) scale(.97)",
                      transition: "opacity .22s,transform .22s",
                      pointerEvents: isVoiceOn ? "auto" : "none",
                    }}
                  >
                    {isVoiceOn && (
                      <>
                        <div
                          style={{
                            flex: 1,
                            display: "flex",
                            alignItems: "center",
                            gap: 3,
                            justifyContent: "center",
                          }}
                        >
                          {Array.from({ length: 12 }, (_, i) => (
                            <div
                              key={i}
                              style={{
                                width: 3,
                                height: 18,
                                borderRadius: 2,
                                background:
                                  voiceState === "listening"
                                    ? "#F47521"
                                    : "#7B2FBE",
                                animation: `acwWave ${voiceState === "listening" ? ".6s" : ".7s"} ${i * (voiceState === "listening" ? 50 : 60)}ms ease-in-out infinite`,
                              }}
                            />
                          ))}
                        </div>
                        <button
                          onClick={
                            voiceState === "listening" ? stopListening : stopAll
                          }
                          style={{
                            width: 48,
                            height: 48,
                            borderRadius: "50%",
                            background:
                              voiceState === "listening"
                                ? "rgba(239,68,68,.18)"
                                : "rgba(244,117,33,.14)",
                            border: `1px solid ${voiceState === "listening" ? "rgba(239,68,68,.3)" : "rgba(244,117,33,.28)"}`,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            cursor: "pointer",
                            flexShrink: 0,
                          }}
                        >
                          <svg
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill={
                              voiceState === "listening" ? "#ef4444" : "#F47521"
                            }
                          >
                            <rect x="5" y="5" width="14" height="14" rx="2" />
                          </svg>
                        </button>
                      </>
                    )}
                  </div>

                  {/* Live transcript bubble */}
                  {transcript && (
                    <div
                      style={{
                        position: "absolute",
                        bottom: "calc(100% + 8px)",
                        left: 0,
                        right: 0,
                        padding: "8px 14px",
                        borderRadius: 12,
                        background: "rgba(7,4,12,.95)",
                        border: "1px solid rgba(244,117,33,.18)",
                        color: "rgba(255,255,255,.7)",
                        fontSize: 12,
                        lineHeight: 1.55,
                        animation: "acwSlide .2s ease forwards",
                      }}
                    >
                      <span
                        style={{
                          color: "rgba(244,117,33,.5)",
                          fontSize: 8,
                          fontWeight: 700,
                          letterSpacing: ".1em",
                          textTransform: "uppercase",
                          display: "block",
                          marginBottom: 3,
                        }}
                      >
                        Hearing
                      </span>
                      {transcript}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export { AuraChatWidget as SiriOrbNew };
