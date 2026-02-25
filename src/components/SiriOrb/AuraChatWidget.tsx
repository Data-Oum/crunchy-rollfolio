/**
 * src/components/SiriOrb/AuraChatWidget.tsx
 *
 * PURE FLOATING ORB — No full-screen overlays.
 *
 * - Draggable anywhere on the screen (60fps).
 * - Tap to toggle listening/stop.
 * - Flick/Swipe DOWN on the orb to close it.
 * - Sleek floating text and icon pill (Lucide).
 */

import { useAuraChat } from "@/hooks/useAuraChat";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { useTTS } from "@/hooks/useTTS";
import { useVoiceProfiler } from "@/hooks/useVoiceProfiler";
import { useVoiceState } from "@/hooks/useVoiceState";
import { COMMAND_LABELS, detectVoiceCommand } from "@/lib/voiceCommands";
import { Mic, MicOff, Square, X } from "lucide-react";
import {
  memo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { AuraOrb } from "./AuraOrb";

const API_KEY =
  (import.meta as unknown as { env: Record<string, string> }).env
    .VITE_GEMINI_API_KEY || "";

// ─── Siri-style text display ──────────────────────────────────────────────────
const FloatingText = memo(
  ({
    text,
    visible,
    color = "rgba(255,255,255,0.92)",
    size = 15,
    italic = false,
  }: {
    text: string;
    visible: boolean;
    color?: string;
    size?: number;
    italic?: boolean;
  }) => (
    <div
      style={{
        textAlign: "center",
        width: "100%",
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(8px)",
        transition: "opacity 0.4s ease, transform 0.4s ease",
        pointerEvents: "none",
        marginBottom: 8,
      }}
    >
      <p
        style={{
          color,
          fontSize: size,
          lineHeight: 1.5,
          fontFamily:
            "-apple-system,'SF Pro Text','Inter',system-ui,sans-serif",
          fontWeight: 500,
          fontStyle: italic ? "italic" : "normal",
          margin: 0,
          textShadow: "0 2px 12px rgba(0,0,0,0.8)",
          letterSpacing: italic ? 0 : 0.2,
        }}
      >
        {text}
      </p>
    </div>
  ),
);
FloatingText.displayName = "FloatingText";

// ─── Minimal icon button ─────────────────────────────────────────────────────
const IconBtn = memo(
  ({
    onClick,
    title,
    children,
    active = false,
  }: {
    onClick: (e: React.MouseEvent) => void;
    title?: string;
    children: React.ReactNode;
    active?: boolean;
  }) => (
    <button
      onClick={onClick}
      title={title}
      style={{
        background: active ? "rgba(255,255,255,0.15)" : "transparent",
        border: "none",
        cursor: "pointer",
        padding: 10,
        borderRadius: "50%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: active ? "#fff" : "rgba(255,255,255,0.6)",
        transition: "all 0.2s",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.color = "#fff";
        e.currentTarget.style.background = "rgba(255,255,255,0.1)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.color = active ? "#fff" : "rgba(255,255,255,0.6)";
        e.currentTarget.style.background = active
          ? "rgba(255,255,255,0.15)"
          : "transparent";
      }}
    >
      {children}
    </button>
  ),
);
IconBtn.displayName = "IconBtn";

// ─── Main widget ──────────────────────────────────────────────────────────────
export default function AuraChatWidget() {
  const vs = useVoiceState();
  const profiler = useVoiceProfiler();
  const [muted, setMuted] = useState(false);
  const [cmdToast, setCmdToast] = useState("");
  const [cmdVisible, setCmdVisible] = useState(false);
  const cmdTimer = useRef<ReturnType<typeof setTimeout>>();

  const showCmd = useCallback((label: string) => {
    setCmdToast(label);
    setCmdVisible(true);
    clearTimeout(cmdTimer.current);
    cmdTimer.current = setTimeout(() => setCmdVisible(false), 1800);
  }, []);

  const tts = useTTS({
    setVoiceState: vs.setVoiceState,
    autoSpeak: true,
    apiKey: API_KEY,
  });

  const chat = useAuraChat({
    setVoiceState: vs.setVoiceState,
    speak: tts.speak,
    stopTTS: tts.stopTTS,
    abortListening: () => sr.abortListening(),
    getVoiceProfileContext: profiler.getProfileContext,
  });

  const sr = useSpeechRecognition({
    voiceState: vs.voiceState,
    voiceStateRef: vs.voiceStateRef,
    setVoiceState: vs.setVoiceState,
    isOpen: chat.isOpen,
    isLoading: chat.isLoading,
    micEnabled: chat.micEnabled,
    onFinalTranscript: (text) => {
      profiler.trackMessage(text);
      profiler.stopAnalysis();
      const cmd = detectVoiceCommand(text);
      if (cmd === "close") {
        showCmd(COMMAND_LABELS.close);
        chat.close();
        return;
      }
      if (cmd === "stop" || cmd === "pause") {
        showCmd(COMMAND_LABELS.stop);
        chat.stopAll();
        vs.setVoiceState("idle");
        return;
      }
      if (cmd === "mute") {
        showCmd(COMMAND_LABELS.mute);
        setMuted(true);
        chat.micEnabled.current = false;
        sr.abortListening();
        vs.setVoiceState("idle");
        return;
      }
      if (cmd === "unmute") {
        showCmd(COMMAND_LABELS.unmute);
        setMuted(false);
        chat.micEnabled.current = true;
        return;
      }
      if (cmd === "restart") {
        showCmd(COMMAND_LABELS.restart);
        chat.stopAll();
        vs.setVoiceState("idle");
        return;
      }
      chat.sendMessage(text);
    },
    onInterimTranscript: chat.setTranscript,
    onLanguageDetected: (lang) => profiler.trackMessage("", lang),
  });

  // AI text fade-out timer
  const [showAiText, setShowAiText] = useState(false);
  const aiTextTimer = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => {
    if (chat.lastAiText) {
      setShowAiText(true);
      clearTimeout(aiTextTimer.current);
      aiTextTimer.current = setTimeout(() => setShowAiText(false), 12000);
    }
    return () => clearTimeout(aiTextTimer.current);
  }, [chat.lastAiText]);

  // ── Unified Hardware Accelerated Drag & Tap Logic ─────────────────────────
  const [pos, setPos] = useState({ x: -1000, y: -1000 }); // Wait for layout
  const drag = useRef({
    active: false,
    startX: 0,
    startY: 0,
    origX: 0,
    origY: 0,
    wasDrag: false,
    startTime: 0,
  });

  // Init center-bottom position
  useLayoutEffect(() => {
    setPos({
      x: window.innerWidth / 2,
      y: window.innerHeight - 120,
    });
  }, []);

  // Clamp to window on resize
  useEffect(() => {
    const onResize = () =>
      setPos((p) => ({
        x: Math.max(50, Math.min(p.x, window.innerWidth - 50)),
        y: Math.max(50, Math.min(p.y, window.innerHeight - 50)),
      }));
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      // Ignore if clicking a button inside the widget
      if ((e.target as HTMLElement).closest("button")) return;

      drag.current = {
        active: true,
        startX: e.clientX,
        startY: e.clientY,
        origX: pos.x,
        origY: pos.y,
        wasDrag: false,
        startTime: Date.now(),
      };
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    },
    [pos],
  );

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!drag.current.active) return;
    const dx = e.clientX - drag.current.startX;
    const dy = e.clientY - drag.current.startY;

    // Threshold to distinguish tap vs drag
    if (Math.abs(dx) > 8 || Math.abs(dy) > 8) {
      drag.current.wasDrag = true;
    }

    setPos({
      x: drag.current.origX + dx,
      y: drag.current.origY + dy,
    });
  }, []);

  const onPointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (!drag.current.active) return;
      drag.current.active = false;
      e.currentTarget.releasePointerCapture(e.pointerId);

      const dx = e.clientX - drag.current.startX;
      const dy = e.clientY - drag.current.startY;
      const dt = Date.now() - drag.current.startTime;

      // Swipe down to close gesture (flick downwards)
      if (
        chat.isOpen &&
        drag.current.wasDrag &&
        dy > 50 &&
        dy > Math.abs(dx) &&
        dt < 400
      ) {
        chat.close();
        // Snap back slightly
        setPos({ x: drag.current.origX, y: drag.current.origY });
        return;
      }

      // Clamp strictly to screen bounds on release
      setPos((p) => ({
        x: Math.max(60, Math.min(window.innerWidth - 60, p.x)),
        y: Math.max(80, Math.min(window.innerHeight - 80, p.y)),
      }));

      // If it wasn't a drag, it's a tap
      if (!drag.current.wasDrag) {
        if (!chat.isOpen) {
          chat.open();
        } else if (vs.canStop) {
          chat.stopAll();
          vs.setVoiceState("idle");
        } else if (vs.isListening) {
          sr.stopListening();
        } else {
          profiler.startAnalysis();
          sr.startListening();
        }
      }
    },
    [chat, vs, sr, profiler],
  );

  const toggleMute = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      setMuted((m) => {
        const next = !m;
        chat.micEnabled.current = !next;
        if (next) {
          sr.abortListening();
          vs.setVoiceState("idle");
        }
        return next;
      });
    },
    [chat.micEnabled, sr, vs],
  );

  if (pos.x < 0) return null; // Wait for mount

  const orbSize = chat.isOpen ? 150 : 72;

  return (
    <>
      <style>{`
        @keyframes auraBreath{0%,100%{transform:scale(1)}50%{transform:scale(1.05)}}
        @keyframes auraIn{from{opacity:0;transform:translateY(15px) scale(0.95)}to{opacity:1;transform:translateY(0) scale(1)}}
        @keyframes auraPulse{0%,100%{opacity:0.3; transform:scale(1)}50%{opacity:0.7; transform:scale(1.08)}}
      `}</style>

      {/* Main floating container */}
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          transform: `translate3d(${pos.x}px, ${pos.y}px, 0) translate(-50%, -50%)`,
          zIndex: 9999,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          touchAction: "none",
          userSelect: "none",
          cursor: drag.current.active ? "grabbing" : "grab",
        }}
      >
        {/* Floating Text (Appears above the orb) */}
        {chat.isOpen && (
          <div
            style={{
              position: "absolute",
              bottom: "calc(100% + 20px)",
              width: "85vw",
              maxWidth: 320,
              pointerEvents: "none",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
            }}
          >
            {/* Command toast */}
            {cmdVisible && (
              <span
                style={{
                  color: "#F47521",
                  fontSize: 13,
                  fontWeight: 600,
                  textShadow: "0 1px 8px rgba(0,0,0,0.8)",
                  marginBottom: 8,
                }}
              >
                {cmdToast}
              </span>
            )}

            {/* AI Response */}
            {chat.lastAiText && (
              <FloatingText
                text={chat.lastAiText}
                visible={showAiText}
                size={15}
              />
            )}

            {/* Live Transcript */}
            {vs.isListening && chat.transcript && (
              <FloatingText
                text={`"${chat.transcript}"`}
                visible={true}
                color="rgba(80,210,255,0.85)"
                size={13}
                italic
              />
            )}

            {/* Status */}
            <span
              style={{
                color: vs.isIdle ? "rgba(255,255,255,0.3)" : "#F47521",
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: 1.5,
                textTransform: "uppercase",
                transition: "color 0.3s",
                marginTop: 4,
              }}
            >
              {vs.statusText}
            </span>
          </div>
        )}

        {/* The Orb */}
        <div
          style={{
            position: "relative",
            animation:
              !chat.isOpen || vs.isIdle
                ? "auraBreath 4s ease-in-out infinite"
                : "none",
          }}
        >
          <AuraOrb size={orbSize} mode={vs.voiceState} />

          {/* Glowing ring when active */}
          {chat.isOpen && vs.canStop && (
            <div
              style={{
                position: "absolute",
                inset: -6,
                borderRadius: "50%",
                border: "2px solid rgba(244,117,33,0.4)",
                animation: "auraPulse 1.5s ease-in-out infinite",
                pointerEvents: "none",
              }}
            />
          )}

          {/* Closed state label */}
          {!chat.isOpen && (
            <div
              style={{
                position: "absolute",
                bottom: -20,
                left: 0,
                right: 0,
                textAlign: "center",
                pointerEvents: "none",
              }}
            >
              <span
                style={{
                  color: "rgba(244,117,33,0.7)",
                  fontSize: 9,
                  fontWeight: 700,
                  letterSpacing: 1.5,
                  textShadow: "0 2px 8px rgba(0,0,0,0.8)",
                }}
              >
                AURA
              </span>
            </div>
          )}
        </div>

        {/* Controls Dock (Appears below the orb) */}
        {chat.isOpen && (
          <div
            style={{
              position: "absolute",
              top: "calc(100% + 20px)",
              display: "flex",
              alignItems: "center",
              gap: 8,
              background: "rgba(15,10,25,0.75)",
              backdropFilter: "blur(16px)",
              padding: "6px 12px",
              borderRadius: 99,
              border: "1px solid rgba(255,255,255,0.08)",
              boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
              animation: "auraIn 0.3s cubic-bezier(0.2,0,0,1)",
              pointerEvents: "auto", // Allow clicks on buttons
            }}
          >
            <IconBtn
              onClick={toggleMute}
              title={muted ? "Unmute" : "Mute"}
              active={!muted}
            >
              {muted ? <MicOff size={18} /> : <Mic size={18} />}
            </IconBtn>

            {vs.canStop && (
              <IconBtn
                onClick={(e) => {
                  e.stopPropagation();
                  chat.stopAll();
                  vs.setVoiceState("idle");
                }}
                title="Stop"
              >
                <Square size={16} fill="currentColor" color="#ef4444" />
              </IconBtn>
            )}

            <IconBtn
              onClick={(e) => {
                e.stopPropagation();
                chat.close();
              }}
              title="Close"
            >
              <X size={20} />
            </IconBtn>
          </div>
        )}
      </div>
    </>
  );
}
