/**
 * src/lib/voiceCommands.ts
 * Detects control commands in voice transcripts before sending to AI.
 */

export type VoiceCommand =
  | "stop"
  | "close"
  | "mute"
  | "unmute"
  | "pause"
  | "restart"
  | null;

const COMMAND_MAP: Array<{ cmd: VoiceCommand; patterns: RegExp[] }> = [
  {
    cmd: "close",
    patterns: [
      /\b(close|exit|quit|goodbye|bye|end|finish|done|terminate|shut.?down|get.?out|leave|dismiss)\b/i,
      /\b(end.?(the.?)?(chat|session|call|conversation|this))\b/i,
      /\b(close.?(the.?)?(chat|app|window|this))\b/i,
      /\b(that.?'?s?.?(all|enough|it))\b/i,
      /\b(i.?'?m?.?(done|finished|leaving|going))\b/i,
      /\bsee\s+you\b/i,
      /\btalk\s+later\b/i,
    ],
  },
  {
    cmd: "stop",
    patterns: [
      /\b(stop|halt|cancel|abort|silence|quiet|shush|hush|enough|no.?more)\b/i,
      /\b(stop.?(talking|speaking|it|that|now|please))\b/i,
      /\b(shut.?up|be.?quiet)\b/i,
      /\b(ok.?stop|okay.?stop|please.?stop)\b/i,
      /\b(that.?'?s?.?enough)\b/i,
    ],
  },
  {
    cmd: "pause",
    patterns: [/\b(pause|hold.?on|wait|one.?sec|just.?a.?moment|hold.?up)\b/i],
  },
  {
    cmd: "mute",
    patterns: [
      /\b(mute|mute.?(the.?)?mic|turn.?off.?(the.?)?mic|disable.?mic|mic.?off)\b/i,
      /\b(stop.?listening|don.?t.?listen)\b/i,
    ],
  },
  {
    cmd: "unmute",
    patterns: [
      /\b(unmute|turn.?on.?(the.?)?mic|enable.?mic|mic.?on|start.?listening)\b/i,
    ],
  },
  {
    cmd: "restart",
    patterns: [
      /\b(restart|reset|start.?over|begin.?again|try.?again|fresh.?start)\b/i,
    ],
  },
];

export function detectVoiceCommand(transcript: string): VoiceCommand {
  if (!transcript?.trim()) return null;

  const cleaned = transcript
    .toLowerCase()
    .replace(
      /\b(um|uh|er|ah|like|you know|hey|ok|okay|so|well|please|just|can you|could you|i want you to|aura)\b/gi,
      " ",
    )
    .replace(/\s{2,}/g, " ")
    .trim();

  // Only match commands in short phrases (<= 10 words)
  if (cleaned.split(/\s+/).length > 10) return null;

  for (const { cmd, patterns } of COMMAND_MAP) {
    for (const pattern of patterns) {
      if (pattern.test(cleaned)) return cmd;
    }
  }

  return null;
}

export const COMMAND_LABELS: Record<NonNullable<VoiceCommand>, string> = {
  stop: "Stopped",
  close: "Session ended",
  mute: "Mic muted",
  unmute: "Mic active",
  pause: "Paused",
  restart: "Restarting...",
};
