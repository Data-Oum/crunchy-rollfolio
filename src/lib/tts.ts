/**
 * src/lib/tts.ts
 *
 * TTSPlayer — Gemini TTS with reliable cancellation.
 *
 * STOP FIX: Generation counter. stop() increments this.gen.
 * speak() captures myGen and checks at every async boundary.
 *
 * DYNAMIC VOICE: Selects from 30 Gemini voices based on context.
 * OFFLINE: Falls back to browser SpeechSynthesis with voice matching.
 */

import { auraD } from "./diagnostics";

const TTS_MODEL = "gemini-2.5-flash-preview-tts";
const TTS_RATE = 24_000;

export type AuraVoiceName =
  | "Charon"
  | "Kore"
  | "Fenrir"
  | "Aoede"
  | "Sulafat"
  | "Puck"
  | "Zephyr"
  | "Enceladus"
  | "Sadachbia"
  | "Rasalgethi"
  | "Achird";

export interface VoiceConfig {
  voiceName: AuraVoiceName;
  stylePrompt?: string;
}

export function selectVoice(opts?: {
  tone?: string;
  language?: string;
  gender?: string;
  isGreeting?: boolean;
  isExcited?: boolean;
  isCalm?: boolean;
}): VoiceConfig {
  if (!opts) return { voiceName: "Charon" };
  if (opts.isGreeting)
    return {
      voiceName: "Sulafat",
      stylePrompt: "Speak warmly and invitingly, like welcoming someone.",
    };
  if (opts.isExcited)
    return {
      voiceName: "Fenrir",
      stylePrompt: "Speak with energy and enthusiasm.",
    };
  if (opts.isCalm || opts.tone === "calm")
    return {
      voiceName: "Aoede",
      stylePrompt: "Speak in a relaxed, breezy manner.",
    };
  if (opts.tone === "frustrated")
    return {
      voiceName: "Sulafat",
      stylePrompt: "Speak gently and reassuringly.",
    };
  return {
    voiceName: "Charon",
    stylePrompt: "Speak confidently and informatively.",
  };
}

