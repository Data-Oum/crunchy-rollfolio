/**
 * src/lib/diagnostics.ts
 *
 * Aura Diagnostics Engine — tracks everything.
 * Console: window.__aura_diag.getReport()
 */

export type DiagModule =
  | "gemini"
  | "tts"
  | "sr"
  | "voice"
  | "store"
  | "orb"
  | "network"
  | "profiler"
  | "system"
  | "supabase"
  | "fallback";
export type DiagLevel = "info" | "warn" | "error" | "fatal";

export interface DiagEntry {
  ts: number;
  module: DiagModule;
  level: DiagLevel;
  message: string;
  data?: unknown;
}

export interface HealthStatus {
  geminiApi: "ok" | "degraded" | "down" | "unknown";
  ttsEngine: "ok" | "fallback" | "down" | "unknown";
  speechRecognition: "ok" | "unsupported" | "denied" | "unknown";
  network: "online" | "offline" | "unknown";
  audioContext: "ok" | "suspended" | "closed" | "unknown";
  supabase: "ok" | "down" | "unknown";
  fallbackAI: "standby" | "active" | "unknown";
}

const MAX_ENTRIES = 300;

class AuraDiagnostics {
  private entries: DiagEntry[] = [];
  health: HealthStatus = {
    geminiApi: "unknown",
    ttsEngine: "unknown",
    speechRecognition: "unknown",
    network:
      typeof navigator !== "undefined" && navigator.onLine
        ? "online"
        : "unknown",
    audioContext: "unknown",
    supabase: "unknown",
    fallbackAI: "standby",
  };
  counters: Record<string, number> = {};
  lastErrors: Record<string, string | null> = {};
  private startTime = Date.now();

  constructor() {
    if (typeof window !== "undefined") {
      window.addEventListener("online", () =>
        this.setHealth("network", "online"),
      );
      window.addEventListener("offline", () =>
        this.setHealth("network", "offline"),
      );
    }
  }

  log(
    module: DiagModule,
    level: DiagLevel,
    message: string,
    data?: unknown,
  ): void {
    this.entries.push({ ts: Date.now(), module, level, message, data });
    if (this.entries.length > MAX_ENTRIES)
      this.entries = this.entries.slice(-MAX_ENTRIES);
    const key = `${module}.${level}`;
    this.counters[key] = (this.counters[key] || 0) + 1;

    const styles: Record<DiagLevel, string> = {
      info: "color:#7B2FBE",
      warn: "color:#F47521;font-weight:bold",
      error: "color:#ef4444;font-weight:bold",
      fatal:
        "color:#fff;background:#ef4444;font-weight:bold;padding:2px 6px;border-radius:3px",
    };
    const prefix = `[Aura:${module}]`;
    if (level === "error" || level === "fatal") {
      console.error(`%c${prefix} ${message}`, styles[level], data ?? "");
      this.lastErrors[module] = message;
    } else if (level === "warn") {
      console.warn(`%c${prefix} ${message}`, styles[level], data ?? "");
    } else {
      console.log(`%c${prefix} ${message}`, styles[level], data ?? "");
    }
  }

  error(module: DiagModule, err: unknown, context?: string): void {
    const msg = err instanceof Error ? err.message : String(err);
    this.log(module, "error", context ? `${context}: ${msg}` : msg, {
      stack: err instanceof Error ? err.stack?.slice(0, 400) : undefined,
    });
  }

  setHealth<K extends keyof HealthStatus>(
    key: K,
    value: HealthStatus[K],
  ): void {
    const prev = this.health[key];
    this.health[key] = value;
    if (prev !== value)
      this.log(
        "system",
        "info",
        `Health: ${key} ${String(prev)} → ${String(value)}`,
      );
  }

  increment(key: string): void {
    this.counters[key] = (this.counters[key] || 0) + 1;
  }

  getReport() {
    return {
      uptime: Date.now() - this.startTime,
      health: { ...this.health },
      counters: { ...this.counters },
      lastErrors: { ...this.lastErrors },
      recentEntries: this.entries.slice(-25),
    };
  }

  getEntries(module?: DiagModule, limit = 50): DiagEntry[] {
    const e = module
      ? this.entries.filter((x) => x.module === module)
      : this.entries;
    return e.slice(-limit);
  }
}

export const auraD = new AuraDiagnostics();
if (typeof window !== "undefined") (window as any).__aura_diag = auraD;
