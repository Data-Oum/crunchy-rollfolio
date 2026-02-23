import { motion } from "framer-motion";
import animeBattle from "@/assets/anime-battle.png";
import animeCity from "@/assets/anime-city.png";
import energyBlast from "@/assets/energy-blast.png";
import breathingTechnique from "@/assets/breathing-technique.png";

const ANIME_PROJECTS = [
  {
    title: "Jujutsu Kaisen",
    jp: "呪術廻戦",
    desc: "Cursed energy flows through every frame. Gojo's Infinite Void, Sukuna's Domain Expansion — peak animation meets peak storytelling.",
    image: animeBattle,
    tags: ["MAPPA", "Shonen", "Cursed Energy"],
    rating: "10/10",
    color: "primary" as const,
  },
  {
    title: "Demon Slayer",
    jp: "鬼滅の刃",
    desc: "Water Breathing, Flame Breathing — ufotable turned manga panels into pure cinema. The Mugen Train arc broke records for a reason.",
    image: breathingTechnique,
    tags: ["ufotable", "Shonen", "Breathing"],
    rating: "9.5/10",
    color: "anime-cyan" as const,
  },
  {
    title: "Attack on Titan",
    jp: "進撃の巨人",
    desc: "Freedom isn't free. Eren's journey from scared kid to… whatever he became. The greatest plot twist machine in anime history.",
    image: animeCity,
    tags: ["WIT/MAPPA", "Dark Fantasy", "Epic"],
    rating: "10/10",
    color: "anime-red" as const,
  },
  {
    title: "Dragon Ball Super",
    jp: "ドラゴンボール超",
    desc: "Ultra Instinct. Tournament of Power. Goku keeps breaking limits we didn't know existed. The OG that started it all.",
    image: energyBlast,
    tags: ["Toei", "Shonen", "Power"],
    rating: "9/10",
    color: "anime-gold" as const,
  },
];

export const AnimeShowcase = () => {
  return (
    <section id="showcase" className="relative py-20 sm:py-32">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <span className="text-primary font-mono text-sm tracking-widest">アニメ コレクション</span>
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold mt-3">
            <span className="text-gradient-cursed">Top Picks</span>
          </h2>
          <p className="text-muted-foreground mt-4 max-w-md mx-auto">
            The anime that shaped my cursed energy. Each one a masterpiece.
          </p>
        </motion.div>

        {/* Cards grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
          {ANIME_PROJECTS.map((anime, i) => (
            <motion.div
              key={anime.title}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15, duration: 0.6 }}
              whileHover={{ y: -8, scale: 1.02 }}
              className="group glass-card overflow-hidden cursor-pointer"
            >
              {/* Image */}
              <div className="relative h-48 sm:h-56 overflow-hidden">
                <motion.img
                  src={anime.image}
                  alt={anime.title}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
                
                {/* Rating badge */}
                <div className="absolute top-3 right-3 px-2 py-1 rounded bg-primary/90 text-primary-foreground text-xs font-mono font-bold">
                  ★ {anime.rating}
                </div>

                {/* Japanese title overlay */}
                <div className="absolute bottom-3 left-4">
                  <span className="text-3xl font-bold text-foreground/10 group-hover:text-foreground/20 transition-colors">
                    {anime.jp}
                  </span>
                </div>
              </div>

              {/* Content */}
              <div className="p-5 sm:p-6">
                <h3 className="text-xl sm:text-2xl font-bold text-foreground mb-2 group-hover:text-primary transition-colors">
                  {anime.title}
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed mb-4">
                  {anime.desc}
                </p>
                <div className="flex flex-wrap gap-2">
                  {anime.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-1 rounded bg-muted text-muted-foreground text-xs font-mono border border-border"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
