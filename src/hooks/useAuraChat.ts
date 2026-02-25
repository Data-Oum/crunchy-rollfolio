/**
 * src/hooks/useAuraChat.ts
 *
 * VOICE-ONLY Aura business logic. NO text input anywhere.
 * Tap orb → speak → Aura responds → auto-listen again.
 *
 * FIXES:
 *   1. stopAll() now blocks auto-restart via micEnabled.current = false
 *   2. close() sets isOpen=false FIRST before any async work (no hanging UI)
 *   3. open() calls resetOffline() so offline mode never persists across sessions
 */

import {
  extractCompany,
  extractIntent,
  extractInterests,
  extractName,
  extractRole,
  toTitleCaseExport,
  type OnboardStep,
} from "@/components/SiriOrb/onboarding";
import { saveFullSession } from "@/integrations/supabase/client";
import { auraD } from "@/lib/diagnostics";
import {
  fallbackOnboardReply,
  getFallbackGreeting,
  resetFallbackContext,
  setFallbackContext,
} from "@/lib/fallbackAI";
import {
  askAura,
  detectInstantAnswer,
  generateSummary,
  isOffline,
  resetOffline, // ← FIX 3: import resetOffline
} from "@/lib/gemini";
import { selectVoice, type VoiceConfig } from "@/lib/tts";
import {
  useConversationStore,
  type UserProfile,
} from "@/store/useConversationStore";
import { useCallback, useEffect, useRef, useState } from "react";
import type { VoiceState } from "./useVoiceState";

export const ONBOARD_STEPS: OnboardStep[] = [
  "ask_name",
  "ask_company",
  "ask_role",
  "ask_intent",
];

interface Opts {
  setVoiceState: (s: VoiceState) => void;
  speak: (text: string, vc?: VoiceConfig) => Promise<void>;
  stopTTS: () => void;
  abortListening: () => void;
  getVoiceProfileContext?: () => string;
}

