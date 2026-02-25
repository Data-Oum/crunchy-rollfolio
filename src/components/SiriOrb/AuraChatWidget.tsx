/**
 * src/components/SiriOrb/AuraChatWidget.tsx
 *
 * PURE VOICE-ONLY interface. Zero text inputs. Zero chat panels.
 * Just the plasma orb + floating glass UI elements.
 *
 * Layout:
 *   - Fullscreen dark backdrop
 *   - Centered plasma orb (tap to speak)
 *   - Floating: last AI response (fades after 14s)
 *   - Floating: live transcript (during listening)
 *   - Status bar: kanji + mode + offline indicator
 *   - Minimal controls: mute, stop, close
 *   - Onboarding progress dots
 *   - User badge (after onboarding)
 *   - End card (session summary)
 */

import { ONBOARD_STEPS, useAuraChat } from "@/hooks/useAuraChat";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { useTTS } from "@/hooks/useTTS";
import { useVoiceProfiler } from "@/hooks/useVoiceProfiler";
import { useVoiceState } from "@/hooks/useVoiceState";
import { memo, useCallback, useEffect, useRef, useState } from "react";
import { AuraOrb } from "./AuraOrb";

const API_KEY =
  (import.meta as unknown as { env: Record<string, string> }).env
    .VITE_GEMINI_API_KEY || "";

// ── Glass card component ─────────────────────────────────────────────────────
const Glass = memo(
  ({
    children,
    className = "",
    style,
  }: {
    children: React.ReactNode;
    className?: string;
    style?: React.CSSProperties;
  }) => (
    <div
      className={className}
      style={{
        background: "rgba(12,8,18,0.72)",
        backdropFilter: "blur(18px) saturate(1.3)",
        WebkitBackdropFilter: "blur(18px) saturate(1.3)",
        border: "1px solid rgba(244,117,33,0.12)",
        borderRadius: 16,
        ...style,
      }}
    >
      {children}
    </div>
  ),
);
Glass.displayName = "Glass";

