import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";

export const CinematicOpening = () => {
  const [show, setShow] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setShow(false), 2800);
    return () => clearTimeout(timer);
  }, []);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed inset-0 z-[9999] pointer-events-none flex flex-col"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6 }}
        >
          <motion.div className="w-full bg-background"
            initial={{ height: "50vh" }}
            animate={{ height: "0vh" }}
            transition={{ duration: 1.6, delay: 1.2, ease: [0.76, 0, 0.24, 1] }} />

          <motion.div className="absolute inset-0 flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 1, 0] }}
            transition={{ duration: 2.4, times: [0, 0.2, 0.7, 1] }}>
            <div className="text-center">
              <motion.div initial={{ scaleX: 0 }} animate={{ scaleX: 1 }}
                transition={{ duration: 0.6, delay: 0.3, ease: "easeOut" }}
                className="h-px w-32 mx-auto mb-4"
                style={{ background: "hsl(var(--primary))", transformOrigin: "center" }} />
              <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="text-primary font-mono text-xs tracking-[0.5em] uppercase">
                伝説の始まり
              </motion.p>
              <motion.h1
                initial={{ opacity: 0, letterSpacing: "0.5em" }}
                animate={{ opacity: 1, letterSpacing: "0.15em" }}
                transition={{ delay: 0.7, duration: 0.8 }}
                className="text-foreground text-4xl sm:text-6xl font-black mt-2"
                style={{ fontFamily: "'Impact','Arial Black',sans-serif" }}>
                AMIT<span className="text-gradient-gold">FOLIO</span>
              </motion.h1>
              <motion.div initial={{ scaleX: 0 }} animate={{ scaleX: 1 }}
                transition={{ duration: 0.6, delay: 0.9, ease: "easeOut" }}
                className="h-px w-32 mx-auto mt-4"
                style={{ background: "hsl(var(--primary))", transformOrigin: "center" }} />
            </div>
          </motion.div>

          <motion.div className="w-full bg-background mt-auto"
            initial={{ height: "50vh" }}
            animate={{ height: "0vh" }}
            transition={{ duration: 1.6, delay: 1.2, ease: [0.76, 0, 0.24, 1] }} />
        </motion.div>
      )}
    </AnimatePresence>
  );
};