export function useAuraChat({
  setVoiceState,
  speak,
  stopTTS,
  abortListening,
  getVoiceProfileContext,
}: Opts) {
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
  const [isLoading, setIsLoading] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [autoSpeak, setAutoSpeak] = useState(true);
  const [onboardStep, setOnboardStep] = useState<OnboardStep>("welcome");
  const [showEndCard, setShowEndCard] = useState(false);
  const [endSummary, setEndSummary] = useState("");
  const [apiError, setApiError] = useState<string | null>(null);
  const [lastAiText, setLastAiText] = useState("");
  const [offlineIndicator, setOfflineIndicator] = useState(false);

  const isLoadingRef = useRef(false);
  const stepRef = useRef<OnboardStep>("welcome");
  const micEnabled = useRef(false);
  const sessionCounted = useRef(false);
  const convoId = useRef(`c_${Date.now()}`);
  const sendRef = useRef<(t: string) => void>(() => {});

  useEffect(() => {
    isLoadingRef.current = isLoading;
  }, [isLoading]);
  useEffect(() => {
    stepRef.current = onboardStep;
  }, [onboardStep]);
  useEffect(() => {
    const check = () => setOfflineIndicator(isOffline());
    check();
    window.addEventListener("online", check);
    window.addEventListener("offline", check);
    return () => {
      window.removeEventListener("online", check);
      window.removeEventListener("offline", check);
    };
  }, []);

  const isOnboard = onboardStep !== "ready";
  const convoLeft = getRemaining();
  const limitHit = !canChat();
  const onboardIndex = ONBOARD_STEPS.indexOf(onboardStep);

  // ── OPEN ───────────────────────────────────────────────────────────────────
  const open = useCallback(() => {
    setIsOpen(true);
    micEnabled.current = true;
    sessionCounted.current = false;
    convoId.current = `c_${Date.now()}`;
    resetFallbackContext();
    resetOffline(); // ← FIX 3: clear offline mode on every new session
    auraD.log("system", "info", "Session opened");

    setTimeout(() => {
      const s = getStore();
      const p = s.userProfile;
      let greeting: string;
      let vc: VoiceConfig;

      if (p?.name) {
        greeting = getFallbackGreeting(p.name, p.sessionCount || 1);
        setOnboardStep("ready");
        vc = selectVoice({ isGreeting: true });
        setFallbackContext({
          userName: p.name,
          userRole: p.role,
          userCompany: p.company,
          userIntent: p.intent,
        });
        s.updateProfile({
          sessionCount: (p.sessionCount || 0) + 1,
          lastSeen: new Date().toISOString(),
        });
      } else {
        greeting = getFallbackGreeting();
        setOnboardStep("ask_name");
        vc = selectVoice({ isGreeting: true });
      }

      s.setMessages([{ role: "ai", text: greeting, ts: Date.now() }]);
      setLastAiText(greeting);
      speak(greeting, vc);
    }, 400);
  }, [speak, getStore]);

  // ── CLOSE ──────────────────────────────────────────────────────────────────
  // FIX 2: Close UI immediately — don't await generateSummary before setIsOpen(false)
  const close = useCallback(async () => {
    micEnabled.current = false;
    abortListening();
    stopTTS();
    setVoiceState("idle");

    // ← FIX 2: Close UI FIRST so widget disappears instantly
    setIsOpen(false);
    setTranscript("");
    setLastAiText("");
    setOnboardStep("welcome");
    sessionCounted.current = false;

    // Summary + persistence runs in background after UI is already gone
    const s = getStore();
    const msgs = s.messages;
    resetMessages();

    auraD.log("system", "info", "Session closed");

    if (msgs.length > 2) {
      try {
        const sum = await generateSummary(s.userProfile, msgs);
        setEndSummary(sum);

        s.saveConversation?.({
          id: convoId.current,
          date: new Date().toISOString(),
          messages: [...msgs],
          summary: sum,
        });
        if (s.userProfile)
          s.updateProfile({ interests: extractInterests(msgs) });

        saveFullSession({
          visitorName: s.userProfile?.name,
          visitorCompany: s.userProfile?.company,
          visitorRole: s.userProfile?.role,
          visitorIntent: s.userProfile?.intent,
          summary: sum,
          messages: msgs,
          metadata: {
            convoId: convoId.current,
            sessionCount: s.userProfile?.sessionCount,
          },
        }).catch((e) => auraD.error("supabase", e, "Session save failed"));

        if (sum) setShowEndCard(true);
      } catch (e) {
        auraD.error("system", e, "Summary generation failed");
      }
    }
  }, [getStore, resetMessages, stopTTS, abortListening, setVoiceState]);

  // ── STOP ALL ───────────────────────────────────────────────────────────────
  // FIX 1: Disable mic BEFORE stopping so auto-restart effect can't re-trigger.
  //        Re-enable after 1.2s so the next manual tap still works.
  const stopAll = useCallback(() => {
    micEnabled.current = false; // ← FIX 1: block the auto-restart guard
    stopTTS();
    abortListening();
    setIsLoading(false);
    // Re-arm mic after cooldown so user can tap orb again
    setTimeout(() => {
      micEnabled.current = true;
    }, 1200);
  }, [stopTTS, abortListening]);

  // ── SEND MESSAGE (voice-only, no text input) ──────────────────────────────
  const sendMessage = useCallback(
    async (rawText: string) => {
      const msg = rawText.trim();
      if (!msg || isLoadingRef.current) return;
      setTranscript("");

      const s = getStore();

      // Daily limit
      if (!sessionCounted.current) {
        if (!s.canChat()) {
          const limitMsg =
            "Daily limit reached. Reach Amit directly at amit98ch@gmail.com or come back tomorrow.";
          setLastAiText(limitMsg);
          speak(limitMsg);
          return;
        }
        s.incrementDaily?.();
        sessionCounted.current = true;
      }

      const step = stepRef.current;

      // ── ONBOARDING ─────────────────────────────────────────────────────────
      if (step !== "ready") {
        addMessage({ role: "user", text: msg, ts: Date.now() });

        let profile: UserProfile = s.userProfile ?? {
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
            profile = { ...profile, name };
            nextStep = "ask_company";
            reply = fallbackOnboardReply("ask_name", msg, name);
            setFallbackContext({ userName: name });
          } else {
            reply = "Just your first name. What should I call you?";
          }
        } else if (step === "ask_company") {
          const co =
            extractCompany(msg) ||
            (msg.length > 1 && msg.length < 60
              ? toTitleCaseExport(msg.trim())
              : "");
          if (co) {
            profile = { ...profile, company: co };
            nextStep = "ask_role";
            reply = fallbackOnboardReply("ask_company", msg);
            setFallbackContext({ userCompany: co });
          } else {
            reply = "Which company or organization?";
          }
        } else if (step === "ask_role") {
          const role = extractRole(msg);
          if (role) {
            profile = { ...profile, role };
            nextStep = "ask_intent";
            reply = fallbackOnboardReply("ask_role", msg);
            setFallbackContext({ userRole: role });
          } else {
            reply = "Your role? Recruiter, engineer, founder, or investor?";
          }
        } else if (step === "ask_intent") {
          profile = {
            ...profile,
            intent: extractIntent(msg),
            totalMessages: 0,
          };
          nextStep = "ready";
          reply = fallbackOnboardReply("ask_intent", msg, profile.name);
          setFallbackContext({ userIntent: profile.intent });
        }

        setProfile(profile);
        setOnboardStep(nextStep);

        setTimeout(() => {
          getStore().addMessage({ role: "ai", text: reply, ts: Date.now() });
          setLastAiText(reply);
          speak(reply, selectVoice({ isGreeting: nextStep === "ready" }));
        }, 250);
        return;
      }

      // ── NORMAL CHAT ────────────────────────────────────────────────────────
      if (s.userProfile) {
        updateProfile({
          totalMessages: (s.userProfile.totalMessages || 0) + 1,
          lastSeen: new Date().toISOString(),
        });
      }

      // Zero-latency instant
      const instant = detectInstantAnswer(msg);
      if (instant) {
        addMessage({ role: "user", text: msg, ts: Date.now() });
        setTimeout(() => {
          getStore().addMessage({ role: "ai", text: instant, ts: Date.now() });
          setLastAiText(instant);
          speak(instant);
        }, 80);
        return;
      }

      // Full chat (Gemini or fallback)
      const historySnap = [...s.messages];
      addMessage({ role: "user", text: msg, ts: Date.now() });
      setIsLoading(true);
      setVoiceState("thinking");

      try {
        const voiceCtx = getVoiceProfileContext?.() || "";
        const reply = await askAura(
          msg,
          s.userProfile,
          historySnap,
          setApiError,
          voiceCtx,
        );
        setIsLoading(false);
        getStore().addMessage({ role: "ai", text: reply, ts: Date.now() });
        setLastAiText(reply);

        const isExcited = /impressive|amazing|incredible|wow/i.test(reply);
        speak(
          reply,
          selectVoice({
            isExcited,
            tone: s.userProfile?.role === "Engineer" ? "calm" : undefined,
          }),
        );
      } catch (err) {
        setIsLoading(false);
        auraD.error("gemini", err, "Send failed completely");
        const fb =
          "Ask about the projects, tech stack, or how to work with Amit.";
        getStore().addMessage({ role: "ai", text: fb, ts: Date.now() });
        setLastAiText(fb);
        speak(fb);
      }
    },
    [
      addMessage,
      updateProfile,
      setProfile,
      speak,
      setVoiceState,
      getStore,
      getVoiceProfileContext,
    ],
  );

  useEffect(() => {
    sendRef.current = sendMessage;
  }, [sendMessage]);

  return {
    isOpen,
    isLoading,
    transcript,
    setTranscript,
    autoSpeak,
    setAutoSpeak,
    onboardStep,
    isOnboard,
    onboardIndex,
    showEndCard,
    setShowEndCard,
    endSummary,
    apiError,
    setApiError,
    lastAiText,
    offlineIndicator,
    messages,
    userProfile,
    convoLeft,
    limitHit,
    open,
    close,
    stopAll,
    sendMessage,
    micEnabled,
    sendRef,
  };
}
