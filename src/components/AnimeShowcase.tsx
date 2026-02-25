import animeBattle from "@/assets/anime-battle.png";
import breathingTechnique from "@/assets/breathing-technique.png";
import { PROFILE } from "@/data/profile";
import { motion, useMotionValue, useTransform, useScroll } from "framer-motion";
import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const BADGE_STYLES: Record<string, { gradient: string; glow: string; accent: string }> = {
  "FLAGSHIP · HEALTHTECH": {
    gradient: "linear-gradient(135deg, hsl(var(--primary)), hsl(35 100% 50%))",
    glow: "hsl(var(--primary) / 0.4)",
    accent: "hsl(var(--primary))",
  },
  "AI PLATFORM": {
    gradient: "linear-gradient(135deg, hsl(var(--secondary)), hsl(280 70% 45%))",
    glow: "hsl(var(--secondary) / 0.4)",
    accent: "hsl(var(--secondary))",
  },
  "SPORTS · FINTECH": {
    gradient: "linear-gradient(135deg, hsl(var(--anime-cyan)), hsl(199 90% 45%))",
    glow: "hsl(var(--anime-cyan) / 0.4)",
    accent: "hsl(var(--anime-cyan))",
  },
  "WEB3 · DEFI": {
    gradient: "linear-gradient(135deg, hsl(var(--anime-green)), hsl(160 67% 38%))",
    glow: "hsl(var(--anime-green) / 0.4)",
    accent: "hsl(var(--anime-green))",
  },
};

// ─── Manga Panel Card ────────────────────────────────────────
function MangaCard({ project, index }: { project: typeof PROFILE.projects[number]; index: number }) {
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rx = useTransform(my, [-150, 150], [10, -10]);
  const ry = useTransform(mx, [-150, 150], [-10, 10]);
  const cardRef = useRef<HTMLDivElement>(null);

  const style = BADGE_STYLES[project.badge] ?? {
    gradient: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--secondary)))",
    glow: "hsl(var(--primary) / 0.4)",
    accent: "hsl(var(--primary))",
  };

  return (
    <motion.div
      ref={cardRef}
      style={{ rotateX: rx, rotateY: ry, transformStyle: "preserve-3d" }}
      onMouseMove={(e) => {
        if (!cardRef.current) return;
        const r = cardRef.current.getBoundingClientRect();
        mx.set(e.clientX - r.left - r.width / 2);
        my.set(e.clientY - r.top - r.height / 2);
      }}
      onMouseLeave={() => { mx.set(0); my.set(0); }}
      className="project-card group cursor-default h-full"
    >
      <div className="relative rounded-2xl overflow-hidden h-full bg-card/80 border border-border/40"
        style={{ boxShadow: `0 4px 40px hsl(0 0% 0% / 0.6)` }}>

        {/* Animated top gradient bar */}
        <motion.div className="h-1.5 w-full relative overflow-hidden"
          style={{ background: style.gradient }}>
          <motion.div
            className="absolute inset-0"
            style={{ background: "linear-gradient(90deg, transparent, hsl(0 0% 100% / 0.3), transparent)" }}
            animate={{ x: ["-100%", "200%"] }}
            transition={{ duration: 3, repeat: Infinity, repeatDelay: 2 }}
          />
        </motion.div>

        {/* Episode number watermark */}
        <div className="absolute top-4 right-4 text-7xl font-black opacity-[0.03] font-mono text-foreground select-none"
          style={{ fontFamily: "'Impact','Arial Black',sans-serif" }}>
          EP.{String(index + 1).padStart(2, "0")}
        </div>

        {/* Manga speed lines corner */}
        <svg className="absolute top-0 right-0 w-32 h-32 opacity-[0.04] pointer-events-none" viewBox="0 0 100 100">
          {[...Array(12)].map((_, i) => (
            <line key={i} x1="100" y1="0" x2={100 - Math.cos(i * 0.15) * 100} y2={Math.sin(i * 0.15) * 100}
              stroke="currentColor" strokeWidth="0.5" className="text-foreground" />
          ))}
        </svg>

        {/* Hover glow */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none rounded-2xl"
          style={{ boxShadow: `inset 0 0 0 1px ${style.accent}, 0 0 60px ${style.glow}` }} />

        <div className="p-6 sm:p-8 relative">
          {/* Badge */}
          <motion.span
            whileHover={{ scale: 1.05 }}
            className="inline-block px-3 py-1 rounded-lg text-[10px] font-mono font-bold tracking-widest mb-5 text-primary-foreground"
            style={{ background: style.gradient, boxShadow: `0 0 20px ${style.glow}` }}>
            {project.badge}
          </motion.span>

          {/* Project Name — big, dramatic */}
          <h3 className="text-2xl sm:text-3xl font-black text-foreground mb-1 transition-colors group-hover:text-primary duration-500 leading-tight"
            style={{ fontFamily: "'Impact','Arial Black',sans-serif", letterSpacing: "0.04em" }}>
            {project.name}
          </h3>

          {/* Tagline with anime accent */}
          <div className="flex items-center gap-2 mb-4">
            <div className="w-4 h-px" style={{ background: style.accent }} />
            <p className="text-sm font-mono italic text-primary/80">{project.tagline}</p>
          </div>

          {/* Description */}
          <p className="text-muted-foreground text-sm leading-relaxed mb-6">{project.desc}</p>

          {/* Impact — cinematic stat bar */}
          <motion.div
            whileHover={{ scale: 1.02 }}
            className="flex items-center gap-3 mb-6 px-4 py-3 rounded-xl bg-primary/[0.06] border border-primary/15 relative overflow-hidden">
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ background: `linear-gradient(90deg, transparent, ${style.glow}, transparent)`, filter: "blur(20px)" }} />
            <span className="text-[9px] font-mono tracking-widest text-primary relative z-10">⚡ IMPACT</span>
            <div className="w-px h-4 bg-primary/30 relative z-10" />
            <span className="text-xs font-mono text-muted-foreground relative z-10">{project.impact}</span>
          </motion.div>

          {/* Tech tags — animated reveal */}
          <div className="flex flex-wrap gap-2">
            {project.tech.map((t, ti) => (
              <motion.span key={t}
                initial={{ opacity: 0, y: 8 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: ti * 0.05 }}
                whileHover={{ scale: 1.08, y: -3, borderColor: style.accent }}
                className="px-2.5 py-1.5 rounded-lg text-[11px] font-mono cursor-default transition-all bg-muted/30 border border-border/50 text-muted-foreground hover:text-primary">
                {t}
              </motion.span>
            ))}
          </div>
        </div>

        {/* Bottom manga panel border */}
        <div className="absolute bottom-0 left-0 right-0 h-px" style={{ background: style.gradient }} />
      </div>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════
