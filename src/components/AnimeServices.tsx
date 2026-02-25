import { PROFILE } from "@/data/profile";
import { motion } from "framer-motion";
import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const BMC_URL = "https://buymeacoffee.com/amithellmab";

export const AnimeServices = () => {
  const sectionRef = useRef<HTMLElement>(null);
  const headingRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      if (headingRef.current) {
        const els = headingRef.current.querySelectorAll(".reveal-el");
        gsap.fromTo(els, { y: 50, opacity: 0 }, {
          y: 0, opacity: 1, stagger: 0.1, duration: 0.9, ease: "power4.out",
          scrollTrigger: { trigger: headingRef.current, start: "top 80%" },
        });
      }
      const cards = sectionRef.current?.querySelectorAll(".service-card");
      if (cards?.length) {
        gsap.fromTo(cards, { y: 80, opacity: 0, scale: 0.85 }, {
          y: 0, opacity: 1, scale: 1, stagger: 0.12, duration: 0.9, ease: "power3.out",
          scrollTrigger: { trigger: cards[0], start: "top 82%" },
        });
      }
    }, sectionRef);
    return () => ctx.revert();
  }, []);

  return (
    <section id="services" ref={sectionRef} className="relative py-32 overflow-hidden"
      style={{ background: "linear-gradient(180deg, hsl(var(--background)), hsl(240 6% 2%), hsl(var(--background)))" }}>

      <div className="absolute inset-0 pointer-events-none anime-grid opacity-50" />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div ref={headingRef} className="mb-20 text-center">
          <div className="reveal-el inline-flex items-center gap-3 mb-3">
            <div className="w-20 h-px" style={{ background: "linear-gradient(90deg, transparent, hsl(var(--primary)))" }} />
            <span className="text-xs font-mono tracking-[0.4em] text-primary">依頼 • SERVICES</span>
            <div className="w-20 h-px" style={{ background: "linear-gradient(90deg, hsl(var(--primary)), transparent)" }} />
          </div>
          <h2 className="reveal-el text-5xl sm:text-7xl font-black leading-none"
            style={{ fontFamily: "'Impact','Arial Black',sans-serif" }}>
            <span className="text-foreground">HOW I </span>
            <span className="text-gradient-crunchy">FIGHT</span>
          </h2>
          <p className="reveal-el text-muted-foreground font-mono text-sm mt-4">
            戦い方 — Choose your battle formation.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
          {PROFILE.services.map((service) => (
            <motion.div key={service.id}
              whileHover={{ y: -8, scale: 1.02 }}
              className="service-card relative rounded-2xl overflow-hidden bg-card/60 border border-border/30 group flex flex-col">
              <div className="h-1.5 w-full" style={{ background: `linear-gradient(90deg, ${service.color}, ${service.color}60)` }} />
              <div className="p-6 sm:p-8 flex-1 flex flex-col">
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-3xl" style={{ color: service.color }}>{service.icon}</span>
                  <div>
                    <h3 className="text-xl font-black text-foreground"
                      style={{ fontFamily: "'Impact','Arial Black',sans-serif" }}>
                      {service.title}
                    </h3>
                    <p className="text-xs font-mono text-muted-foreground">{service.sub}</p>
                  </div>
                </div>
                <ul className="space-y-2 mb-6 flex-1">
                  {service.items.map((item, j) => (
                    <li key={j} className="flex items-start gap-2 text-sm text-muted-foreground font-mono">
                      <span className="text-[8px] mt-1.5" style={{ color: service.color }}>▸</span>
                      {item}
                    </li>
                  ))}
                </ul>
                <div className="mb-4 px-3 py-2 rounded-lg bg-primary/[0.05] border border-primary/10">
                  <p className="text-sm font-bold text-foreground">{service.price}</p>
                  <p className="text-[10px] font-mono text-muted-foreground">{service.note}</p>
                </div>
                <motion.a
                  href={`mailto:${PROFILE.email}?subject=${encodeURIComponent(service.title)}`}
                  whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                  className="block w-full text-center px-4 py-3 rounded-xl font-bold text-sm text-primary-foreground"
                  style={{ background: service.color, boxShadow: `0 0 20px ${service.color}30` }}>
                  {service.cta}
                </motion.a>
              </div>
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none rounded-2xl"
                style={{ boxShadow: `inset 0 0 0 1px ${service.color}30, 0 0 50px ${service.color}15` }} />
            </motion.div>
          ))}
        </div>

        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="mt-16 text-center">
          <p className="text-muted-foreground font-mono text-sm mb-4">仕事が気に入った？ — Like my work?</p>
          <motion.a href={BMC_URL} target="_blank" rel="noopener noreferrer"
            whileHover={{ scale: 1.06, y: -3 }} whileTap={{ scale: 0.94 }}
            className="inline-flex items-center gap-3 px-8 py-4 rounded-2xl font-mono text-sm font-bold relative overflow-hidden group"
            style={{
              background: "linear-gradient(135deg, hsl(24 91% 54% / 0.15), hsl(24 100% 60% / 0.1))",
              border: "1px solid hsl(24 91% 54% / 0.3)",
              boxShadow: "0 0 30px hsl(24 91% 54% / 0.1)",
            }}>
            <motion.div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ background: "linear-gradient(105deg, transparent 35%, hsl(24 91% 54% / 0.15) 45%, transparent 55%)" }}
              animate={{ x: ["-100%", "200%"] }}
              transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }} />
            <span className="text-2xl relative z-10">☕</span>
            <span className="text-foreground relative z-10">Buy Me a Coffee</span>
          </motion.a>
        </motion.div>
      </div>
    </section>
  );
};
