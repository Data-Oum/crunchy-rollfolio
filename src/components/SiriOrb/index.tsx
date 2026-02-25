/**
 * src/components/SiriOrb/index.tsx
 *
 * ROOT CAUSE OF BLACK SCREEN (FIXED):
 *   Previous attempts used a "DOM spring" — directly setting el.style.width etc
 *   via requestAnimationFrame. This fights React's reconciler. Under React 18
 *   concurrent mode + strict mode, React can re-render and re-apply the style
 *   prop at any time, resetting animated values to their initial state.
 *
 *   THE FIX: React owns all CSS values via state. CSS `transition` handles
 *   the smooth animation. No DOM manipulation. No RAF. No reconciler fighting.
 *   This is bulletproof across strict mode, concurrent mode, and SSR hydration.
 *
 * ALWAYS-ON MIC:
 *   Mic auto-starts when chat opens. Stops before TTS. Restarts after TTS ends.
 *   Permanently stopped on close() and beforeunload/visibilitychange.
 *
 * RE-RENDER STRATEGY:
 *   - Zustand: granular per-slice selectors (not useConversationStore())
 *   - sendMessage stored in ref → startListening is stable for lifetime
 *   - MessageBubble + TypingIndicator: memo'd
 *   - PlasmaOrb: mode synced via ref, canvas loop never causes React re-renders
 */

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  saveConversationToDB,
  saveMessagesToDB,
} from "@/integrations/supabase/client";
import { askAura, detectInstantAnswer, generateSummary } from "@/lib/gemini";
import { ttsPlayer } from "@/lib/tts";
import type { Message, UserProfile } from "@/store/useConversationStore";
import { useConversationStore } from "@/store/useConversationStore";

import { DevProfiler } from "./DevProfiler";
import { SilentBoundary } from "./ErrorBoundary";
import { AuraIcon, EndScreen, LimitScreen, UserBadge } from "./Panels";
import type { OrbMode } from "./PlasmaOrb";
import { PlasmaOrb } from "./PlasmaOrb";
import {
  extractCompany,
  extractIntent,
  extractInterests,
  extractName,
  extractRole,
  toTitleCaseExport,
  type OnboardStep,
} from "./onboarding";

// ── Constants ─────────────────────────────────────────────────────────────────
const ORB = 80;
const PW = 390;
const PH = 590;
const BMC_URL = "https://buymeacoffee.com/amithellmab";

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

// ── CSS (injected once at module level) ───────────────────────────────────────
if (
  typeof document !== "undefined" &&
  !document.getElementById("siri-orb-css")
) {
  const s = document.createElement("style");
  s.id = "siri-orb-css";
  s.textContent = `
    @keyframes orbFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
    @keyframes haloGlow{0%,100%{opacity:.35;transform:scale(1.1)}50%{opacity:.7;transform:scale(1.35)}}
    @keyframes waveBar{0%,100%{transform:scaleY(.25);opacity:.4}50%{transform:scaleY(1);opacity:1}}
    @keyframes blink{0%,100%{opacity:.6}50%{opacity:1}}
    @keyframes typeDot{0%,80%,100%{transform:translateY(0);opacity:.4}40%{transform:translateY(-5px);opacity:1}}
    @keyframes slideIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
    @keyframes fadeSlideUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
    @keyframes onboardPulse{0%,100%{box-shadow:0 0 0 0 rgba(123,47,190,0)}50%{box-shadow:0 0 0 5px rgba(123,47,190,.1)}}
    .so-sc::-webkit-scrollbar{width:2px}
    .so-sc::-webkit-scrollbar-thumb{background:rgba(244,117,33,.16);border-radius:99px}
    .so-inp{background:transparent!important;color:#fff!important;border:none!important;outline:none!important;}
    .so-inp::placeholder{color:rgba(255,255,255,.18)!important}
    .so-chip:hover{border-color:rgba(244,117,33,.5)!important;color:#F47521!important}
    .so-sug:hover{background:rgba(244,117,33,.07)!important;border-color:rgba(244,117,33,.28)!important}
    .so-send:hover:not(:disabled){box-shadow:inset 0 1px 0 rgba(255,255,255,.35),0 0 20px rgba(244,117,33,.38)!important;transform:scale(1.05)!important}
    .so-send:active:not(:disabled){transform:scale(.92)!important}
    .so-send:disabled{opacity:.22;cursor:not-allowed}
    .so-ib:hover{background:rgba(255,255,255,.07)!important}
    .so-msg{animation:slideIn .25s cubic-bezier(.34,1.4,.64,1) forwards}
    .so-ob{animation:onboardPulse 2.4s ease-in-out infinite}
  `;
  document.head.appendChild(s);
}

