import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { GoogleGenAI } from "npm:@google/genai";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SUMMARY_CONTEXT = `
# AUDIO PROFILE: AURA
## "The Memory Keeper"

[PERSONA]
You are AURA's analytical subsystem. You summarize conversations with precision and elegance.

### DIRECTOR'S NOTES
Style:
- Professional, concise, and insightful.
- Tone: Informative and calm (Callirrhoe voice).
- Pace: Even.

[TASK]
Provide a 1-sentence summary of the visitor's needs in under 30 words.
`.trim();

// ── WAV Header Helper ───────────────────────────────────────────────────────
function addWavHeader(pcmBase64: string, sampleRate = 24000): string {
  const binaryString = atob(pcmBase64);
  const pcmData = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    pcmData[i] = binaryString.charCodeAt(i);
  }

  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const wavHeader = new ArrayBuffer(44);
  const view = new DataView(wavHeader);

  view.setUint32(0, 0x52494646, false);
  view.setUint32(4, 36 + pcmData.length, true);
  view.setUint32(8, 0x57415645, false);
  view.setUint32(12, 0x666d7420, false);
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);
  view.setUint32(36, 0x64617461, false);
  view.setUint32(40, pcmData.length, true);

  const finalBuffer = new Uint8Array(44 + pcmData.length);
  finalBuffer.set(new Uint8Array(wavHeader), 0);
  finalBuffer.set(pcmData, 44);

  let outStr = "";
  for (let i = 0; i < finalBuffer.length; i++) {
    outStr += String.fromCharCode(finalBuffer[i]);
  }
  return btoa(outStr);
}

// ── Gemini call with hard timeout ────────────────────────────────────────────
async function callGemini(
  requestBody: object,
  apiKey: string,
  timeoutMs = 15000,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      },
    );
    clearTimeout(timer);
    return res;
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, userName } = await req.json();
    const VITE_GEMINI_KEY = Deno.env.get("VITE_GEMINI_KEY");
    if (!VITE_GEMINI_KEY) throw new Error("API Key missing");

    if (!Array.isArray(messages) || messages.length < 2) {
      return new Response(JSON.stringify({ summary: "", audio: "" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const transcript = messages
      .slice(-10)
      .filter((m) => m?.text)
      .map((m) => `${m.role === "user" ? "Visitor" : "Aura"}: ${m.text}`)
      .join("\n");

    const name = userName || "this visitor";
    const prompt = `Conversation:\n${transcript}\n\nSummarize what ${name} needs from Amit in 1 sentence.`;

    const genAI = new GoogleGenAI(VITE_GEMINI_KEY);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash-preview-tts",
      systemInstruction: SUMMARY_CONTEXT,
    });

    console.log("[AuraSummary] Calling Gemini SDK...");
    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        maxOutputTokens: 100,
        temperature: 0.65,
        responseModalities: ["TEXT", "AUDIO"],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: "Callirrhoe" },
          },
        },
      },
    });

    const data = result.response;
    const parts = data?.candidates?.[0]?.content?.parts || [];
    const summary = parts.find((p: any) => p.text)?.text?.trim() || "";
    const pcmAudio =
      parts.find((p: any) => p.inlineData)?.inlineData?.data || "";
    const audio = pcmAudio ? addWavHeader(pcmAudio) : "";

    return new Response(JSON.stringify({ summary, audio }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("[AuraSummary] FATAL:", e);
    return new Response(JSON.stringify({ summary: "", error: e.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
