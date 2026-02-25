/**
 * src/hooks/useSpeechRecognition.ts
 * Always-on SR with auto-restart, interim transcripts, language detection.
 */
import { auraD } from "@/lib/diagnostics";
import { useCallback, useEffect, useMemo, useRef } from "react";
import type { VoiceState } from "./useVoiceState";

interface Opts {
  voiceState: VoiceState;
  voiceStateRef: React.MutableRefObject<VoiceState>;
  setVoiceState: (s: VoiceState) => void;
  isOpen: boolean;
  isLoading: boolean;
  micEnabled: React.MutableRefObject<boolean>;
  onFinalTranscript: (text: string) => void;
  onInterimTranscript: (text: string) => void;
  onLanguageDetected?: (lang: string) => void;
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
  const langRef = useRef(onLanguageDetected);
  langRef.current = onLanguageDetected;

  const SR = useMemo(() => {
    if (typeof window === "undefined") return null;
    const sr =
      window.SpeechRecognition ||
      (window as any).webkitSpeechRecognition ||
      null;
    auraD.setHealth("speechRecognition", sr ? "ok" : "unsupported");
    return sr;
  }, []);

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
    r.lang = "en-IN";

    r.onresult = (e: SpeechRecognitionEvent) => {
      const text = Array.from(e.results)
        .map((res) => res[0].transcript)
        .join("");
      interimRef.current(text);
      if (e.results[e.results.length - 1].isFinal) {
        r.stop();
        langRef.current?.(r.lang || "en");
        auraD.increment("sr.transcripts");
        finalRef.current(text.trim());
      }
    };
    r.onerror = (e) => {
      auraD.log("sr", "warn", `Error: ${e.error}`);
      if (e.error === "not-allowed")
        auraD.setHealth("speechRecognition", "denied");
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
  }, [SR, setVoiceState, micEnabled, voiceStateRef]);

  // Auto-restart after idle
  useEffect(() => {
    if (!isOpen || isLoading || voiceState !== "idle" || !micEnabled.current)
      return;
    const t = setTimeout(() => {
      if (isOpen && !loadRef.current && micEnabled.current) startListening();
    }, 800);
    return () => clearTimeout(t);
  }, [voiceState, isOpen, isLoading, startListening, micEnabled]);

  return { hasSupport: !!SR, startListening, stopListening, abortListening };
}
