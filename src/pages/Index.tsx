import { AnimeHero } from "@/components/AnimeHero";
import { AnimeNav } from "@/components/AnimeNav";
import { Suspense, lazy, memo, useEffect, useRef, useState } from "react";

// ─── Lazy imports — each in its own Suspense so one failure doesn't block others
const PlasmaCanvas = lazy(() =>
  import("@/components/PlasmaCanvas").then((m) => ({
    default: m.PlasmaCanvas,
  })),
);
const AnimeShowcase = lazy(() =>
  import("@/components/AnimeShowcase").then((m) => ({
    default: m.AnimeShowcase,
  })),
);
const AnimeJourney = lazy(() =>
  import("@/components/AnimeJourney").then((m) => ({
    default: m.AnimeJourney,
  })),
);
const AnimeContact = lazy(() =>
  import("@/components/AnimeContact").then((m) => ({
    default: m.AnimeContact,
  })),
);
// SiriOrb is lazy-loaded but NEVER re-mounted after first render
const SiriOrb = lazy(() =>
  import("@/components/SiriOrb").then((m) => ({ default: m.SiriOrb })),
);

// ─── Stable fallback components — defined outside render to avoid re-creation
const NullFallback = null;

const SectionFallback = (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      height: "100vh",
      color: "rgba(255,255,255,0.2)",
      fontSize: 13,
      fontFamily: "monospace",
      letterSpacing: "0.1em",
      textTransform: "uppercase",
    }}
  >
    <span
      style={{
        display: "inline-block",
        width: 6,
        height: 6,
        borderRadius: "50%",
        background: "rgba(244,117,33,0.6)",
        marginRight: 10,
        animation: "pulse 1.4s ease-in-out infinite",
      }}
    />
    Loading
  </div>
);

// ─── SkeneSections — memoized so parent re-renders don't cause this to re-mount
const BelowFoldSections = memo(() => (
  <>
    <Suspense fallback={SectionFallback}>
      <AnimeShowcase />
    </Suspense>
    <Suspense fallback={SectionFallback}>
      <AnimeJourney />
    </Suspense>
    <Suspense fallback={SectionFallback}>
      <AnimeContact />
    </Suspense>
  </>
));
BelowFoldSections.displayName = "BelowFoldSections";

// ─── SiriOrbMount — isolated Suspense so orb never causes page re-renders
//     The `key` is intentionally fixed — we never want to remount this
const SiriOrbMount = memo(() => (
  <Suspense fallback={NullFallback}>
    <SiriOrb />
  </Suspense>
));
SiriOrbMount.displayName = "SiriOrbMount";

// ─── Scanline overlay — memoized, never changes
const Scanlines = memo(() => (
  <div
    className="fixed inset-0 pointer-events-none z-[1]"
    aria-hidden="true"
    style={{
      backgroundImage:
        "repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,0.07) 2px,rgba(0,0,0,0.07) 3px)",
    }}
  />
));
Scanlines.displayName = "Scanlines";

// ─── Intersection observer hook — defers below-fold until near viewport
function useBelowFoldVisible() {
  const [visible, setVisible] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    // Show sections when user is within 600px of the fold
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "600px" },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  return { visible, sentinelRef };
}

// ═══════════════════════════════════════════════════════════════════════════════
//  PAGE
// ═══════════════════════════════════════════════════════════════════════════════
const Index = () => {
  const { visible, sentinelRef } = useBelowFoldVisible();

  return (
    <div className="relative min-h-screen" style={{ background: "#050308" }}>
      {/* Pulse keyframe for loading indicator */}
      <style>{`@keyframes pulse{0%,100%{opacity:.3}50%{opacity:1}}`}</style>

      {/* Background plasma canvas — silent fallback, never blocks */}
      <Suspense fallback={NullFallback}>
        <PlasmaCanvas />
      </Suspense>

      {/* CRT scanlines overlay */}
      <Scanlines />

      {/* Nav — always eager, renders instantly */}
      <AnimeNav />

      <main className="relative z-10">
        {/* Hero — always eager, critical for LCP */}
        <AnimeHero />

        {/* Sentinel triggers below-fold load */}
        <div ref={sentinelRef} style={{ height: 1 }} aria-hidden="true" />

        {/* Below-fold content — loaded once sentinel is near viewport */}
        {visible && <BelowFoldSections />}
      </main>

      {/* SiriOrb — mounted once, isolated from page re-renders */}
      <SiriOrbMount />
    </div>
  );
};

export default Index;
