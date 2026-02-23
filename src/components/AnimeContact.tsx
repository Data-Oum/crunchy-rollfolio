import { motion } from "framer-motion";

const WATCHLIST = [
  { name: "Solo Leveling", status: "Watching", ep: "S2E08", hype: 95 },
  { name: "One Piece", status: "Ongoing", ep: "EP1100+", hype: 90 },
  { name: "My Hero Academia", status: "Final Season", ep: "S7", hype: 85 },
  { name: "Chainsaw Man", status: "Waiting S2", ep: "12 EP", hype: 92 },
  { name: "Bleach TYBW", status: "Watching", ep: "S3", hype: 88 },
  { name: "Dandadan", status: "New Fav", ep: "S1", hype: 93 },
];

export const AnimeContact = () => {
  return (
    <section id="contact" className="relative py-20 sm:py-32">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Watchlist */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-20"
        >
          <div className="text-center mb-12">
            <span className="text-primary font-mono text-sm tracking-widest">現在視聴中</span>
            <h2 className="text-3xl sm:text-4xl font-bold mt-3 text-foreground">
              Currently <span className="text-gradient-crunchy">Watching</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {WATCHLIST.map((item, i) => (
              <motion.div
                key={item.name}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                whileHover={{ scale: 1.03 }}
                className="glass-card p-4 cursor-default"
              >
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-foreground font-bold text-sm">{item.name}</h3>
                  <span className="text-xs font-mono text-primary bg-primary/10 px-2 py-0.5 rounded">
                    {item.status}
                  </span>
                </div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-muted-foreground font-mono">{item.ep}</span>
                  <span className="text-xs text-muted-foreground font-mono">HYPE {item.hype}%</span>
                </div>
                {/* Hype bar */}
                <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    whileInView={{ width: `${item.hype}%` }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1 + 0.3, duration: 0.8, ease: "easeOut" }}
                    className="h-full rounded-full bg-gradient-to-r from-primary to-crunchy-glow"
                  />
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Contact / CTA */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center"
        >
          <div className="glass-card p-8 sm:p-12 max-w-2xl mx-auto">
            <span className="text-primary font-mono text-sm">接触 • CONNECT</span>
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mt-3 mb-4">
              Let's Talk <span className="text-gradient-crunchy">Anime</span>
            </h2>
            <p className="text-muted-foreground mb-8 max-w-md mx-auto">
              Fellow weeb? Want to debate who's the strongest sorcerer? 
              Or maybe you just need someone who codes with the same intensity as Goku trains.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <motion.a
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                href="https://crunchyroll.com"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-bold text-sm glow-crunchy transition-all"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </svg>
                Crunchyroll Profile
              </motion.a>
              <motion.a
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                href="mailto:amit98ch@gmail.com"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-muted text-foreground border border-border hover:border-primary/50 font-bold text-sm transition-all"
              >
                Send a Message
              </motion.a>
            </div>

            <p className="text-xs text-muted-foreground font-mono mt-6">
              "The only ones who should kill are those prepared to be killed." — Lelouch
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
            CRUNCHFOLIO © 2025 • Built with 呪力 (Cursed Energy) • 
            <span className="text-primary"> Powered by Crunchyroll Premium</span>
          </p>
        </motion.footer>
      </div>
    </section>
  );
};
