import animeBattle from "@/assets/anime-battle.png";
import breathingTechnique from "@/assets/breathing-technique.png";
import { COLORS, PROFILE, SUPPLEMENTARY_PROJECTS } from "@/data/profile";
import { motion, useMotionValue, useTransform, useScroll } from "framer-motion";
import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

type Project = typeof PROFILE.projects[number];
type SupProject = typeof SUPPLEMENTARY_PROJECTS[number];

function MangaCard({ project, index }: { project: Project; index: number }) {
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rx = useTransform(my, [-150, 150], [10, -10]);
  const ry = useTransform(mx, [-150, 150], [-10, 10]);
  const cardRef = useRef<HTMLDivElement>(null);
  const color = project.color;

  const year = "year" in project ? (project as any).year : null;
  const platform = "platform" in project ? (project as any).platform : null;
  const category = "category" in project ? (project as any).category : project.badge;
  const types: string[] = "types" in project ? (project as any).types : [];
  const link: string | null = "link" in project ? (project as any).link : null;

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
        <motion.div className="h-1.5 w-full relative overflow-hidden"
          style={{ background: `linear-gradient(90deg, ${color}, ${color}80)` }}>
          <motion.div className="absolute inset-0"
            style={{ background: "linear-gradient(90deg, transparent, hsl(0 0% 100% / 0.3), transparent)" }}
            animate={{ x: ["-100%", "200%"] }}
            transition={{ duration: 3, repeat: Infinity, repeatDelay: 2 }} />
        </motion.div>

        <div className="absolute top-4 right-4 text-7xl font-black opacity-[0.03] font-mono text-foreground select-none"
          style={{ fontFamily: "'Impact','Arial Black',sans-serif" }}>
          EP.{String(index + 1).padStart(2, "0")}
        </div>

        <svg className="absolute top-0 right-0 w-32 h-32 opacity-[0.04] pointer-events-none" viewBox="0 0 100 100">
          {[...Array(12)].map((_, i) => (
            <line key={i} x1="100" y1="0" x2={100 - Math.cos(i * 0.15) * 100} y2={Math.sin(i * 0.15) * 100}
              stroke="currentColor" strokeWidth="0.5" className="text-foreground" />
          ))}
        </svg>

        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none rounded-2xl"
          style={{ boxShadow: `inset 0 0 0 1px ${color}, 0 0 60px ${color}30` }} />

        <div className="p-6 sm:p-8 relative">
          {/* Row 1 — platform pill + year */}
          {(platform || year) && (
            <div className="flex items-center justify-between mb-4">
              {platform && (
                <span className="px-2.5 py-1 rounded-full text-[9px] font-mono font-bold tracking-widest"
                  style={{ color, border: `1px solid ${color}44`, background: `${color}10` }}>
                  {platform}
                </span>
              )}
              {year && (
                <span className="text-[9px] font-mono tracking-wide text-muted-foreground/60">
                  {year}
                </span>
              )}
            </div>
          )}

          {/* Row 2 — category */}
          <p className="text-[8px] font-mono tracking-[0.28em] uppercase text-muted-foreground/50 mb-2">
            {category}
          </p>

          {/* Row 3 — project name */}
          <h3 className="text-2xl sm:text-3xl font-black text-foreground mb-4 transition-colors group-hover:text-primary duration-500 leading-tight"
            style={{ fontFamily: "'Impact','Arial Black',sans-serif", letterSpacing: "0.04em" }}>
            {project.name}
          </h3>

          {/* Row 4 — description */}
          <p className="text-muted-foreground text-sm leading-relaxed mb-5">{project.desc}</p>

          {/* Row 5 — types chips */}
          {types.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-5">
              {types.map((t) => (
                <motion.span key={t}
                  whileHover={{ scale: 1.06, y: -2 }}
                  className="px-2.5 py-1.5 rounded-lg text-[10px] font-mono cursor-default transition-all bg-muted/30 border border-border/50 text-muted-foreground hover:text-primary hover:border-primary/30">
                  {t}
                </motion.span>
              ))}
            </div>
          )}

          {/* Row 6 — live link */}
          {link && (
            <a href={link} target="_blank" rel="noreferrer"
              className="text-[10px] font-mono tracking-wide transition-colors"
              style={{ color: `${color}99` }}
              onMouseEnter={(e) => (e.currentTarget.style.color = color)}
              onMouseLeave={(e) => (e.currentTarget.style.color = `${color}99`)}>
              View Live ↗
            </a>
          )}
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-px" style={{ background: `linear-gradient(90deg, ${color}, transparent)` }} />
      </div>
    </motion.div>
  );
}

