// ═══════════════════════════════════════════════════════════════════
// AnimeContact.tsx — Crunchyroll-inspired contact section
// ═══════════════════════════════════════════════════════════════════
import animeCity from "@/assets/anime-city.png";
import energyBlast from "@/assets/energy-blast.png";
import { PROFILE } from "@/data/profile";
import { motion } from "framer-motion";

const CR_ORANGE = "#F47521";
const CR_PURPLE = "#7B2FBE";

const SOCIALS = [
  { label: "GitHub", href: PROFILE.github, icon: "{ }" },
  { label: "Twitter", href: PROFILE.twitter, icon: "𝕏" },
  { label: "Medium", href: PROFILE.medium, icon: "M" },
  { label: "LinkedIn", href: PROFILE.linkedin, icon: "in" },
];

export const AnimeContact = () => (
  <section
    id="contact"
    className="relative py-24 overflow-hidden"
    style={{ background: "linear-gradient(180deg,#0a0007,#050308)" }}
  >
    {/* Anime city BG */}
    <div className="absolute inset-0 pointer-events-none">
      <img
        src={animeCity}
        alt=""
        className="w-full h-full object-cover opacity-[0.09]"
        style={{
          filter: "saturate(1.3) brightness(0.8)",
          mixBlendMode: "luminosity",
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-[#050308] via-[#050308]/60 to-[#0a0007]" />
    </div>

    {/* Energy blast decorative */}
    <motion.img
      src={energyBlast}
      alt=""
      animate={{ opacity: [0.04, 0.1, 0.04], rotate: [0, -5, 0] }}
      transition={{ duration: 7, repeat: Infinity }}
      className="absolute right-0 bottom-0 w-80 pointer-events-none select-none"
      style={{ mixBlendMode: "screen", transformOrigin: "bottom right" }}
    />

    {/* Bottom glow line */}
    <div
      className="absolute bottom-0 left-0 right-0 h-px"
      style={{
        background: `linear-gradient(90deg,transparent,${CR_ORANGE}60,transparent)`,
      }}
    />

    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="text-center"
      >
        {/* Label */}
        <div className="inline-flex items-center gap-3 mb-10">
          <div
            className="w-16 h-px"
            style={{
              background: `linear-gradient(90deg,transparent,${CR_ORANGE})`,
            }}
          />
          <span
            className="text-xs font-mono tracking-widest"
            style={{ color: CR_ORANGE }}
          >
            接触 • LET'S CONNECT
          </span>
          <div
            className="w-16 h-px"
            style={{
              background: `linear-gradient(90deg,${CR_ORANGE},transparent)`,
            }}
          />
        </div>

        {/* CTA Card */}
        <div className="relative max-w-2xl mx-auto">
          {/* Animated border */}
          <motion.div
            animate={{ opacity: [0.4, 0.8, 0.4] }}
            transition={{ duration: 3, repeat: Infinity }}
            className="absolute -inset-px rounded-2xl pointer-events-none"
            style={{
              background: `linear-gradient(135deg,${CR_ORANGE}50,transparent 40%,${CR_PURPLE}40,transparent 70%,${CR_ORANGE}50)`,
            }}
          />

          <div
            className="relative rounded-2xl p-8 sm:p-12 overflow-hidden"
            style={{
              background: "rgba(8,5,12,0.95)",
              border: `1px solid rgba(244,117,33,0.15)`,
            }}
          >
            {/* Scanlines */}
            <div
              className="absolute inset-0 pointer-events-none opacity-[0.03]"
              style={{
                backgroundImage:
                  "repeating-linear-gradient(0deg,transparent,transparent 3px,rgba(255,255,255,0.8) 3px,rgba(255,255,255,0.8) 4px)",
              }}
            />

            {/* Corner accents */}
            {[
              "top-0 left-0",
              "top-0 right-0",
              "bottom-0 left-0",
              "bottom-0 right-0",
            ].map((c) => (
              <div
                key={c}
                className={`absolute ${c} w-6 h-6`}
                style={{ opacity: 0.4 }}
              >
                <div
                  className="w-full h-px"
                  style={{
                    background: CR_ORANGE,
                    ...(c.includes("bottom")
                      ? { position: "absolute", bottom: 0 }
                      : {}),
                  }}
                />
                <div
                  className="h-full w-px"
                  style={{
                    background: CR_ORANGE,
                    ...(c.includes("right")
                      ? { position: "absolute", right: 0 }
                      : {}),
                  }}
                />
              </div>
            ))}

            <h2
              className="text-3xl sm:text-5xl font-black text-white mb-3 leading-tight"
              style={{ fontFamily: "'Impact','Arial Black',sans-serif" }}
            >
              BUILD SOMETHING{" "}
              <span
                style={{
                  color: CR_ORANGE,
                  textShadow: `0 0 30px ${CR_ORANGE}60`,
                  fontStyle: "italic",
                }}
              >
                LEGENDARY
              </span>
            </h2>
            <p className="text-white/45 mb-8 max-w-md mx-auto font-mono text-sm leading-relaxed">
              Technical co-founder, architect, or someone who owns outcomes.
              <span style={{ color: CR_ORANGE }}> That's Amit.</span>
            </p>

            {/* Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
              <motion.a
                whileHover={{ scale: 1.04, y: -2 }}
                whileTap={{ scale: 0.97 }}
                href={`mailto:${PROFILE.email}`}
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-bold text-sm text-white"
                style={{
                  background: CR_ORANGE,
                  boxShadow: `0 0 30px ${CR_ORANGE}45, 0 4px 20px ${CR_ORANGE}25`,
                }}
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
                {PROFILE.email}
              </motion.a>
              <motion.a
                whileHover={{ scale: 1.04, y: -2 }}
                whileTap={{ scale: 0.97 }}
                href={PROFILE.linkedin}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-bold text-sm text-white"
                style={{
                  background: "rgba(255,255,255,0.05)",
                  border: `1px solid rgba(244,117,33,0.3)`,
                }}
              >
                <span style={{ color: CR_ORANGE }}>in</span> LinkedIn
              </motion.a>
            </div>

            {/* Socials */}
            <div className="flex gap-3 justify-center flex-wrap">
              {SOCIALS.map((s, i) => (
                <motion.a
                  key={s.label}
                  initial={{ opacity: 0, y: 8 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.06 }}
                  whileHover={{ scale: 1.08, y: -2 }}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono text-white/40 transition-all"
                  style={{ border: "1px solid rgba(255,255,255,0.06)" }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.color = CR_ORANGE;
                    (e.currentTarget as HTMLElement).style.borderColor =
                      `${CR_ORANGE}40`;
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.color =
                      "rgba(255,255,255,0.4)";
                    (e.currentTarget as HTMLElement).style.borderColor =
                      "rgba(255,255,255,0.06)";
                  }}
                >
                  <span style={{ color: CR_ORANGE }}>{s.icon}</span> {s.label}
                </motion.a>
              ))}
            </div>

            <p className="text-xs text-white/25 font-mono mt-8 italic">
              "Every system I architect ships to production."
            </p>
          </div>
        </div>
      </motion.div>

      {/* Footer */}
      <motion.footer
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        className="mt-20 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4"
        style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}
      >
        <p className="text-white/25 text-xs font-mono">
          {PROFILE.name.toUpperCase()} © 2025
        </p>
        <p className="text-white/25 text-xs font-mono">
          Built with <span style={{ color: CR_ORANGE }}>呪力</span> •{" "}
          <span style={{ color: CR_ORANGE }}>{PROFILE.location}</span>
        </p>
        <div className="flex items-end gap-1 h-4">
          {[...Array(4)].map((_, i) => (
            <motion.div
              key={i}
              animate={{ scaleY: [0.3, 1.5 + i * 0.2, 0.3] }}
              transition={{
                duration: 0.7 + i * 0.1,
                repeat: Infinity,
                delay: i * 0.1,
              }}
              className="w-0.5 rounded-full"
              style={{
                height: `${8 + i * 3}px`,
                background: `rgba(244,117,33,0.5)`,
                transformOrigin: "bottom",
              }}
            />
          ))}
        </div>
      </motion.footer>
    </div>
  </section>
);
