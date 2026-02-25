import animeAvatar from "@/assets/anime-avatar.png";
import animeBattle from "@/assets/anime-battle.png";
import energyBlast from "@/assets/energy-blast.png";
import plasmaOrb from "@/assets/plasma-orb.png";
import { PROFILE } from "@/data/profile";
import { motion, useScroll, useTransform, useMotionValue } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const GLITCH_CHARS = "アイウエオカキクケコサシスセソタチツテトナニヌネノ呪術廻戦";

function GlitchText({ text, className, delay = 0 }: { text: string; className?: string; delay?: number }) {
  const [display, setDisplay] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setReady(true);
      let iter = 0;
      const glitch = setInterval(() => {
        setDisplay(text.split("").map((char, i) =>
          i < iter ? char : GLITCH_CHARS[Math.floor(Math.random() * GLITCH_CHARS.length)]
        ).join(""));
        if (iter >= text.length) { clearInterval(glitch); setDisplay(text); }
        iter += 1;
      }, 35);
    }, delay);
    return () => clearTimeout(timeout);
  }, [text, delay]);

  useEffect(() => {
    if (!ready) return;
    const interval = setInterval(() => {
      let iter = 0;
      const glitch = setInterval(() => {
        setDisplay(text.split("").map((char, i) =>
          i < iter ? char : GLITCH_CHARS[Math.floor(Math.random() * GLITCH_CHARS.length)]
        ).join(""));
        if (iter >= text.length) { clearInterval(glitch); setDisplay(text); }
        iter += 1;
      }, 40);
    }, 6000);
    return () => clearInterval(interval);
  }, [text, ready]);

  return <span className={className}>{display || "\u00A0"}</span>;
}

function StatCounter({ value, label, index }: { value: string; label: string; index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    gsap.fromTo(ref.current, { y: 40, opacity: 0, scale: 0.8 }, {
      y: 0, opacity: 1, scale: 1, duration: 0.8, delay: 2.2 + index * 0.15, ease: "back.out(1.7)",
    });
  }, [index]);

  return (
    <motion.div ref={ref} whileHover={{ scale: 1.08, y: -4 }} className="relative group cursor-default">
      <div className="absolute inset-0 bg-primary/10 rounded-lg blur-md group-hover:bg-primary/20 transition-all" />
      <div className="relative border border-primary/30 rounded-lg px-4 py-3 text-center bg-background/40 backdrop-blur-sm">
        <div className="text-2xl sm:text-3xl font-black text-gradient-gold font-mono leading-none">{value}</div>
        <div className="text-[10px] text-muted-foreground font-mono tracking-widest mt-1 uppercase">{label}</div>
      </div>
    </motion.div>
  );
}

function SpeedLines() {
  return (
    <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-[0.03]" preserveAspectRatio="none">
      {[...Array(40)].map((_, i) => {
        const angle = (i / 40) * Math.PI * 2;
        return (
          <line key={i} x1="50%" y1="50%"
            x2={`${50 + Math.cos(angle) * 120}%`} y2={`${50 + Math.sin(angle) * 120}%`}
            stroke="hsl(var(--primary))" strokeWidth="0.5" />
        );
      })}
    </svg>
  );
}

const KANJI = ["呪", "術", "廻", "戦", "力", "魂", "無", "限", "金", "剛"];

function FloatingKanji() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {KANJI.map((k, i) => (
        <motion.span key={i}
          className="absolute text-primary/[0.03] font-black select-none"
          style={{
            fontSize: `${60 + Math.random() * 80}px`,
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            fontFamily: "'Impact','Arial Black',sans-serif",
          }}
          animate={{ y: [0, -30, 0], opacity: [0.01, 0.04, 0.01], rotate: [0, Math.random() > 0.5 ? 5 : -5, 0] }}
          transition={{ duration: 8 + Math.random() * 6, repeat: Infinity, delay: i * 0.7 }}>
          {k}
        </motion.span>
      ))}
    </div>
  );
}

