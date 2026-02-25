/**
 * src/components/SiriOrb/AuraChatWidget.tsx
 *
 * AURA — Premium Voice Widget. Bottom-right anchored.
 *
 * UX Principles:
 *  - No emojis. Proper lucide-react icons only.
 *  - Drag anywhere. Swipe down to close.
 *  - Glassmorphism panels, right-aligned to orb.
 *  - Beautiful token usage HUD (collapsible) — input/output bars, cost, utilization.
 *  - Language indicator (EN / HI / JA / KO) — subtle badge.
 *  - Status text: LISTENING / THINKING / SPEAKING with animated dot.
 *  - Email card with mail icon CTA.
 *  - Offline badge when fallback mode is active.
 */

import { useAuraChat } from "@/hooks/useAuraChat";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { useTTS } from "@/hooks/useTTS";
import { useVoiceProfiler } from "@/hooks/useVoiceProfiler";
import { useVoiceState } from "@/hooks/useVoiceState";
import type { TokenUsageStats } from "@/lib/gemini";
import { COMMAND_LABELS, detectVoiceCommand } from "@/lib/voiceCommands";
import {
  Activity,
  ChevronDown,
  Mail,
  Mic,
  MicOff,
  Square,
  WifiOff,
  X,
  Zap,
} from "lucide-react";
import {
  memo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { AuraOrb } from "./AuraOrb";

const API_KEY =
  (import.meta as unknown as { env: Record<string, string> }).env
    .VITE_GEMINI_API_KEY || "";

// ─── Design tokens ────────────────────────────────────────────────────────────
const C = {
  bg: "rgba(8,5,18,0.88)",
  bgDeep: "rgba(5,3,12,0.95)",
  border: "rgba(255,255,255,0.07)",
  borderAccent: "rgba(244,117,33,0.28)",
  accent: "#F47521",
  accentDim: "rgba(244,117,33,0.18)",
  accentMid: "rgba(244,117,33,0.35)",
  textPrimary: "rgba(255,255,255,0.92)",
  textSecondary: "rgba(255,255,255,0.52)",
  textTertiary: "rgba(255,255,255,0.28)",
  danger: "rgba(239,68,68,0.85)",
  dangerBg: "rgba(239,68,68,0.1)",
  blur: "blur(24px)",
  shadow: "0 20px 60px rgba(0,0,0,0.7), 0 0 0 1px rgba(244,117,33,0.06)",
  shadowSm: "0 8px 32px rgba(0,0,0,0.5)",
};

// ─── Language label ───────────────────────────────────────────────────────────
const LANG_LABELS: Record<string, string> = {
  en: "EN",
  hi: "HI",
  ja: "JA",
  ko: "KO",
};

// ─── Token HUD ────────────────────────────────────────────────────────────────
const TokenHUD = memo(
  ({
    stats,
    visible,
    onClose,
  }: {
    stats: TokenUsageStats;
    visible: boolean;
    onClose: () => void;
  }) => {
    if (!visible || stats.sessionCalls === 0) return null;

    const inputPct = Math.min(
      100,
      (stats.sessionInputTokens /
        Math.max(1, stats.sessionInputTokens + stats.sessionOutputTokens)) *
        100,
    );
    const ctxPct = Math.round(stats.contextUtilization * 100);
    const costMicro = Math.round(stats.estimatedCostUSD * 1_000_000); // in micro-dollars

    return (
      <div
        style={{
          position: "absolute",
          bottom: "calc(100% + 14px)",
          right: 0,
          width: 240,
          background: C.bgDeep,
          backdropFilter: C.blur,
          borderRadius: 14,
          border: `1px solid ${C.border}`,
          boxShadow: C.shadow,
          padding: "14px 14px 12px",
          animation: "auraIn 0.2s ease",
          pointerEvents: "auto",
          zIndex: 10001,
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 12,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Activity size={12} color={C.accent} strokeWidth={2.5} />
            <span
              style={{
                color: C.accent,
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: 1.4,
                textTransform: "uppercase",
                fontFamily: "'SF Mono', 'Fira Code', monospace",
              }}
            >
              Token Usage
            </span>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              cursor: "pointer",
              color: C.textTertiary,
              padding: 2,
              display: "flex",
              alignItems: "center",
            }}
          >
            <X size={12} />
          </button>
        </div>

        {/* Session stat row */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: 8,
            marginBottom: 12,
          }}
        >
          {[
            {
              label: "Input",
              value: formatTokenCount(stats.sessionInputTokens),
            },
            {
              label: "Output",
              value: formatTokenCount(stats.sessionOutputTokens),
            },
            { label: "Calls", value: String(stats.sessionCalls) },
          ].map((item) => (
            <div
              key={item.label}
              style={{
                background: "rgba(255,255,255,0.04)",
                borderRadius: 8,
                padding: "6px 8px",
                textAlign: "center",
              }}
            >
              <div
                style={{
                  color: C.textPrimary,
                  fontSize: 13,
                  fontWeight: 700,
                  fontFamily: "'SF Mono', 'Fira Code', monospace",
                  lineHeight: 1,
                  marginBottom: 3,
                }}
              >
                {item.value}
              </div>
              <div
                style={{
                  color: C.textTertiary,
                  fontSize: 9,
                  letterSpacing: 0.8,
                  textTransform: "uppercase",
                  fontFamily: "'SF Mono', 'Fira Code', monospace",
                }}
              >
                {item.label}
              </div>
            </div>
          ))}
        </div>

        {/* Input/Output ratio bar */}
        <div style={{ marginBottom: 10 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: 4,
            }}
          >
            <span
              style={{
                color: C.textTertiary,
                fontSize: 9,
                letterSpacing: 0.8,
                textTransform: "uppercase",
                fontFamily: "'SF Mono', 'Fira Code', monospace",
              }}
            >
              Input / Output ratio
            </span>
          </div>
          <div
            style={{
              height: 4,
              borderRadius: 2,
              background: "rgba(255,255,255,0.06)",
              overflow: "hidden",
              position: "relative",
            }}
          >
            <div
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                height: "100%",
                width: `${inputPct}%`,
                background: `linear-gradient(90deg, ${C.accent}, rgba(244,117,33,0.6))`,
                borderRadius: 2,
                transition: "width 0.5s ease",
              }}
            />
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginTop: 3,
            }}
          >
            <span
              style={{
                color: "rgba(244,117,33,0.7)",
                fontSize: 9,
                fontFamily: "'SF Mono', 'Fira Code', monospace",
              }}
            >
              in {Math.round(inputPct)}%
            </span>
            <span
              style={{
                color: C.textTertiary,
                fontSize: 9,
                fontFamily: "'SF Mono', 'Fira Code', monospace",
              }}
            >
              out {Math.round(100 - inputPct)}%
            </span>
          </div>
        </div>

        {/* Context window utilization */}
        <div style={{ marginBottom: 10 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: 4,
            }}
          >
            <span
              style={{
                color: C.textTertiary,
                fontSize: 9,
                letterSpacing: 0.8,
                textTransform: "uppercase",
                fontFamily: "'SF Mono', 'Fira Code', monospace",
              }}
            >
              Context window
            </span>
            <span
              style={{
                color: ctxPct > 70 ? "#f59e0b" : C.textSecondary,
                fontSize: 9,
                fontFamily: "'SF Mono', 'Fira Code', monospace",
                fontWeight: 700,
              }}
            >
              {ctxPct}%
            </span>
          </div>
          <div
            style={{
              height: 4,
              borderRadius: 2,
              background: "rgba(255,255,255,0.06)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${ctxPct}%`,
                background:
                  ctxPct > 70
                    ? "linear-gradient(90deg, #f59e0b, #ef4444)"
                    : "linear-gradient(90deg, rgba(99,202,183,0.9), rgba(99,202,183,0.5))",
                borderRadius: 2,
                transition: "width 0.5s ease",
              }}
            />
          </div>
        </div>

        {/* Cost estimate */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "6px 8px",
            background: "rgba(255,255,255,0.03)",
            borderRadius: 8,
            border: `1px solid ${C.border}`,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <Zap size={10} color={C.textTertiary} />
            <span
              style={{
                color: C.textTertiary,
                fontSize: 9,
                letterSpacing: 0.8,
                textTransform: "uppercase",
                fontFamily: "'SF Mono', 'Fira Code', monospace",
              }}
            >
              Est. cost
            </span>
          </div>
          <span
            style={{
              color: C.textSecondary,
              fontSize: 11,
              fontWeight: 700,
              fontFamily: "'SF Mono', 'Fira Code', monospace",
            }}
          >
            {costMicro < 1
              ? "< $0.000001"
              : `$${stats.estimatedCostUSD.toFixed(6)}`}
          </span>
        </div>

        {/* Model indicator */}
        <div
          style={{
            marginTop: 8,
            textAlign: "center",
          }}
        >
          <span
            style={{
              color: C.textTertiary,
              fontSize: 9,
              fontFamily: "'SF Mono', 'Fira Code', monospace",
              letterSpacing: 0.5,
            }}
          >
            gemini-2.5-flash · 1M ctx
          </span>
        </div>
      </div>
    );
  },
);
TokenHUD.displayName = "TokenHUD";

