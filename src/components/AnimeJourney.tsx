import { motion } from "framer-motion";

const JOURNEY = [
  { year: "2015", event: "First Anime", title: "Dragon Ball Z", desc: "Goku went Super Saiyan. I went all in." },
  { year: "2017", event: "Deep Dive", title: "Attack on Titan S1-S2", desc: "Realized anime isn't just entertainment. It's art." },
  { year: "2019", event: "Peak Shonen", title: "Demon Slayer S1", desc: "Episode 19. Hinokami Kagura. Changed everything." },
  { year: "2020", event: "Cursed Era", title: "Jujutsu Kaisen S1", desc: "Gojo Satoru walked in and the game was over." },
  { year: "2023", event: "GOAT Arc", title: "JJK Shibuya Incident", desc: "MAPPA delivered cinema. Every. Single. Frame." },
  { year: "NOW", event: "Still Here", title: "Crunchyroll Premium", desc: "Simulcast everything. Sleep is optional." },
];

export const AnimeJourney = () => {
  return (
    <section id="journey" className="relative py-20 sm:py-32">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <span className="text-primary font-mono text-sm tracking-widest">冒険の旅</span>
          <h2 className="text-4xl sm:text-5xl font-bold mt-3 text-foreground">
            My Anime <span className="text-gradient-crunchy">Journey</span>
          </h2>
        </motion.div>

        {/* Timeline */}
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-4 sm:left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-primary/50 via-cursed/30 to-transparent" />

          {JOURNEY.map((item, i) => (
            <motion.div
              key={item.year}
              initial={{ opacity: 0, x: i % 2 === 0 ? -40 : 40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.6 }}
              className={`relative flex items-start gap-6 mb-12 ${
                i % 2 === 0 ? "sm:flex-row" : "sm:flex-row-reverse"
              } flex-row`}
            >
              {/* Dot */}
              <div className="absolute left-4 sm:left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-primary glow-crunchy z-10 mt-1.5" />

              {/* Content */}
              <div className={`ml-10 sm:ml-0 sm:w-[calc(50%-2rem)] ${i % 2 === 0 ? "sm:text-right sm:pr-8" : "sm:text-left sm:pl-8 sm:ml-auto"}`}>
                <span className="text-primary font-mono text-sm font-bold">{item.year}</span>
                <span className="text-muted-foreground text-xs ml-2 font-mono">{item.event}</span>
                <h3 className="text-lg font-bold text-foreground mt-1">{item.title}</h3>
                <p className="text-muted-foreground text-sm mt-1">{item.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
