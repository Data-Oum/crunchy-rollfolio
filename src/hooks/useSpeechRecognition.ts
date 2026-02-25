/**
 * src/hooks/useSpeechRecognition.ts
 *
 * Always-on SR with:
 *   - Adaptive language detection (EN / HI / JA / KO)
 *   - Dynamic lang switching per utterance
 *   - Multi-language recognition strategy: runs primary lang, falls back on confidence
 *   - Auto-restart after idle
 *   - Interim transcripts
 */

import { auraD } from "@/lib/diagnostics";
import { detectLanguage, type SupportedLang } from "@/lib/fallbackAI";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { VoiceState } from "./useVoiceState";

// ─── Language → SR lang code mapping ─────────────────────────────────────────
const LANG_TO_SR: Record<SupportedLang, string> = {
  en: "en-IN", // Indian English as default (works for global English too)
  hi: "hi-IN",
  ja: "ja-JP",
  ko: "ko-KR",
};

// Recognition confidence threshold for language switching
const LANG_SWITCH_CONFIDENCE = 0.65;

// How many consecutive detections before we lock the language
const LANG_LOCK_THRESHOLD = 2;

interface Opts {
  voiceState: VoiceState;
  voiceStateRef: React.MutableRefObject<VoiceState>;
  setVoiceState: (s: VoiceState) => void;
  isOpen: boolean;
  isLoading: boolean;
  micEnabled: React.MutableRefObject<boolean>;
  onFinalTranscript: (text: string, lang: SupportedLang) => void;
  onInterimTranscript: (text: string) => void;
  onLanguageDetected?: (lang: SupportedLang, srLang: string) => void;
}