export const AnimeHero = () => {
  const sectionRef = useRef<HTMLElement>(null);
  const nameRef = useRef<HTMLDivElement>(null);
  const lastNameRef = useRef<HTMLDivElement>(null);
  const badgeRef = useRef<HTMLDivElement>(null);
  const descRef = useRef<HTMLDivElement>(null);
  const rolesRef = useRef<HTMLDivElement>(null);
  const avatarRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ["start start", "end start"] });
  const bgY = useTransform(scrollYProgress, [0, 1], ["0%", "30%"]);
  const orbScale = useTransform(scrollYProgress, [0, 1], [1, 1.3]);
  const contentY = useTransform(scrollYProgress, [0, 1], ["0%", "15%"]);

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const rotateX = useTransform(mouseY, [-300, 300], [5, -5]);
  const rotateY = useTransform(mouseX, [-300, 300], [-5, 5]);

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    mouseX.set(e.clientX - rect.left - rect.width / 2);
    mouseY.set(e.clientY - rect.top - rect.height / 2);
  };

  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: "power4.out" } });
      if (badgeRef.current) tl.fromTo(badgeRef.current, { x: -60, opacity: 0 }, { x: 0, opacity: 1, duration: 0.8 }, 0.8);
      if (nameRef.current) tl.fromTo(nameRef.current, { y: 80, opacity: 0, scale: 0.7, skewX: -8 }, { y: 0, opacity: 1, scale: 1, skewX: 0, duration: 1, ease: "elastic.out(1, 0.6)" }, 1.0);
      if (lastNameRef.current) tl.fromTo(lastNameRef.current, { x: -40, opacity: 0 }, { x: 0, opacity: 1, duration: 0.8 }, 1.3);
      if (descRef.current) tl.fromTo(descRef.current, { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 0.7 }, 1.6);
      if (rolesRef.current) {
        const badges = rolesRef.current.querySelectorAll(".role-badge");
        tl.fromTo(badges, { y: 20, opacity: 0, scale: 0.8 }, { y: 0, opacity: 1, scale: 1, stagger: 0.06, duration: 0.5 }, 1.8);
      }
      if (avatarRef.current) tl.fromTo(avatarRef.current, { opacity: 0, scale: 0.6, rotate: -10 }, { opacity: 1, scale: 1, rotate: 0, duration: 1.2, ease: "back.out(1.4)" }, 1.2);
    }, sectionRef);
    return () => ctx.revert();
  }, []);

  return (
    <section id="hero" ref={sectionRef} className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16" onMouseMove={handleMouseMove}>
      <motion.div style={{ y: bgY }} className="absolute inset-0 pointer-events-none">
        <motion.div initial={{ opacity: 0, scale: 1.15 }} animate={{ opacity: 0.15, scale: 1 }} transition={{ duration: 3, ease: "easeOut" }}>
          <img src={animeBattle} alt="" className="w-full h-full object-cover" style={{ filter: "saturate(1.4) hue-rotate(20deg)" }} />
        </motion.div>
        <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/40 to-background" />
      </motion.div>

      <SpeedLines />
      <FloatingKanji />

      <motion.div style={{ scale: orbScale }} className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <motion.img src={plasmaOrb} alt=""
          animate={{ scale: [1, 1.06, 1], opacity: [0.15, 0.3, 0.15] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="w-[700px] md:w-[1000px] blur-sm" />
      </motion.div>

      <motion.img src={energyBlast} alt=""
        animate={{ opacity: [0.04, 0.12, 0.04], rotate: [0, 5, 0] }}
        transition={{ duration: 6, repeat: Infinity }}
        className="absolute right-0 top-1/4 w-64 pointer-events-none select-none"
        style={{ filter: "hue-rotate(40deg) saturate(2)" }} />

      <div className="absolute inset-0 pointer-events-none opacity-[0.05] mix-blend-screen overflow-hidden">
        <video autoPlay muted loop playsInline className="w-full h-full object-cover" src="/videos/triangle.mp4" />
      </div>

      <motion.div style={{ y: contentY }} className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16">
          <div className="flex-1 text-center lg:text-left">
            <div ref={badgeRef} className="inline-flex items-center gap-2 mb-6 opacity-0">
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <span className="px-3 py-1 rounded-full border border-primary/40 bg-primary/5 text-primary text-xs font-mono tracking-widest">
                建築家 • SOFTWARE ARCHITECT
              </span>
              <div className="hidden sm:block w-16 h-px bg-gradient-to-r from-primary/50 to-transparent" />
            </div>

            <div ref={nameRef} className="relative mb-2 opacity-0">
              <div className="absolute -top-2 left-0 text-6xl sm:text-7xl lg:text-9xl font-black leading-none select-none pointer-events-none tracking-tight"
                style={{ WebkitTextStroke: "1px hsl(var(--primary) / 0.06)", color: "transparent", transform: "translateX(4px) translateY(4px)" }}>
                {PROFILE.nameFirst.toUpperCase()}
              </div>
              <h1 className="text-6xl sm:text-7xl lg:text-9xl font-black leading-none tracking-tight relative">
                <GlitchText text={PROFILE.nameFirst.toUpperCase()} className="text-gradient-gold" delay={1200} />
              </h1>
            </div>

            <div ref={lastNameRef} className="flex items-baseline gap-3 justify-center lg:justify-start mb-6 opacity-0">
              <span className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground tracking-wide">{PROFILE.nameLast.toUpperCase()}</span>
              <span className="hidden sm:block text-primary font-mono text-xs opacity-60 tracking-widest self-end pb-1">チャクラボルティ</span>
            </div>

            <div ref={descRef} className="mb-6 opacity-0">
              <p className="text-primary font-mono text-sm mb-1 tracking-wider">▸ {PROFILE.title}</p>
              <p className="text-muted-foreground text-lg sm:text-xl max-w-lg mx-auto lg:mx-0">{PROFILE.tagline}</p>
            </div>

            <div ref={rolesRef} className="flex flex-wrap gap-2 justify-center lg:justify-start mb-10">
              {PROFILE.roles.map((role) => (
                <motion.span key={role} whileHover={{ scale: 1.08, y: -3 }}
                  className="role-badge px-3 py-1.5 rounded-lg bg-muted/60 text-muted-foreground text-xs font-mono border border-border hover:border-primary/60 hover:text-primary hover:bg-primary/5 transition-all cursor-default opacity-0">
                  {role}
                </motion.span>
              ))}
            </div>

            <div className="flex gap-3 justify-center lg:justify-start">
              {PROFILE.stats.map((stat, i) => (
                <StatCounter key={stat.label} value={stat.value} label={stat.label} index={i} />
              ))}
            </div>
          </div>

          <div ref={avatarRef} className="flex-shrink-0 relative opacity-0">
            <motion.div style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}>
              <div className="absolute -inset-6 border border-primary/10 rounded-3xl" />
              <div className="absolute -inset-3 border border-primary/15 rounded-2xl" />

              <motion.div animate={{ rotate: 360 }} transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
                className="absolute -inset-5 rounded-full"
                style={{
                  border: "1px solid transparent",
                  backgroundImage: "linear-gradient(hsl(var(--background)), hsl(var(--background))), conic-gradient(from 0deg, hsl(var(--primary)/0.4), transparent, hsl(var(--secondary)/0.3), transparent, hsl(var(--primary)/0.4))",
                  backgroundOrigin: "border-box", backgroundClip: "padding-box, border-box", borderRadius: "50%",
                }} />
              <motion.div animate={{ rotate: -360 }} transition={{ duration: 28, repeat: Infinity, ease: "linear" }}
                className="absolute -inset-10 rounded-full border border-dashed border-primary/[0.08]" />

              {[...Array(5)].map((_, i) => (
                <motion.div key={i}
                  animate={{ y: [0, -25 - i * 8, 0], x: [0, i % 2 === 0 ? 15 : -15, 0], opacity: [0, 1, 0], scale: [0.5, 1, 0.5] }}
                  transition={{ duration: 2.5 + i * 0.4, repeat: Infinity, delay: i * 0.5 }}
                  className="absolute w-2 h-2 rounded-full bg-primary"
                  style={{ top: `${20 + i * 12}%`, left: `${15 + (i % 3) * 30}%`, boxShadow: "0 0 8px hsl(var(--primary))" }} />
              ))}

              <motion.div animate={{ y: [-6, 6, -6] }} transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                className="w-48 h-48 sm:w-64 sm:h-64 lg:w-80 lg:h-80 rounded-2xl overflow-hidden relative"
                style={{
                  boxShadow: "0 0 40px hsl(var(--primary)/0.35), 0 0 80px hsl(var(--primary)/0.15), inset 0 0 30px hsl(var(--primary)/0.05)",
                  border: "1.5px solid hsl(var(--primary)/0.45)",
                }}>
                <img src={animeAvatar} alt={PROFILE.name} className="w-full h-full object-cover" />
                <div className="absolute inset-0 pointer-events-none opacity-30"
                  style={{ backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, hsl(var(--background)/0.15) 2px, hsl(var(--background)/0.15) 4px)" }} />
                <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-gradient-to-t from-background/60 to-transparent" />
              </motion.div>

              <motion.div animate={{ y: [-4, 4, -4] }} transition={{ duration: 3, repeat: Infinity }}
                className="absolute -bottom-3 -right-3 px-3 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-mono font-bold"
                style={{ boxShadow: "0 0 20px hsl(var(--primary)/0.5)" }}>
                LVL ∞ 建築家
              </motion.div>

              <motion.div animate={{ y: [4, -4, 4] }} transition={{ duration: 4, repeat: Infinity }}
                className="absolute -top-3 -left-3 px-2 py-1 rounded-lg border border-secondary/50 bg-background/80 backdrop-blur-sm text-[10px] font-mono font-bold text-secondary">
                力 MAX
              </motion.div>
            </motion.div>
          </div>
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 3 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2">
        <motion.span animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 2, repeat: Infinity }}
          className="text-[10px] font-mono text-muted-foreground tracking-widest">
          下にスクロール
        </motion.span>
        <div className="w-6 h-10 rounded-full border-2 border-primary/40 flex justify-center pt-2">
          <motion.div animate={{ y: [0, 12, 0], opacity: [1, 0, 1] }} transition={{ duration: 2, repeat: Infinity }}
            className="w-1.5 h-1.5 rounded-full bg-primary" />
        </div>
      </motion.div>
    </section>
  );
};
