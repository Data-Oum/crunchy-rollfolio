import { motion } from "framer-motion";
import { PROFILE } from "@/data/profile";

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
          <span className="text-primary font-mono text-sm tracking-widest">冒険の旅 • TIMELINE</span>
          <h2 className="text-4xl sm:text-5xl font-bold mt-3 text-foreground">
            The <span className="text-gradient-crunchy">Arc</span>
          </h2>
        </motion.div>

        <div className="relative">
          <div className="absolute left-4 sm:left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-primary/50 via-secondary/30 to-transparent" />

          {PROFILE.journey.map((item, i) => (
            <motion.div
              key={item.yr}
              initial={{ opacity: 0, x: i % 2 === 0 ? -40 : 40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.6 }}
              className={`relative flex items-start gap-6 mb-12 ${
                i % 2 === 0 ? "sm:flex-row" : "sm:flex-row-reverse"
              } flex-row`}
            >
              <div className="absolute left-4 sm:left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-primary glow-crunchy z-10 mt-1.5" />

              <div className={`ml-10 sm:ml-0 sm:w-[calc(50%-2rem)] ${i % 2 === 0 ? "sm:text-right sm:pr-8" : "sm:text-left sm:pl-8 sm:ml-auto"}`}>
                <span className="text-primary font-mono text-sm font-bold">{item.yr}</span>
                <h3 className="text-lg font-bold text-foreground mt-1">{item.title}</h3>
                <p className="text-muted-foreground text-sm mt-1">{item.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Skills section */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-20"
        >
          <div className="text-center mb-10">
            <span className="text-primary font-mono text-sm tracking-widest">能力 • SKILLS</span>
            <h2 className="text-3xl sm:text-4xl font-bold mt-3 text-foreground">
              Power <span className="text-gradient-cursed">Levels</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {PROFILE.skills.map((skill, i) => (
              <motion.div
                key={skill.cat}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="glass-card p-4"
              >
                <h3 className="text-primary font-mono text-xs tracking-widest mb-3">{skill.cat.toUpperCase()}</h3>
                <div className="space-y-1.5">
                  {skill.items.map((item) => (
                    <div key={item} className="text-xs text-muted-foreground font-mono flex items-center gap-2">
                      <span className="w-1 h-1 rounded-full bg-primary flex-shrink-0" />
                      {item}
                    </div>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
};
