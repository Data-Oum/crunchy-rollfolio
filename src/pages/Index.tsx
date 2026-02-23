import { PlasmaCanvas } from "@/components/PlasmaCanvas";
import { AnimeNav } from "@/components/AnimeNav";
import { AnimeHero } from "@/components/AnimeHero";
import { AnimeShowcase } from "@/components/AnimeShowcase";
import { AnimeJourney } from "@/components/AnimeJourney";
import { AnimeContact } from "@/components/AnimeContact";
import { SiriOrb } from "@/components/SiriOrb";

const Index = () => {
  return (
    <div className="relative min-h-screen bg-background anime-grid">
      <PlasmaCanvas />
      <div className="scan-line fixed inset-0 pointer-events-none z-[1]" />
      <AnimeNav />
      <main className="relative z-10">
        <AnimeHero />
        <AnimeShowcase />
        <AnimeJourney />
        <AnimeContact />
      </main>
      <SiriOrb />
    </div>
  );
};

export default Index;
