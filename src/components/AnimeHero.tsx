import { motion } from "framer-motion";
import plasmaOrb from "@/assets/plasma-orb.png";
import animeAvatar from "@/assets/anime-avatar.png";
import { PROFILE } from "@/data/profile";

export const AnimeHero = () => {
  return (
    <section id="hero" className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
      {/* Background plasma orb */}
      <motion.div
        animate={{ scale: [1, 1.05, 1], opacity: [0.3, 0.5, 0.3] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        className="absolute inset-0 flex items-center justify-center pointer-events-none"
      >
        <img src={plasmaOrb} alt="" className="w-[600px] md:w-[900px] opacity-40 blur-sm" loading="lazy" />
      </motion.div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-20">
          {/* Left: Text */}
          <div className="flex-1 text-center lg:text-left">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
            >
              <span className="inline-block px-3 py-1 rounded-full bg-primary/10 border border-primary/30 text-primary text-xs font-mono tracking-widest mb-6">
                呪術師 • SOFTWARE ENGINEER
              </span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="text-5xl sm:text-6xl lg:text-8xl font-bold leading-none mb-4"
            >
              <span className="text-gradient-crunchy">{PROFILE.nameFirst.toUpperCase()}</span>
              <br />
              <span className="text-foreground text-4xl sm:text-5xl lg:text-6xl">{PROFILE.nameLast.toUpperCase()}</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.5 }}
              className="text-primary font-mono text-sm mb-2"
            >
              {PROFILE.title}
            </motion.p>

            <motion.p
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.6 }}
              className="text-muted-foreground text-lg sm:text-xl max-w-lg mb-8 mx-auto lg:mx-0"
            >
              {PROFILE.tagline}
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.8 }}
              className="flex flex-wrap gap-2 justify-center lg:justify-start"
            >
              {PROFILE.roles.map((role, i) => (
                <motion.span
                  key={role}
                  whileHover={{ scale: 1.1, y: -2 }}
                  className="px-3 py-1.5 rounded-lg bg-muted text-muted-foreground text-xs font-mono border border-border hover:border-primary/50 hover:text-primary transition-all cursor-default"
                  style={{ animationDelay: `${i * 0.1}s` }}
                >
                  {role}
                </motion.span>
              ))}
            </motion.div>

            {/* Stats */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.2 }}
              className="flex gap-8 mt-10 justify-center lg:justify-start"
            >
              {PROFILE.stats.map((stat) => (
                <div key={stat.label} className="text-center">
                  <div className="text-2xl font-bold text-primary">{stat.value}</div>
                  <div className="text-xs text-muted-foreground font-mono">{stat.label}</div>
                </div>
              ))}
            </motion.div>
          </div>

          {/* Right: Avatar with anime character vibe */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, delay: 0.6 }}
            className="flex-shrink-0"
          >
            <div className="relative">
              {/* Orbit rings — anime power aura */}
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                className="absolute -inset-4 rounded-full border border-primary/20"
              />
              <motion.div
                animate={{ rotate: -360 }}
                transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
                className="absolute -inset-8 rounded-full border border-secondary/10"
              />
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                className="absolute -inset-12 rounded-full border border-primary/5"
              />

              {/* Energy particles */}
              {[...Array(6)].map((_, i) => (
                <motion.div
                  key={i}
                  animate={{
                    y: [0, -20 - i * 10, 0],
                    x: [0, (i % 2 === 0 ? 10 : -10), 0],
                    opacity: [0, 0.8, 0],
                    scale: [0, 1, 0],
                  }}
                  transition={{
                    duration: 2 + i * 0.5,
                    repeat: Infinity,
                    delay: i * 0.4,
                  }}
                  className="absolute w-1.5 h-1.5 rounded-full bg-primary"
                  style={{
                    top: `${30 + Math.random() * 40}%`,
                    left: `${20 + Math.random() * 60}%`,
                  }}
                />
              ))}

              <div className="w-48 h-48 sm:w-64 sm:h-64 lg:w-80 lg:h-80 rounded-full overflow-hidden glow-crunchy border-2 border-primary/40">
                <img
                  src={animeAvatar}
                  alt={PROFILE.name}
                  className="w-full h-full object-cover plasma-pulse"
                />
              </div>

              {/* Power level badge */}
              <motion.div
                animate={{ y: [-5, 5, -5] }}
                transition={{ duration: 3, repeat: Infinity }}
                className="absolute -bottom-2 -right-2 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-mono font-bold glow-crunchy"
              >
                LVL ∞ ARCHITECT
              </motion.div>

              {/* Anime-style power indicator */}
              <motion.div
                animate={{ y: [5, -5, 5] }}
                transition={{ duration: 4, repeat: Infinity }}
                className="absolute -top-2 -left-2 px-2 py-1 rounded bg-secondary/90 text-secondary-foreground text-[10px] font-mono font-bold"
              >
                呪力 MAX
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        animate={{ y: [0, 10, 0] }}
        transition={{ duration: 2, repeat: Infinity }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
      >
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
