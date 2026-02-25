import breathingTechnique from "@/assets/breathing-technique.png";
import energyBlast from "@/assets/energy-blast.png";
import { PROFILE } from "@/data/profile";
import { motion, useInView, useScroll, useTransform } from "framer-motion";
import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

// ─── Power Bar ───────────────────────────────────────────────
function PowerBar({ label, pct, color }: { label: string; pct: number; color: string }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });
  const clean = label.replace(/\s\d+%$/, "");
  const labelPct = label.match(/(\d+)%/)?.[1];
  return (
    <div ref={ref} className="mb-3">
      <div className="flex justify-between mb-1">
        <span className="text-xs font-mono text-muted-foreground">{clean}</span>
        {labelPct && <span className="text-[10px] font-mono" style={{ color }}>{labelPct}%</span>}
      </div>
      <div className="h-2 w-full rounded-full bg-muted/40 overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={inView ? { width: `${pct}%` } : {}}
          transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
          className="h-full rounded-full relative"
          style={{ background: `linear-gradient(90deg, ${color}60, ${color})`, boxShadow: `0 0 12px ${color}40` }}
        >
          {/* Shine sweep */}
          <motion.div
            className="absolute inset-0"
            style={{ background: "linear-gradient(90deg, transparent 40%, hsl(0 0% 100% / 0.2) 50%, transparent 60%)" }}
            animate={inView ? { x: ["-100%", "200%"] } : {}}
            transition={{ duration: 2, delay: 1.5 }}
          />
        </motion.div>
      </div>
    </div>
  );
}

function getPct(item: string) {
  const m = item.match(/(\d+)%/);
  return m ? parseInt(m[1]) : 88;
}

const SKILL_COLORS = [
  "hsl(25, 93%, 54%)",
  "hsl(270, 60%, 55%)",
  "hsl(199, 90%, 70%)",
  "hsl(160, 67%, 52%)",
  "hsl(0, 100%, 60%)",
];

