import animeAvatar from "@/assets/anime-avatar.png";
import animeBattle from "@/assets/anime-battle.png";
import energyBlast from "@/assets/energy-blast.png";
import plasmaOrb from "@/assets/plasma-orb.png";
import { PROFILE } from "@/data/profile";
import { motion, useMotionValue, useTransform } from "framer-motion";
import { useEffect, useState } from "react";

const GLITCH_CHARS = "アイウエオカキクケコサシスセソタチツテトナニヌネノ";

function GlitchText({ text, className }: { text: string; className?: string }) {
  const [display, setDisplay] = useState(text);
  const [glitching, setGlitching] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setGlitching(true);
      let iter = 0;
      const glitch = setInterval(() => {
        setDisplay(
          text
            .split("")
            .map((char, i) =>
              i < iter
                ? char
                : GLITCH_CHARS[Math.floor(Math.random() * GLITCH_CHARS.length)],
            )
            .join(""),
        );
        if (iter >= text.length) {
          clearInterval(glitch);
          setDisplay(text);
          setGlitching(false);
        }
        iter += 1;
      }, 40);
    }, 4000);
    return () => clearInterval(interval);
  }, [text]);

  return <span className={className}>{display}</span>;
}

function StatCounter({ value, label }: { value: string; label: string }) {
  return (
    <motion.div
      whileHover={{ scale: 1.05 }}
      className="relative group cursor-default"
    >
      <div className="absolute inset-0 bg-primary/10 rounded-lg blur-md group-hover:bg-primary/20 transition-all" />
      <div className="relative border border-primary/30 rounded-lg px-4 py-3 text-center bg-background/40 backdrop-blur-sm">
        <div className="text-2xl sm:text-3xl font-black text-primary font-mono leading-none">
          {value}
        </div>
        <div className="text-[10px] text-muted-foreground font-mono tracking-widest mt-1 uppercase">
          {label}
        </div>
      </div>
    </motion.div>
  );
}

