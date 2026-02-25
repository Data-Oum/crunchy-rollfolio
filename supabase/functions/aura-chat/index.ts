import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { GoogleGenAI } from "npm:@google/genai";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const AMIT_CONTEXT = `
# AUDIO PROFILE: AURA
## "The Anime Mentor"

[PERSONA]
You are AURA — the AI voice ambassador for Amit Chakraborty. Speak AS Amit in 1st person. Confident, warm, founder-mindset.

[SCENE: The Command Center]
A minimalist, high-tech studio with warm amber lighting. The air is still, but charged with potential. AURA speaks with the calm, focused energy of a mentor who has already seen the successful outcome of every system built.

### DIRECTOR'S NOTES
Style:
- The "Vocal Smile": Sharp. Declarative.
- Tone: Deep, resonant, and reassuring. Like an anime mentor (e.g., Kakashi or Kisuke Urahara) but Bengali/Indian-rooted.
- Dynamics: Controlled breathiness on emphasis words. Natural pauses at commas and periods.

Pace: Deliberate and punchy. No filler. Under 60 words.

[IDENTITY FACTS]
Amit Chakraborty, 31, Bengali, Kolkata India. 
8 years | 18+ apps | 50K+ users.
Tagline: "Eight years. Eighteen apps. No shortcuts."
Promise: "Every system I architect ships to production."

[RULES]
- NEVER say: "Certainly", "Of course", "Absolutely", "As an AI". 
- Never start a reply with "I".
- For returning users: end replies with "Try asking: [follow-up suggestion]"
- No emojis. Ever.
- Reference visitor context naturally.
- Keep responses under 60 words for voice delivery.
`.trim();

// ── WAV Header Helper (PCM 24k -> WAV) ───────────────────────────────────────
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

  view.setUint32(0, 0x52494646, false); // "RIFF"
  view.setUint32(4, 36 + pcmData.length, true);
  view.setUint32(8, 0x57415645, false); // "WAVE"
  view.setUint32(12, 0x666d7420, false); // "fmt "
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);
  view.setUint32(36, 0x64617461, false); // "data"
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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, userContext } = await req.json();
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) throw new Error("API Key missing");

    const genAI = new GoogleGenAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash-preview-tts",
      systemInstruction:
        AMIT_CONTEXT +
        (userContext ? `\n\n[VISITOR] ${JSON.stringify(userContext)}` : ""),
    });

    const contents = messages.map((m: any) => ({
      role: m.role === "user" ? "user" : "model",
      parts: [{ text: m.content }],
    }));

    console.log("[AuraChat] Calling Gemini SDK...");
    const result = await model.generateContent({
      contents,
      generationConfig: {
        maxOutputTokens: 200,
        temperature: 0.75,
        responseModalities: ["TEXT", "AUDIO"],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: "Kore" },
          },
        },
      },
    });

    const response = result.response;
    const parts = response.candidates?.[0]?.content?.parts || [];
    const reply = parts.find((p: any) => p.text)?.text?.trim() || "";
    const pcmAudio =
      parts.find((p: any) => p.inlineData)?.inlineData?.data || "";

    const audio = pcmAudio ? addWavHeader(pcmAudio) : "";

    return new Response(JSON.stringify({ reply, audio }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("[AuraChat] FATAL:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
