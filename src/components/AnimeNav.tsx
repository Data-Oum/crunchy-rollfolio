import { PROFILE } from "@/data/profile";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";

let gsap: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const g = require("gsap");
  gsap = g.gsap ?? g.default ?? g;
} catch {}

const CR_ORANGE = "#F47521";

const NAV_ITEMS = [
  { label: "ホーム", en: "Home", href: "#hero" },
  { label: "作品", en: "Projects", href: "#showcase" },
  { label: "冒険", en: "Journey", href: "#journey" },
  { label: "接触", en: "Contact", href: "#contact" },
];

export const AnimeNav = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [active, setActive] = useState("#hero");
  const [scrolled, setScrolled] = useState(false);
  const navRef = useRef<HTMLElement>(null);

  useEffect(() => {
    // GSAP entrance
    if (gsap && navRef.current) {
      gsap.fromTo(
        navRef.current,
        { y: -80, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.9, ease: "power3.out", delay: 0.1 },
      );
    }

    const onScroll = () => {
      setScrolled(window.scrollY > 50);
      const sections = NAV_ITEMS.map((n) => n.href.replace("#", ""));
      for (const id of [...sections].reverse()) {
        const el = document.getElementById(id);
        if (el && window.scrollY >= el.offsetTop - 130) {
          setActive(`#${id}`);
          break;
        }
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollTo = (href: string) => {
    document.querySelector(href)?.scrollIntoView({ behavior: "smooth" });
    setIsOpen(false);
  };

  return (
    <nav
      ref={navRef}
      className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
      style={{
        background: scrolled ? "rgba(5,3,8,0.92)" : "transparent",
        backdropFilter: scrolled ? "blur(20px)" : "none",
        borderBottom: scrolled ? `1px solid rgba(244,117,33,0.12)` : "none",
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <motion.div
            whileHover={{ scale: 1.05 }}
            onClick={() => scrollTo("#hero")}
            className="flex items-center gap-2.5 cursor-pointer group"
          >
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center relative overflow-hidden"
              style={{
                background: CR_ORANGE,
                boxShadow: `0 0 20px ${CR_ORANGE}50`,
              }}
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                className="absolute inset-0 rounded-xl opacity-30"
                style={{
                  background:
                    "conic-gradient(from 0deg,transparent,rgba(255,255,255,0.4),transparent)",
                }}
              />
              <span className="text-white font-black text-xs font-mono relative z-10">
                AC
              </span>
            </div>
            <div className="hidden sm:block">
              <span
                className="text-white font-black text-lg tracking-tight"
                style={{ fontFamily: "'Impact','Arial Black',sans-serif" }}
              >
                {PROFILE.nameFirst.toUpperCase()}
              </span>
              <span
                className="font-black text-lg tracking-tight"
                style={{
                  color: CR_ORANGE,
                  fontFamily: "'Impact','Arial Black',sans-serif",
                }}
              >
                FOLIO
              </span>
            </div>
          </motion.div>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-1">
            {NAV_ITEMS.map((item) => {
              const isActive = active === item.href;
              return (
                <motion.button
                  key={item.en}
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => scrollTo(item.href)}
                  className="relative px-4 py-2 rounded-lg text-sm font-mono font-bold transition-all duration-200"
                  style={{
                    color: isActive ? "white" : "rgba(255,255,255,0.45)",
                    background: isActive
                      ? "rgba(244,117,33,0.12)"
                      : "transparent",
                  }}
                >
                  <span
                    className="text-[10px] mr-1 font-mono"
                    style={{ color: `${CR_ORANGE}${isActive ? "ff" : "70"}` }}
                  >
                    {item.label}
                  </span>
                  {item.en}
                  {isActive && (
                    <motion.div
                      layoutId="nav-underline"
                      className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-0.5 rounded-full"
                      style={{
                        background: CR_ORANGE,
                        boxShadow: `0 0 8px ${CR_ORANGE}`,
                      }}
                    />
                  )}
                </motion.button>
              );
            })}
          </div>

          {/* Right — wave bars */}
          <div className="hidden md:flex items-center gap-2">
            <div className="flex gap-0.5 items-end h-4">
              {[...Array(4)].map((_, i) => (
                <motion.div
                  key={i}
                  animate={{ scaleY: [0.3, 1 + i * 0.2, 0.3] }}
                  transition={{
                    duration: 0.7 + i * 0.1,
                    repeat: Infinity,
                    delay: i * 0.12,
                  }}
                  className="w-0.5 rounded-full"
                  style={{
                    height: `${8 + i * 3}px`,
                    background: CR_ORANGE,
                    transformOrigin: "bottom",
                    opacity: 0.7,
                  }}
                />
              ))}
            </div>
            <span className="text-[9px] text-white/35 font-mono tracking-widest">
              VOICE ON
            </span>
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden p-2 relative w-8 h-6"
          >
            {[0, 1, 2].map((i) => (
              <motion.span
                key={i}
                animate={
                  isOpen
                    ? i === 0
                      ? { rotate: 45, y: 8 }
                      : i === 1
                        ? { opacity: 0 }
                        : { rotate: -45, y: -8 }
                    : { rotate: 0, y: 0, opacity: 1 }
                }
                className="absolute left-0 h-0.5 w-6 rounded-full block"
                style={{
                  background: CR_ORANGE,
                  top: i === 0 ? 0 : i === 1 ? "50%" : "100%",
                  transform: i === 1 ? "translateY(-50%)" : "",
                }}
              />
            ))}
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="md:hidden overflow-hidden"
            style={{
              background: "rgba(5,3,8,0.97)",
              borderBottom: `1px solid rgba(244,117,33,0.15)`,
            }}
          >
            <div className="px-4 py-4 space-y-1">
              {NAV_ITEMS.map((item, i) => (
                <motion.button
                  key={item.en}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  onClick={() => scrollTo(item.href)}
                  className="flex items-center gap-3 w-full text-left px-4 py-3 rounded-xl text-sm font-mono font-bold"
                  style={{
                    background:
                      active === item.href
                        ? `rgba(244,117,33,0.1)`
                        : "transparent",
                    color:
                      active === item.href ? "white" : "rgba(255,255,255,0.45)",
                    border:
                      active === item.href
                        ? `1px solid rgba(244,117,33,0.25)`
                        : "1px solid transparent",
                  }}
                >
                  <span
                    style={{ color: CR_ORANGE }}
                    className="text-[10px] w-8"
                  >
                    {item.label}
                  </span>
                  {item.en}
                  {active === item.href && (
                    <span
                      className="ml-auto w-1.5 h-1.5 rounded-full animate-pulse"
                      style={{ background: CR_ORANGE }}
                    />
                  )}
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};
