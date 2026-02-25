/**
 * src/components/AuraChatWidget.tsx
 *
 * Thin UI layer. All logic lives in hooks.
 *
 * Architecture:
 *   useVoiceState     → single source of truth for orb mode
 *   useTTS            → Gemini TTS lifecycle (thinking→speaking→idle)
 *   useSpeechRecognition → always-on mic, interim transcripts
 *   useAuraChat       → all business logic (greetings, onboarding, chat)
 *
 * NO module-scope SDK calls. NO new GoogleGenAI() at top level.
 * Every API call happens lazily inside hooks and lib functions.
 */

import { ONBOARD_STEPS, useAuraChat } from "@/hooks/useAuraChat";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { useTTS } from "@/hooks/useTTS";
import { useVoiceState } from "@/hooks/useVoiceState";
import type { Message } from "@/store/useConversationStore";
import { DAILY_LIMIT } from "@/store/useConversationStore";
import { memo, useEffect, useMemo, useRef, useState } from "react";
import { AuraOrb } from "./AuraOrb";

// ── Constants ─────────────────────────────────────────────────────────────────
const ORB = 80,
  PW = 390,
  PH = 590;
const BMC = "https://buymeacoffee.com/amithellmab";

const SUGGESTIONS = [
  "What's the most impressive thing you've built?",
  "Tell me about your medical AI work",
  "Why should I hire Amit?",
] as const;

const CHIPS = [
  "Who is Amit?",
  "Biggest project?",
  "Tech stack?",
  "DeFi work?",
  "Contact?",
] as const;

// ── CSS (injected once, never causes re-renders) ──────────────────────────────
const CSS_ID = "acw-v4";
if (typeof document !== "undefined" && !document.getElementById(CSS_ID)) {
  const s = document.createElement("style");
  s.id = CSS_ID;
  s.textContent = `
    @keyframes acwFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
    @keyframes acwHalo{0%,100%{opacity:.3;transform:scale(1.1)}50%{opacity:.65;transform:scale(1.38)}}
    @keyframes acwWave{0%,100%{transform:scaleY(.2);opacity:.3}50%{transform:scaleY(1);opacity:1}}
    @keyframes acwBlink{0%,100%{opacity:.55}50%{opacity:1}}
    @keyframes acwDot{0%,80%,100%{transform:translateY(0);opacity:.4}40%{transform:translateY(-5px);opacity:1}}
    @keyframes acwSlide{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
    @keyframes acwFade{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
    @keyframes acwPulse{0%,100%{box-shadow:0 0 0 0 rgba(123,47,190,0)}60%{box-shadow:0 0 0 6px rgba(123,47,190,.1)}}
    .acw-sc::-webkit-scrollbar{width:2px}
    .acw-sc::-webkit-scrollbar-thumb{background:rgba(244,117,33,.14);border-radius:99px}
    .acw-inp{background:transparent!important;color:#fff!important;border:none!important;outline:none!important}
    .acw-inp::placeholder{color:rgba(255,255,255,.16)!important}
    .acw-chip:hover{border-color:rgba(244,117,33,.55)!important;color:#F47521!important}
    .acw-sug:hover{background:rgba(244,117,33,.08)!important;border-color:rgba(244,117,33,.3)!important}
    .acw-send:hover:not(:disabled){transform:scale(1.06)!important;box-shadow:inset 0 1px 0 rgba(255,255,255,.35),0 0 22px rgba(244,117,33,.4)!important}
    .acw-send:active:not(:disabled){transform:scale(.9)!important}
    .acw-send:disabled{opacity:.2;cursor:not-allowed}
    .acw-ib:hover{background:rgba(255,255,255,.08)!important}
    .acw-msg{animation:acwSlide .25s cubic-bezier(.34,1.4,.64,1) forwards}
    .acw-stop:hover{background:rgba(239,68,68,.22)!important}
  `;
  document.head.appendChild(s);
}

// ── Container style (CSS transition for open/close animation) ─────────────────
const TRANS =
  "width .48s cubic-bezier(.34,1.2,.64,1),height .48s cubic-bezier(.34,1.2,.64,1),border-radius .48s cubic-bezier(.34,1.2,.64,1),background .3s ease,backdrop-filter .3s ease,border .3s ease,box-shadow .3s ease";

function containerStyle(
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

const MsgBubble = memo(
  ({ m, isOnboard }: { m: Message; isOnboard: boolean }) => (
    <div
      className="acw-msg"
      style={{
        display: "flex",
        justifyContent: m.role === "user" ? "flex-end" : "flex-start",
        marginBottom: 8,
      }}
    >
      {m.role !== "user" && (
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
                border: isOnboard
                  ? "1px solid rgba(123,47,190,.2)"
                  : "1px solid rgba(255,255,255,.055)",
                color: "rgba(255,255,255,.86)",
              }),
        }}
      >
        {m.text}
      </div>
    </div>
  ),
);
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

