import { motion } from "framer-motion";
import { PROFILE } from "@/data/profile";

export const AnimeContact = () => {
  return (
    <section id="contact" className="relative py-20 sm:py-32">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Contact CTA */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center"
        >
          <div className="glass-card p-8 sm:p-12 max-w-2xl mx-auto">
            <span className="text-primary font-mono text-sm">接触 • LET'S CONNECT</span>
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mt-3 mb-4">
              Build Something <span className="text-gradient-crunchy">Legendary</span>
            </h2>
            <p className="text-muted-foreground mb-8 max-w-md mx-auto">
              Looking for a technical co-founder, architect, or someone who treats your product like their own? Let's talk.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <motion.a
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                href={`mailto:${PROFILE.email}`}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-bold text-sm glow-crunchy transition-all"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                {PROFILE.email}
              </motion.a>
              <motion.a
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                href={PROFILE.linkedin}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-muted text-foreground border border-border hover:border-primary/50 font-bold text-sm transition-all"
              >
                LinkedIn
              </motion.a>
            </div>

            {/* Social links */}
            <div className="flex gap-4 justify-center mt-6">
              {[
                { label: "GitHub", href: PROFILE.github },
                { label: "Twitter", href: PROFILE.twitter },
                { label: "Medium", href: PROFILE.medium },
              ].map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-muted-foreground font-mono hover:text-primary transition-colors"
                >
                  {link.label}
                </a>
              ))}
            </div>

            <p className="text-xs text-muted-foreground font-mono mt-6">
              "Every system I architect ships to production. I own outcomes, not just code."
            </p>
          </div>
        </motion.div>

        {/* Footer */}
        <motion.footer
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mt-20 pt-8 border-t border-border text-center"
        >
          <p className="text-muted-foreground text-xs font-mono">
            {PROFILE.name.toUpperCase()} © 2025 • Built with 呪力 (Cursed Energy) • 
            <span className="text-primary"> {PROFILE.location}</span>
          </p>
        </motion.footer>
      </div>
    </section>
  );
};