export const AnimeHero = () => {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const rotateX = useTransform(mouseY, [-300, 300], [5, -5]);
  const rotateY = useTransform(mouseX, [-300, 300], [-5, 5]);

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    mouseX.set(e.clientX - rect.left - rect.width / 2);
    mouseY.set(e.clientY - rect.top - rect.height / 2);
  };

  return (
    <section
      id="hero"
      className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16"
      onMouseMove={handleMouseMove}
    >
      {/* Anime city background — deep parallax layer */}
      <motion.div
        initial={{ opacity: 0, scale: 1.1 }}
        animate={{ opacity: 0.12, scale: 1 }}
        transition={{ duration: 2 }}
        className="absolute inset-0 pointer-events-none"
      >
        <img
          src={animeBattle}
          alt=""
          className="w-full h-full object-cover"
          style={{ filter: "saturate(1.4) hue-rotate(20deg)" }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/40 to-background" />
      </motion.div>

      {/* Plasma orb */}
      <motion.div
        animate={{ scale: [1, 1.05, 1], opacity: [0.25, 0.4, 0.25] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        className="absolute inset-0 flex items-center justify-center pointer-events-none"
      >
        <img
          src={plasmaOrb}
          alt=""
          className="w-[700px] md:w-[1000px] opacity-50 blur-sm"
        />
      </motion.div>

      {/* Manga speed lines — top-left corner */}
      <svg
        className="absolute top-0 left-0 w-72 h-72 opacity-5 pointer-events-none"
        viewBox="0 0 200 200"
      >
        {[...Array(20)].map((_, i) => (
          <line
            key={i}
            x1="0"
            y1="0"
            x2={200 * Math.cos((i * Math.PI) / 10)}
            y2={200 * Math.sin((i * Math.PI) / 10)}
            stroke="hsl(var(--primary))"
            strokeWidth="0.5"
          />
        ))}
      </svg>

      {/* Energy blast decorative */}
      <motion.img
        src={energyBlast}
        alt=""
        animate={{ opacity: [0.04, 0.09, 0.04], rotate: [0, 5, 0] }}
        transition={{ duration: 6, repeat: Infinity }}
        className="absolute right-0 top-1/4 w-64 pointer-events-none select-none"
        style={{ filter: "hue-rotate(40deg) saturate(2)" }}
      />

      {/* Main content */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16">
          {/* LEFT COLUMN */}
          <div className="flex-1 text-center lg:text-left">
            {/* Mission badge */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.7, delay: 0.2 }}
              className="inline-flex items-center gap-2 mb-6"
            >
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <span className="px-3 py-1 rounded-full border border-primary/40 bg-primary/5 text-primary text-xs font-mono tracking-widest">
                呪術師 • SOFTWARE ARCHITECT
              </span>
              <div className="hidden sm:block w-16 h-px bg-gradient-to-r from-primary/50 to-transparent" />
            </motion.div>

            {/* NAME — massive, layered */}
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.35 }}
              className="relative mb-2"
            >
              {/* Ghost text behind */}
              <div
                className="absolute -top-2 left-0 text-6xl sm:text-7xl lg:text-9xl font-black leading-none select-none pointer-events-none tracking-tight"
                style={{
                  WebkitTextStroke: "1px hsl(var(--primary) / 0.08)",
                  color: "transparent",
                  transform: "translateX(4px) translateY(4px)",
                }}
              >
                {PROFILE.nameFirst.toUpperCase()}
              </div>
              <h1 className="text-6xl sm:text-7xl lg:text-9xl font-black leading-none tracking-tight relative">
                <GlitchText
                  text={PROFILE.nameFirst.toUpperCase()}
                  className="text-gradient-crunchy"
                />
              </h1>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.5 }}
              className="flex items-baseline gap-3 justify-center lg:justify-start mb-6"
            >
              <span className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground tracking-wide">
                {PROFILE.nameLast.toUpperCase()}
              </span>
              <span className="hidden sm:block text-primary font-mono text-xs opacity-60 tracking-widest self-end pb-1">
                チャクラボルティ
              </span>
            </motion.div>

            {/* Title + tagline */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.65 }}
              className="mb-6"
            >
              <p className="text-primary font-mono text-sm mb-1 tracking-wider">
                ▸ {PROFILE.title}
              </p>
              <p className="text-muted-foreground text-lg sm:text-xl max-w-lg mx-auto lg:mx-0">
                {PROFILE.tagline}
              </p>
            </motion.div>

            {/* Role badges */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.8 }}
              className="flex flex-wrap gap-2 justify-center lg:justify-start mb-10"
            >
              {PROFILE.roles.map((role, i) => (
                <motion.span
                  key={role}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.8 + i * 0.07 }}
                  whileHover={{ scale: 1.08, y: -3 }}
                  className="px-3 py-1.5 rounded-lg bg-muted/60 text-muted-foreground text-xs font-mono border border-border hover:border-primary/60 hover:text-primary hover:bg-primary/5 transition-all cursor-default"
                >
                  {role}
                </motion.span>
              ))}
            </motion.div>

            {/* Stats row */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.1 }}
              className="flex gap-3 justify-center lg:justify-start"
            >
              {PROFILE.stats.map((stat) => (
                <StatCounter
                  key={stat.label}
                  value={stat.value}
                  label={stat.label}
                />
              ))}
            </motion.div>
          </div>

          {/* RIGHT COLUMN — Avatar */}
          <motion.div
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, delay: 0.5 }}
            style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
            className="flex-shrink-0 relative"
          >
            {/* Outer manga panel frame */}
            <div className="absolute -inset-6 border border-primary/10 rounded-3xl" />
            <div className="absolute -inset-3 border border-primary/15 rounded-2xl" />

            {/* Orbit rings */}
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
              className="absolute -inset-5 rounded-full"
              style={{
                border: "1px solid transparent",
                backgroundImage:
                  "linear-gradient(hsl(var(--background)), hsl(var(--background))), conic-gradient(from 0deg, hsl(var(--primary)/0.4), transparent, hsl(var(--secondary)/0.3), transparent, hsl(var(--primary)/0.4))",
                backgroundOrigin: "border-box",
                backgroundClip: "padding-box, border-box",
                borderRadius: "50%",
              }}
            />
            <motion.div
              animate={{ rotate: -360 }}
              transition={{ duration: 28, repeat: Infinity, ease: "linear" }}
              className="absolute -inset-10 rounded-full border border-dashed border-primary/8"
            />

            {/* Floating energy orbs */}
            {[...Array(5)].map((_, i) => (
              <motion.div
                key={i}
                animate={{
                  y: [0, -25 - i * 8, 0],
                  x: [0, i % 2 === 0 ? 15 : -15, 0],
                  opacity: [0, 1, 0],
                  scale: [0.5, 1, 0.5],
                }}
                transition={{
                  duration: 2.5 + i * 0.4,
                  repeat: Infinity,
                  delay: i * 0.5,
                }}
                className="absolute w-2 h-2 rounded-full bg-primary"
                style={{
                  top: `${20 + i * 12}%`,
                  left: `${15 + (i % 3) * 30}%`,
                  boxShadow: "0 0 8px hsl(var(--primary))",
                }}
              />
            ))}

            {/* Avatar */}
            <motion.div
              animate={{ y: [-6, 6, -6] }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
              className="w-48 h-48 sm:w-64 sm:h-64 lg:w-80 lg:h-80 rounded-2xl overflow-hidden relative"
              style={{
                boxShadow:
                  "0 0 40px hsl(var(--primary)/0.35), 0 0 80px hsl(var(--primary)/0.15), inset 0 0 30px hsl(var(--primary)/0.05)",
                border: "1.5px solid hsl(var(--primary)/0.45)",
              }}
            >
              <img
                src={animeAvatar}
                alt={PROFILE.name}
                className="w-full h-full object-cover"
              />
              {/* Scan-line overlay */}
              <div
                className="absolute inset-0 pointer-events-none opacity-30"
                style={{
                  backgroundImage:
                    "repeating-linear-gradient(0deg, transparent, transparent 2px, hsl(var(--background)/0.15) 2px, hsl(var(--background)/0.15) 4px)",
                }}
              />
              {/* Bottom shimmer */}
              <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-gradient-to-t from-background/60 to-transparent" />
            </motion.div>

            {/* Level badge */}
            <motion.div
              animate={{ y: [-4, 4, -4] }}
              transition={{ duration: 3, repeat: Infinity }}
              className="absolute -bottom-3 -right-3 px-3 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-mono font-bold"
              style={{ boxShadow: "0 0 20px hsl(var(--primary)/0.5)" }}
            >
              LVL ∞ ARCHITECT
            </motion.div>

            {/* Power tag */}
            <motion.div
              animate={{ y: [4, -4, 4] }}
              transition={{ duration: 4, repeat: Infinity }}
              className="absolute -top-3 -left-3 px-2 py-1 rounded-lg border border-secondary/50 bg-background/80 backdrop-blur-sm text-[10px] font-mono font-bold text-secondary"
            >
              呪力 MAX
            </motion.div>
          </motion.div>
        </div>
      </div>

      {/* Scroll cue */}
      <motion.div
        animate={{ y: [0, 10, 0] }}
        transition={{ duration: 2, repeat: Infinity }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
      >
        <span className="text-[10px] font-mono text-muted-foreground tracking-widest">
          SCROLL
        </span>
        <div className="w-6 h-10 rounded-full border-2 border-primary/40 flex justify-center pt-2">
          <motion.div
            animate={{ y: [0, 12, 0], opacity: [1, 0, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="w-1.5 h-1.5 rounded-full bg-primary"
          />
        </div>
      </motion.div>
    </section>
  );
};