export function toSpeakable(text: string): string {
  return text
    .replace(/https?:\/\/\S+/g, "")
    .replace(/[*_`#>|~]/g, "")
    .replace(/—/g, ", ")
    .replace(/·/g, ", ")
    .replace(/\bK8s\b/gi, "Kubernetes")
    .replace(/\bAWS\b/g, "A.W.S.")
    .replace(/\bAPI\b/g, "A.P.I.")
    .replace(/\bAPIs\b/g, "A.P.I.s")
    .replace(/\bRAG\b/g, "retrieval augmented generation")
    .replace(/\bLLMs?\b/g, "large language model")
    .replace(/\bVP\b/g, "V.P.")
    .replace(/\bCTO\b/g, "C.T.O.")
    .replace(/\bCEO\b/g, "C.E.O.")
    .replace(/\bDeFi\b/gi, "decentralized finance")
    .replace(/\bNFTs?\b/g, "N.F.Ts")
    .replace(/\b50K\+?\b/g, "50 thousand")
    .replace(/99\.9%/g, "99 point 9 percent")
    .replace(/Next\.js/gi, "Next J.S.")
    .replace(/Node\.js/gi, "Node J.S.")
    .replace(/NestJS/gi, "Nest J.S.")
    .replace(/GraphQL/gi, "Graph Q.L.")
    .replace(/HIPAA/g, "H.I.P.A.A.")
    .replace(/\bC\+\+\b/g, "C plus plus")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function b64ToU8(b64: string): Uint8Array {
  const bin = atob(b64);
  const buf = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
  return buf;
}

function pcmToF32(bytes: Uint8Array): Float32Array {
  const n = bytes.length >> 1;
  const f = new Float32Array(n);
  const v = new DataView(bytes.buffer, bytes.byteOffset);
  for (let i = 0; i < n; i++) f[i] = v.getInt16(i * 2, true) / 32_768;
  return f;
}

let _audioCtx: AudioContext | null = null;
function getAudioCtx(): AudioContext {
  if (!_audioCtx || _audioCtx.state === "closed") {
    _audioCtx = new AudioContext({ sampleRate: TTS_RATE });
    auraD.setHealth("audioContext", "ok");
  }
  if (_audioCtx.state === "suspended")
    _audioCtx
      .resume()
      .catch(() => auraD.log("tts", "warn", "AudioContext resume failed"));
  return _audioCtx;
}

class TTSPlayer {
  private node: AudioBufferSourceNode | null = null;
  private gen = 0;
  private _isSpeaking = false;
  private _isGenerating = false;

  get isBusy(): boolean {
    return this._isSpeaking || this._isGenerating;
  }

  stop(): void {
    this.gen++;
    this._isSpeaking = false;
    this._isGenerating = false;
    try {
      this.node?.stop();
    } catch {}
    this.node?.disconnect();
    this.node = null;
    try {
      window.speechSynthesis?.cancel();
    } catch {}
    auraD.log("tts", "info", `Stopped (gen=${this.gen})`);
  }

  async speak(
    text: string,
    apiKey: string,
    onStart?: () => void,
    onEnd?: () => void,
    voiceConfig?: VoiceConfig,
  ): Promise<void> {
    this.stop();
    const myGen = ++this.gen;
    this._isGenerating = true;

    const callEnd = () => {
      if (this.gen === myGen) {
        this._isSpeaking = false;
        this._isGenerating = false;
        onEnd?.();
      }
    };
    const voice = voiceConfig?.voiceName ?? "Charon";
    const speakableText = voiceConfig?.stylePrompt
      ? `${voiceConfig.stylePrompt}\n\n${toSpeakable(text)}`
      : toSpeakable(text);

    auraD.log(
      "tts",
      "info",
      `Speaking (gen=${myGen}, voice=${voice}): "${text.slice(0, 50)}..."`,
    );
    auraD.increment("tts.attempts");

    // If no API key, go straight to browser fallback
    if (!apiKey) {
      auraD.log("tts", "info", "No API key — using browser TTS");
      this._isGenerating = false;
      await this._browserFallback(text, myGen, onStart, callEnd);
      return;
    }

    try {
      const { GoogleGenAI } = await import("@google/genai");
      if (this.gen !== myGen) return;

      const ai = new GoogleGenAI({ apiKey });

      const res = await ai.models.generateContent({
        model: TTS_MODEL,
        contents: [{ parts: [{ text: speakableText }] }],
        config: {
          responseModalities: ["AUDIO"],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } },
          },
        },
      });
      if (this.gen !== myGen) return;

      const data = res.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (!data) throw new Error("No audio data");

      auraD.setHealth("ttsEngine", "ok");
      const f32 = pcmToF32(b64ToU8(data));
      if (this.gen !== myGen) return;

      const ctx = getAudioCtx();
      const buf = ctx.createBuffer(1, f32.length, TTS_RATE);
      buf.copyToChannel(f32, 0);
      if (this.gen !== myGen) return;

      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.connect(ctx.destination);
      this.node = src;
      this._isGenerating = false;
      this._isSpeaking = true;

      await new Promise<void>((resolve) => {
        src.onended = () => {
          this.node = null;
          this._isSpeaking = false;
          callEnd();
          resolve();
        };
        onStart?.();
        src.start(0);
        auraD.increment("tts.successes");
      });
    } catch (err) {
      if (this.gen !== myGen) return;
      this._isGenerating = false;
      auraD.error("tts", err, "Gemini TTS failed");
      auraD.increment("tts.failures");

      const msg = err instanceof Error ? err.message.toLowerCase() : "";
      if (
        msg.includes("quota") ||
        msg.includes("429") ||
        msg.includes("api key") ||
        msg.includes("401")
      ) {
        auraD.setHealth("ttsEngine", "fallback");
      }

      await this._browserFallback(text, myGen, onStart, callEnd);
    }
  }

  private async _browserFallback(
    text: string,
    myGen: number,
    onStart?: () => void,
    onEnd?: () => void,
  ): Promise<void> {
    if (typeof window === "undefined" || !window.speechSynthesis) {
      onEnd?.();
      return;
    }
    if (this.gen !== myGen) return;

    return new Promise<void>((resolve) => {
      const u = new SpeechSynthesisUtterance(toSpeakable(text));
      u.rate = 0.92;
      u.pitch = 0.9;
      u.lang = "en-IN";

      // Wait for voices to load
      const setVoice = () => {
        const voices = window.speechSynthesis.getVoices();
        const v =
          voices.find(
            (v) =>
              v.lang === "en-IN" && !v.name.toLowerCase().includes("female"),
          ) ||
          voices.find((v) => v.lang === "en-IN") ||
          voices.find((v) => v.lang.startsWith("en-GB")) ||
          voices.find((v) => v.lang.startsWith("en")) ||
          null;
        if (v) u.voice = v;
      };

      if (window.speechSynthesis.getVoices().length > 0) {
        setVoice();
      } else {
        window.speechSynthesis.onvoiceschanged = setVoice;
      }

      u.onstart = () => {
        if (this.gen === myGen) {
          this._isSpeaking = true;
          onStart?.();
        }
      };
      u.onend = () => {
        this._isSpeaking = false;
        if (this.gen === myGen) onEnd?.();
        resolve();
      };
      u.onerror = (e) => {
        auraD.log("tts", "warn", `Browser TTS error: ${e.error}`);
        this._isSpeaking = false;
        if (this.gen === myGen) onEnd?.();
        resolve();
      };

      window.speechSynthesis.speak(u);
      auraD.log("tts", "info", "Browser fallback TTS");
      auraD.increment("tts.browser_fallbacks");
    });
  }
}

export const ttsPlayer = new TTSPlayer();
