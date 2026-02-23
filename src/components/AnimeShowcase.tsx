import { motion } from "framer-motion";
import { PROFILE } from "@/data/profile";

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
          <span className="text-primary font-mono text-sm tracking-widest">作品集 • PROJECTS</span>
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold mt-3">
            <span className="text-gradient-cursed">Shipped Work</span>
          </h2>
          <p className="text-muted-foreground mt-4 max-w-md mx-auto">
            Production systems. Real users. Zero shortcuts.
          </p>
        </motion.div>

        {/* Cards grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
          {PROFILE.projects.map((project, i) => (
            <motion.div
              key={project.name}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15, duration: 0.6 }}
              whileHover={{ y: -8, scale: 1.02 }}
              className="group glass-card overflow-hidden cursor-default"
            >
              {/* Top accent bar */}
              <div className="h-1 w-full bg-gradient-to-r from-primary via-secondary to-primary" />

              <div className="p-6">
                {/* Badge */}
                <span className="inline-block px-2 py-0.5 rounded bg-primary/10 border border-primary/30 text-primary text-[10px] font-mono tracking-widest mb-4">
                  {project.badge}
                </span>

                <h3 className="text-xl sm:text-2xl font-bold text-foreground mb-1 group-hover:text-primary transition-colors">
                  {project.name}
                </h3>
                <p className="text-primary/80 text-sm font-mono mb-3">{project.tagline}</p>
                <p className="text-muted-foreground text-sm leading-relaxed mb-4">
                  {project.desc}
                </p>

                {/* Impact */}
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-[10px] font-mono text-primary bg-primary/10 px-2 py-0.5 rounded">
                    IMPACT
                  </span>
                  <span className="text-xs text-muted-foreground font-mono">{project.impact}</span>
                </div>

                {/* Tech tags */}
                <div className="flex flex-wrap gap-2">
                  {project.tech.map((t) => (
                    <span
                      key={t}
                      className="px-2 py-1 rounded bg-muted text-muted-foreground text-xs font-mono border border-border"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Tech stack cloud */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mt-16 text-center"
        >
          <span className="text-primary font-mono text-xs tracking-widest">技術スタック</span>
          <div className="flex flex-wrap gap-2 justify-center mt-4 max-w-3xl mx-auto">
            {PROFILE.techStack.map((tech, i) => (
              <motion.span
                key={tech}
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.03 }}
                whileHover={{ scale: 1.1, y: -2 }}
                className="px-2 py-1 rounded bg-muted/50 text-muted-foreground text-xs font-mono border border-border/50 hover:border-primary/40 hover:text-primary transition-all cursor-default"
              >
                {tech}
              </motion.span>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
};