// ═══════════════════════════════════════════════════════════════
//  JOURNEY
// ═══════════════════════════════════════════════════════════════
export const AnimeJourney = () => {
  const sectionRef = useRef<HTMLElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ["start end", "end start"] });
  const bgY = useTransform(scrollYProgress, [0, 1], ["0%", "15%"]);

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Heading
      if (headingRef.current) {
        const els = headingRef.current.querySelectorAll(".reveal-el");
        gsap.fromTo(els,
          { y: 50, opacity: 0, skewY: 2 },
          {
            y: 0, opacity: 1, skewY: 0,
            stagger: 0.1, duration: 0.9, ease: "power4.out",
            scrollTrigger: { trigger: headingRef.current, start: "top 80%" },
          }
        );
      }

      // Timeline cards
      if (timelineRef.current) {
        const items = timelineRef.current.querySelectorAll(".journey-card");
        items.forEach((el: Element, i: number) => {
          gsap.fromTo(el,
            { x: i % 2 === 0 ? -100 : 100, opacity: 0, scale: 0.85 },
            {
              x: 0, opacity: 1, scale: 1,
              duration: 0.9, ease: "power3.out",
              scrollTrigger: { trigger: el, start: "top 82%" },
            }
          );
        });
      }

      // Skill cards
      const skillCards = sectionRef.current?.querySelectorAll(".skill-card");
      if (skillCards?.length) {
        gsap.fromTo(skillCards,
          { y: 60, opacity: 0, scale: 0.8, rotateX: 5 },
          {
            y: 0, opacity: 1, scale: 1, rotateX: 0,
            stagger: 0.08, duration: 0.8, ease: "back.out(1.4)",
            scrollTrigger: { trigger: skillCards[0], start: "top 80%" },
          }
        );
      }
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section id="journey" ref={sectionRef} className="relative py-32 overflow-hidden"
      style={{ background: "linear-gradient(180deg, hsl(var(--background)), hsl(0 0% 1.5%), hsl(var(--background)))" }}>

      {/* Parallax BG assets */}
      <motion.div style={{ y: bgY }} className="absolute inset-0 pointer-events-none">
        <motion.img src={breathingTechnique} alt=""
          animate={{ opacity: [0.04, 0.1, 0.04], rotate: [0, 2, 0] }}
          transition={{ duration: 8, repeat: Infinity }}
          className="absolute left-0 bottom-0 w-96 select-none"
          style={{ mixBlendMode: "screen", filter: "hue-rotate(20deg)" }} />
        <motion.img src={energyBlast} alt=""
          animate={{ opacity: [0.03, 0.08, 0.03] }}
          transition={{ duration: 6, repeat: Infinity }}
          className="absolute right-0 top-0 w-72 select-none"
          style={{ mixBlendMode: "screen", transform: "rotate(180deg)" }} />
      </motion.div>

      {/* Accent lines */}
      <div className="absolute right-0 top-0 bottom-0 w-px pointer-events-none"
        style={{ background: "linear-gradient(180deg, transparent, hsl(var(--secondary) / 0.4), transparent)" }} />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Header */}
        <div ref={headingRef} className="mb-20">
          <div className="reveal-el flex items-center gap-4 mb-3">
            <div className="w-1.5 h-12 rounded-full bg-secondary" style={{ boxShadow: "0 0 15px hsl(var(--secondary))" }} />
            <span className="text-xs font-mono tracking-[0.3em] text-secondary">冒険の旅 • THE ARC</span>
          </div>
          <h2 className="reveal-el text-6xl sm:text-7xl font-black leading-none"
            style={{ fontFamily: "'Impact','Arial Black',sans-serif" }}>
            <span className="text-foreground">THE </span>
            <span className="text-primary italic" style={{ textShadow: "0 0 50px hsl(var(--primary) / 0.3)" }}>ARC</span>
          </h2>
          <div className="reveal-el flex items-center gap-3 mt-4">
            <div className="w-20 h-px bg-gradient-to-r from-secondary/50 to-transparent" />
            <p className="text-muted-foreground font-mono text-sm">Every legend has an origin story.</p>
          </div>
        </div>

        {/* Timeline */}
        <div ref={timelineRef} className="relative mb-28">
          {/* Center line with energy flow */}
          <div className="absolute left-5 sm:left-1/2 top-0 bottom-0 w-px overflow-hidden">
            <div className="absolute inset-0"
              style={{ background: "linear-gradient(180deg, hsl(var(--primary) / 0.6), hsl(var(--secondary) / 0.4), transparent)" }} />
            <motion.div
              animate={{ y: ["0%", "100%"] }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              className="absolute top-0 w-full h-24"
              style={{ background: "linear-gradient(180deg, transparent, hsl(var(--primary)), transparent)" }} />
          </div>

          {PROFILE.journey.map((item, i) => {
            const isRight = i % 2 !== 0;
            const isNow = item.yr === "Now";
            return (
              <div key={item.yr}
                className={`journey-card relative flex items-start mb-14 gap-6 ${isRight ? "sm:flex-row-reverse" : "sm:flex-row"} flex-row`}>
                {/* Node */}
                <div className="absolute left-5 sm:left-1/2 -translate-x-1/2 z-10 mt-1.5">
                  <motion.div
                    whileInView={{ scale: [0, 1.5, 1] }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6 }}
                    className="w-4 h-4 rounded-full border-2 border-background"
                    style={{
                      background: isNow ? "hsl(var(--primary))" : "hsl(var(--secondary))",
                      boxShadow: `0 0 18px ${isNow ? "hsl(var(--primary))" : "hsl(var(--secondary))"}`,
                    }}
                  />
                </div>

                {/* Card */}
                <div className={`ml-12 sm:ml-0 sm:w-[calc(50%-2.5rem)] ${isRight ? "sm:ml-10" : "sm:mr-10"}`}>
                  <motion.div whileHover={{ scale: 1.03, y: -3 }}
                    className="p-5 rounded-xl relative overflow-hidden bg-card/60 border border-border/30 group">
                    {/* Hover energy */}
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                      style={{ background: `radial-gradient(circle at 50% 50%, ${isNow ? "hsl(var(--primary) / 0.05)" : "hsl(var(--secondary) / 0.03)"}, transparent 70%)` }} />
                    
                    <span className="inline-block px-2.5 py-0.5 rounded font-mono text-xs font-bold mb-3 text-primary-foreground"
                      style={{
                        background: isNow ? "hsl(var(--primary))" : "hsl(var(--secondary) / 0.3)",
                        boxShadow: isNow ? "0 0 15px hsl(var(--primary) / 0.4)" : "none",
                      }}>
                      {item.yr}
                      {isNow && <span className="ml-1.5 inline-block w-1.5 h-1.5 rounded-full bg-primary-foreground animate-pulse" />}
                    </span>
                    <h3 className="text-lg font-black text-foreground mb-1.5"
                      style={{ fontFamily: "'Impact','Arial Black',sans-serif", letterSpacing: "0.02em" }}>
                      {item.title}
                    </h3>
                    <p className="text-muted-foreground text-sm font-mono leading-relaxed">{item.desc}</p>
                    
                    {/* Corner accent */}
                    <div className="absolute bottom-0 right-0 w-8 h-8 opacity-20">
                      <div className="absolute bottom-0 right-0 w-full h-px bg-primary" />
                      <div className="absolute bottom-0 right-0 h-full w-px bg-primary" />
                    </div>
                  </motion.div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Skills / Power Levels */}
        <div>
          <div className="flex items-center gap-4 mb-12">
            <div className="w-1.5 h-12 rounded-full bg-primary" style={{ boxShadow: "0 0 15px hsl(var(--primary))" }} />
            <div>
              <span className="text-xs font-mono tracking-[0.3em] block text-primary">能力 • ABILITIES</span>
              <h2 className="text-5xl sm:text-6xl font-black text-foreground"
                style={{ fontFamily: "'Impact','Arial Black',sans-serif" }}>
                POWER <span className="text-primary italic">LEVELS</span>
              </h2>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {PROFILE.skills.map((skill, si) => {
              const color = SKILL_COLORS[si % SKILL_COLORS.length];
              return (
                <motion.div key={skill.cat} whileHover={{ y: -6 }}
                  className="skill-card p-6 rounded-xl relative overflow-hidden group bg-card/50 border border-border/30">
                  {/* Category header */}
                  <div className="flex items-center gap-2.5 mb-5">
                    <div className="w-1.5 h-6 rounded-full" style={{ background: color, boxShadow: `0 0 10px ${color}` }} />
                    <span className="text-xs font-mono font-bold tracking-[0.2em]" style={{ color }}>{skill.cat.toUpperCase()}</span>
                  </div>
                  {skill.items.map((item) => (
                    <PowerBar key={item} label={item} pct={getPct(item)} color={color} />
                  ))}
                  {/* Hover glow */}
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-xl pointer-events-none"
                    style={{ boxShadow: `inset 0 0 0 1px ${color}40, 0 0 30px ${color}15` }} />
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};
