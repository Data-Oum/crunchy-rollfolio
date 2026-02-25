/**
 * src/hooks/useVoiceProfiler.ts
 * Analyzes voice characteristics via Web Audio API. Non-invasive: no audio stored.
 */
import { auraD } from "@/lib/diagnostics";
import { useCallback, useRef } from "react";

export interface VoiceProfile {
  avgPitchHz: number;
  pitchRange: [number, number];
  estimatedGender: "male" | "female" | "neutral" | "unknown";
  avgEnergyDb: number;
  energyVariance: number;
  estimatedTone: "calm" | "excited" | "neutral" | "frustrated" | "unknown";
  detectedLanguage: string;
  languageConfidence: number;
  avgSpeakingRate: number;
  sessionCount: number;
  preferredTopics: string[];
  avgMessageLength: number;
  interactionStyle:
    | "concise"
    | "detailed"
    | "questioning"
    | "exploring"
    | "unknown";
  pitchSamples: number[];
  energySamples: number[];
}

const DEFAULT: VoiceProfile = {
  avgPitchHz: 0,
  pitchRange: [0, 0],
  estimatedGender: "unknown",
  avgEnergyDb: 0,
  energyVariance: 0,
  estimatedTone: "unknown",
  detectedLanguage: "en",
  languageConfidence: 0,
  avgSpeakingRate: 0,
  sessionCount: 0,
  preferredTopics: [],
  avgMessageLength: 0,
  interactionStyle: "unknown",
  pitchSamples: [],
  energySamples: [],
};

function detectPitch(buf: Float32Array, sr: number): number {
  const SIZE = buf.length;
  const minP = Math.floor(sr / 600),
    maxP = Math.floor(sr / 50);
  let bestC = -1,
    bestO = -1;
  for (let off = minP; off < Math.min(maxP, SIZE / 2); off++) {
    let c = 0,
      n1 = 0,
      n2 = 0;
    for (let i = 0; i < SIZE - off; i++) {
      c += buf[i] * buf[i + off];
      n1 += buf[i] ** 2;
      n2 += buf[i + off] ** 2;
    }
    const norm = Math.sqrt(n1 * n2);
    if (norm > 0) c /= norm;
    if (c > 0.15 && c > bestC) {
      bestC = c;
      bestO = off;
    }
  }
  return bestO === -1 ? 0 : sr / bestO;
}

function rmsDb(buf: Float32Array): number {
  let s = 0;
  for (let i = 0; i < buf.length; i++) s += buf[i] ** 2;
  const rms = Math.sqrt(s / buf.length);
  return rms > 0 ? 20 * Math.log10(rms) : -100;
}

export function useVoiceProfiler() {
  const prof = useRef<VoiceProfile>({ ...DEFAULT });
  const ctxRef = useRef<AudioContext | null>(null);
  const srcRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef(0);
  const activeRef = useRef(false);
  const msgStats = useRef({ lengths: [] as number[], questions: 0, total: 0 });

  const startAnalysis = useCallback(async () => {
    if (activeRef.current) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
      });
      streamRef.current = stream;
      const ctx = new AudioContext({ sampleRate: 44100 });
      ctxRef.current = ctx;
      const src = ctx.createMediaStreamSource(stream);
      srcRef.current = src;
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 4096;
      analyserRef.current = analyser;
      src.connect(analyser);
      activeRef.current = true;
      const buf = new Float32Array(analyser.fftSize);

      const loop = () => {
        if (!activeRef.current) return;
        analyser.getFloatTimeDomainData(buf);
        const e = rmsDb(buf);
        if (e > -50) {
          const pitch = detectPitch(buf, ctx.sampleRate);
          const p = prof.current;
          if (pitch > 50 && pitch < 600) {
            p.pitchSamples.push(pitch);
            if (p.pitchSamples.length > 500)
              p.pitchSamples = p.pitchSamples.slice(-500);
          }
          p.energySamples.push(e);
          if (p.energySamples.length > 500)
            p.energySamples = p.energySamples.slice(-500);
        }
        rafRef.current = requestAnimationFrame(loop);
      };
      loop();
      auraD.log("profiler", "info", "Voice analysis started");
    } catch (err) {
      auraD.error("profiler", err, "Mic access failed");
    }
  }, []);

  const stopAnalysis = useCallback(() => {
    activeRef.current = false;
    cancelAnimationFrame(rafRef.current);
    try {
      srcRef.current?.disconnect();
    } catch {}
    try {
      ctxRef.current?.close();
    } catch {}
    streamRef.current?.getTracks().forEach((t) => t.stop());
    srcRef.current = null;
    ctxRef.current = null;
    streamRef.current = null;

    const p = prof.current;
    if (p.pitchSamples.length > 10) {
      const sorted = [...p.pitchSamples].sort((a, b) => a - b);
      p.avgPitchHz = sorted.reduce((a, b) => a + b, 0) / sorted.length;
      p.pitchRange = [
        sorted[Math.floor(sorted.length * 0.1)],
        sorted[Math.floor(sorted.length * 0.9)],
      ];
      p.estimatedGender =
        p.avgPitchHz < 150 ? "male" : p.avgPitchHz > 200 ? "female" : "neutral";
    }
    if (p.energySamples.length > 10) {
      p.avgEnergyDb =
        p.energySamples.reduce((a, b) => a + b, 0) / p.energySamples.length;
      p.energyVariance = Math.sqrt(
        p.energySamples.reduce((s, e) => s + (e - p.avgEnergyDb) ** 2, 0) /
          p.energySamples.length,
      );
      p.estimatedTone =
        p.energyVariance > 15 && p.avgEnergyDb > -25
          ? "excited"
          : p.energyVariance < 5 && p.avgEnergyDb < -35
            ? "calm"
            : p.energyVariance > 12
              ? "frustrated"
              : "neutral";
    }
    p.sessionCount++;
    auraD.log(
      "profiler",
      "info",
      `Analysis done: gender=${p.estimatedGender} pitch=${Math.round(p.avgPitchHz)}Hz tone=${p.estimatedTone}`,
    );
  }, []);

  const trackMessage = useCallback((text: string, lang?: string) => {
    const s = msgStats.current;
    s.lengths.push(text.length);
    s.total++;
    if (text.includes("?")) s.questions++;
    const p = prof.current;
    p.avgMessageLength =
      s.lengths.reduce((a, b) => a + b, 0) / s.lengths.length;
    p.interactionStyle =
      p.avgMessageLength < 20
        ? "concise"
        : p.avgMessageLength > 80
          ? "detailed"
          : s.total > 0 && s.questions / s.total > 0.5
            ? "questioning"
            : "exploring";
    if (lang) {
      p.detectedLanguage = lang;
      p.languageConfidence = Math.min(1, p.languageConfidence + 0.1);
    }
  }, []);

  const getProfileContext = useCallback((): string => {
    const p = prof.current;
    const parts: string[] = [];
    if (p.estimatedGender !== "unknown")
      parts.push(
        `Voice: ${p.estimatedGender} (~${Math.round(p.avgPitchHz)}Hz)`,
      );
    if (p.estimatedTone !== "unknown") parts.push(`Tone: ${p.estimatedTone}`);
    if (p.interactionStyle !== "unknown")
      parts.push(`Style: ${p.interactionStyle}`);
    return parts.length ? `\n[VOICE PROFILE]\n${parts.join(" | ")}` : "";
  }, []);

  return {
    startAnalysis,
    stopAnalysis,
    trackMessage,
    getProfileContext,
    profileRef: prof,
  };
}
