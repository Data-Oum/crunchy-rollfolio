/**
 * src/hooks/useVoiceState.ts
 * Central voice state. Stable setter so child hooks never get stale refs.
 */
import { useCallback, useRef, useState } from "react";

export type VoiceState = "idle" | "listening" | "thinking" | "speaking";

export function useVoiceState(initial: VoiceState = "idle") {
  const [voiceState, _set] = useState<VoiceState>(initial);
  const ref = useRef<VoiceState>(initial);
  const setVoiceState = useCallback((s: VoiceState) => {
    ref.current = s;
    _set(s);
  }, []);

  return {
    voiceState,
    voiceStateRef: ref,
    setVoiceState,
    statusText: (
      {
        idle: "タッチ • Tap to speak",
        listening: "聴く • Listening...",
        thinking: "念 • Thinking...",
        speaking: "声 • Speaking...",
      } as Record<VoiceState, string>
    )[voiceState],
    canStop: voiceState === "thinking" || voiceState === "speaking",
    isBusy: voiceState === "thinking" || voiceState === "speaking",
    isVoiceActive: voiceState === "listening" || voiceState === "speaking",
    isIdle: voiceState === "idle",
    isListening: voiceState === "listening",
    isThinking: voiceState === "thinking",
    isSpeaking: voiceState === "speaking",
  };
}
