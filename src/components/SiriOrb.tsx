import { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PROFILE } from "@/data/profile";

export const SiriOrb = () => {
  const [isActive, setIsActive] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [currentText, setCurrentText] = useState("");
  const [orbScale, setOrbScale] = useState(1);
  const queueIndex = useRef(0);
  const animFrame = useRef<number>(0);

  const speak = useCallback((text: string) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();

    const utter = new SpeechSynthesisUtterance(text);
    utter.rate = 0.92;
    utter.pitch = 0.85;
    utter.volume = 0.85;

    const voices = window.speechSynthesis.getVoices();
    const preferred = voices.find(v => v.lang.includes("en") && v.name.includes("Google"));
    if (preferred) utter.voice = preferred;

    utter.onstart = () => setIsSpeaking(true);
    utter.onend = () => {
      setIsSpeaking(false);
      setOrbScale(1);
    };

    // Animate orb based on speech
    const pulseOrb = () => {
      if (window.speechSynthesis.speaking) {
        setOrbScale(1 + Math.random() * 0.3);
        animFrame.current = requestAnimationFrame(pulseOrb);
      }
    };

    setCurrentText(text);
    window.speechSynthesis.speak(utter);
    pulseOrb();
  }, []);

  const toggle = () => {
    if (isActive) {
      window.speechSynthesis?.cancel();
      setIsActive(false);
      setIsSpeaking(false);
      setCurrentText("");
      queueIndex.current = 0;
      return;
    }
    setIsActive(true);
    speak(PROFILE.narrations[0]);
    queueIndex.current = 1;
  };

  const next = () => {
    if (queueIndex.current < PROFILE.narrations.length) {
      speak(PROFILE.narrations[queueIndex.current]);
      queueIndex.current++;
    }
  };

  useEffect(() => {
    return () => {
      window.speechSynthesis?.cancel();
      cancelAnimationFrame(animFrame.current);
    };
  }, []);

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-4">
      {/* Speech bubble */}
      <AnimatePresence>
        {currentText && isActive && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.8 }}
            className="glass-card p-4 max-w-xs"
          >
            <p className="text-sm text-foreground leading-relaxed font-display">
              {currentText}
            </p>
            {queueIndex.current < PROFILE.narrations.length && (
              <button
                onClick={next}
                className="mt-3 text-xs text-primary font-mono hover:underline flex items-center gap-1"
              >
                Next → <span className="text-muted-foreground">({queueIndex.current}/{PROFILE.narrations.length})</span>
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Siri Orb */}
      <motion.button
        onClick={toggle}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        className="relative w-16 h-16 rounded-full flex items-center justify-center"
      >
        {/* Outer glow rings */}
        <motion.div
          animate={{
            scale: isActive ? [1, 1.4, 1] : 1,
            opacity: isActive ? [0.3, 0, 0.3] : 0,
          }}
          transition={{ duration: 2, repeat: Infinity }}
          className="absolute inset-0 rounded-full bg-primary/20"
        />
        <motion.div
          animate={{
            scale: isActive ? [1, 1.6, 1] : 1,
            opacity: isActive ? [0.2, 0, 0.2] : 0,
          }}
          transition={{ duration: 2, repeat: Infinity, delay: 0.3 }}
          className="absolute inset-0 rounded-full bg-secondary/15"
        />

        {/* Main orb */}
        <motion.div
          animate={{ scale: isSpeaking ? orbScale : 1 }}
          transition={{ duration: 0.1 }}
          className="relative w-14 h-14 rounded-full overflow-hidden"
          style={{
            background: isActive
              ? "radial-gradient(circle at 30% 30%, hsl(var(--primary)), hsl(var(--secondary)), hsl(var(--primary)))"
              : "hsl(var(--muted))",
            boxShadow: isActive
              ? "0 0 40px hsl(var(--primary) / 0.4), 0 0 80px hsl(var(--secondary) / 0.2), inset 0 0 20px hsl(var(--primary) / 0.3)"
              : "none",
          }}
        >
          {/* Liquid animation layers */}
          {isActive && (
            <>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                className="absolute inset-0 rounded-full"
                style={{
                  background: "conic-gradient(from 0deg, transparent, hsl(var(--primary) / 0.6), transparent, hsl(var(--secondary) / 0.4), transparent)",
                }}
              />
              <motion.div
                animate={{ rotate: -360 }}
                transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
                className="absolute inset-1 rounded-full"
                style={{
                  background: "conic-gradient(from 180deg, transparent, hsl(var(--secondary) / 0.5), transparent, hsl(var(--primary) / 0.3), transparent)",
                }}
              />
              {/* Center glow */}
              <div
                className="absolute inset-2 rounded-full"
                style={{
                  background: "radial-gradient(circle, hsl(var(--primary) / 0.8) 0%, transparent 70%)",
                }}
              />
            </>
          )}

          {/* Mic / Wave icon */}
          <div className="absolute inset-0 flex items-center justify-center z-10">
            {isSpeaking ? (
              <div className="flex gap-[3px] items-center">
                {[...Array(5)].map((_, i) => (
                  <motion.div
                    key={i}
                    animate={{
                      scaleY: [1, 2 + Math.random() * 2, 1],
                    }}
                    transition={{
                      duration: 0.4 + Math.random() * 0.3,
                      repeat: Infinity,
                      delay: i * 0.08,
                    }}
                    className="w-[2px] h-3 rounded-full"
                    style={{
                      background: isActive ? "hsl(var(--primary-foreground))" : "hsl(var(--primary))",
                    }}
                  />
                ))}
              </div>
            ) : (
              <svg
                className="w-6 h-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke={isActive ? "hsl(var(--primary-foreground))" : "hsl(var(--primary))"}
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                />
              </svg>
            )}
          </div>
        </motion.div>

        {/* Label */}
        {!isActive && (
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute -top-6 text-[10px] font-mono text-muted-foreground whitespace-nowrap"
          >
            ASK AMIT
          </motion.span>
        )}
      </motion.button>
    </div>
  );
};
