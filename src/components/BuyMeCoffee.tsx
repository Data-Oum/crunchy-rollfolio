import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";

const BMC_URL = "https://buymeacoffee.com/amithellmab";

export const BuyMeCoffee = () => {
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Show after 15s of browsing
    const timer = setTimeout(() => setVisible(true), 15000);
    return () => clearTimeout(timer);
  }, []);

  if (dismissed) return null;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 60, scale: 0.8 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 60 }}
          transition={{ type: "spring", stiffness: 200, damping: 20 }}
          className="fixed bottom-6 right-6 z-[100] flex items-center gap-3"
        >
          {/* Dismiss */}
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setDismissed(true)}
            className="w-7 h-7 rounded-full bg-muted/80 backdrop-blur-sm text-muted-foreground text-xs flex items-center justify-center border border-border hover:border-primary/30 transition-colors"
          >
            ✕
          </motion.button>

          {/* BMC Button */}
          <motion.a
            href={BMC_URL}
            target="_blank"
            rel="noopener noreferrer"
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.95 }}
            className="flex items-center gap-2.5 px-5 py-3 rounded-2xl font-mono text-sm font-bold text-primary-foreground relative overflow-hidden group"
            style={{
              background: "hsl(var(--primary))",
              boxShadow: "0 0 30px hsl(var(--primary) / 0.4), 0 8px 32px hsl(var(--primary) / 0.2)",
            }}
          >
            {/* Shine effect */}
            <motion.div
              className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
              style={{
                background: "linear-gradient(105deg, transparent 40%, hsl(0 0% 100% / 0.15) 45%, transparent 50%)",
              }}
              animate={{ x: ["-100%", "200%"] }}
              transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
            />
            <span className="text-lg relative z-10">☕</span>
            <span className="relative z-10 tracking-wide">Buy Me a Coffee</span>
          </motion.a>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