// ── Types ─────────────────────────────────────────────────────────────────────
type VoiceState = "idle" | "listening" | "thinking" | "speaking";
type Phase = "orb" | "open"; // Simplified: CSS transition handles intermediate state

// ── Helper: orb container styles driven by phase ─────────────────────────────
// THIS IS THE KEY FIX: React owns these styles. CSS transition animates them.
// No DOM spring. No requestAnimationFrame. No reconciler conflict.
function getContainerStyle(
  phase: Phase,
  isMobile: boolean,
): React.CSSProperties {
  const TRANSITION =
    "width 0.48s cubic-bezier(0.34,1.2,0.64,1), height 0.48s cubic-bezier(0.34,1.2,0.64,1), border-radius 0.48s cubic-bezier(0.34,1.2,0.64,1), background 0.32s ease, backdrop-filter 0.32s ease, border 0.32s ease, box-shadow 0.32s ease";

  if (phase === "orb") {
    return {
      width: ORB,
      height: ORB,
      borderRadius: ORB / 2,
      background: "transparent",
      backdropFilter: "none",
      border: "none",
      boxShadow: "none",
      transition: TRANSITION,
    };
  }
  // "open"
  const W = isMobile ? "100vw" : PW;
  const H = isMobile ? "100dvh" : PH;
  return {
    width: W,
    height: H,
    borderRadius: isMobile ? 0 : 20,
    background: "rgba(7,4,12,0.94)",
    backdropFilter: "blur(28px) saturate(1.8)",
    border: isMobile ? "none" : "1px solid rgba(244,117,33,0.12)",
    boxShadow: isMobile
      ? "none"
      : "0 32px 90px rgba(0,0,0,0.9),inset 0 1px 0 rgba(255,255,255,0.03)",
    transition: TRANSITION,
  };
}

