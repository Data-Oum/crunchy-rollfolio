import breathingTechnique from "@/assets/breathing-technique.png";
import energyBlast from "@/assets/energy-blast.png";
import { PROFILE } from "@/data/profile";
import { motion, useInView } from "framer-motion";
import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

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
      <div className="h-1.5 w-full rounded-full bg-muted/50">
        <motion.div
          initial={{ width: 0 }}
          animate={inView ? { width: `${pct}%` } : {}}
          transition={{ duration: 1.3, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
          className="h-full rounded-full"
          style={{ background: `linear-gradient(90deg, ${color}80, ${color})`, boxShadow: `0 0 8px ${color}60` }}
        />
      </div>
    </div>
  );
}

function getPct(item: string) {
  const m = item.match(/(\d+)%/);
  return m ? parseInt(m[1]) : 88;
}

const SKILL_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--secondary))",
  "hsl(var(--anime-cyan))",
  "hsl(var(--anime-green))",
  "hsl(var(--anime-red))",
];

export const AnimeJourney = () => {
  const sectionRef = useRef<HTMLElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Timeline cards stagger with alternating direction
      if (timelineRef.current) {
        const items = timelineRef.current.querySelectorAll(".journey-card");
        items.forEach((el: Element, i: number) => {
          gsap.fromTo(el,
            { x: i % 2 === 0 ? -80 : 80, opacity: 0, scale: 0.9 },
            {
              x: 0, opacity: 1, scale: 1,
              duration: 0.8, ease: "power3.out",
              scrollTrigger: { trigger: el, start: "top 82%" },
            }
          );
        });
      }

      // Skill cards
      const skillCards = sectionRef.current?.querySelectorAll(".skill-card");
      if (skillCards) {
        gsap.fromTo(skillCards,
          { y: 50, opacity: 0, scale: 0.85 },
          {
            y: 0, opacity: 1, scale: 1,
            stagger: 0.08, duration: 0.7, ease: "back.out(1.4)",
            scrollTrigger: { trigger: skillCards[0], start: "top 80%" },
          }
        );
      }
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section id="journey" ref={sectionRef} className="relative py-24 overflow-hidden"
      style={{ background: "linear-gradient(180deg, hsl(var(--background)), hsl(0 0% 3%), hsl(var(--background)))" }}>

      {/* BG assets */}
      <motion.img src={breathingTechnique} alt=""
        animate={{ opacity: [0.04, 0.09, 0.04], rotate: [0, 2, 0] }}
        transition={{ duration: 8, repeat: Infinity }}
        className="absolute left-0 bottom-0 w-80 pointer-events-none select-none"
        style={{ mixBlendMode: "screen", filter: "hue-rotate(20deg)" }} />
      <motion.img src={energyBlast} alt=""
        animate={{ opacity: [0.03, 0.07, 0.03] }}
        transition={{ duration: 6, repeat: Infinity }}
        className="absolute right-0 top-0 w-64 pointer-events-none select-none"
        style={{ mixBlendMode: "screen", transform: "rotate(180deg)" }} />

      {/* Purple accent right */}
      <div className="absolute right-0 top-0 bottom-0 w-1 pointer-events-none"
        style={{ background: "linear-gradient(180deg, transparent, hsl(var(--secondary) / 0.4), transparent)" }} />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Header */}
        <div className="mb-16">
          <div className="flex items-center gap-4 mb-2">
            <div className="w-1 h-10 rounded-full bg-secondary" style={{ boxShadow: "0 0 12px hsl(var(--secondary))" }} />
            <span className="text-xs font-mono tracking-widest text-secondary">冒険の旅 • TIMELINE</span>
          </div>
          <h2 className="text-5xl sm:text-6xl font-black leading-none"
            style={{ fontFamily: "'Impact','Arial Black',sans-serif" }}>
            <span className="text-foreground">THE </span>
            <span className="text-primary italic" style={{ textShadow: "0 0 40px hsl(var(--primary) / 0.3)" }}>ARC</span>
          </h2>
          <p className="text-muted-foreground font-mono text-sm mt-2">Every legend has an origin story.</p>
        </div>

        {/* Timeline */}
        <div ref={timelineRef} className="relative mb-24">
          {/* Center line */}
          <div className="absolute left-5 sm:left-1/2 top-0 bottom-0 w-px overflow-hidden">
            <div className="absolute inset-0"
              style={{ background: "linear-gradient(180deg, hsl(var(--primary) / 0.5), hsl(var(--secondary) / 0.4), transparent)" }} />
            <motion.div
              animate={{ y: ["0%", "100%"] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }}
              className="absolute top-0 w-full h-20"
              style={{ background: "linear-gradient(180deg, transparent, hsl(var(--primary)), transparent)" }} />
          </div>

          {PROFILE.journey.map((item, i) => {
            const isRight = i % 2 !== 0;
            return (
              <div key={item.yr}
                className={`journey-card relative flex items-start mb-12 gap-6 ${isRight ? "sm:flex-row-reverse" : "sm:flex-row"} flex-row`}>
                {/* Node */}
                <div className="absolute left-5 sm:left-1/2 -translate-x-1/2 z-10 mt-1.5">
                  <motion.div
                    whileInView={{ scale: [0, 1.4, 1] }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5 }}
                    className="w-3.5 h-3.5 rounded-full border-2 border-background"
                    style={{
                      background: item.yr === "Now" ? "hsl(var(--primary))" : "hsl(var(--secondary))",
                      boxShadow: `0 0 14px ${item.yr === "Now" ? "hsl(var(--primary))" : "hsl(var(--secondary))"}`,
                    }}
                  />
                </div>

                {/* Card */}
                <div className={`ml-12 sm:ml-0 sm:w-[calc(50%-2.5rem)] ${isRight ? "sm:ml-10" : "sm:mr-10"}`}>
                  <motion.div whileHover={{ scale: 1.02, y: -2 }}
                    className="p-4 rounded-xl relative overflow-hidden bg-card/60 border border-border/30">
                    <span className="inline-block px-2 py-0.5 rounded font-mono text-xs font-bold mb-2 text-primary-foreground"
                      style={{
                        background: item.yr === "Now" ? "hsl(var(--primary))" : "hsl(var(--secondary) / 0.3)",
                        boxShadow: item.yr === "Now" ? "0 0 12px hsl(var(--primary) / 0.4)" : "none",
                      }}>
                      {item.yr}
                      {item.yr === "Now" && <span className="ml-1 inline-block w-1.5 h-1.5 rounded-full bg-primary-foreground animate-pulse" />}
                    </span>
                    <h3 className="text-base font-black text-foreground mb-1"
                      style={{ fontFamily: "'Impact','Arial Black',sans-serif", letterSpacing: "0.02em" }}>
                      {item.title}
                    </h3>
                    <p className="text-muted-foreground text-sm font-mono leading-relaxed">{item.desc}</p>
                    {/* Corner accent */}
                    <div className="absolute bottom-0 right-0 w-6 h-6 opacity-20">
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
          <div className="flex items-center gap-4 mb-10">
            <div className="w-1 h-10 rounded-full bg-primary" style={{ boxShadow: "0 0 12px hsl(var(--primary))" }} />
            <div>
              <span className="text-xs font-mono tracking-widest block text-primary">能力 • ABILITIES</span>
              <h2 className="text-4xl sm:text-5xl font-black text-foreground"
                style={{ fontFamily: "'Impact','Arial Black',sans-serif" }}>
                POWER <span className="text-primary italic">LEVELS</span>
              </h2>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {PROFILE.skills.map((skill, si) => {
              const color = SKILL_COLORS[si % SKILL_COLORS.length];
              return (
                <motion.div key={skill.cat} whileHover={{ y: -4 }}
                  className="skill-card p-5 rounded-xl relative overflow-hidden group bg-card/50 border border-border/30">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-1 h-5 rounded-full" style={{ background: color, boxShadow: `0 0 8px ${color}` }} />
                    <span className="text-xs font-mono font-bold tracking-widest" style={{ color }}>{skill.cat.toUpperCase()}</span>
                  </div>
                  {skill.items.map((item) => (
                    <PowerBar key={item} label={item} pct={getPct(item)} color={color} />
                  ))}
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl pointer-events-none"
                    style={{ boxShadow: `inset 0 0 0 1px ${color}` }} />
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};