export function useSpeechRecognition({
  voiceState,
  voiceStateRef,
  setVoiceState,
  isOpen,
  isLoading,
  micEnabled,
  onFinalTranscript,
  onInterimTranscript,
  onLanguageDetected,
}: Opts) {
  const recRef = useRef<SpeechRecognition | null>(null);
  const loadRef = useRef(isLoading);
  loadRef.current = isLoading;

  const finalRef = useRef(onFinalTranscript);
  finalRef.current = onFinalTranscript;
  const interimRef = useRef(onInterimTranscript);
  interimRef.current = onInterimTranscript;
  const langCbRef = useRef(onLanguageDetected);
  langCbRef.current = onLanguageDetected;

  // Language tracking
  const [detectedLang, setDetectedLang] = useState<SupportedLang>("en");
  const currentLangRef = useRef<SupportedLang>("en");
  const langHistory = useRef<SupportedLang[]>([]);
  const langLockCount = useRef(0);
  const lockedLang = useRef<SupportedLang | null>(null);

  const SR = useMemo(() => {
    if (typeof window === "undefined") return null;
    const sr =
      window.SpeechRecognition ||
      (
        window as unknown as {
          webkitSpeechRecognition: typeof SpeechRecognition;
        }
      ).webkitSpeechRecognition ||
      null;
    auraD.setHealth("speechRecognition", sr ? "ok" : "unsupported");
    return sr;
  }, []);

  // ─── Language management ─────────────────────────────────────────────────
  const updateDetectedLanguage = useCallback(
    (newLang: SupportedLang, confidence: number = 1) => {
      if (confidence < LANG_SWITCH_CONFIDENCE && lockedLang.current) {
        return; // Not confident enough to override locked language
      }

      langHistory.current.push(newLang);
      if (langHistory.current.length > 5) {
        langHistory.current = langHistory.current.slice(-5);
      }

      // Check if language is consistent (lock it)
      const recent = langHistory.current.slice(-LANG_LOCK_THRESHOLD);
      const allSame = recent.every((l) => l === newLang);

      if (allSame && recent.length >= LANG_LOCK_THRESHOLD) {
        if (lockedLang.current !== newLang) {
          lockedLang.current = newLang;
          langLockCount.current++;
          auraD.log(
            "sr",
            "info",
            `Language locked: ${newLang} (${LANG_TO_SR[newLang]})`,
          );
        }
      }

      if (currentLangRef.current !== newLang) {
        currentLangRef.current = newLang;
        setDetectedLang(newLang);
        langCbRef.current?.(newLang, LANG_TO_SR[newLang]);
        auraD.log(
          "sr",
          "info",
          `Language switched: ${newLang} → ${LANG_TO_SR[newLang]}`,
        );
      }
    },
    [],
  );

  const getCurrentSRLang = useCallback((): string => {
    return LANG_TO_SR[lockedLang.current || currentLangRef.current];
  }, []);

  // ─── Core SR ──────────────────────────────────────────────────────────────
  const abortListening = useCallback(() => {
    try {
      recRef.current?.abort();
    } catch {}
    recRef.current = null;
  }, []);

  const stopListening = useCallback(() => {
    try {
      recRef.current?.stop();
    } catch {}
    recRef.current = null;
    setVoiceState("idle");
    interimRef.current("");
  }, [setVoiceState]);

  const startListening = useCallback(() => {
    if (!SR || !micEnabled.current || loadRef.current) return;
    try {
      recRef.current?.abort();
    } catch {}
    recRef.current = null;
    setVoiceState("listening");
    interimRef.current("");

    const r = new SR();
    recRef.current = r;
    r.continuous = false;
    r.interimResults = true;
    r.maxAlternatives = 3; // Get alternatives for better language detection
    r.lang = getCurrentSRLang();

    auraD.log("sr", "info", `Listening with lang=${r.lang}`);

    r.onresult = (e: SpeechRecognitionEvent) => {
      // Collect best transcript from all alternatives
      const lastResult = e.results[e.results.length - 1];
      const text = Array.from(e.results)
        .map((res) => res[0].transcript)
        .join("");

      interimRef.current(text);

      if (lastResult.isFinal) {
        r.stop();
        auraD.increment("sr.transcripts");

        // Detect language from transcript
        const transcriptLang = detectLanguage(text);
        const confidence = lastResult[0].confidence || 1;

        // Also check alternative transcripts for language hints
        if (lastResult.length > 1) {
          const altText = lastResult[1]?.transcript || "";
          const altLang = detectLanguage(altText);
          if (altLang !== "en" && transcriptLang === "en") {
            // Alternative suggests non-English — worth noting
            auraD.log("sr", "info", `Alt transcript suggests: ${altLang}`);
          }
        }

        updateDetectedLanguage(transcriptLang, confidence);
        finalRef.current(text.trim(), currentLangRef.current);
      }
    };

    r.onerror = (e) => {
      auraD.log("sr", "warn", `SR error: ${e.error} (lang: ${r.lang})`);
      if (e.error === "not-allowed") {
        auraD.setHealth("speechRecognition", "denied");
      }
      // On language error, try falling back to en-IN
      if (e.error === "language-not-supported" && r.lang !== LANG_TO_SR["en"]) {
        auraD.log(
          "sr",
          "warn",
          `Lang ${r.lang} not supported, falling back to en-IN`,
        );
        lockedLang.current = null;
        currentLangRef.current = "en";
        setDetectedLang("en");
      }
      setVoiceState("idle");
      interimRef.current("");
    };

    r.onend = () => {
      if (voiceStateRef.current === "listening") setVoiceState("idle");
      interimRef.current("");
    };

    try {
      r.start();
    } catch (err) {
      auraD.error("sr", err, "Start failed");
      setVoiceState("idle");
    }
  }, [
    SR,
    setVoiceState,
    micEnabled,
    voiceStateRef,
    getCurrentSRLang,
    updateDetectedLanguage,
  ]);

  // ─── Auto-restart after idle ─────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen || isLoading || voiceState !== "idle" || !micEnabled.current)
      return;
    const t = setTimeout(() => {
      if (isOpen && !loadRef.current && micEnabled.current) startListening();
    }, 800);
    return () => clearTimeout(t);
  }, [voiceState, isOpen, isLoading, startListening, micEnabled]);

  // ─── Reset language on session close ─────────────────────────────────────
  const resetLanguage = useCallback(() => {
    currentLangRef.current = "en";
    lockedLang.current = null;
    langLockCount.current = 0;
    langHistory.current = [];
    setDetectedLang("en");
  }, []);

  return {
    hasSupport: !!SR,
    startListening,
    stopListening,
    abortListening,
    detectedLang,
    currentSRLang: getCurrentSRLang(),
    resetLanguage,
  };
}
