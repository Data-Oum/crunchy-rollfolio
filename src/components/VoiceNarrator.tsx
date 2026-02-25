import { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

const NARRATIONS = [
  { trigger: "intro", text: "Welcome to CrunchFolio. Where cursed energy meets pure obsession." },
  { trigger: "anime", text: "These aren't just shows. They're the reason I stay up until 3 AM." },
  { trigger: "jjk", text: "Jujutsu Kaisen. Gojo Satoru is the strongest. No debate." },
  { trigger: "journey", text: "From Dragon Ball Z to Shibuya Incident. What a ride." },
  { trigger: "bye", text: "May your watchlist never end. Until next time, weeb." },
];

export const VoiceNarrator = () => {
  const [isActive, setIsActive] = useState(false);
  const [currentText, setCurrentText] = useState("");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const speechRef = useRef<SpeechSynthesisUtterance | null>(null);
  const queueIndex = useRef(0);

  const speak = useCallback((text: string) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();

    const utter = new SpeechSynthesisUtterance(text);
    utter.rate = 0.9;
    utter.pitch = 0.8;
    utter.volume = 0.8;

    const voices = window.speechSynthesis.getVoices();
    const preferred = voices.find(v => v.lang.includes("en") && v.name.includes("Google"));
    if (preferred) utter.voice = preferred;

    utter.onstart = () => setIsSpeaking(true);
    utter.onend = () => setIsSpeaking(false);

    speechRef.current = utter;
    setCurrentText(text);
    window.speechSynthesis.speak(utter);
  }, []);

  const toggleNarration = () => {
    if (isActive) {
      window.speechSynthesis?.cancel();
      setIsActive(false);
      setIsSpeaking(false);
      setCurrentText("");
      queueIndex.current = 0;
      return;
    }
    setIsActive(true);
    speak(NARRATIONS[0].text);
    queueIndex.current = 1;
  };

  const nextNarration = () => {
    if (queueIndex.current < NARRATIONS.length) {
      speak(NARRATIONS[queueIndex.current].text);
      queueIndex.current++;
    }
  };

  useEffect(() => {
    return () => {
      window.speechSynthesis?.cancel();
    };
  }, []);

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      {/* Speech bubble */}
      <AnimatePresence>
        {currentText && isActive && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.9 }}
            className="glass-card p-4 max-w-xs"
          >
            <p className="text-sm text-foreground leading-relaxed">{currentText}</p>
            {queueIndex.current < NARRATIONS.length && (
              <button
                onClick={nextNarration}
                className="mt-2 text-xs text-primary font-mono hover:underline"
              >
                Next →
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Voice button */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={toggleNarration}
        className={`w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 ${
          isActive
            ? "bg-primary glow-crunchy"
            : "bg-muted border border-border hover:border-primary/50"
        }`}
      >
        {isSpeaking ? (
          <div className="flex gap-0.5 items-center">
            {[...Array(4)].map((_, i) => (
              <motion.div
                key={i}
                animate={{ scaleY: [1, 2 + i * 0.5, 1] }}
                transition={{ duration: 0.5, repeat: Infinity, delay: i * 0.1 }}
                className={`w-0.5 h-3 rounded-full ${isActive ? "bg-primary-foreground" : "bg-primary"}`}
              />
            ))}
          </div>
        ) : (
          <svg className={`w-6 h-6 ${isActive ? "text-primary-foreground" : "text-primary"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
          </svg>
        )}
      </motion.button>
    </div>
  );
};