function SupplementaryCard({ project }: { project: SupProject }) {
  return (
    <a
      href={project.link}
      target="_blank"
      rel="noreferrer"
      className="group flex-shrink-0 w-64 p-4 rounded-xl border border-border/30 bg-card/40 no-underline transition-all duration-200 hover:border-primary/30 hover:bg-primary/[0.04]"
      style={{ scrollSnapAlign: "start" }}
    >
      <div className="text-sm font-semibold text-foreground/85 group-hover:text-foreground mb-1 transition-colors"
        style={{ fontFamily: "'Impact','Arial Black',sans-serif", letterSpacing: "0.02em" }}>
        {project.name}
      </div>
      <div className="text-[10px] font-mono text-primary/60 group-hover:text-primary mb-1.5 transition-colors tracking-wide">
        {project.domain}
      </div>
      <div className="text-[9px] font-mono text-muted-foreground/50 truncate mb-2.5">
        {project.tech}
      </div>
      <span className="inline-block text-[8px] font-mono tracking-widest uppercase px-2 py-0.5 rounded border border-border/40 text-muted-foreground/40">
        {project.platform}
      </span>
    </a>
  );
}

export const AnimeShowcase = () => {
  const sectionRef = useRef<HTMLElement>(null);
  const headingRef = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ["start end", "end start"] });
  const bgY = useTransform(scrollYProgress, [0, 1], ["0%", "20%"]);

  const featured = PROFILE.projects.filter((p) => p.featured);

  useEffect(() => {
    const ctx = gsap.context(() => {
      if (headingRef.current) {
        const els = headingRef.current.querySelectorAll(".reveal-el");
        gsap.fromTo(els, { y: 60, opacity: 0, skewY: 3 }, {
          y: 0, opacity: 1, skewY: 0, stagger: 0.12, duration: 1, ease: "power4.out",
          scrollTrigger: { trigger: headingRef.current, start: "top 80%" },
        });
      }
      if (cardsRef.current) {
        const cards = cardsRef.current.querySelectorAll(".project-card");
        cards.forEach((card, i) => {
          gsap.fromTo(card, { y: 100, opacity: 0, scale: 0.85, rotateX: 8 }, {
            y: 0, opacity: 1, scale: 1, rotateX: 0, duration: 1, ease: "power3.out", delay: i * 0.12,
            scrollTrigger: { trigger: card, start: "top 85%" },
          });
        });
      }
    }, sectionRef);
    return () => ctx.revert();
  }, []);

  return (
    <section id="showcase" ref={sectionRef} className="relative py-32 overflow-hidden">
      <motion.div style={{ y: bgY }} className="absolute inset-0 pointer-events-none">
        <img src={animeBattle} alt="" className="w-full h-full object-cover opacity-[0.08]"
          style={{ filter: "saturate(0.8) hue-rotate(-10deg)", mixBlendMode: "luminosity" }} />
        <div className="absolute inset-0 bg-gradient-to-b from-background via-transparent to-background" />
      </motion.div>

      <motion.img src={breathingTechnique} alt=""
        animate={{ opacity: [0.05, 0.12, 0.05], x: [0, 10, 0] }}
        transition={{ duration: 6, repeat: Infinity }}
        className="absolute right-0 top-1/2 -translate-y-1/2 w-80 pointer-events-none select-none"
        style={{ mixBlendMode: "screen", filter: "hue-rotate(-10deg)" }} />

      <div className="absolute left-0 top-0 bottom-0 w-px pointer-events-none"
        style={{ background: "linear-gradient(180deg, transparent, hsl(var(--primary) / 0.3), transparent)" }} />

      <div className="absolute inset-0 pointer-events-none opacity-[0.03] mix-blend-screen overflow-hidden">
        <video autoPlay muted loop playsInline className="w-full h-full object-cover" src="/videos/rand.mp4" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div ref={headingRef} className="mb-20">
          <div className="reveal-el flex items-center gap-4 mb-3">
            <div className="w-1.5 h-12 rounded-full bg-primary" style={{ boxShadow: "0 0 15px hsl(var(--primary))" }} />
            <span className="text-xs font-mono tracking-[0.3em] text-primary">作品集 • PROJECTS</span>
          </div>
          <h2 className="reveal-el text-6xl sm:text-8xl font-black leading-none"
            style={{ fontFamily: "'Impact','Arial Black',sans-serif" }}>
            <span className="text-gradient-crunchy">SHIPPED</span>
            <span className="text-foreground"> WORK</span>
          </h2>
          <div className="reveal-el flex items-center gap-3 mt-4">
            <div className="w-20 h-px bg-gradient-to-r from-primary/50 to-transparent" />
            <p className="text-muted-foreground font-mono text-sm">本番環境。実ユーザー。妥協なし。— Production. Real users. Zero shortcuts.</p>
          </div>
        </div>

        {/* Featured 2×2 grid */}
        <div ref={cardsRef} className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-10 mb-10" style={{ perspective: "1400px" }}>
          {featured.map((project, i) => (
            <MangaCard key={project.name} project={project} index={i} />
          ))}
        </div>

        {/* Supplementary horizontal scroll row */}
        <div className="flex gap-4 overflow-x-auto pb-3 mt-4 mb-12"
          style={{ scrollSnapType: "x mandatory", WebkitOverflowScrolling: "touch" as any }}>
          {SUPPLEMENTARY_PROJECTS.map((p) => (
            <SupplementaryCard key={p.name} project={p} />
          ))}
        </div>

        {/* View All Projects CTA */}
        <div className="text-center mb-24">
          <motion.a
            href="https://projectscopes.devamit.co.in"
            target="_blank"
            rel="noreferrer"
            whileHover={{ scale: 1.04, y: -2 }}
            whileTap={{ scale: 0.96 }}
            className="inline-flex items-center gap-3 px-8 py-4 rounded-xl font-mono text-sm font-bold tracking-widest uppercase no-underline transition-all"
            style={{ background: COLORS.orangeG, color: COLORS.bg, boxShadow: "0 0 40px rgba(244,117,33,0.25), 0 0 80px rgba(244,117,33,0.1)" }}
          >
            View All Projects
            <span style={{ fontSize: 16 }}>↗</span>
          </motion.a>
        </div>

        {/* Tech Stack */}
        <div className="mt-8">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-1.5 h-10 rounded-full bg-secondary" style={{ boxShadow: "0 0 12px hsl(var(--secondary))" }} />
            <div>
              <span className="text-xs font-mono tracking-[0.3em] text-secondary">技術スタック • ARSENAL</span>
              <h3 className="text-3xl font-black text-foreground mt-1"
                style={{ fontFamily: "'Impact','Arial Black',sans-serif" }}>
                TECH <span className="text-gradient-crunchy italic">STACK</span>
              </h3>
            </div>
          </div>
          <div className="p-8 rounded-2xl bg-card/30 border border-border/20 relative overflow-hidden">
            <div className="absolute inset-0 opacity-[0.02] pointer-events-none anime-grid" />
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