// ── Main component ────────────────────────────────────────────────────────────
export const SiriOrbNew = () => {
  // ── Zustand — granular selectors, one re-render per slice ─────────────────
  const messages = useConversationStore((s) => s.messages);
  const userProfile = useConversationStore((s) => s.userProfile);
  const addMessage = useConversationStore((s) => s.addMessage);
  const resetMessages = useConversationStore((s) => s.resetMessages);
  const setProfile = useConversationStore((s) => s.setProfile);
  const updateProfile = useConversationStore((s) => s.updateProfile);
  const canChat = useConversationStore((s) => s.canChat);
  const getRemainingChats = useConversationStore((s) => s.getRemainingChats);
  const getStore = useConversationStore.getState;

  // ── Local state ───────────────────────────────────────────────────────────
  const [phase, setPhase] = useState<Phase>("orb");
  const [voiceState, setVoiceState] = useState<VoiceState>("idle");
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
  // Controls whether chat content is rendered (slight delay after open for perf)
  const [chatVisible, setChatVisible] = useState(false);

  // ── Refs (mutated without causing re-renders) ─────────────────────────────
  const isLoadingRef = useRef(false);
  const autoSpeakRef = useRef(true);
  const onboardStepRef = useRef<OnboardStep>("welcome");
  const sessionCountedRef = useRef(false);
  const micActiveRef = useRef(false); // false = mic permanently off
  const recogRef = useRef<SpeechRecognition | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const convoIdRef = useRef(`c_${Date.now()}`);
  const sendMessageRef = useRef<(t: string) => void>(() => {}); // stable ref to latest sendMessage

  // Sync refs with state
  useEffect(() => {
    isLoadingRef.current = isLoading;
  }, [isLoading]);
  useEffect(() => {
    onboardStepRef.current = onboardStep;
  }, [onboardStep]);
  useEffect(() => {
    autoSpeakRef.current = autoSpeak;
  }, [autoSpeak]);

  // ── Derived ───────────────────────────────────────────────────────────────
  const isOrb = phase === "orb";
  const isOpen = phase === "open";
  const limitHit = !canChat();
  const convoLeft = getRemainingChats();
  const isOnboarding = onboardStep !== "ready";
  const isVoiceActive = voiceState === "listening" || voiceState === "speaking";
  const showBMCChip = messages.filter((m) => m.role === "user").length >= 3;
  const onboardIdx = ONBOARD_STEPS.indexOf(onboardStep);

  const containerStyle = useMemo(
    () => getContainerStyle(phase, isMobile),
    [phase, isMobile],
  );

  const orbMode = useMemo<OrbMode>(() => {
    if (voiceState === "listening") return "listening";
    if (voiceState === "thinking") return "thinking";
    if (voiceState === "speaking") return "speaking";
    return "idle";
  }, [voiceState]);

  const statusLabel = error
    ? error
    : voiceState === "listening"
      ? "Listening..."
      : voiceState === "thinking"
        ? "Thinking..."
        : voiceState === "speaking"
          ? "Speaking..."
          : "Ready";

  const sendBtnColor = isOnboarding
    ? "linear-gradient(155deg,#7B2FBE 0%,#5a1fa0 60%,#3d1070 100%)"
    : "linear-gradient(155deg,#F47521 0%,#d4661a 60%,#a84e10 100%)";

  const inputPlaceholder = isOnboarding
    ? onboardStep === "ask_name"
      ? "Your first name..."
      : onboardStep === "ask_company"
        ? "Company or organization..."
        : onboardStep === "ask_role"
          ? "Your role..."
          : "What brings you here..."
    : "Ask anything about Amit...";

  // ── Init ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    // Mobile detection
    const checkMobile = () => setIsMobile(window.innerWidth <= 640);
    window.addEventListener("resize", checkMobile);

    // Kill mic on tab switch / close
    const killMic = () => {
      micActiveRef.current = false;
      try {
        recogRef.current?.abort();
      } catch {}
      recogRef.current = null;
      ttsPlayer.stop();
    };
    window.addEventListener("beforeunload", killMic);
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) killMic();
    });

    // Restore returning user
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
      window.removeEventListener("resize", checkMobile);
      window.removeEventListener("beforeunload", killMic);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Scroll to latest message
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

  // Stable — only depends on SR which never changes
  const startListening = useCallback(() => {
    if (!SR || !micActiveRef.current) return;
    // Clean up any existing instance
    try {
      recogRef.current?.abort();
    } catch {}
    recogRef.current = null;
    setVoiceState("listening");
    setTranscript("");
    const r = new SR();
    recogRef.current = r;
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
        sendMessageRef.current(t);
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
      recogRef.current?.stop();
    } catch {}
    recogRef.current = null;
    setVoiceState("idle");
    setTranscript("");
  }, []);

  // ── Always-on mic: restart whenever idle + chat open + not loading ────────
  useEffect(() => {
    if (
      voiceState !== "idle" ||
      phase !== "open" ||
      isLoading ||
      !micActiveRef.current
    )
      return;
    const t = setTimeout(() => {
      if (phase === "open" && !isLoadingRef.current && micActiveRef.current) {
        startListening();
      }
    }, 600);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voiceState, phase, isLoading]);

  // ── TTS ───────────────────────────────────────────────────────────────────
  const speak = useCallback(async (text: string) => {
    if (!autoSpeakRef.current) return;
    // Stop mic before speaking
    try {
      recogRef.current?.abort();
    } catch {}
    recogRef.current = null;
    await ttsPlayer.speak(
      text,
      () => setVoiceState("speaking"),
      () => setVoiceState("idle"), // triggers always-on mic restart
    );
  }, []);

  const stopSpeak = useCallback(() => {
    ttsPlayer.stop();
    setVoiceState("idle");
  }, []);

  // ── Open ──────────────────────────────────────────────────────────────────
  const open = useCallback(() => {
    setPhase("open");
    micActiveRef.current = true;
    sessionCountedRef.current = false;
    convoIdRef.current = `c_${Date.now()}`;
    // Delay chat content render until container is expanding (avoids layout flash)
    setTimeout(() => {
      setChatVisible(true);
      setTimeout(() => inputRef.current?.focus(), 80);
    }, 80);
    setTimeout(() => {
      const s = getStore();
      const profile = s.userProfile;
      let greeting: string;
      if (profile?.name) {
        const topics = extractInterests(
          s.getRecentConversationMessages?.(6) ?? [],
        );
        greeting = topics.length
          ? `${profile.name}. Session ${profile.sessionCount || 1}. Last time: ${topics.slice(0, 2).join(" and ")}. What do you need today?`
          : `${profile.name}. Session ${profile.sessionCount || 1}. What can I help you with today?`;
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
    // Permanently disarm mic
    micActiveRef.current = false;
    try {
      recogRef.current?.abort();
    } catch {}
    recogRef.current = null;
    ttsPlayer.stop();
    setVoiceState("idle");

    const s = getStore();
    const msgs = s.messages;
    if (msgs.length > 1) {
      const summary = await generateSummary(s.userProfile, msgs);
      setEndSummary(summary);
      s.saveConversation?.({
        id: convoIdRef.current,
        date: new Date().toISOString(),
        messages: [...msgs],
        summary,
      });
      if (s.userProfile) s.updateProfile({ interests: extractInterests(msgs) });
      // Persist to Supabase (fire-and-forget)
      const p = s.userProfile;
      if (p) {
        saveConversationToDB({
          visitorName: p.name,
          visitorCompany: p.company,
          visitorRole: p.role,
          visitorIntent: p.intent,
          summary,
          metadata: { sessionCount: p.sessionCount, interests: p.interests },
        }).then(async (id) => {
          if (id) await saveMessagesToDB(id, msgs);
        });
      }
      setShowEnd(true);
    }

    setPhase("orb");
    setChatVisible(false);
    resetMessages();
    setOnboardStep("welcome");
    sessionCountedRef.current = false;
  }, [getStore, resetMessages]);

  // ── Send message ──────────────────────────────────────────────────────────
  const sendMessage = useCallback(
    async (text: string) => {
      const msg = text.trim();
      if (!msg || isLoadingRef.current) return;
      setInputText("");
      setTranscript("");

      const s = getStore();
      if (!sessionCountedRef.current) {
        if (!s.canChat()) return;
        s.incrementDaily();
        sessionCountedRef.current = true;
      }

      const step = onboardStepRef.current;

      // ── Onboarding ────────────────────────────────────────────────────────
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
        let nextStep: OnboardStep = step;
        let reply = "";

        if (step === "ask_name") {
          const name = extractName(msg);
          if (name) {
            np = { ...np, name };
            nextStep = "ask_company";
            reply = `${name}. Which company are you with?`;
          } else reply = "Just your first name — what should I call you?";
        } else if (step === "ask_company") {
          const co =
            extractCompany(msg) ||
            (msg.length > 1 && msg.length < 60
              ? toTitleCaseExport(msg.trim())
              : null);
          if (co) {
            np = { ...np, company: co };
            nextStep = "ask_role";
            reply = "Your role — recruiter, engineer, founder, investor?";
          } else reply = "Which company or organization are you with?";
        } else if (step === "ask_role") {
          const role = extractRole(msg);
          if (role) {
            np = { ...np, role };
            nextStep = "ask_intent";
            reply = "What brings you here — exploring, hiring, or partnership?";
          } else
            reply = "Your role — recruiter, founder, engineer, or investor?";
        } else if (step === "ask_intent") {
          np = { ...np, intent: extractIntent(msg), totalMessages: 0 };
          nextStep = "ready";
          reply = `Got it. ${np.name ? `${np.name}, a` : "A"}sk me anything about Amit's projects, stack, or how to work with him.`;
        }

        setProfile(np);
        setOnboardStep(nextStep);
        setTimeout(() => {
          getStore().addMessage({ role: "ai", text: reply, ts: Date.now() });
          speak(reply);
        }, 280);
        return;
      }

      // ── Normal chat ───────────────────────────────────────────────────────
      if (s.userProfile) {
        updateProfile({
          totalMessages: (s.userProfile.totalMessages || 0) + 1,
          lastSeen: new Date().toISOString(),
        });
      }

      const instant = detectInstantAnswer(msg);
      if (instant) {
        addMessage({ role: "user", text: msg, ts: Date.now() });
        setTimeout(() => {
          getStore().addMessage({ role: "ai", text: instant, ts: Date.now() });
          speak(instant);
        }, 100);
        return;
      }

      const historySnapshot = [...s.messages];
      addMessage({ role: "user", text: msg, ts: Date.now() });
      setIsLoading(true);
      setVoiceState("thinking");

      try {
        const reply = await askAura(
          msg,
          s.userProfile,
          historySnapshot,
          setError,
        );
        getStore().addMessage({ role: "ai", text: reply, ts: Date.now() });
        speak(reply);
      } catch {
        const fb = "Ask about Amit's projects, tech stack, or how to hire him.";
        getStore().addMessage({ role: "ai", text: fb, ts: Date.now() });
        speak(fb);
      } finally {
        setIsLoading(false);
        setVoiceState("idle");
      }
    },
    [addMessage, updateProfile, setProfile, speak, getStore],
  );

  // Keep ref current
  useEffect(() => {
    sendMessageRef.current = sendMessage;
  }, [sendMessage]);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <DevProfiler id="SiriOrb">
      <>
        {showEnd && (
          <SilentBoundary name="EndScreen">
            <EndScreen
              name={userProfile?.name || ""}
              summary={endSummary}
              onDismiss={() => setShowEnd(false)}
            />
          </SilentBoundary>
        )}

        {/* ── Fixed positioner ── */}
        <div
          style={{
            position: "fixed",
            zIndex: 9999,
            ...(isMobile && isOpen
              ? { top: 0, left: 0 }
              : isOrb
                ? { bottom: 24, right: 24 }
                : { bottom: 20, right: 20 }),
          }}
        >
          {/* Halo (orb only) */}
          {isOrb && (
            <div
              aria-hidden="true"
              style={{
                position: "absolute",
                inset: 0,
                borderRadius: "50%",
                background:
                  "radial-gradient(circle,rgba(244,117,33,.22) 0%,transparent 70%)",
                filter: "blur(14px)",
                transform: "scale(1.6)",
                animation: "haloGlow 3.8s ease-in-out infinite",
                pointerEvents: "none",
              }}
            />
          )}

          {/* Count badge */}
          {isOrb && (
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

          {/*
            ╔═══════════════════════════════════════════════════════════════╗
            ║  ANIMATED CONTAINER                                           ║
            ║  React owns ALL style properties via `containerStyle`.       ║
            ║  CSS `transition` handles the smooth morph animation.        ║
            ║  This eliminates ALL DOM spring / reconciler conflicts.      ║
            ╚═══════════════════════════════════════════════════════════════╝
          */}
          <div
            role={isOrb ? "button" : undefined}
            aria-label={isOrb ? "Open Aura AI chat" : undefined}
            tabIndex={isOrb ? 0 : undefined}
            onClick={isOrb ? open : undefined}
            onKeyDown={
              isOrb
                ? (e) => {
                    if (e.key === "Enter" || e.key === " ") open();
                  }
                : undefined
            }
            style={{
              ...containerStyle,
              position: "relative",
              overflow: "hidden",
              cursor: isOrb ? "pointer" : "default",
              animation: isOrb ? "orbFloat 4.2s ease-in-out infinite" : "none",
              fontFamily: "inherit",
            }}
          >
            {/* PlasmaOrb canvas — always mounted, hidden when open */}
            <div
              aria-hidden="true"
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
              <SilentBoundary name="PlasmaOrb">
                <PlasmaOrb size={ORB} mode={orbMode} />
              </SilentBoundary>
            </div>

            {/* Chat panel — mounted only when open (chatVisible) */}
            {chatVisible && (
              <SilentBoundary name="ChatPanel">
                <DevProfiler id="ChatPanel">
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
                    {limitHit && !sessionCountedRef.current && (
                      <LimitScreen onClose={close} />
                    )}

                    {/* ── Header ── */}
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
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 9,
                        }}
                      >
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
                            {isOnboarding && (
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
                                  ? "blink 1.2s ease-in-out infinite"
                                  : "none",
                            }}
                          >
                            {statusLabel}
                          </div>
                        </div>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          gap: 3,
                          alignItems: "center",
                        }}
                      >
                        <UserBadge user={userProfile} convoLeft={convoLeft} />
                        {/* TTS toggle */}
                        <button
                          className="so-ib"
                          onClick={() => {
                            setAutoSpeak((v) => !v);
                            stopSpeak();
                          }}
                          title={autoSpeak ? "Mute voice" : "Unmute voice"}
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
                            stroke={
                              autoSpeak ? "#F47521" : "rgba(255,255,255,.3)"
                            }
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
                            className="so-ib"
                            onClick={stopSpeak}
                            title="Stop speaking"
                            style={{
                              width: 28,
                              height: 28,
                              borderRadius: 7,
                              border: "none",
                              cursor: "pointer",
                              background: "rgba(244,117,33,.1)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            <svg
                              width="10"
                              height="10"
                              viewBox="0 0 24 24"
                              fill="#F47521"
                            >
                              <rect x="4" y="4" width="16" height="16" rx="2" />
                            </svg>
                          </button>
                        )}
                        {/* Close */}
                        <button
                          className="so-ib"
                          onClick={close}
                          title="Close"
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
                    {isOnboarding && (
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
                        {ONBOARD_STEPS.map((_, idx) => (
                          <div
                            key={idx}
                            style={{
                              flex: 1,
                              height: 2,
                              borderRadius: 1,
                              background:
                                idx <= onboardIdx
                                  ? "#7B2FBE"
                                  : "rgba(255,255,255,.06)",
                              transition: "background .3s",
                            }}
                          />
                        ))}
                      </div>
                    )}

                    {/* ── Messages ── */}
                    <DevProfiler id="MessageList">
                      <div
                        className="so-sc"
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
                                Amit Chakraborty's AI. Listening — just speak or
                                type.
                              </p>
                            </div>
                            {!isOnboarding && (
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
                                    className="so-sug"
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
                          <MessageBubble
                            key={`${m.ts}-${i}`}
                            message={m}
                            isOnboarding={isOnboarding}
                          />
                        ))}

                        {isLoading && <TypingIndicator />}
                        <div ref={chatEndRef} />
                      </div>
                    </DevProfiler>

                    {/* Quick chips */}
                    {messages.length > 0 && !isOnboarding && (
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
                            className="so-chip"
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
                        {showBMCChip && (
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

                    {/* ── Input bar ── */}
                    <div
                      style={{
                        flexShrink: 0,
                        background: "rgba(5,3,9,.94)",
                        backdropFilter: "blur(28px) saturate(150%)",
                        borderTop: isOnboarding
                          ? "1px solid rgba(123,47,190,.15)"
                          : "1px solid rgba(255,255,255,.05)",
                        padding: isMobile
                          ? `12px 12px max(20px,env(safe-area-inset-bottom,20px))`
                          : "11px 12px 14px",
                      }}
                    >
                      <div style={{ position: "relative", height: 48 }}>
                        {/* Text input layer */}
                        <div
                          style={{
                            position: "absolute",
                            inset: 0,
                            display: "flex",
                            alignItems: "center",
                            gap: 7,
                            opacity: isVoiceActive ? 0 : 1,
                            transform: isVoiceActive
                              ? "translateY(5px) scale(.97)"
                              : "none",
                            transition: "opacity .22s,transform .22s",
                            pointerEvents: isVoiceActive ? "none" : "auto",
                          }}
                        >
                          <div
                            className={isOnboarding ? "so-ob" : ""}
                            style={{
                              flex: 1,
                              height: 48,
                              display: "flex",
                              alignItems: "center",
                              borderRadius: 24,
                              background: "rgba(255,255,255,.038)",
                              border: isOnboarding
                                ? "1px solid rgba(123,47,190,.35)"
                                : "1px solid rgba(255,255,255,.065)",
                              boxShadow: "inset 0 2px 5px rgba(0,0,0,.3)",
                              overflow: "hidden",
                              cursor: "text",
                            }}
                            onClick={() => inputRef.current?.focus()}
                          >
                            {/* Mic button */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                voiceState === "listening"
                                  ? stopListening()
                                  : startListening();
                              }}
                              title={
                                voiceState === "listening"
                                  ? "Stop listening"
                                  : "Start listening"
                              }
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
                                    : isOnboarding
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
                              className="so-inp"
                              type="text"
                              placeholder={inputPlaceholder}
                              value={inputText}
                              onChange={(e) => {
                                setInputText(e.target.value);
                                if (error) setError(null);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" && !isLoadingRef.current)
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
                            className="so-send"
                            onClick={() => sendMessage(inputText)}
                            disabled={isLoading || !inputText.trim()}
                            style={{
                              flexShrink: 0,
                              width: 48,
                              height: 48,
                              borderRadius: "50%",
                              background: sendBtnColor,
                              border: isOnboarding
                                ? "1px solid rgba(123,47,190,.3)"
                                : "1px solid rgba(200,90,20,.3)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              cursor: "pointer",
                              transition:
                                "all .22s cubic-bezier(.34,1.4,.64,1)",
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

                        {/* Voice waveform layer */}
                        <div
                          style={{
                            position: "absolute",
                            inset: 0,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: 14,
                            opacity: isVoiceActive ? 1 : 0,
                            transform: isVoiceActive
                              ? "none"
                              : "translateY(-5px) scale(.97)",
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
                                      background:
                                        voiceState === "listening"
                                          ? "#F47521"
                                          : "#7B2FBE",
                                      animation: `waveBar ${voiceState === "listening" ? ".6s" : ".7s"} ${i * (voiceState === "listening" ? 50 : 60)}ms ease-in-out infinite`,
                                    }}
                                  />
                                ))}
                              </div>
                              <button
                                onClick={
                                  voiceState === "listening"
                                    ? stopListening
                                    : stopSpeak
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
                                    voiceState === "listening"
                                      ? "#ef4444"
                                      : "#F47521"
                                  }
                                >
                                  <rect
                                    x="5"
                                    y="5"
                                    width="14"
                                    height="14"
                                    rx="2"
                                  />
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
                              animation: "slideIn .2s ease forwards",
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
                </DevProfiler>
              </SilentBoundary>
            )}
          </div>
        </div>
      </>
    </DevProfiler>
  );
};

// ── MessageBubble — memo'd: doesn't re-render when other messages change ──────
const MessageBubble = memo(
  ({
    message: m,
    isOnboarding,
  }: {
    message: Message;
    isOnboarding: boolean;
  }) => (
    <div
      className="so-msg"
      style={{
        display: "flex",
        justifyContent: m.role === "user" ? "flex-end" : "flex-start",
        marginBottom: 8,
      }}
    >
      {m.role === "ai" && <AuraIcon size={24} />}
      <div
        style={{
          maxWidth: "78%",
          borderRadius:
            m.role === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
          padding: "9px 13px",
          fontSize: 12.5,
          lineHeight: 1.65,
          marginLeft: m.role === "ai" ? 6 : 0,
          marginTop: m.role === "ai" ? 2 : 0,
          ...(m.role === "user"
            ? {
                background: "rgba(244,117,33,.15)",
                border: "1px solid rgba(244,117,33,.22)",
                color: "#fed7aa",
              }
            : {
                background: "#0F0C18",
                border: isOnboarding
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
MessageBubble.displayName = "MessageBubble";

// ── TypingIndicator — memo'd ──────────────────────────────────────────────────
const TypingIndicator = memo(() => (
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
            animation: `typeDot 1.2s ${d}ms infinite`,
          }}
        />
      ))}
    </div>
  </div>
));
TypingIndicator.displayName = "TypingIndicator";
