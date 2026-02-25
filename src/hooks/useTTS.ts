/**
 * src/hooks/useTTS.ts
 * Wraps TTSPlayer. Owns voiceState lifecycle: thinking→speaking→idle.
 */
import { ttsPlayer, type VoiceConfig } from "@/lib/tts";
import { useCallback, useRef } from "react";
import type { VoiceState } from "./useVoiceState";

interface Opts {
  setVoiceState: (s: VoiceState) => void;
  autoSpeak: boolean;
  apiKey: string;
}

export function useTTS({ setVoiceState, autoSpeak, apiKey }: Opts) {
  const autoRef = useRef(autoSpeak);
  autoRef.current = autoSpeak;
  const keyRef = useRef(apiKey);
  keyRef.current = apiKey;

  const speak = useCallback(
    async (text: string, vc?: VoiceConfig) => {
      if (!autoRef.current) {
        setVoiceState("idle");
        return;
      }
      setVoiceState("thinking");
      await ttsPlayer.speak(
        text,
        keyRef.current,
        () => setVoiceState("speaking"),
        () => setVoiceState("idle"),
        vc,
      );
    },
    [setVoiceState],
  );

  const stopTTS = useCallback(() => {
    ttsPlayer.stop();
    setVoiceState("idle");
  }, [setVoiceState]);

  return { speak, stopTTS };
}
