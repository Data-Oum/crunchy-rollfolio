import animeBattle from "@/assets/anime-battle.png";
import breathingTechnique from "@/assets/breathing-technique.png";
import { PROFILE } from "@/data/profile";
import { motion, useMotionValue, useTransform } from "framer-motion";
import { useEffect, useRef } from "react";

let gsap: any = null;
let ScrollTrigger: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const g = require("gsap");
  const st = require("gsap/ScrollTrigger");
  gsap = g.gsap ?? g.default ?? g;
  ScrollTrigger = st.ScrollTrigger;
  if (gsap && ScrollTrigger) gsap.registerPlugin(ScrollTrigger);
} catch {}

const CR_ORANGE = "#F47521";
const CR_PURPLE = "#7B2FBE";

const BADGE_STYLES: Record<string, { gradient: string; glow: string }> = {
  "FLAGSHIP · HEALTHTECH": {
    gradient: `linear-gradient(135deg, #F47521, #e8620a)`,
    glow: "#F47521",
  },
  "AI PLATFORM": {
    gradient: `linear-gradient(135deg, ${CR_PURPLE}, #5a1f9e)`,
    glow: CR_PURPLE,
  },
  "SPORTS · FINTECH": {
    gradient: `linear-gradient(135deg, #00b4d8, #0077b6)`,
    glow: "#00b4d8",
  },
  "WEB3 · DEFI": {
    gradient: `linear-gradient(135deg, #2ecc71, #1a9e52)`,
    glow: "#2ecc71",
  },
};

function HoloCard({
  children,
  index,
}: {
  children: React.ReactNode;
  index: number;
}) {
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
      onMouseLeave={() => {
        mx.set(0);
        my.set(0);
      }}
      initial={{ opacity: 0, y: 60 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{
        delay: index * 0.1,
        duration: 0.7,
        ease: [0.16, 1, 0.3, 1],
      }}
      className="group cursor-default h-full"
    >
      {children}
    </motion.div>
  );
}

