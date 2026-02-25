import animeBattle from "@/assets/anime-battle.png";
import breathingTechnique from "@/assets/breathing-technique.png";
import { PROFILE } from "@/data/profile";
import { motion, useMotionValue, useTransform } from "framer-motion";
import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const BADGE_STYLES: Record<string, { gradient: string; glow: string }> = {
  "FLAGSHIP · HEALTHTECH": {
    gradient: "linear-gradient(135deg, hsl(var(--primary)), hsl(25 93% 42%))",
    glow: "hsl(var(--primary))",
  },
  "AI PLATFORM": {
    gradient: "linear-gradient(135deg, hsl(var(--secondary)), hsl(270 80% 35%))",
    glow: "hsl(var(--secondary))",
  },
  "SPORTS · FINTECH": {
    gradient: "linear-gradient(135deg, hsl(var(--anime-cyan)), hsl(199 90% 45%))",
    glow: "hsl(var(--anime-cyan))",
  },
  "WEB3 · DEFI": {
    gradient: "linear-gradient(135deg, hsl(var(--anime-green)), hsl(160 67% 38%))",
    glow: "hsl(var(--anime-green))",
  },
};

function HoloCard({ children, index }: { children: React.ReactNode; index: number }) {
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rx = useTransform(my, [-100, 100], [8, -8]);
  const ry = useTransform(mx, [-100, 100], [-8, 8]);
  const cardRef = useRef<HTMLDivElement>(null);

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
      className="group cursor-default h-full"
    >
      {children}
    </motion.div>
  );
}