// ── Main widget ──────────────────────────────────────────────────────────────
export default function AuraChatWidget() {
  const vs = useVoiceState();
  const profiler = useVoiceProfiler();

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
      chat.sendMessage(text);
    },
    onInterimTranscript: chat.setTranscript,
    onLanguageDetected: (lang) => profiler.trackMessage("", lang),
  });

  // ── Fade timer for last AI text ────────────────────────────────────────────
  const [showAiText, setShowAiText] = useState(false);
  const fadeTimer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (chat.lastAiText) {
      setShowAiText(true);
      clearTimeout(fadeTimer.current);
      fadeTimer.current = setTimeout(() => setShowAiText(false), 14000);
    }
    return () => clearTimeout(fadeTimer.current);
  }, [chat.lastAiText]);

  // ── Orb tap handler ────────────────────────────────────────────────────────
  const handleOrbTap = useCallback(() => {
    if (!chat.isOpen) {
      chat.open();
      return;
    }
    if (vs.canStop) {
      chat.stopAll();
      vs.setVoiceState("idle");
      return;
    }
    if (vs.isListening) {
      sr.stopListening();
      return;
    }
    // idle → start listening
    profiler.startAnalysis();
    sr.startListening();
  }, [chat, vs, sr, profiler]);

  // ── Close handler ──────────────────────────────────────────────────────────
  const handleClose = useCallback(() => {
    chat.close();
  }, [chat]);

  // ── Mute toggle ────────────────────────────────────────────────────────────
  const [muted, setMuted] = useState(false);
  const toggleMute = useCallback(() => {
    setMuted((m) => {
      const next = !m;
      chat.micEnabled.current = !next;
      if (next) {
        sr.abortListening();
        vs.setVoiceState("idle");
      }
      return next;
    });
  }, [chat.micEnabled, sr, vs]);

  // ── Orb size ───────────────────────────────────────────────────────────────
  const [orbSize, setOrbSize] = useState(220);
  useEffect(() => {
    const calc = () => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const base = Math.min(vw, vh);
      setOrbSize(Math.max(160, Math.min(280, base * 0.42)));
    };
    calc();
    window.addEventListener("resize", calc);
    return () => window.removeEventListener("resize", calc);
  }, []);

  // ── Not open: show launcher orb ────────────────────────────────────────────
  if (!chat.isOpen) {
    return (
      <>
        {/* End card overlay */}
        {chat.showEndCard && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 9999,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "rgba(3,1,8,0.88)",
            }}
            onClick={() => chat.setShowEndCard(false)}
          >
            <Glass
              style={{
                padding: "28px 32px",
                maxWidth: 360,
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: 28, marginBottom: 8 }}>🎌</div>
              <div
                style={{
                  color: "rgba(255,255,255,0.9)",
                  fontSize: 15,
                  fontWeight: 600,
                  marginBottom: 10,
                }}
              >
                Session Complete
              </div>
              {chat.endSummary && (
                <div
                  style={{
                    color: "rgba(255,255,255,0.55)",
                    fontSize: 13,
                    lineHeight: 1.6,
                    marginBottom: 14,
                  }}
                >
                  {chat.endSummary}
                </div>
              )}
              <div style={{ color: "rgba(244,117,33,0.7)", fontSize: 12 }}>
                Tap anywhere to dismiss
              </div>
            </Glass>
          </div>
        )}

        {/* Launcher button */}
        <div
          onClick={handleOrbTap}
          style={{
            position: "fixed",
            bottom: 28,
            right: 28,
            zIndex: 9990,
            cursor: "pointer",
            transition: "transform 0.3s ease",
          }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.transform = "scale(1.08)")
          }
          onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
          role="button"
          aria-label="Open Aura voice assistant"
        >
          <AuraOrb size={72} mode="idle" />
          <div
            style={{
              position: "absolute",
              bottom: -6,
              left: "50%",
              transform: "translateX(-50%)",
              background: "rgba(12,8,18,0.8)",
              borderRadius: 8,
              padding: "3px 10px",
              fontSize: 10,
              color: "rgba(244,117,33,0.8)",
              whiteSpace: "nowrap",
              border: "1px solid rgba(244,117,33,0.15)",
            }}
          >
            Tap to talk
          </div>
        </div>
      </>
    );
  }

  // ── Full-screen voice interface ────────────────────────────────────────────
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9998,
        background:
          "radial-gradient(ellipse at center, rgba(12,6,20,0.97) 0%, rgba(3,1,8,0.99) 100%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "'Inter','Noto Sans JP',system-ui,sans-serif",
        overflow: "hidden",
        animation: "auraFadeIn 0.4s ease-out",
      }}
    >
      <style>{`
        @keyframes auraFadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes auraPulse { 0%,100% { opacity: 0.6; } 50% { opacity: 1; } }
        @keyframes auraSlideUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes auraBreathe { 0%,100% { transform: scale(1); } 50% { transform: scale(1.03); } }
      `}</style>

      {/* ── Top bar: close + user badge + offline ──────────────────────────── */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "16px 20px",
          zIndex: 10,
        }}
      >
        {/* User badge */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {chat.userProfile?.name && (
            <Glass
              style={{
                padding: "5px 14px",
                display: "flex",
                alignItems: "center",
                gap: 6,
                borderRadius: 20,
              }}
            >
              <div
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, #F47521, #7B2FBE)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 11,
                  fontWeight: 700,
                  color: "#fff",
                }}
              >
                {chat.userProfile.name[0]?.toUpperCase()}
              </div>
              <span
                style={{
                  color: "rgba(255,255,255,0.75)",
                  fontSize: 13,
                  fontWeight: 500,
                }}
              >
                {chat.userProfile.name}
              </span>
              {chat.userProfile.sessionCount > 1 && (
                <span style={{ color: "rgba(244,117,33,0.5)", fontSize: 10 }}>
                  #{chat.userProfile.sessionCount}
                </span>
              )}
            </Glass>
          )}

          {/* Offline indicator */}
          {chat.offlineIndicator && (
            <Glass
              style={{
                padding: "4px 12px",
                borderRadius: 14,
                borderColor: "rgba(220,40,60,0.25)",
              }}
            >
              <span
                style={{
                  color: "rgba(220,40,60,0.8)",
                  fontSize: 11,
                  fontWeight: 600,
                }}
              >
                オフライン • Offline
              </span>
            </Glass>
          )}
        </div>

        {/* Close */}
        <button
          onClick={handleClose}
          style={{
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: "50%",
            width: 36,
            height: 36,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            color: "rgba(255,255,255,0.5)",
            fontSize: 18,
            transition: "all 0.2s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(255,255,255,0.12)";
            e.currentTarget.style.color = "rgba(255,255,255,0.8)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "rgba(255,255,255,0.06)";
            e.currentTarget.style.color = "rgba(255,255,255,0.5)";
          }}
          aria-label="Close"
        >
          ✕
        </button>
      </div>

      {/* ── Last AI response (floating, fades) ─────────────────────────────── */}
      {showAiText && chat.lastAiText && (
        <div
          style={{
            position: "absolute",
            top: "12%",
            left: "50%",
            transform: "translateX(-50%)",
            maxWidth: "min(85vw, 480px)",
            zIndex: 5,
            animation: "auraSlideUp 0.5s ease-out",
            transition: "opacity 0.8s ease",
          }}
        >
          <Glass style={{ padding: "16px 22px", textAlign: "center" }}>
            <div
              style={{
                color: "rgba(255,255,255,0.88)",
                fontSize: 15,
                lineHeight: 1.7,
                fontWeight: 400,
                letterSpacing: 0.2,
              }}
            >
              {chat.lastAiText}
            </div>
          </Glass>
        </div>
      )}

      {/* ── Orb ────────────────────────────────────────────────────────────── */}
      <div
        onClick={handleOrbTap}
        style={{
          cursor: "pointer",
          position: "relative",
          animation: vs.isIdle
            ? "auraBreathe 4s ease-in-out infinite"
            : undefined,
          transition: "transform 0.3s ease",
        }}
        role="button"
        aria-label={
          vs.canStop
            ? "Stop"
            : vs.isListening
              ? "Stop listening"
              : "Tap to speak"
        }
      >
        <AuraOrb size={orbSize} mode={vs.voiceState} />

        {/* Stop overlay */}
        {vs.canStop && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              pointerEvents: "none",
            }}
          >
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                background: "rgba(220,40,60,0.2)",
                border: "2px solid rgba(220,40,60,0.5)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                animation: "auraPulse 1.5s ease-in-out infinite",
              }}
            >
              <div
                style={{
                  width: 14,
                  height: 14,
                  borderRadius: 3,
                  background: "rgba(220,40,60,0.8)",
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* ── Status text ────────────────────────────────────────────────────── */}
      <div
        style={{
          marginTop: 20,
          textAlign: "center",
          animation: "auraSlideUp 0.4s ease-out",
        }}
      >
        <div
          style={{
            color: vs.isIdle
              ? "rgba(255,255,255,0.35)"
              : "rgba(244,117,33,0.85)",
            fontSize: 13,
            fontWeight: 500,
            letterSpacing: 1.5,
            transition: "color 0.3s",
          }}
        >
          {vs.statusText}
        </div>
      </div>

      {/* ── Live transcript (during listening) ─────────────────────────────── */}
      {vs.isListening && chat.transcript && (
        <div
          style={{
            position: "absolute",
            bottom: "22%",
            left: "50%",
            transform: "translateX(-50%)",
            maxWidth: "min(80vw, 400px)",
            zIndex: 5,
            animation: "auraSlideUp 0.3s ease-out",
          }}
        >
          <Glass style={{ padding: "10px 18px", textAlign: "center" }}>
            <div
              style={{
                color: "rgba(80,210,255,0.85)",
                fontSize: 14,
                fontStyle: "italic",
                animation: "auraPulse 2s ease-in-out infinite",
              }}
            >
              "{chat.transcript}"
            </div>
          </Glass>
        </div>
      )}

      {/* ── Onboarding progress dots ───────────────────────────────────────── */}
      {chat.isOnboard && (
        <div
          style={{
            position: "absolute",
            bottom: "15%",
            left: "50%",
            transform: "translateX(-50%)",
            display: "flex",
            gap: 8,
            zIndex: 5,
          }}
        >
          {ONBOARD_STEPS.map((step, i) => (
            <div
              key={step}
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background:
                  i <= chat.onboardIndex
                    ? "rgba(244,117,33,0.8)"
                    : "rgba(255,255,255,0.15)",
                transition: "all 0.4s ease",
                transform: i === chat.onboardIndex ? "scale(1.3)" : "scale(1)",
              }}
            />
          ))}
        </div>
      )}

      {/* ── Bottom controls: mute + stop ───────────────────────────────────── */}
      <div
        style={{
          position: "absolute",
          bottom: 28,
          left: "50%",
          transform: "translateX(-50%)",
          display: "flex",
          gap: 16,
          zIndex: 10,
        }}
      >
        {/* Mute */}
        <button
          onClick={toggleMute}
          style={{
            width: 44,
            height: 44,
            borderRadius: "50%",
            background: muted
              ? "rgba(220,40,60,0.15)"
              : "rgba(255,255,255,0.06)",
            border: `1px solid ${muted ? "rgba(220,40,60,0.3)" : "rgba(255,255,255,0.1)"}`,
            color: muted ? "rgba(220,40,60,0.8)" : "rgba(255,255,255,0.5)",
            cursor: "pointer",
            fontSize: 18,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "all 0.2s",
          }}
          aria-label={muted ? "Unmute" : "Mute"}
        >
          {muted ? "🔇" : "🎙"}
        </button>

        {/* Stop (only when active) */}
        {vs.canStop && (
          <button
            onClick={() => {
              chat.stopAll();
              vs.setVoiceState("idle");
            }}
            style={{
              width: 44,
              height: 44,
              borderRadius: "50%",
              background: "rgba(220,40,60,0.15)",
              border: "1px solid rgba(220,40,60,0.3)",
              color: "rgba(220,40,60,0.8)",
              cursor: "pointer",
              fontSize: 16,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "all 0.2s",
            }}
            aria-label="Stop"
          >
            ■
          </button>
        )}
      </div>

      {/* ── API error indicator ────────────────────────────────────────────── */}
      {chat.apiError && (
        <div
          style={{
            position: "absolute",
            bottom: 80,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 10,
          }}
        >
          <Glass
            style={{
              padding: "6px 14px",
              borderRadius: 12,
              borderColor: "rgba(255,200,80,0.2)",
            }}
          >
            <span style={{ color: "rgba(255,200,80,0.7)", fontSize: 11 }}>
              {chat.apiError}
            </span>
          </Glass>
        </div>
      )}

      {/* ── Remaining chats ────────────────────────────────────────────────── */}
      {!chat.isOnboard && chat.convoLeft <= 10 && (
        <div
          style={{
            position: "absolute",
            top: "50%",
            right: 16,
            transform: "translateY(-50%)",
            zIndex: 5,
          }}
        >
          <Glass style={{ padding: "6px 10px", borderRadius: 10 }}>
            <span style={{ color: "rgba(255,200,80,0.6)", fontSize: 10 }}>
              {chat.convoLeft} left today
            </span>
          </Glass>
        </div>
      )}
    </div>
  );
}
