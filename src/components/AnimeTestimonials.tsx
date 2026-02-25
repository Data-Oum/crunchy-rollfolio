import { PROFILE } from "@/data/profile";
import { motion, useScroll, useTransform } from "framer-motion";
import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

function TestimonialCard({ t, index }: { t: typeof PROFILE.testimonials[number]; index: number }) {
  return (
    <motion.div
      whileHover={{ y: -6, scale: 1.02 }}
      className="testimonial-card relative rounded-2xl overflow-hidden bg-card/60 border border-border/30 group"
      style={{ perspective: "1000px" }}
    >
      {/* Top accent bar */}
      <div className="h-1 w-full" style={{ background: `linear-gradient(90deg, ${t.col}, ${t.col}80, transparent)` }} />

      {/* Manga speech bubble tail */}
      <svg className="absolute -top-2 left-8 w-5 h-3 opacity-20" viewBox="0 0 20 12">
        <polygon points="0,12 10,0 20,12" fill={t.col} />
      </svg>

      <div className="p-6 sm:p-8 relative">
        {/* Seniority badge */}
        <span className="inline-block px-2.5 py-0.5 rounded-lg text-[9px] font-mono font-bold tracking-widest mb-4 text-primary-foreground"
          style={{ background: t.col, boxShadow: `0 0 12px ${t.col}40` }}>
          {t.seniority}
        </span>

        {/* Quote */}
        <div className="relative mb-6">
          <span className="absolute -left-2 -top-4 text-5xl font-black opacity-[0.06] text-foreground select-none"
            style={{ fontFamily: "Georgia, serif" }}>"</span>
          <p className="text-muted-foreground text-sm leading-relaxed font-mono italic pl-4 border-l-2"
            style={{ borderColor: `${t.col}40` }}>
            {t.text}
          </p>
        </div>

        {/* Author */}
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-foreground font-bold text-sm">{t.name}</p>
            <p className="text-muted-foreground text-xs font-mono">{t.role}</p>
            <p className="text-xs font-mono mt-0.5" style={{ color: t.col }}>{t.company} · {t.date}</p>
          </div>
          <motion.a
            href={t.li}
            target="_blank"
            rel="noopener noreferrer"
            whileHover={{ scale: 1.1 }}
            className="flex items-center justify-center w-8 h-8 rounded-lg border border-border/40 text-muted-foreground hover:text-primary hover:border-primary/40 transition-all text-xs font-bold"
          >
            in
          </motion.a>
        </div>

        {/* Relation tag */}
        <div className="mt-3 pt-3 border-t border-border/20">
          <p className="text-[10px] font-mono text-muted-foreground/60 tracking-wider">{t.rel}</p>
        </div>
      </div>

      {/* Hover glow */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none rounded-2xl"
        style={{ boxShadow: `inset 0 0 0 1px ${t.col}30, 0 0 40px ${t.col}10` }} />
    </motion.div>
  );
}

export const AnimeTestimonials = () => {
  const sectionRef = useRef<HTMLElement>(null);
  const headingRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ["start end", "end start"] });
  const bgY = useTransform(scrollYProgress, [0, 1], ["0%", "10%"]);

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

      // Cards
      const cards = sectionRef.current?.querySelectorAll(".testimonial-card");
      if (cards?.length) {
        gsap.fromTo(cards,
          { y: 80, opacity: 0, scale: 0.85, rotateY: -5 },
          {
            y: 0, opacity: 1, scale: 1, rotateY: 0,
            stagger: 0.15, duration: 1, ease: "power3.out",
            scrollTrigger: { trigger: cards[0], start: "top 82%" },
          }
        );
      }
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section id="testimonials" ref={sectionRef} className="relative py-32 overflow-hidden"
      style={{ background: "linear-gradient(180deg, hsl(var(--background)), hsl(0 0% 1.5%), hsl(var(--background)))" }}>

      {/* Floating kanji */}
      <motion.span
        style={{ y: bgY, fontFamily: "'Impact','Arial Black',sans-serif" }}
        className="absolute top-20 right-10 text-[200px] font-black text-primary/[0.02] select-none pointer-events-none">
        信
      </motion.span>
      <motion.span
        style={{ y: bgY, fontFamily: "'Impact','Arial Black',sans-serif" }}
        className="absolute bottom-20 left-10 text-[150px] font-black text-secondary/[0.02] select-none pointer-events-none">
        頼
      </motion.span>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Header */}
        <div ref={headingRef} className="mb-20 text-center">
          <div className="reveal-el inline-flex items-center gap-3 mb-3">
            <div className="w-20 h-px" style={{ background: "linear-gradient(90deg, transparent, hsl(var(--primary)))" }} />
            <span className="text-xs font-mono tracking-[0.4em] text-primary">証言 • TESTIMONIALS</span>
            <div className="w-20 h-px" style={{ background: "linear-gradient(90deg, hsl(var(--primary)), transparent)" }} />
          </div>
          <h2 className="reveal-el text-5xl sm:text-7xl font-black leading-none"
            style={{ fontFamily: "'Impact','Arial Black',sans-serif" }}>
            <span className="text-foreground">WHAT THEY </span>
            <span className="text-gradient-gold">SAY</span>
          </h2>
          <p className="reveal-el text-muted-foreground font-mono text-sm mt-4">
            仲間の言葉 — Words from comrades in the field.
          </p>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
          {PROFILE.testimonials.map((t, i) => (
            <TestimonialCard key={t.name} t={t} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
};
