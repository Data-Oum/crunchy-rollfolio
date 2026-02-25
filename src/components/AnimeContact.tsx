import animeCity from "@/assets/anime-city.png";
import energyBlast from "@/assets/energy-blast.png";
import { PROFILE } from "@/data/profile";
import { motion, useScroll, useTransform } from "framer-motion";
import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const BMC_URL = "https://buymeacoffee.com/amithellmab";

const SOCIALS = [
  { label: "GitHub", href: PROFILE.github, icon: "{ }" },
  { label: "Twitter", href: PROFILE.twitter, icon: "𝕏" },
  { label: "Medium", href: PROFILE.medium, icon: "M" },
  { label: "LinkedIn", href: PROFILE.linkedin, icon: "in" },
];

export const AnimeContact = () => {
  const sectionRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ["start end", "end start"] });
  const bgY = useTransform(scrollYProgress, [0, 1], ["0%", "20%"]);

  useEffect(() => {
    const ctx = gsap.context(() => {
      // CTA card dramatic reveal
      const card = sectionRef.current?.querySelector(".cta-card");
      if (card) {
        gsap.fromTo(card,
          { y: 100, opacity: 0, scale: 0.85, rotateX: 5 },
          {
            y: 0, opacity: 1, scale: 1, rotateX: 0,
            duration: 1.2, ease: "power3.out",
            scrollTrigger: { trigger: card, start: "top 80%" },
          }
        );
      }

      // Footer slide
      const footer = sectionRef.current?.querySelector("footer");
      if (footer) {
        gsap.fromTo(footer, { y: 30, opacity: 0 }, {
          y: 0, opacity: 1, duration: 0.8,
          scrollTrigger: { trigger: footer, start: "top 95%" },
        });
      }
    }, sectionRef);
    return () => ctx.revert();
  }, []);

  return (
    <section id="contact" ref={sectionRef} className="relative py-32 overflow-hidden"
      style={{ background: "linear-gradient(180deg, hsl(var(--background)), hsl(0 0% 1%))" }}>

      {/* Parallax Anime city BG */}
      <motion.div style={{ y: bgY }} className="absolute inset-0 pointer-events-none">
        <img src={animeCity} alt="" className="w-full h-full object-cover opacity-[0.1]"
          style={{ filter: "saturate(1.3) brightness(0.8)", mixBlendMode: "luminosity" }} />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-background" />
      </motion.div>

      {/* Energy blast */}
      <motion.img src={energyBlast} alt=""
        animate={{ opacity: [0.04, 0.12, 0.04], rotate: [0, -5, 0] }}
        transition={{ duration: 7, repeat: Infinity }}
        className="absolute right-0 bottom-0 w-96 pointer-events-none select-none"
        style={{ mixBlendMode: "screen", transformOrigin: "bottom right" }} />

      {/* Bottom glow */}
      <div className="absolute bottom-0 left-0 right-0 h-px"
        style={{ background: "linear-gradient(90deg, transparent, hsl(var(--primary) / 0.5), transparent)" }} />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center">
          {/* Label */}
          <div className="inline-flex items-center gap-3 mb-12">
            <div className="w-20 h-px" style={{ background: "linear-gradient(90deg, transparent, hsl(var(--primary)))" }} />
            <span className="text-xs font-mono tracking-[0.4em] text-primary">接触 • LET'S CONNECT</span>
            <div className="w-20 h-px" style={{ background: "linear-gradient(90deg, hsl(var(--primary)), transparent)" }} />
          </div>

          {/* CTA Card */}
          <div className="cta-card relative max-w-2xl mx-auto" style={{ perspective: "1200px" }}>
            {/* Animated border glow */}
            <motion.div
              animate={{ opacity: [0.3, 0.8, 0.3] }}
              transition={{ duration: 4, repeat: Infinity }}
              className="absolute -inset-px rounded-2xl pointer-events-none"
              style={{ background: "linear-gradient(135deg, hsl(var(--primary) / 0.4), transparent 40%, hsl(var(--secondary) / 0.3), transparent 70%, hsl(var(--primary) / 0.4))" }}
            />

            <div className="relative rounded-2xl p-10 sm:p-14 overflow-hidden bg-card/90 border border-primary/15">
              {/* Scanlines */}
              <div className="absolute inset-0 pointer-events-none opacity-[0.02]"
                style={{ backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 3px, hsl(var(--foreground) / 0.6) 3px, hsl(var(--foreground) / 0.6) 4px)" }} />

              {/* Corner accents */}
              {["top-0 left-0", "top-0 right-0", "bottom-0 left-0", "bottom-0 right-0"].map((c) => (
                <div key={c} className={`absolute ${c} w-8 h-8 opacity-30`}>
                  <div className="w-full h-px bg-primary" style={c.includes("bottom") ? { position: "absolute", bottom: 0 } : {}} />
                  <div className="h-full w-px bg-primary" style={c.includes("right") ? { position: "absolute", right: 0 } : {}} />
                </div>
              ))}

              <h2 className="text-4xl sm:text-6xl font-black text-foreground mb-4 leading-tight"
                style={{ fontFamily: "'Impact','Arial Black',sans-serif" }}>
                BUILD SOMETHING{" "}
                <span className="text-primary italic" style={{ textShadow: "0 0 40px hsl(var(--primary) / 0.4)" }}>LEGENDARY</span>
              </h2>
              <p className="text-muted-foreground mb-10 max-w-md mx-auto font-mono text-sm leading-relaxed">
                Technical co-founder, architect, or someone who owns outcomes.
                <span className="text-primary"> That's Amit.</span>
              </p>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center mb-6">
                <motion.a whileHover={{ scale: 1.05, y: -3 }} whileTap={{ scale: 0.95 }}
                  href={`mailto:${PROFILE.email}`}
                  className="inline-flex items-center justify-center gap-2 px-7 py-4 rounded-xl font-bold text-sm text-primary-foreground bg-primary relative overflow-hidden group"
                  style={{ boxShadow: "0 0 40px hsl(var(--primary) / 0.3), 0 4px 20px hsl(var(--primary) / 0.15)" }}>
                  {/* Shine */}
                  <motion.div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ background: "linear-gradient(105deg, transparent 40%, hsl(0 0% 100% / 0.15) 45%, transparent 50%)" }}
                    animate={{ x: ["-100%", "200%"] }}
                    transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }} />
                  <svg className="w-4 h-4 relative z-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <span className="relative z-10">{PROFILE.email}</span>
                </motion.a>
                <motion.a whileHover={{ scale: 1.05, y: -3 }} whileTap={{ scale: 0.95 }}
                  href={PROFILE.linkedin} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 px-7 py-4 rounded-xl font-bold text-sm text-foreground bg-muted/30 border border-primary/30 hover:border-primary/50 transition-colors">
                  <span className="text-primary">in</span> LinkedIn
                </motion.a>
              </div>

              {/* Buy Me a Coffee — prominent */}
              <motion.a href={BMC_URL} target="_blank" rel="noopener noreferrer"
                whileHover={{ scale: 1.06, y: -3 }} whileTap={{ scale: 0.94 }}
                className="inline-flex items-center gap-2.5 px-6 py-3 rounded-xl font-mono text-sm font-bold mb-10 relative overflow-hidden group"
                style={{
                  background: "linear-gradient(135deg, hsl(43 65% 55% / 0.15), hsl(25 93% 54% / 0.1))",
                  border: "1px solid hsl(43 65% 55% / 0.3)",
                  boxShadow: "0 0 20px hsl(43 65% 55% / 0.1)",
                }}>
                <motion.div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ background: "linear-gradient(105deg, transparent 35%, hsl(43 65% 55% / 0.15) 45%, transparent 55%)" }}
                  animate={{ x: ["-100%", "200%"] }}
                  transition={{ duration: 2, repeat: Infinity, repeatDelay: 4 }} />
                <span className="text-xl relative z-10">☕</span>
                <span className="text-foreground relative z-10">Buy Me a Coffee</span>
              </motion.a>

              {/* Socials */}
              <div className="flex gap-3 justify-center flex-wrap">
                {SOCIALS.map((s, i) => (
                  <motion.a key={s.label}
                    initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }} transition={{ delay: i * 0.08 }}
                    whileHover={{ scale: 1.1, y: -3 }}
                    href={s.href} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono text-muted-foreground border border-border/30 hover:text-primary hover:border-primary/40 transition-all">
                    <span className="text-primary">{s.icon}</span> {s.label}
                  </motion.a>
                ))}
              </div>

              <p className="text-xs text-muted-foreground/40 font-mono mt-10 italic">
                "Every system I architect ships to production."
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-24 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-border/15">
          <p className="text-muted-foreground/40 text-xs font-mono">{PROFILE.name.toUpperCase()} © 2025</p>
          <p className="text-muted-foreground/40 text-xs font-mono">
            Built with <span className="text-primary">呪力</span> • <span className="text-primary">{PROFILE.location}</span>
          </p>
          <div className="flex items-end gap-1 h-4">
            {[...Array(5)].map((_, i) => (
              <motion.div key={i}
                animate={{ scaleY: [0.2, 1.5 + i * 0.2, 0.2] }}
                transition={{ duration: 0.6 + i * 0.1, repeat: Infinity, delay: i * 0.08 }}
                className="w-0.5 rounded-full bg-primary/50"
                style={{ height: `${6 + i * 3}px`, transformOrigin: "bottom" }} />
            ))}
          </div>
        </footer>
      </div>
    </section>
  );
};