function formatTokenCount(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

// ─── Email CTA Card ───────────────────────────────────────────────────────────
const EmailCard = memo(
  ({
    visible,
    onEmail,
    onDismiss,
    message,
  }: {
    visible: boolean;
    onEmail: () => void;
    onDismiss: () => void;
    message: string;
  }) =>
    !visible ? null : (
      <div
        style={{
          position: "absolute",
          bottom: "calc(100% + 14px)",
          right: 0,
          width: 252,
          background: C.bgDeep,
          backdropFilter: C.blur,
          borderRadius: 16,
          border: `1px solid ${C.borderAccent}`,
          boxShadow: C.shadow,
          padding: "16px",
          animation: "auraSlideUp 0.28s cubic-bezier(0.2,0,0,1)",
          pointerEvents: "auto",
          zIndex: 10002,
        }}
      >
        <p
          style={{
            color: C.textPrimary,
            fontSize: 13,
            lineHeight: 1.55,
            margin: "0 0 14px 0",
            fontFamily:
              "-apple-system,'SF Pro Text','Inter',system-ui,sans-serif",
          }}
        >
          {message}
        </p>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={onEmail}
            style={{
              flex: 1,
              padding: "9px 12px",
              borderRadius: 10,
              border: "none",
              background: `linear-gradient(135deg, ${C.accent}, #d94f0b)`,
              color: "#fff",
              fontSize: 12,
              fontWeight: 700,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              letterSpacing: 0.3,
              boxShadow: "0 4px 14px rgba(244,117,33,0.35)",
            }}
          >
            <Mail size={13} strokeWidth={2.5} />
            Email Amit
          </button>
          <button
            onClick={onDismiss}
            style={{
              padding: "9px 12px",
              borderRadius: 10,
              border: `1px solid ${C.border}`,
              background: "transparent",
              color: C.textTertiary,
              fontSize: 12,
              cursor: "pointer",
              fontFamily:
                "-apple-system,'SF Pro Text','Inter',system-ui,sans-serif",
            }}
          >
            Dismiss
          </button>
        </div>
      </div>
    ),
);
EmailCard.displayName = "EmailCard";

// ─── Glass text panel ─────────────────────────────────────────────────────────
const GlassTextPanel = memo(
  ({
    aiText,
    showAiText,
    transcript,
    isListening,
  }: {
    aiText: string;
    showAiText: boolean;
    transcript: string;
    isListening: boolean;
  }) => {
    if (!aiText && !(isListening && transcript)) return null;

    return (
      <div
        style={{
          background: C.bg,
          backdropFilter: C.blur,
          borderRadius: 16,
          border: `1px solid ${C.border}`,
          boxShadow: C.shadowSm,
          padding: "13px 15px",
          width: "100%",
          animation: "auraIn 0.28s ease",
        }}
      >
        {aiText && (
          <p
            style={{
              color: C.textPrimary,
              fontSize: 13.5,
              lineHeight: 1.6,
              margin: 0,
              fontFamily:
                "-apple-system,'SF Pro Text','Inter',system-ui,sans-serif",
              fontWeight: 450,
              opacity: showAiText ? 1 : 0,
              transform: showAiText ? "translateY(0)" : "translateY(5px)",
              transition: "opacity 0.32s ease, transform 0.32s ease",
              letterSpacing: 0.1,
              maxWidth: 290,
              wordBreak: "break-word",
            }}
          >
            {aiText}
          </p>
        )}
        {isListening && transcript && (
          <p
            style={{
              color: "rgba(80,215,255,0.82)",
              fontSize: 12,
              lineHeight: 1.55,
              margin: aiText ? "8px 0 0" : "0",
              fontFamily:
                "-apple-system,'SF Pro Text','Inter',system-ui,sans-serif",
              fontStyle: "italic",
              fontWeight: 400,
            }}
          >
            &ldquo;{transcript}&rdquo;
          </p>
        )}
      </div>
    );
  },
);
GlassTextPanel.displayName = "GlassTextPanel";

// ─── Icon button ──────────────────────────────────────────────────────────────
const IconBtn = memo(
  ({
    onClick,
    title,
    children,
    active = false,
    danger = false,
    small = false,
  }: {
    onClick: (e: React.MouseEvent) => void;
    title?: string;
    children: React.ReactNode;
    active?: boolean;
    danger?: boolean;
    small?: boolean;
  }) => (
    <button
      onClick={onClick}
      title={title}
      style={{
        background: active ? C.accentDim : danger ? C.dangerBg : "transparent",
        border: "none",
        cursor: "pointer",
        padding: small ? 7 : 9,
        borderRadius: "50%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: active ? C.accent : danger ? C.danger : C.textSecondary,
        transition: "all 0.16s ease",
        flexShrink: 0,
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLButtonElement).style.color = active
          ? C.accent
          : danger
            ? C.danger
            : C.textPrimary;
        (e.currentTarget as HTMLButtonElement).style.background = active
          ? C.accentMid
          : danger
            ? "rgba(239,68,68,0.18)"
            : "rgba(255,255,255,0.07)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.color = active
          ? C.accent
          : danger
            ? C.danger
            : C.textSecondary;
        (e.currentTarget as HTMLButtonElement).style.background = active
          ? C.accentDim
          : danger
            ? C.dangerBg
            : "transparent";
      }}
    >
      {children}
    </button>
  ),
);
IconBtn.displayName = "IconBtn";

