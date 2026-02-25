import { AnimeHero } from "@/components/AnimeHero";
import { AnimeNav } from "@/components/AnimeNav";
import { CinematicOpening } from "@/components/CinematicOpening";
import { DevProfiler } from "@/components/SiriOrb/DevProfiler";
import { SilentBoundary } from "@/components/SiriOrb/ErrorBoundary";
import { Suspense, lazy, memo, useEffect, useRef, useState } from "react";

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
const AnimeTestimonials = lazy(() =>
  import("@/components/AnimeTestimonials").then((m) => ({
    default: m.AnimeTestimonials,
  })),
);
const AnimeServices = lazy(() =>
  import("@/components/AnimeServices").then((m) => ({
    default: m.AnimeServices,
  })),
);
const AnimeContact = lazy(() =>
  import("@/components/AnimeContact").then((m) => ({
    default: m.AnimeContact,
  })),
);
const BuyMeCoffee = lazy(() =>
  import("@/components/BuyMeCoffee").then((m) => ({ default: m.BuyMeCoffee })),
);
const SiriOrb = lazy(() =>
  import("@/components/SiriOrb/AuraChatWidget").then((m) => ({
    default: m.default,
  })),
);

const NullFallback = null;

const SectionFallback = (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      height: "100vh",
      color: "rgba(255,255,255,0.15)",
      fontSize: 12,
      fontFamily: "monospace",
      letterSpacing: "0.15em",
      textTransform: "uppercase",
    }}
  >
    <span
      style={{
        display: "inline-block",
        width: 5,
        height: 5,
        borderRadius: "50%",
        background: "rgba(244,117,33,0.6)",
        marginRight: 10,
        animation: "pulse 1.4s ease-in-out infinite",
      }}
    />
    読み込み中...
  </div>
);

const BelowFoldSections = memo(() => (
  <>
    <Suspense fallback={SectionFallback}>
      <AnimeShowcase />
    </Suspense>
    <Suspense fallback={SectionFallback}>
      <AnimeJourney />
    </Suspense>
    <Suspense fallback={SectionFallback}>
      <AnimeTestimonials />
    </Suspense>
    <Suspense fallback={SectionFallback}>
      <AnimeServices />
    </Suspense>
    <Suspense fallback={SectionFallback}>
      <AnimeContact />
    </Suspense>
  </>
));
BelowFoldSections.displayName = "BelowFoldSections";

const SiriOrbMount = memo(() => (
  <Suspense>
    <SilentBoundary name="SiriOrb" fallback={NullFallback}>
      <DevProfiler id="SiriOrb">
        <SiriOrb />
      </DevProfiler>
    </SilentBoundary>
  </Suspense>
));
SiriOrbMount.displayName = "SiriOrbMount";

const Scanlines = memo(() => (
  <div
    className="fixed inset-0 pointer-events-none z-[1]"
    aria-hidden="true"
    style={{
      backgroundImage:
        "repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,0.05) 2px,rgba(0,0,0,0.05) 3px)",
    }}
  />
));
Scanlines.displayName = "Scanlines";

function useBelowFoldVisible() {
  const [visible, setVisible] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
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

const Index = () => {
  const { visible, sentinelRef } = useBelowFoldVisible();

  return (
    <div className="relative min-h-screen bg-background">
      <style>{`@keyframes pulse{0%,100%{opacity:.3}50%{opacity:1}}`}</style>

      <CinematicOpening />

      <Suspense fallback={NullFallback}>
        <PlasmaCanvas />
      </Suspense>

      <Scanlines />

      <AnimeNav />

      <main className="relative z-10">
        <AnimeHero />
        <div ref={sentinelRef} style={{ height: 1 }} aria-hidden="true" />
        {visible && <BelowFoldSections />}
      </main>

      <SiriOrbMount />
      {/* <PlasmaOrb size={120} mode={"idle"} /> */}

      <Suspense fallback={NullFallback}>
        <BuyMeCoffee />
      </Suspense>
    </div>
  );
};

export default Index;
