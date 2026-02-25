import { getGenAI, TTS_MODEL } from "./gemini";

const TTS_SAMPLE_RATE = 24_000;
const TTS_VOICE = "Charon";

// ── Text cleanup ──────────────────────────────────────────────────────────────
export function toSpeakableText(text: string): string {
  return text
    .replace(/https?:\/\/\S+/g, "")
    .replace(/[*_`#>|]/g, "")
    .replace(/—/g, ", ")
    .replace(/·/g, ", ")
    .replace(/\bK8s\b/gi, "Kubernetes")
    .replace(/\bAWS\b/g, "Amazon Web Services")
    .replace(/\bAPI\b/g, "A.P.I.")
    .replace(/\bRAG\b/g, "retrieval augmented generation")
    .replace(/\bLLMs?\b/g, "large language models")
    .replace(/\bVP\b/g, "V.P.")
    .replace(/\bCTO\b/g, "C.T.O.")
    .replace(/\bCEO\b/g, "C.E.O.")
    .replace(/\bDeFi\b/gi, "decentralized finance")
    .replace(/\bNFTs?\b/g, "N.F.Ts")
    .replace(/50K\+?/g, "50 thousand plus")
    .replace(/99\.9%/g, "99 point 9 percent")
    .replace(/Next\.js/gi, "Next JS")
    .replace(/NestJS/gi, "Nest JS")
    .replace(/Node\.js/gi, "Node JS")
    .trim();
}

function buildTTSPrompt(text: string): string {
  return `# Aura — Voice of Amit Chakraborty
Confident, declarative, founder energy. Measured pace. Firm periods. Subtle Indian-educated inflection.

${toSpeakableText(text)}`.trim();
}

// ── Audio helpers ─────────────────────────────────────────────────────────────
function base64ToUint8(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function pcmInt16ToFloat32(bytes: Uint8Array): Float32Array {
  const samples = bytes.length >> 1;
  const f32 = new Float32Array(samples);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  for (let i = 0; i < samples; i++) {
    f32[i] = view.getInt16(i * 2, true) / 32_768;
  }
  return f32;
}

let _ctx: AudioContext | null = null;
function getAudioCtx(): AudioContext {
  if (!_ctx || _ctx.state === "closed") {
    _ctx = new AudioContext({ sampleRate: TTS_SAMPLE_RATE });
  }
  if (_ctx.state === "suspended") _ctx.resume().catch(() => {});
  return _ctx;
}

// ── Player class ──────────────────────────────────────────────────────────────
class TTSPlayer {
  private src: AudioBufferSourceNode | null = null;
  private abort: AbortController | null = null;

  stop(): void {
    this.abort?.abort();
    this.abort = null;
    try {
      this.src?.stop();
    } catch {}
    this.src?.disconnect();
    this.src = null;
  }

  async speak(
    text: string,
    onStart?: () => void,
    onEnd?: () => void,
  ): Promise<void> {
    this.stop();
    this.abort = new AbortController();
    const signal = this.abort.signal;

    try {
      const resp = await getGenAI().models.generateContent({
        model: TTS_MODEL,
        contents: [{ parts: [{ text: buildTTSPrompt(text) }] }],
        config: {
          responseModalities: ["AUDIO"],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: TTS_VOICE } },
          },
        },
      });

      if (signal.aborted) return;

      const inline = resp.candidates?.[0]?.content?.parts?.[0]?.inlineData;
      if (!inline?.data) throw new Error("No TTS audio data");

      const f32 = pcmInt16ToFloat32(base64ToUint8(inline.data));
      const ctx = getAudioCtx();
      const buf = ctx.createBuffer(1, f32.length, TTS_SAMPLE_RATE);
      buf.copyToChannel(f32, 0);

      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.connect(ctx.destination);
      this.src = src;

      await new Promise<void>((resolve) => {
        src.onended = () => {
          this.src = null;
          onEnd?.();
          resolve();
        };
        signal.addEventListener("abort", () => {
          try {
            src.stop();
          } catch {}
          this.src = null;
          onEnd?.();
          resolve();
        });
        onStart?.();
        src.start(0);
      });
    } catch (err: unknown) {
      if (signal.aborted || (err instanceof Error && err.name === "AbortError"))
        return;
      console.warn("[TTS] Gemini failed, browser fallback:", err);
      onEnd?.();
      await this._browserFallback(text, onStart, onEnd);
    }
  }

  private async _browserFallback(
    text: string,
    onStart?: () => void,
    onEnd?: () => void,
  ): Promise<void> {
    if (!window.speechSynthesis) {
      onEnd?.();
      return;
    }
    return new Promise<void>((resolve) => {
      const u = new SpeechSynthesisUtterance(toSpeakableText(text));
      u.rate = 0.92;
      u.pitch = 0.95;
      u.onstart = () => onStart?.();
      u.onend = () => {
        onEnd?.();
        resolve();
      };
      u.onerror = () => {
        onEnd?.();
        resolve();
      };
      window.speechSynthesis.speak(u);
    });
  }
}

export const ttsPlayer = new TTSPlayer();