// ── Main widget ───────────────────────────────────────────────────────────────
export const AuraChatWidget = () => {
  // ── API key (safe — read inside effect, never at module scope) ─────────────
  const apiKeyRef = useRef("");
  useEffect(() => {
    apiKeyRef.current =
      (import.meta as unknown as { env: Record<string, string> }).env
        .VITE_GEMINI_API_KEY ?? "";
  }, []);

  const [isMobile, setIsMobile] = useState(
    () => typeof window !== "undefined" && window.innerWidth <= 640,
  );
  useEffect(() => {
    const h = () => setIsMobile(window.innerWidth <= 640);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);

  // ── Hooks ──────────────────────────────────────────────────────────────────
  const vs = useVoiceState();
  const tts = useTTS({
    setVoiceState: vs.setVoiceState,
    autoSpeak: true,
    apiKey: apiKeyRef.current,
  });

  const chat = useAuraChat({
    setVoiceState: vs.setVoiceState,
    speak: tts.speak,
    stopTTS: tts.stopTTS,
    abortListening: () => {
      sr.abortListening();
    },
  });

  // We need a stable ref to abortListening before sr is initialized
  const abortRef = useRef<() => void>(() => {});

  const sr = useSpeechRecognition({
    voiceState: vs.voiceState,
    voiceStateRef: vs.voiceStateRef,
    setVoiceState: vs.setVoiceState,
    isOpen: chat.isOpen,
    isLoading: chat.isLoading,
    micEnabled: chat.micEnabled,
    onFinalTranscript: (text) => chat.sendRef.current(text),
    onInterimTranscript: chat.setTranscript,
  });

  useEffect(() => {
    abortRef.current = sr.abortListening;
  }, [sr.abortListening]);

  // ── Lifecycle cleanup ──────────────────────────────────────────────────────
  useEffect(() => {
    const kill = () => {
      chat.micEnabled.current = false;
      sr.abortListening();
      tts.stopTTS();
    };
    window.addEventListener("beforeunload", kill);
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) kill();
    });
    return () => window.removeEventListener("beforeunload", kill);
  }, [sr, tts, chat.micEnabled]);

  // ── TTS autoSpeak sync ─────────────────────────────────────────────────────
  // Re-create useTTS with current autoSpeak value reflected
  // (autoSpeak is read from ref inside the hook so no re-init needed)

  const cStyle = useMemo(
    () => containerStyle(chat.isOpen, isMobile),
    [chat.isOpen, isMobile],
  );
  const showBMC = chat.messages.filter((m) => m.role === "user").length >= 3;
  const sendColor = chat.isOnboard
    ? "linear-gradient(155deg,#7B2FBE 0%,#5a1fa0 60%,#3d1070 100%)"
    : "linear-gradient(155deg,#F47521 0%,#d4661a 60%,#a84e10 100%)";

  // ── Status label ────────────────────────────────────────────────────────────
  const statusColor = chat.apiError
    ? "#ef4444"
    : vs.voiceState !== "idle"
      ? "#F47521"
      : "rgba(244,117,33,.4)";

  return (
    <>
      {/* End session card */}
      {chat.showEndCard && (
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
                {chat.userProfile?.name
                  ? `Thanks, ${chat.userProfile.name}.`
                  : "Session complete."}
              </p>
              {chat.endSummary && (
                <p
                  style={{
                    fontSize: 12,
                    color: "rgba(255,255,255,.45)",
                    margin: 0,
                    lineHeight: 1.72,
                  }}
                >
                  {chat.endSummary}
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
                href={BMC}
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
              onClick={() => chat.setShowEndCard(false)}
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
          ...(isMobile && chat.isOpen
            ? { top: 0, left: 0 }
            : !chat.isOpen
              ? { bottom: 24, right: 24 }
              : { bottom: 20, right: 20 }),
        }}
      >
        {/* Halo glow when closed */}
        {!chat.isOpen && (
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

        {/* Conversation count badge */}
        {!chat.isOpen && (
          <div
            style={{
              position: "absolute",
              top: -4,
              right: -4,
              zIndex: 1,
              width: 18,
              height: 18,
              borderRadius: "50%",
              background: chat.convoLeft === 0 ? "#ef4444" : "#F47521",
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
            {chat.convoLeft}
          </div>
        )}

        {/* Main container — morphs from orb → panel */}
        <div
          role={!chat.isOpen ? "button" : undefined}
          aria-label={!chat.isOpen ? "Open Aura AI assistant" : undefined}
          tabIndex={!chat.isOpen ? 0 : undefined}
          onClick={!chat.isOpen ? chat.open : undefined}
          onKeyDown={
            !chat.isOpen
              ? (e) => {
                  if (e.key === "Enter" || e.key === " ") chat.open();
                }
              : undefined
          }
          style={{
            ...cStyle,
            position: "relative",
            overflow: "hidden",
            cursor: !chat.isOpen ? "pointer" : "default",
            animation: !chat.isOpen
              ? "acwFloat 4.2s ease-in-out infinite"
              : "none",
            fontFamily: "inherit",
          }}
        >
          {/* Plasma orb (visible when closed) */}
          <div
            aria-hidden
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: ORB,
              height: ORB,
              opacity: chat.isOpen ? 0 : 1,
              transition: "opacity .2s",
              pointerEvents: "none",
            }}
          >
            <AuraOrb size={ORB} mode={vs.voiceState} />
          </div>

          {/* Chat panel */}
          {chat.chatReady && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                opacity: chat.isOpen ? 1 : 0,
                transition: "opacity .2s .1s",
                display: "flex",
                flexDirection: "column",
                pointerEvents: chat.isOpen ? "auto" : "none",
              }}
            >
              {/* Daily limit overlay */}
              {chat.limitHit && (
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
                    href={BMC}
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
                    onClick={chat.close}
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
                      {chat.isOnboard && (
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
                        color: statusColor,
                        animation:
                          vs.voiceState !== "idle"
                            ? "acwBlink 1.2s ease-in-out infinite"
                            : "none",
                      }}
                    >
                      {chat.apiError ?? vs.statusText}
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", gap: 3, alignItems: "center" }}>
                  {/* User badge */}
                  {chat.userProfile?.name && (
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
                        {chat.userProfile.name[0].toUpperCase()}
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
                        {chat.userProfile.name}
                        {chat.userProfile.company
                          ? ` · ${chat.userProfile.company}`
                          : ""}
                      </span>
                      <span
                        style={{
                          fontSize: 8,
                          color: chat.convoLeft === 0 ? "#ef4444" : "#F47521",
                          background:
                            chat.convoLeft === 0
                              ? "rgba(239,68,68,.14)"
                              : "rgba(244,117,33,.14)",
                          padding: "1px 5px",
                          borderRadius: 99,
                          fontWeight: 700,
                        }}
                      >
                        {chat.convoLeft}/{DAILY_LIMIT}
                      </span>
                    </div>
                  )}

                  {/* TTS toggle */}
                  <button
                    className="acw-ib"
                    onClick={() => {
                      chat.setAutoSpeak((v) => !v);
                      chat.stopAll();
                    }}
                    title={chat.autoSpeak ? "Mute voice" : "Enable voice"}
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 7,
                      border: "none",
                      cursor: "pointer",
                      background: chat.autoSpeak
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
                      stroke={
                        chat.autoSpeak ? "#F47521" : "rgba(255,255,255,.3)"
                      }
                      strokeWidth="2"
                      strokeLinecap="round"
                    >
                      {chat.autoSpeak ? (
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

                  {/* Stop button — visible during thinking + speaking */}
                  {vs.canStop && (
                    <button
                      className="acw-ib acw-stop"
                      onClick={chat.stopAll}
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
                      {vs.isThinking ? (
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
                    onClick={chat.close}
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

              {/* Onboard progress */}
              {chat.isOnboard && (
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
                          i <= chat.onboardIndex
                            ? "#7B2FBE"
                            : "rgba(255,255,255,.06)",
                        transition: "background .3s",
                      }}
                    />
                  ))}
                </div>
              )}

              {/* Messages */}
              <div
                className="acw-sc"
                ref={(el) => {
                  if (el) el.scrollTop = el.scrollHeight;
                }}
                style={{
                  flex: 1,
                  overflowY: "auto",
                  padding: "14px 12px",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                {chat.messages.length <= 1 && (
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
                        Amit Chakraborty's AI. Speak or type.
                      </p>
                    </div>
                    {!chat.isOnboard && (
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
                          Try asking
                        </p>
                        {SUGGESTIONS.map((sg) => (
                          <button
                            key={sg}
                            className="acw-sug"
                            onClick={() => chat.sendMessage(sg)}
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

                {chat.messages.map((m, i) => (
                  <MsgBubble
                    key={`${m.ts}-${i}`}
                    m={m}
                    isOnboard={chat.isOnboard}
                  />
                ))}
                {chat.isLoading && <Typing />}
              </div>

              {/* Quick chips */}
              {chat.messages.length > 0 && !chat.isOnboard && (
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
                      onClick={() => chat.sendMessage(c)}
                      disabled={chat.isLoading}
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
                      href={BMC}
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
              <InputBar
                isOnboard={chat.isOnboard}
                isMobile={isMobile}
                inputText={chat.inputText}
                setInputText={chat.setInputText}
                transcript={chat.transcript}
                isLoading={chat.isLoading}
                isListening={vs.isListening}
                isSpeaking={vs.isSpeaking}
                isVoiceActive={vs.isVoiceActive}
                hasSR={sr.hasSupport}
                placeholder={chat.inputPlaceholder}
                sendColor={sendColor}
                onSend={chat.sendMessage}
                onToggleMic={() =>
                  vs.isListening ? sr.stopListening() : sr.startListening()
                }
                onStopVoice={chat.stopAll}
                onError={chat.apiError}
              />
            </div>
          )}
        </div>
      </div>
    </>
  );
};

// ── Input bar (extracted to keep main component readable) ─────────────────────
const InputBar = memo(
  ({
    isOnboard,
    isMobile,
    inputText,
    setInputText,
    transcript,
    isLoading,
    isListening,
    isSpeaking,
    isVoiceActive,
    hasSR,
    placeholder,
    sendColor,
    onSend,
    onToggleMic,
    onStopVoice,
    onError,
  }: {
    isOnboard: boolean;
    isMobile: boolean;
    inputText: string;
    setInputText: (v: string) => void;
    transcript: string;
    isLoading: boolean;
    isListening: boolean;
    isSpeaking: boolean;
    isVoiceActive: boolean;
    hasSR: boolean;
    placeholder: string;
    sendColor: string;
    onSend: (t: string) => void;
    onToggleMic: () => void;
    onStopVoice: () => void;
    onError: string | null;
  }) => {
    const inputRef = useRef<HTMLInputElement>(null);
    return (
      <div
        style={{
          flexShrink: 0,
          background: "rgba(5,3,9,.94)",
          backdropFilter: "blur(28px)",
          borderTop: isOnboard
            ? "1px solid rgba(123,47,190,.15)"
            : "1px solid rgba(255,255,255,.05)",
          padding: isMobile
            ? "12px 12px max(20px,env(safe-area-inset-bottom,20px))"
            : "11px 12px 14px",
        }}
      >
        <div style={{ position: "relative", height: 48 }}>
          {/* Text input */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              gap: 7,
              opacity: isVoiceActive ? 0 : 1,
              transform: isVoiceActive ? "translateY(5px) scale(.97)" : "none",
              transition: "opacity .22s,transform .22s",
              pointerEvents: isVoiceActive ? "none" : "auto",
            }}
          >
            <div
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
                  onToggleMic();
                }}
                style={{
                  flexShrink: 0,
                  width: 44,
                  height: 48,
                  background: "none",
                  border: "none",
                  cursor: hasSR ? "pointer" : "default",
                  opacity: hasSR ? 1 : 0.3,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: isListening
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
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !isLoading) onSend(inputText);
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
              onClick={() => onSend(inputText)}
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

          {/* Voice waveform */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 14,
              opacity: isVoiceActive ? 1 : 0,
              transform: isVoiceActive ? "none" : "translateY(-5px) scale(.97)",
              transition: "opacity .22s,transform .22s",
              pointerEvents: isVoiceActive ? "auto" : "none",
            }}
          >
            {isVoiceActive && (
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
                        background: isListening ? "#F47521" : "#7B2FBE",
                        animation: `acwWave ${isListening ? ".6s" : ".7s"} ${i * (isListening ? 50 : 60)}ms ease-in-out infinite`,
                      }}
                    />
                  ))}
                </div>
                <button
                  onClick={isListening ? onToggleMic : onStopVoice}
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: "50%",
                    background: isListening
                      ? "rgba(239,68,68,.18)"
                      : "rgba(244,117,33,.14)",
                    border: `1px solid ${isListening ? "rgba(239,68,68,.3)" : "rgba(244,117,33,.28)"}`,
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
                    fill={isListening ? "#ef4444" : "#F47521"}
                  >
                    <rect x="5" y="5" width="14" height="14" rx="2" />
                  </svg>
                </button>
              </>
            )}
          </div>

          {/* Live transcript */}
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
    );
  },
);
InputBar.displayName = "InputBar";

export { AuraChatWidget as SiriOrbNew };
export default AuraChatWidget;
