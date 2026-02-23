import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PROFILE } from "@/data/profile";

const NAV_ITEMS = [
  { label: "ホーム", en: "Home", href: "#hero" },
  { label: "作品", en: "Projects", href: "#showcase" },
  { label: "冒険", en: "Journey", href: "#journey" },
  { label: "接触", en: "Contact", href: "#contact" },
];

export const AnimeNav = () => {
  const [isOpen, setIsOpen] = useState(false);

  const scrollTo = (href: string) => {
    const el = document.querySelector(href);
    el?.scrollIntoView({ behavior: "smooth" });
    setIsOpen(false);
  };

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.8, ease: [0.18, 1, 0.3, 1] }}
      className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 backdrop-blur-xl bg-background/70"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <motion.div
            whileHover={{ scale: 1.05 }}
            className="flex items-center gap-2 cursor-pointer"
            onClick={() => scrollTo("#hero")}
          >
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center glow-crunchy">
              <span className="text-primary-foreground font-bold text-sm font-mono">AC</span>
            </div>
            <span className="text-foreground font-bold text-lg tracking-tight hidden sm:block">
              {PROFILE.nameFirst.toUpperCase()}<span className="text-primary">FOLIO</span>
            </span>
          </motion.div>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-1">
            {NAV_ITEMS.map((item) => (
              <motion.button
                key={item.en}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => scrollTo(item.href)}
                className="px-4 py-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-all duration-300 text-sm font-medium group"
              >
                <span className="text-primary text-xs font-mono mr-1 opacity-60 group-hover:opacity-100">
                  {item.label}
                </span>
                {item.en}
              </motion.button>
            ))}
          </div>

          {/* Voice indicator */}
          <div className="hidden md:flex items-center gap-2">
            <div className="flex gap-1 items-center">
              {[...Array(3)].map((_, i) => (
                <motion.div
                  key={i}
                  animate={{ scaleY: [1, 1.5 + i * 0.3, 1] }}
                  transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.15 }}
                  className="w-0.5 h-3 bg-primary rounded-full"
                />
              ))}
            </div>
            <span className="text-xs text-muted-foreground font-mono">VOICE ON</span>
          </div>

          {/* Mobile hamburger */}
          <button onClick={() => setIsOpen(!isOpen)} className="md:hidden p-2 text-foreground">
            <motion.div animate={isOpen ? { rotate: 45, y: 6 } : { rotate: 0, y: 0 }} className="w-5 h-0.5 bg-primary mb-1.5" />
            <motion.div animate={isOpen ? { opacity: 0 } : { opacity: 1 }} className="w-5 h-0.5 bg-primary mb-1.5" />
            <motion.div animate={isOpen ? { rotate: -45, y: -6 } : { rotate: 0, y: 0 }} className="w-5 h-0.5 bg-primary" />
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="md:hidden bg-background/95 backdrop-blur-xl border-b border-border overflow-hidden"
          >
            <div className="px-4 py-4 space-y-2">
              {NAV_ITEMS.map((item) => (
                <button
                  key={item.en}
                  onClick={() => scrollTo(item.href)}
                  className="block w-full text-left px-4 py-3 rounded-lg text-foreground hover:bg-muted transition-colors font-medium"
                >
                  <span className="text-primary text-xs font-mono mr-2">{item.label}</span>
                  {item.en}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
};
