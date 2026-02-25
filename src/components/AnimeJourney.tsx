import breathingTechnique from "@/assets/breathing-technique.png";
import energyBlast from "@/assets/energy-blast.png";
import { PROFILE } from "@/data/profile";
import { motion, useInView } from "framer-motion";
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

function PowerBar({
  label,
  pct,
  color,
}: {
  label: string;
  pct: number;
  color: string;
}) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });
  const clean = label.replace(/\s\d+%$/, "");
  const labelPct = label.match(/(\d+)%/)?.[1];
  return (
    <div ref={ref} className="mb-3">
      <div className="flex justify-between mb-1">
        <span className="text-xs font-mono text-white/60">{clean}</span>
        {labelPct && (
          <span className="text-[10px] font-mono" style={{ color }}>
            {labelPct}%
          </span>
        )}
      </div>
      <div
        className="h-1.5 w-full rounded-full"
        style={{ background: "rgba(255,255,255,0.07)" }}
      >
        <motion.div
          initial={{ width: 0 }}
          animate={inView ? { width: `${pct}%` } : {}}
          transition={{ duration: 1.3, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
          className="h-full rounded-full"
          style={{
            background: `linear-gradient(90deg,${color}80,${color})`,
            boxShadow: `0 0 8px ${color}60`,
          }}
        />
      </div>
    </div>
  );
}

function getPct(item: string) {
  const m = item.match(/(\d+)%/);
  return m ? parseInt(m[1]) : 88;
}

const SKILL_COLORS = [CR_ORANGE, CR_PURPLE, "#00b4d8", "#2ecc71", "#e91e8c"];

export const AnimeJourney = () => {
  const sectionRef = useRef<HTMLElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!gsap || !ScrollTrigger || !timelineRef.current) return;
    const ctx = gsap.context(() => {
      const items = timelineRef.current!.querySelectorAll(".journey-card");
      items.forEach((el: Element, i: number) => {
        gsap.fromTo(
          el,
          { x: i % 2 === 0 ? -60 : 60, opacity: 0 },
          {
            x: 0,
            opacity: 1,
            duration: 0.7,
            ease: "power3.out",
            scrollTrigger: {
              trigger: el,
              start: "top 82%",
              toggleActions: "play none none none",
            },
          },
        );
      });
    }, sectionRef);
    return () => ctx.revert();
  }, []);

  return (
    <section
      id="journey"
      ref={sectionRef}
      className="relative py-24 overflow-hidden"
      style={{ background: "linear-gradient(180deg,#06040a,#0a0007)" }}
    >
      {/* BG assets */}
      <motion.img
        src={breathingTechnique}
        alt=""
        animate={{ opacity: [0.04, 0.09, 0.04], rotate: [0, 2, 0] }}
        transition={{ duration: 8, repeat: Infinity }}
        className="absolute left-0 bottom-0 w-80 pointer-events-none select-none"
        style={{ mixBlendMode: "screen", filter: "hue-rotate(20deg)" }}
      />
      <motion.img
        src={energyBlast}
        alt=""
        animate={{ opacity: [0.03, 0.07, 0.03] }}
        transition={{ duration: 6, repeat: Infinity }}
        className="absolute right-0 top-0 w-64 pointer-events-none select-none"
        style={{ mixBlendMode: "screen", transform: "rotate(180deg)" }}
      />

      {/* Purple right accent */}
      <div
        className="absolute right-0 top-0 bottom-0 w-1 pointer-events-none"
        style={{
          background: `linear-gradient(180deg,transparent,${CR_PURPLE}60,transparent)`,
        }}
      />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Header */}
        <div className="mb-16">
          <div className="flex items-center gap-4 mb-2">
            <div
              className="w-1 h-10 rounded-full"
              style={{
                background: CR_PURPLE,
                boxShadow: `0 0 12px ${CR_PURPLE}`,
              }}
            />
            <span
              className="text-xs font-mono tracking-widest"
              style={{ color: CR_PURPLE }}
            >
              冒険の旅 • TIMELINE
            </span>
          </div>
          <h2
            className="text-5xl sm:text-6xl font-black leading-none"
            style={{ fontFamily: "'Impact','Arial Black',sans-serif" }}
          >
            <span className="text-white">THE </span>
            <span
              style={{
                color: CR_ORANGE,
                textShadow: `0 0 40px ${CR_ORANGE}50`,
                fontStyle: "italic",
              }}
            >
              ARC
            </span>
          </h2>
          <p className="text-white/35 font-mono text-sm mt-2">
            Every legend has an origin story.
          </p>
        </div>

        {/* Timeline */}
        <div ref={timelineRef} className="relative mb-24">
          {/* Center line */}
          <div className="absolute left-5 sm:left-1/2 top-0 bottom-0 w-px overflow-hidden">
            <div
              className="absolute inset-0"
              style={{
                background: `linear-gradient(180deg,${CR_ORANGE}80,${CR_PURPLE}60,transparent)`,
              }}
            />
            <motion.div
              animate={{ y: ["0%", "100%"] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }}
              className="absolute top-0 w-full h-20"
              style={{
                background: `linear-gradient(180deg,transparent,${CR_ORANGE},transparent)`,
              }}
            />
          </div>

          {PROFILE.journey.map((item, i) => {
            const isRight = i % 2 !== 0;
            return (
              <div
                key={item.yr}
                className={`journey-card relative flex items-start mb-12 gap-6 ${isRight ? "sm:flex-row-reverse" : "sm:flex-row"} flex-row`}
              >
                {/* Node */}
                <div className="absolute left-5 sm:left-1/2 -translate-x-1/2 z-10 mt-1.5">
                  <motion.div
                    whileInView={{ scale: [0, 1.4, 1] }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5 }}
                    className="w-3.5 h-3.5 rounded-full border-2 border-[#0a0007]"
                    style={{
                      background: item.yr === "Now" ? CR_ORANGE : CR_PURPLE,
                      boxShadow: `0 0 14px ${item.yr === "Now" ? CR_ORANGE : CR_PURPLE}`,
                    }}
                  />
                </div>

                {/* Card */}
                <div
                  className={`ml-12 sm:ml-0 sm:w-[calc(50%-2.5rem)] ${isRight ? "sm:ml-10" : "sm:mr-10"}`}
                >
                  <motion.div
                    whileHover={{ scale: 1.02, y: -2 }}
                    className="p-4 rounded-xl relative overflow-hidden"
                    style={{
                      background: "rgba(10,8,15,0.8)",
                      border: "1px solid rgba(255,255,255,0.06)",
                    }}
                  >
                    {/* Year pill */}
                    <span
                      className="inline-block px-2 py-0.5 rounded font-mono text-xs font-bold mb-2 text-white"
                      style={{
                        background:
                          item.yr === "Now"
                            ? CR_ORANGE
                            : "rgba(123,47,190,0.3)",
                        boxShadow:
                          item.yr === "Now"
                            ? `0 0 12px ${CR_ORANGE}60`
                            : "none",
                      }}
                    >
                      {item.yr}
                      {item.yr === "Now" && (
                        <span className="ml-1 inline-block w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                      )}
                    </span>
                    <h3
                      className="text-base font-black text-white mb-1"
                      style={{
                        fontFamily: "'Impact','Arial Black',sans-serif",
                        letterSpacing: "0.02em",
                      }}
                    >
                      {item.title}
                    </h3>
                    <p className="text-white/45 text-sm font-mono leading-relaxed">
                      {item.desc}
                    </p>
                    {/* Corner accent */}
                    <div className="absolute bottom-0 right-0 w-6 h-6 opacity-20">
                      <div
                        className="absolute bottom-0 right-0 w-full h-px"
                        style={{ background: CR_ORANGE }}
                      />
                      <div
                        className="absolute bottom-0 right-0 h-full w-px"
                        style={{ background: CR_ORANGE }}
                      />
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
            <div
              className="w-1 h-10 rounded-full"
              style={{
                background: CR_ORANGE,
                boxShadow: `0 0 12px ${CR_ORANGE}`,
              }}
            />
            <div>
              <span
                className="text-xs font-mono tracking-widest block"
                style={{ color: CR_ORANGE }}
              >
                能力 • ABILITIES
              </span>
              <h2
                className="text-4xl sm:text-5xl font-black"
                style={{ fontFamily: "'Impact','Arial Black',sans-serif" }}
              >
                POWER{" "}
                <span style={{ color: CR_ORANGE, fontStyle: "italic" }}>
                  LEVELS
                </span>
              </h2>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {PROFILE.skills.map((skill, si) => {
              const color = SKILL_COLORS[si % SKILL_COLORS.length];
              return (
                <motion.div
                  key={skill.cat}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: si * 0.07 }}
                  whileHover={{ y: -4 }}
                  className="p-5 rounded-xl relative overflow-hidden group"
                  style={{
                    background: "rgba(10,8,15,0.75)",
                    border: `1px solid rgba(255,255,255,0.05)`,
                  }}
                >
                  {/* Category header */}
                  <div className="flex items-center gap-2 mb-4">
                    <div
                      className="w-1 h-5 rounded-full"
                      style={{
                        background: color,
                        boxShadow: `0 0 8px ${color}`,
                      }}
                    />
                    <span
                      className="text-xs font-mono font-bold tracking-widest"
                      style={{ color }}
                    >
                      {skill.cat.toUpperCase()}
                    </span>
                  </div>
                  {skill.items.map((item) => (
                    <PowerBar
                      key={item}
                      label={item}
                      pct={getPct(item)}
                      color={color}
                    />
                  ))}
                  {/* Hover glow */}
                  <div
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl pointer-events-none"
                    style={{ boxShadow: `inset 0 0 0 1px ${color}25` }}
                  />
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};