//  SHOWCASE
// ═══════════════════════════════════════════════════════════════
export const AnimeShowcase = () => {
  const sectionRef = useRef<HTMLElement>(null);
  const headingRef = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ["start end", "end start"] });
  const bgY = useTransform(scrollYProgress, [0, 1], ["0%", "20%"]);

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Heading cinematic reveal
      if (headingRef.current) {
        const els = headingRef.current.querySelectorAll(".reveal-el");
        gsap.fromTo(els,
          { y: 60, opacity: 0, skewY: 3 },
          {
            y: 0, opacity: 1, skewY: 0,
            stagger: 0.12, duration: 1, ease: "power4.out",
            scrollTrigger: { trigger: headingRef.current, start: "top 80%" },
          }
        );
      }

      // Cards dramatic stagger
      if (cardsRef.current) {
        const cards = cardsRef.current.querySelectorAll(".project-card");
        cards.forEach((card, i) => {
          gsap.fromTo(card,
            { y: 100, opacity: 0, scale: 0.85, rotateX: 8 },
            {
              y: 0, opacity: 1, scale: 1, rotateX: 0,
              duration: 1, ease: "power3.out",
              delay: i * 0.15,
              scrollTrigger: { trigger: card, start: "top 85%" },
            }
          );
        });
      }

      // Tech stack cascade
      const techItems = sectionRef.current?.querySelectorAll(".tech-tag");
      if (techItems?.length) {
        gsap.fromTo(techItems,
          { y: 20, opacity: 0, scale: 0.6 },
          {
            y: 0, opacity: 1, scale: 1,
            stagger: 0.015, duration: 0.4, ease: "back.out(1.7)",
            scrollTrigger: { trigger: techItems[0], start: "top 85%" },
          }
        );
      }
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section id="showcase" ref={sectionRef} className="relative py-32 overflow-hidden">
      {/* Parallax Battle BG */}
      <motion.div style={{ y: bgY }} className="absolute inset-0 pointer-events-none">
        <img src={animeBattle} alt="" className="w-full h-full object-cover opacity-[0.08]"
          style={{ filter: "saturate(0.8)", mixBlendMode: "luminosity" }} />
        <div className="absolute inset-0 bg-gradient-to-b from-background via-transparent to-background" />
      </motion.div>

      {/* Breathing technique accent */}
      <motion.img src={breathingTechnique} alt=""
        animate={{ opacity: [0.05, 0.12, 0.05], x: [0, 10, 0] }}
        transition={{ duration: 6, repeat: Infinity }}
        className="absolute right-0 top-1/2 -translate-y-1/2 w-80 pointer-events-none select-none"
        style={{ mixBlendMode: "screen", filter: "hue-rotate(30deg)" }} />

      {/* Vertical accent lines */}
      <div className="absolute left-0 top-0 bottom-0 w-px pointer-events-none"
        style={{ background: "linear-gradient(180deg, transparent, hsl(var(--primary) / 0.3), transparent)" }} />
      <div className="absolute right-0 top-0 bottom-0 w-px pointer-events-none"
        style={{ background: "linear-gradient(180deg, transparent, hsl(var(--secondary) / 0.2), transparent)" }} />

      {/* Video overlay for cinematic texture */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.03] mix-blend-screen overflow-hidden">
        <video autoPlay muted loop playsInline className="w-full h-full object-cover" src="/videos/rand.mp4" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Header — cinematic */}
        <div ref={headingRef} className="mb-20">
          <div className="reveal-el flex items-center gap-4 mb-3">
            <div className="w-1.5 h-12 rounded-full bg-primary" style={{ boxShadow: "0 0 15px hsl(var(--primary))" }} />
            <span className="text-xs font-mono tracking-[0.3em] text-primary">作品集 • PROJECTS</span>
          </div>
          <h2 className="reveal-el text-6xl sm:text-8xl font-black leading-none"
            style={{ fontFamily: "'Impact','Arial Black',sans-serif" }}>
            <span className="text-primary" style={{ textShadow: "0 0 60px hsl(var(--primary) / 0.3)" }}>SHIPPED</span>
            <span className="text-foreground"> WORK</span>
          </h2>
          <div className="reveal-el flex items-center gap-3 mt-4">
            <div className="w-20 h-px bg-gradient-to-r from-primary/50 to-transparent" />
            <p className="text-muted-foreground font-mono text-sm">
              Production systems. Real users. Zero shortcuts.
            </p>
          </div>
        </div>

        {/* Cards Grid */}
        <div ref={cardsRef} className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-10" style={{ perspective: "1400px" }}>
          {PROFILE.projects.map((project, i) => (
            <MangaCard key={project.name} project={project} index={i} />
          ))}
        </div>

        {/* Tech Stack */}
        <div className="mt-24">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-1.5 h-10 rounded-full bg-secondary" style={{ boxShadow: "0 0 12px hsl(var(--secondary))" }} />
            <div>
              <span className="text-xs font-mono tracking-[0.3em] text-secondary">技術スタック • ARSENAL</span>
              <h3 className="text-3xl font-black text-foreground mt-1"
                style={{ fontFamily: "'Impact','Arial Black',sans-serif" }}>
                TECH <span className="text-secondary italic">STACK</span>
              </h3>
            </div>
          </div>
          <div className="p-8 rounded-2xl bg-card/30 border border-border/20 relative overflow-hidden">
            {/* Subtle grid pattern */}
            <div className="absolute inset-0 opacity-[0.02] pointer-events-none"
              style={{ backgroundImage: "repeating-linear-gradient(0deg, hsl(var(--primary)) 0px, transparent 1px, transparent 40px), repeating-linear-gradient(90deg, hsl(var(--primary)) 0px, transparent 1px, transparent 40px)" }} />
            <div className="flex flex-wrap gap-2.5 relative z-10">
              {PROFILE.techStack.map((tech) => (
                <motion.span key={tech} whileHover={{ scale: 1.15, y: -4 }}
                  className="tech-tag px-3 py-1.5 rounded-lg text-xs font-mono cursor-default transition-all bg-primary/5 border border-primary/15 text-muted-foreground hover:text-primary hover:border-primary/40 hover:bg-primary/10">
                  {tech}
                </motion.span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