export const AnimeShowcase = () => {
  const sectionRef = useRef<HTMLElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (!gsap || !ScrollTrigger || !headingRef.current) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        headingRef.current,
        { x: -80, opacity: 0 },
        {
          x: 0,
          opacity: 1,
          duration: 1.1,
          ease: "power4.out",
          scrollTrigger: {
            trigger: headingRef.current,
            start: "top 80%",
            toggleActions: "play none none none",
          },
        },
      );
    }, sectionRef);
    return () => ctx.revert();
  }, []);

  return (
    <section
      id="showcase"
      ref={sectionRef}
      className="relative py-24 overflow-hidden"
      // style={{ background: "linear-gradient(180deg,#0a0007,#06040a,#0a0007)" }}
    >
      {/* Battle BG */}
      <div className="absolute inset-0 pointer-events-none">
        <img
          src={animeBattle}
          alt=""
          className="w-full h-full object-cover opacity-[0.07]"
          style={{ filter: "saturate(0.8)", mixBlendMode: "luminosity" }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a0007] via-transparent to-[#0a0007]" />
      </div>

      {/* Breathing technique right-side accent */}
      <motion.img
        src={breathingTechnique}
        alt=""
        animate={{ opacity: [0.05, 0.1, 0.05], x: [0, 8, 0] }}
        transition={{ duration: 6, repeat: Infinity }}
        className="absolute right-0 top-1/2 -translate-y-1/2 w-72 pointer-events-none select-none"
        style={{ mixBlendMode: "screen", filter: "hue-rotate(30deg)" }}
      />

      {/* Orange vertical accent left */}
      <div
        className="absolute left-0 top-0 bottom-0 w-1 pointer-events-none"
        style={{
          background: `linear-gradient(180deg,transparent,${CR_ORANGE}60,transparent)`,
        }}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Header */}
        <div className="mb-16">
          <div className="flex items-center gap-4 mb-2">
            <div
              className="w-1 h-10 rounded-full"
              style={{
                background: CR_ORANGE,
                boxShadow: `0 0 12px ${CR_ORANGE}`,
              }}
            />
            <span
              className="text-xs font-mono tracking-widest"
              style={{ color: CR_ORANGE }}
            >
              作品集 • PROJECTS
            </span>
          </div>
          <h2
            ref={headingRef}
            className="text-5xl sm:text-7xl font-black leading-none"
            style={{ fontFamily: "'Impact','Arial Black',sans-serif" }}
          >
            <span
              style={{
                color: CR_ORANGE,
                textShadow: `0 0 40px ${CR_ORANGE}50`,
              }}
            >
              SHIPPED
            </span>
            <span className="text-white"> WORK</span>
          </h2>
          <p className="text-white/40 font-mono text-sm mt-3">
            Production systems. Real users. Zero shortcuts.
          </p>
        </div>

        {/* Cards */}
        <div
          className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8"
          style={{ perspective: "1200px" }}
        >
          {PROFILE.projects.map((project, i) => {
            const style = BADGE_STYLES[project.badge] ?? {
              gradient: `linear-gradient(135deg,${CR_ORANGE},${CR_PURPLE})`,
              glow: CR_ORANGE,
            };
            return (
              <HoloCard key={project.name} index={i}>
                <div
                  className="relative rounded-2xl overflow-hidden h-full"
                  style={{
                    background: "rgba(10,8,15,0.85)",
                    border: `1px solid rgba(244,117,33,0.15)`,
                    boxShadow: "0 4px 30px rgba(0,0,0,0.5)",
                  }}
                >
                  {/* Top bar */}
                  <div
                    className="h-1 w-full"
                    style={{ background: style.gradient }}
                  />

                  {/* Card # watermark */}
                  <div className="absolute top-4 right-4 text-5xl font-black opacity-[0.04] font-mono text-white select-none">
                    {String(i + 1).padStart(2, "0")}
                  </div>

                  {/* Hover glow */}
                  <div
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none rounded-2xl"
                    style={{
                      boxShadow: `inset 0 0 0 1px ${style.glow}40, 0 0 40px ${style.glow}15`,
                    }}
                  />

                  <div className="p-6 relative">
                    {/* Badge */}
                    <span
                      className="inline-block px-2.5 py-0.5 rounded-lg text-[10px] font-mono font-bold tracking-widest mb-4 text-white"
                      style={{
                        background: style.gradient,
                        boxShadow: `0 0 12px ${style.glow}50`,
                      }}
                    >
                      {project.badge}
                    </span>

                    <h3
                      className="text-xl sm:text-2xl font-black text-white mb-1 transition-colors group-hover:text-orange-400 duration-300"
                      style={{
                        fontFamily: "'Impact','Arial Black',sans-serif",
                        letterSpacing: "0.03em",
                      }}
                    >
                      {project.name}
                    </h3>
                    <p
                      className="text-sm font-mono mb-3 italic"
                      style={{ color: `${CR_ORANGE}cc` }}
                    >
                      {project.tagline}
                    </p>
                    <p className="text-white/50 text-sm leading-relaxed mb-5">
                      {project.desc}
                    </p>

                    {/* Impact */}
                    <div
                      className="flex items-center gap-2 mb-5 px-3 py-2 rounded-xl"
                      style={{
                        background: "rgba(244,117,33,0.06)",
                        border: "1px solid rgba(244,117,33,0.15)",
                      }}
                    >
                      <span
                        className="text-[9px] font-mono tracking-widest"
                        style={{ color: CR_ORANGE }}
                      >
                        ⚡ IMPACT
                      </span>
                      <div className="w-px h-3 bg-orange-500/30" />
                      <span className="text-xs font-mono text-white/50">
                        {project.impact}
                      </span>
                    </div>

                    {/* Tech tags */}
                    <div className="flex flex-wrap gap-1.5">
                      {project.tech.map((t) => (
                        <motion.span
                          key={t}
                          whileHover={{ scale: 1.06, y: -2 }}
                          className="px-2 py-1 rounded-lg text-[11px] font-mono cursor-default transition-all"
                          style={{
                            background: "rgba(255,255,255,0.04)",
                            border: "1px solid rgba(255,255,255,0.08)",
                            color: "rgba(255,255,255,0.5)",
                          }}
                        >
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
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-20"
        >
          <div className="flex items-center gap-4 mb-6">
            <div
              className="w-1 h-8 rounded-full"
              style={{
                background: CR_PURPLE,
                boxShadow: `0 0 10px ${CR_PURPLE}`,
              }}
            />
            <span
              className="text-xs font-mono tracking-widest"
              style={{ color: CR_PURPLE }}
            >
              技術スタック • TECH STACK
            </span>
          </div>
          <div
            className="p-6 rounded-2xl"
            style={{
              background: "rgba(255,255,255,0.02)",
              border: "1px solid rgba(255,255,255,0.05)",
            }}
          >
            <div className="flex flex-wrap gap-2">
              {PROFILE.techStack.map((tech, i) => (
                <motion.span
                  key={tech}
                  initial={{ opacity: 0, scale: 0.7 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.022 }}
                  whileHover={{ scale: 1.12, y: -3 }}
                  className="px-2.5 py-1 rounded-lg text-xs font-mono cursor-default transition-all"
                  style={{
                    background: "rgba(244,117,33,0.05)",
                    border: "1px solid rgba(244,117,33,0.15)",
                    color: "rgba(255,255,255,0.55)",
                  }}
                  onMouseEnter={(e) => {
                    (e.target as HTMLElement).style.color = CR_ORANGE;
                    (e.target as HTMLElement).style.borderColor =
                      `${CR_ORANGE}50`;
                  }}
                  onMouseLeave={(e) => {
                    (e.target as HTMLElement).style.color =
                      "rgba(255,255,255,0.55)";
                    (e.target as HTMLElement).style.borderColor =
                      "rgba(244,117,33,0.15)";
                  }}
                >
                  {tech}
                </motion.span>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};