export const AnimeShowcase = () => {
  const sectionRef = useRef<HTMLElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const cardsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Heading slam
      if (headingRef.current) {
        gsap.fromTo(headingRef.current,
          { x: -100, opacity: 0, skewX: -5 },
          {
            x: 0, opacity: 1, skewX: 0,
            duration: 1.2, ease: "power4.out",
            scrollTrigger: { trigger: headingRef.current, start: "top 80%" },
          }
        );
      }

      // Cards stagger
      if (cardsRef.current) {
        const cards = cardsRef.current.querySelectorAll(".project-card");
        gsap.fromTo(cards,
          { y: 80, opacity: 0, scale: 0.9 },
          {
            y: 0, opacity: 1, scale: 1,
            stagger: 0.15, duration: 0.9, ease: "power3.out",
            scrollTrigger: { trigger: cardsRef.current, start: "top 75%" },
          }
        );
      }

      // Tech stack reveal
      const techItems = sectionRef.current?.querySelectorAll(".tech-tag");
      if (techItems) {
        gsap.fromTo(techItems,
          { y: 15, opacity: 0, scale: 0.7 },
          {
            y: 0, opacity: 1, scale: 1,
            stagger: 0.02, duration: 0.4,
            scrollTrigger: { trigger: techItems[0], start: "top 85%" },
          }
        );
      }
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section id="showcase" ref={sectionRef} className="relative py-24 overflow-hidden">
      {/* Battle BG */}
      <div className="absolute inset-0 pointer-events-none">
        <img src={animeBattle} alt="" className="w-full h-full object-cover opacity-[0.07]"
          style={{ filter: "saturate(0.8)", mixBlendMode: "luminosity" }} />
        <div className="absolute inset-0 bg-gradient-to-b from-background via-transparent to-background" />
      </div>

      {/* Breathing technique accent */}
      <motion.img
        src={breathingTechnique} alt=""
        animate={{ opacity: [0.05, 0.1, 0.05], x: [0, 8, 0] }}
        transition={{ duration: 6, repeat: Infinity }}
        className="absolute right-0 top-1/2 -translate-y-1/2 w-72 pointer-events-none select-none"
        style={{ mixBlendMode: "screen", filter: "hue-rotate(30deg)" }}
      />

      {/* Orange accent left */}
      <div className="absolute left-0 top-0 bottom-0 w-1 pointer-events-none"
        style={{ background: "linear-gradient(180deg, transparent, hsl(var(--primary) / 0.4), transparent)" }} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Header */}
        <div className="mb-16">
          <div className="flex items-center gap-4 mb-2">
            <div className="w-1 h-10 rounded-full bg-primary" style={{ boxShadow: "0 0 12px hsl(var(--primary))" }} />
            <span className="text-xs font-mono tracking-widest text-primary">作品集 • PROJECTS</span>
          </div>
          <h2 ref={headingRef} className="text-5xl sm:text-7xl font-black leading-none"
            style={{ fontFamily: "'Impact','Arial Black',sans-serif" }}>
            <span className="text-primary" style={{ textShadow: "0 0 40px hsl(var(--primary) / 0.3)" }}>SHIPPED</span>
            <span className="text-foreground"> WORK</span>
          </h2>
          <p className="text-muted-foreground font-mono text-sm mt-3">
            Production systems. Real users. Zero shortcuts.
          </p>
        </div>

        {/* Cards */}
        <div ref={cardsRef} className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8" style={{ perspective: "1200px" }}>
          {PROFILE.projects.map((project, i) => {
            const style = BADGE_STYLES[project.badge] ?? {
              gradient: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--secondary)))",
              glow: "hsl(var(--primary))",
            };
            return (
              <HoloCard key={project.name} index={i}>
                <div className="project-card relative rounded-2xl overflow-hidden h-full bg-card/80 border border-border/50"
                  style={{ boxShadow: "0 4px 30px hsl(0 0% 0% / 0.5)" }}>
                  {/* Top bar */}
                  <div className="h-1 w-full" style={{ background: style.gradient }} />

                  {/* Card # watermark */}
                  <div className="absolute top-4 right-4 text-5xl font-black opacity-[0.04] font-mono text-foreground select-none">
                    {String(i + 1).padStart(2, "0")}
                  </div>

                  {/* Hover glow */}
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none rounded-2xl"
                    style={{ boxShadow: `inset 0 0 0 1px ${style.glow}, 0 0 40px ${style.glow}` }} />

                  <div className="p-6 relative">
                    <span className="inline-block px-2.5 py-0.5 rounded-lg text-[10px] font-mono font-bold tracking-widest mb-4 text-primary-foreground"
                      style={{ background: style.gradient, boxShadow: `0 0 12px ${style.glow}` }}>
                      {project.badge}
                    </span>

                    <h3 className="text-xl sm:text-2xl font-black text-foreground mb-1 transition-colors group-hover:text-primary duration-300"
                      style={{ fontFamily: "'Impact','Arial Black',sans-serif", letterSpacing: "0.03em" }}>
                      {project.name}
                    </h3>
                    <p className="text-sm font-mono mb-3 italic text-primary/80">{project.tagline}</p>
                    <p className="text-muted-foreground text-sm leading-relaxed mb-5">{project.desc}</p>

                    {/* Impact */}
                    <div className="flex items-center gap-2 mb-5 px-3 py-2 rounded-xl bg-primary/[0.06] border border-primary/15">
                      <span className="text-[9px] font-mono tracking-widest text-primary">⚡ IMPACT</span>
                      <div className="w-px h-3 bg-primary/30" />
                      <span className="text-xs font-mono text-muted-foreground">{project.impact}</span>
                    </div>

                    {/* Tech tags */}
                    <div className="flex flex-wrap gap-1.5">
                      {project.tech.map((t) => (
                        <motion.span key={t} whileHover={{ scale: 1.06, y: -2 }}
                          className="px-2 py-1 rounded-lg text-[11px] font-mono cursor-default transition-all bg-muted/30 border border-border/50 text-muted-foreground hover:text-primary hover:border-primary/30">
                          {t}
                        </motion.span>
                      ))}
                    </div>
                  </div>
                </div>
              </HoloCard>
            );
          })}
        </div>

        {/* Tech stack */}
        <div className="mt-20">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-1 h-8 rounded-full bg-secondary" style={{ boxShadow: "0 0 10px hsl(var(--secondary))" }} />
            <span className="text-xs font-mono tracking-widest text-secondary">技術スタック • TECH STACK</span>
          </div>
          <div className="p-6 rounded-2xl bg-card/30 border border-border/30">
            <div className="flex flex-wrap gap-2">
              {PROFILE.techStack.map((tech) => (
                <motion.span key={tech} whileHover={{ scale: 1.12, y: -3 }}
                  className="tech-tag px-2.5 py-1 rounded-lg text-xs font-mono cursor-default transition-all bg-primary/5 border border-primary/15 text-muted-foreground hover:text-primary hover:border-primary/40">
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