// ─── Divider ──────────────────────────────────────────────────────────────────
const Divider = () => (
  <div
    style={{
      width: 1,
      height: 16,
      background: "rgba(255,255,255,0.08)",
      margin: "0 1px",
      flexShrink: 0,
    }}
  />
);

// ─── Main widget ──────────────────────────────────────────────────────────────
export default function AuraChatWidget() {
  const vs = useVoiceState();
  const profiler = useVoiceProfiler();
  const [muted, setMuted] = useState(false);
  const [cmdToast, setCmdToast] = useState("");
  const [cmdVisible, setCmdVisible] = useState(false);
  const [emailCard, setEmailCard] = useState<{
    visible: boolean;
    message: string;
  }>({ visible: false, message: "" });
  const [showTokenHUD, setShowTokenHUD] = useState(false);
  const [localTokenStats, setLocalTokenStats] = useState<TokenUsageStats>({
    totalInputTokens: 0,
    totalOutputTokens: 0,
    totalCalls: 0,
    totalFailures: 0,
    sessionInputTokens: 0,
    sessionOutputTokens: 0,
    sessionCalls: 0,
    estimatedCostUSD: 0,
    lastCallTokens: null,
    contextUtilization: 0,
    peakContextTokens: 0,
    avgTokensPerCall: 0,
  });

  const cmdTimer = useRef<ReturnType<typeof setTimeout>>();

  const showCmd = useCallback((label: string) => {
    setCmdToast(label);
    setCmdVisible(true);
    clearTimeout(cmdTimer.current);
    cmdTimer.current = setTimeout(() => setCmdVisible(false), 1800);
  }, []);

  const tts = useTTS({
    setVoiceState: vs.setVoiceState,
    autoSpeak: true,
    apiKey: API_KEY,
  });

  const chat = useAuraChat({
    setVoiceState: vs.setVoiceState,
    speak: tts.speak,
    stopTTS: tts.stopTTS,
    abortListening: () => sr.abortListening(),
    getVoiceProfileContext: profiler.getProfileContext,
    onShowEmailCard: (message) => setEmailCard({ visible: true, message }),
    onTokenUpdate: (stats) => setLocalTokenStats({ ...stats }),
  });

  const sr = useSpeechRecognition({
    voiceState: vs.voiceState,
    voiceStateRef: vs.voiceStateRef,
    setVoiceState: vs.setVoiceState,
    isOpen: chat.isOpen,
    isLoading: chat.isLoading,
    micEnabled: chat.micEnabled,
    onFinalTranscript: (text) => {
      profiler.trackMessage(text);
      profiler.stopAnalysis();
      const cmd = detectVoiceCommand(text);
      if (cmd === "close") {
        showCmd(COMMAND_LABELS.close);
        chat.close();
        return;
      }
      if (cmd === "stop" || cmd === "pause") {
        showCmd(COMMAND_LABELS.stop);
        chat.stopAll();
        vs.setVoiceState("idle");
        return;
      }
      if (cmd === "mute") {
        showCmd(COMMAND_LABELS.mute);
        setMuted(true);
        chat.micEnabled.current = false;
        sr.abortListening();
        vs.setVoiceState("idle");
        return;
      }
      if (cmd === "unmute") {
        showCmd(COMMAND_LABELS.unmute);
        setMuted(false);
        chat.micEnabled.current = true;
        return;
      }
      if (cmd === "restart") {
        showCmd(COMMAND_LABELS.restart);
        chat.stopAll();
        vs.setVoiceState("idle");
        return;
      }
      chat.sendMessage(text);
    },
    onInterimTranscript: chat.setTranscript,
    onLanguageDetected: (lang) => profiler.trackMessage("", lang),
  });

  // AI text visibility
  const [showAiText, setShowAiText] = useState(false);
  const aiTextTimer = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => {
    if (chat.lastAiText) {
      setShowAiText(true);
      clearTimeout(aiTextTimer.current);
      aiTextTimer.current = setTimeout(() => setShowAiText(false), 14000);
    }
    return () => clearTimeout(aiTextTimer.current);
  }, [chat.lastAiText]);

  // Token HUD auto-show on first call
  useEffect(() => {
    if (chat.tokenStats.sessionCalls === 1 && !showTokenHUD) {
      // Don't auto-show, let user click the Activity button
    }
    setLocalTokenStats({ ...chat.tokenStats });
  }, [chat.tokenStats]);

  // ── Drag & Tap ─────────────────────────────────────────────────────────────
  const [pos, setPos] = useState({ x: -1000, y: -1000 });
  const drag = useRef({
    active: false,
    startX: 0,
    startY: 0,
    origX: 0,
    origY: 0,
    wasDrag: false,
    startTime: 0,
  });

  useLayoutEffect(() => {
    setPos({
      x: window.innerWidth - 80,
      y: window.innerHeight - 110,
    });
  }, []);

  useEffect(() => {
    const onResize = () =>
      setPos((p) => ({
        x: Math.max(50, Math.min(p.x, window.innerWidth - 50)),
        y: Math.max(50, Math.min(p.y, window.innerHeight - 50)),
      }));
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if ((e.target as HTMLElement).closest("button")) return;
      drag.current = {
        active: true,
        startX: e.clientX,
        startY: e.clientY,
        origX: pos.x,
        origY: pos.y,
        wasDrag: false,
        startTime: Date.now(),
      };
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    },
    [pos],
  );

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!drag.current.active) return;
    const dx = e.clientX - drag.current.startX;
    const dy = e.clientY - drag.current.startY;
    if (Math.abs(dx) > 8 || Math.abs(dy) > 8) drag.current.wasDrag = true;
    setPos({ x: drag.current.origX + dx, y: drag.current.origY + dy });
  }, []);

  const onPointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (!drag.current.active) return;
      drag.current.active = false;
      e.currentTarget.releasePointerCapture(e.pointerId);

      const dx = e.clientX - drag.current.startX;
      const dy = e.clientY - drag.current.startY;
      const dt = Date.now() - drag.current.startTime;

      // Swipe down to close
      if (
        chat.isOpen &&
        drag.current.wasDrag &&
        dy > 55 &&
        dy > Math.abs(dx) * 1.5 &&
        dt < 400
      ) {
        chat.close();
        setPos({ x: drag.current.origX, y: drag.current.origY });
        return;
      }

      // Clamp to viewport
      setPos((p) => ({
        x: Math.max(60, Math.min(window.innerWidth - 60, p.x)),
        y: Math.max(80, Math.min(window.innerHeight - 80, p.y)),
      }));

      if (!drag.current.wasDrag) {
        if (!chat.isOpen) {
          chat.open();
        } else if (vs.canStop) {
          chat.stopAll();
          vs.setVoiceState("idle");
        } else if (vs.isListening) {
          sr.stopListening();
        } else {
          profiler.startAnalysis();
          sr.startListening();
        }
      }
    },
    [chat, vs, sr, profiler],
  );

  const toggleMute = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      setMuted((m) => {
        const next = !m;
        chat.micEnabled.current = !next;
        if (next) {
          sr.abortListening();
          vs.setVoiceState("idle");
        }
        return next;
      });
    },
    [chat.micEnabled, sr, vs],
  );

  const handleEmail = useCallback(() => {
    window.open(
      "mailto:amit98ch@gmail.com?subject=Let%27s%20Connect%20%E2%80%94%20via%20Aura&body=Hi%20Amit%2C%0A%0AI%20was%20speaking%20with%20Aura%20on%20your%20portfolio%20and%20wanted%20to%20reach%20out%20directly.%0A%0A",
      "_blank",
    );
    setEmailCard({ visible: false, message: "" });
  }, []);

  if (pos.x < 0) return null;

  const orbSize = chat.isOpen ? 130 : 64;
  const isActive = vs.isListening || vs.isThinking || vs.isSpeaking;
  const langLabel = LANG_LABELS[chat.currentLang] || "EN";
  const hasTokenData = localTokenStats.sessionCalls > 0;

  return (
    <>
      <style>{`
        @keyframes auraBreath {
          0%,100% { transform: scale(1); }
          50%      { transform: scale(1.055); }
        }
        @keyframes auraIn {
          from { opacity: 0; transform: translateY(8px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes auraSlideUp {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes auraPulse {
          0%,100% { opacity: 0.2; transform: scale(1); }
          50%      { opacity: 0.6; transform: scale(1.12); }
        }
        @keyframes auraRing {
          0%   { transform: scale(1); opacity: 0.55; }
          100% { transform: scale(1.85); opacity: 0; }
        }
        @keyframes auraDot {
          0%,100% { opacity: 0.35; }
          50%      { opacity: 1; }
        }
        @keyframes auraStatusDot {
          0%,100% { opacity: 0.5; transform: scale(1); }
          50%      { opacity: 1; transform: scale(1.25); }
        }
        @keyframes auraTokenPop {
          0%   { transform: scale(0.85); opacity: 0; }
          60%  { transform: scale(1.05); }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>

      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          transform: `translate3d(${pos.x}px,${pos.y}px,0) translate(-50%,-50%)`,
          zIndex: 9999,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          touchAction: "none",
          userSelect: "none",
          cursor: drag.current.active ? "grabbing" : "pointer",
        }}
      >
        {/* ── Panels above orb ── */}
        {chat.isOpen && (
          <div
            style={{
              position: "absolute",
              bottom: `calc(100% + ${orbSize / 2 + 14}px)`,
              right: 0,
              width: "min(88vw, 310px)",
              pointerEvents: "none",
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-end",
              gap: 6,
            }}
          >
            {/* Token HUD */}
            <div style={{ pointerEvents: "auto", width: "100%" }}>
              <TokenHUD
                stats={localTokenStats}
                visible={showTokenHUD}
                onClose={() => setShowTokenHUD(false)}
              />
            </div>

            {/* Email card */}
            <div style={{ pointerEvents: "auto", width: "100%" }}>
              <EmailCard
                visible={emailCard.visible}
                message={emailCard.message}
                onEmail={handleEmail}
                onDismiss={() => setEmailCard({ visible: false, message: "" })}
              />
            </div>

            {/* Command toast */}
            {cmdVisible && (
              <div
                style={{
                  background: C.accentDim,
                  border: `1px solid ${C.accentMid}`,
                  borderRadius: 8,
                  padding: "4px 11px",
                  pointerEvents: "none",
                  animation: "auraIn 0.2s ease",
                }}
              >
                <span
                  style={{
                    color: C.accent,
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: 1.4,
                    textTransform: "uppercase",
                    fontFamily: "'SF Mono','Fira Code',monospace",
                  }}
                >
                  {cmdToast}
                </span>
              </div>
            )}

            {/* Glass text panel */}
            <GlassTextPanel
              aiText={chat.lastAiText}
              showAiText={showAiText}
              transcript={chat.transcript}
              isListening={vs.isListening}
            />

            {/* Status badge + language badge row */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                pointerEvents: "none",
              }}
            >
              {/* Language badge */}
              {chat.currentLang !== "en" && (
                <div
                  style={{
                    padding: "2px 7px",
                    borderRadius: 6,
                    background: "rgba(255,255,255,0.06)",
                    border: `1px solid ${C.border}`,
                    animation: "auraIn 0.2s ease",
                  }}
                >
                  <span
                    style={{
                      color: C.textTertiary,
                      fontSize: 9,
                      fontWeight: 700,
                      letterSpacing: 1.2,
                      fontFamily: "'SF Mono','Fira Code',monospace",
                    }}
                  >
                    {langLabel}
                  </span>
                </div>
              )}

              {/* Status badge */}
              {!vs.isIdle && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                    padding: "3px 9px",
                    borderRadius: 99,
                    background: C.accentDim,
                    border: `1px solid ${C.accentMid}`,
                  }}
                >
                  <span
                    style={{
                      width: 5,
                      height: 5,
                      borderRadius: "50%",
                      background: C.accent,
                      display: "inline-block",
                      animation: "auraStatusDot 1.1s ease-in-out infinite",
                    }}
                  />
                  <span
                    style={{
                      color: C.accent,
                      fontSize: 10,
                      fontWeight: 700,
                      letterSpacing: 1.4,
                      textTransform: "uppercase",
                      fontFamily: "'SF Mono','Fira Code',monospace",
                    }}
                  >
                    {vs.isListening
                      ? "Listening"
                      : vs.isThinking
                        ? "Thinking"
                        : "Speaking"}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Orb ── */}
        <div
          style={{
            position: "relative",
            animation:
              !chat.isOpen || vs.isIdle
                ? "auraBreath 3.6s ease-in-out infinite"
                : "none",
            transition: "all 0.38s cubic-bezier(0.34,1.56,0.64,1)",
          }}
        >
          {/* Active ripple ring */}
          {chat.isOpen && isActive && (
            <div
              style={{
                position: "absolute",
                inset: -2,
                borderRadius: "50%",
                border: `2px solid ${C.accent}80`,
                animation: "auraRing 2s ease-out infinite",
                pointerEvents: "none",
              }}
            />
          )}

          {/* Speaking/thinking pulse ring */}
          {chat.isOpen && vs.canStop && (
            <div
              style={{
                position: "absolute",
                inset: -9,
                borderRadius: "50%",
                border: `1.5px solid ${C.accentMid}`,
                animation: "auraPulse 1.55s ease-in-out infinite",
                pointerEvents: "none",
              }}
            />
          )}

          <AuraOrb size={orbSize} mode={vs.voiceState} />

          {/* Offline dot */}
          {chat.offlineIndicator && chat.isOpen && (
            <div
              style={{
                position: "absolute",
                top: -5,
                right: -5,
                width: 11,
                height: 11,
                borderRadius: "50%",
                background: "#f59e0b",
                border: "2px solid rgba(5,3,12,0.9)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                title: "Offline mode",
              }}
            />
          )}

          {/* Closed-state AURA pill */}
          {!chat.isOpen && (
            <div
              style={{
                position: "absolute",
                bottom: -24,
                left: "50%",
                transform: "translateX(-50%)",
                display: "flex",
                alignItems: "center",
                gap: 4,
                padding: "3px 9px",
                borderRadius: 99,
                background: "rgba(8,5,18,0.72)",
                backdropFilter: "blur(10px)",
                border: `1px solid ${C.borderAccent}`,
                pointerEvents: "none",
                whiteSpace: "nowrap",
              }}
            >
              <span
                style={{
                  width: 4,
                  height: 4,
                  borderRadius: "50%",
                  background: C.accent,
                  animation: "auraDot 2.1s ease-in-out infinite",
                  display: "inline-block",
                  flexShrink: 0,
                }}
              />
              <span
                style={{
                  color: "rgba(244,117,33,0.88)",
                  fontSize: 8.5,
                  fontWeight: 800,
                  letterSpacing: 2.2,
                  fontFamily: "'SF Mono','Fira Code',monospace",
                }}
              >
                AURA
              </span>
            </div>
          )}
        </div>

        {/* ── Controls dock (open state, below orb) ── */}
        {chat.isOpen && (
          <div
            style={{
              position: "absolute",
              top: `calc(100% + ${orbSize / 2 + 12}px)`,
              right: 0,
              display: "flex",
              alignItems: "center",
              background: C.bg,
              backdropFilter: C.blur,
              padding: "3px 6px",
              borderRadius: 99,
              border: `1px solid ${C.border}`,
              boxShadow: `${C.shadowSm}, inset 0 1px 0 rgba(255,255,255,0.03)`,
              animation: "auraIn 0.28s cubic-bezier(0.2,0,0,1)",
              pointerEvents: "auto",
              gap: 0,
            }}
          >
            {/* Mic toggle */}
            <IconBtn
              onClick={toggleMute}
              title={muted ? "Unmute microphone" : "Mute microphone"}
              active={!muted}
            >
              {muted ? (
                <MicOff size={15} strokeWidth={2} />
              ) : (
                <Mic size={15} strokeWidth={2} />
              )}
            </IconBtn>

            {/* Stop (when active) */}
            {vs.canStop && (
              <>
                <Divider />
                <IconBtn
                  onClick={(e) => {
                    e.stopPropagation();
                    chat.stopAll();
                    vs.setVoiceState("idle");
                  }}
                  title="Stop"
                  danger
                >
                  <Square size={13} fill="currentColor" strokeWidth={0} />
                </IconBtn>
              </>
            )}

            <Divider />

            {/* Offline indicator */}
            {chat.offlineIndicator && (
              <>
                <div
                  title="Offline mode active"
                  style={{
                    padding: "7px 8px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#f59e0b",
                  }}
                >
                  <WifiOff size={14} strokeWidth={2} />
                </div>
                <Divider />
              </>
            )}

            {/* Token HUD toggle */}
            {hasTokenData && (
              <>
                <IconBtn
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowTokenHUD((v) => !v);
                  }}
                  title="Token usage"
                  active={showTokenHUD}
                >
                  <Activity size={14} strokeWidth={2} />
                </IconBtn>
                <Divider />
              </>
            )}

            {/* Close */}
            <IconBtn
              onClick={(e) => {
                e.stopPropagation();
                setShowTokenHUD(false);
                chat.close();
              }}
              title="Close"
            >
              <X size={15} strokeWidth={2} />
            </IconBtn>
          </div>
        )}

        {/* ── Token pulse badge (on orb, when new token data arrives) ── */}
        {chat.isOpen &&
          hasTokenData &&
          !showTokenHUD &&
          localTokenStats.lastCallTokens && (
            <div
              key={localTokenStats.sessionCalls}
              onClick={(e) => {
                e.stopPropagation();
                setShowTokenHUD(true);
              }}
              title="View token usage"
              style={{
                position: "absolute",
                top: -6,
                left: -6,
                background: C.bgDeep,
                border: `1px solid ${C.border}`,
                borderRadius: 8,
                padding: "2px 6px",
                cursor: "pointer",
                animation: "auraTokenPop 0.35s ease forwards",
                display: "flex",
                alignItems: "center",
                gap: 3,
                pointerEvents: "auto",
              }}
            >
              <Activity size={8} color={C.accent} />
              <span
                style={{
                  color: C.textTertiary,
                  fontSize: 8.5,
                  fontFamily: "'SF Mono','Fira Code',monospace",
                  fontWeight: 600,
                  letterSpacing: 0.4,
                }}
              >
                {formatTokenCount(
                  (localTokenStats.lastCallTokens?.input || 0) +
                    (localTokenStats.lastCallTokens?.output || 0),
                )}
              </span>
            </div>
          )}

        {/* ── Swipe hint (first open, idle) ── */}
        {chat.isOpen && vs.isIdle && !chat.isLoading && (
          <div
            style={{
              position: "absolute",
              top: `calc(100% + ${orbSize / 2 + 52}px)`,
              right: "50%",
              transform: "translateX(50%)",
              display: "flex",
              alignItems: "center",
              gap: 4,
              pointerEvents: "none",
              opacity: 0.35,
            }}
          >
            <ChevronDown size={11} color={C.textTertiary} />
            <span
              style={{
                color: C.textTertiary,
                fontSize: 9,
                fontFamily: "'SF Mono','Fira Code',monospace",
                letterSpacing: 0.6,
                whiteSpace: "nowrap",
              }}
            >
              swipe down to close
            </span>
          </div>
        )}
      </div>
    </>
  );
}
