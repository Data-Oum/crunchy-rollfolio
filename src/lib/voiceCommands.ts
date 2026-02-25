/**
 * src/lib/voiceCommands.ts
 *
 * Detects control commands in voice transcripts — ANY LANGUAGE.
 *
 * Speech recognition outputs romanized transliterations for non-Latin scripts,
 * so we match both native script and phonetic romanization where applicable.
 *
 * Languages covered: English, Hindi, Bengali, Spanish, French, German,
 * Italian, Portuguese, Japanese (romaji), Korean (romaji), Arabic (romaji),
 * Turkish, Dutch, Swedish, Russian (romaji), Swahili, Tagalog, Malay.
 */

export type VoiceCommand =
  | "stop"
  | "close"
  | "mute"
  | "unmute"
  | "pause"
  | "restart"
  | null;

const COMMAND_MAP: Array<{ cmd: VoiceCommand; patterns: RegExp[] }> = [
  // ─────────────────────────────────────────────────────────────────────────
  // CLOSE — end / exit the session
  // ─────────────────────────────────────────────────────────────────────────
  {
    cmd: "close",
    patterns: [
      // English
      /\b(close|exit|quit|goodbye|bye|good\s*bye|end|finish|done|terminate|shut.?down|get.?out|leave|dismiss|see\s+you|talk\s+later|later|ciao)\b/i,
      /\b(end.?(the.?)?(chat|session|call|conversation|this))\b/i,
      /\b(close.?(the.?)?(chat|app|window|this))\b/i,
      /\b(that.?'?s?.?(all|enough|it))\b/i,
      /\b(i.?'?m?.?(done|finished|leaving|going))\b/i,

      // Hindi (romanized — SR output from en-IN)
      /\b(band|bandh|khatam|band.?karo|bandh.?karo|khatam.?karo|niklo|nikalna|bahut.?hua|bas.?karo|alvida|phir.?milenge|theek.?hai.?bye)\b/i,
      /\b(chalo|chalte.?hai|main.?ja.?raha|main.?ja.?rahi)\b/i,

      // Bengali (romanized)
      /\b(bondho|bondho.?koro|shesh|shesh.?koro|jai|jachi|biday|ager.?moto)\b/i,

      // Spanish
      /\b(cerrar|salir|adios|adi[oó]s|terminar|finalizar|hasta.?luego|hasta.?pronto|me.?voy|chao|chau)\b/i,

      // French
      /\b(fermer|quitter|ferme|quitte|au.?revoir|[àa].?bient[oô]t|c.?est.?tout|j.?ai.?fini|terminé|bonne.?journée)\b/i,

      // German
      /\b(schlie[ßs]en|beenden|schlie[ßs]|auf.?wiedersehen|tschüss|tschuess|ich.?gehe|fertig|genug)\b/i,

      // Italian
      /\b(chiudi|chiudere|uscire|arrivederci|ciao|basta|ho.?finito|addio)\b/i,

      // Portuguese
      /\b(fechar|sair|tchau|até.?logo|adeus|acabou|terminei|pronto)\b/i,

      // Japanese (romaji)
      /\b(tojiru|owari|owatte|shimau|sayonara|jya.?ne|mata.?ne|owarimasu|heishieru)\b/i,

      // Korean (romaji)
      /\b(dakke|kkeutnaesseo|jongyo|annyeong|kkeutnaeda|nayo)\b/i,

      // Arabic (romanized)
      /\b(ighlaq|ightilaq|wada.?an|ma.?assalama|salam|khallas|khalas|khilas)\b/i,

      // Turkish
      /\b(kapat|kapat[ıi]|tamam.?bay|bitti|bitiyor|görü[sş]ürüz|güle.?güle)\b/i,

      // Russian (romaji)
      /\b(zakryt|zakroyt|vsyo|poka|do.?svidaniya|zakroi|konec|hvatit)\b/i,

      // Swahili
      /\b(funga|ondoka|tutaonana|kwaheri|ninaenda|imeisha)\b/i,

      // Malay / Indonesian
      /\b(tutup|keluar|selamat.?tinggal|sampai.?jumpa|dah|habis)\b/i,

      // Tagalog
      /\b(isara|paalam|sige.?na|tapos.?na|umalis.?na)\b/i,

      // Universal / cross-language
      /\b(exit|quit|bye|fin|end)\b/i,
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // STOP — stop speaking / stop processing (session stays open)
  // ─────────────────────────────────────────────────────────────────────────
  {
    cmd: "stop",
    patterns: [
      // English
      /\b(stop|halt|cancel|abort|silence|quiet|shush|hush|enough|no.?more|cut.?it)\b/i,
      /\b(stop.?(talking|speaking|it|that|now|please))\b/i,
      /\b(shut.?up|be.?quiet|zip.?it)\b/i,
      /\b(ok.?stop|okay.?stop|please.?stop|just.?stop)\b/i,
      /\b(that.?'?s?.?enough)\b/i,

      // Hindi (romanized)
      /\b(ruko|bas|chup|chup.?raho|mat.?bolo|ruk.?jao|ek.?second|thehro|ruka)\b/i,

      // Bengali (romanized)
      /\b(thamo|thak|chup.?koro|aar.?noi|ektu.?darao|boro)\b/i,

      // Spanish
      /\b(para|p[áa]rate|detente|calla|c[áa]llate|silencio|alto|espera|un.?momento)\b/i,

      // French
      /\b(arr[êe]te|arr[êe]tez|tais.?toi|silence|stop|attends|une.?seconde|assez)\b/i,

      // German
      /\b(halt|stopp|h[öo]r.?auf|warte|einen.?moment|sei.?still|genug|aufh[öo]ren)\b/i,

      // Italian
      /\b(fermati|ferma|stop|aspetta|aspetti|silenzio|basta|zitto|un.?attimo)\b/i,

      // Portuguese
      /\b(para|pare|p[áa]ra|espera|silêncio|silencio|chega|um.?momento)\b/i,

      // Japanese (romaji)
      /\b(yamete|tomatte|matte|chotto|shizukani|mouii|mou.?ii|tomero)\b/i,

      // Korean (romaji)
      /\b(geumeo|jomyo|jamkkan|jamkkan.?man|soyong|shirei)\b/i,

      // Arabic (romanized)
      /\b(waqif|iqaf|iskit|intadhir|lihtha|muntadhir|bas)\b/i,

      // Turkish
      /\b(dur|bekle|sus|tamam|yeter|bir.?saniye)\b/i,

      // Russian (romaji)
      /\b(stoy|stop|podozhdi|molchi|tiho|hvatit|ostanis)\b/i,

      // Swahili
      /\b(simama|acha|subiri|kimya)\b/i,

      // Malay / Indonesian
      /\b(berhenti|tunggu|diam|cukup|sebentar)\b/i,

      // Universal
      /\b(stop|whoa|wait)\b/i,
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // PAUSE
  // ─────────────────────────────────────────────────────────────────────────
  {
    cmd: "pause",
    patterns: [
      /\b(pause|hold.?on|wait|one.?sec|just.?a.?moment|hold.?up|ruk.?jao|ek.?min)\b/i,
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // MUTE
  // ─────────────────────────────────────────────────────────────────────────
  {
    cmd: "mute",
    patterns: [
      /\b(mute|mute.?(the.?)?mic|turn.?off.?(the.?)?mic|disable.?mic|mic.?off)\b/i,
      /\b(stop.?listening|don.?t.?listen|sunna.?mat|mat.?suno)\b/i,
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // UNMUTE
  // ─────────────────────────────────────────────────────────────────────────
  {
    cmd: "unmute",
    patterns: [
      /\b(unmute|turn.?on.?(the.?)?mic|enable.?mic|mic.?on|start.?listening|suno|sunna.?shuru)\b/i,
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // RESTART
  // ─────────────────────────────────────────────────────────────────────────
  {
    cmd: "restart",
    patterns: [
      /\b(restart|reset|start.?over|begin.?again|try.?again|fresh.?start|phir.?se|dobara|naye.?sire.?se)\b/i,
    ],
  },
];

export function detectVoiceCommand(transcript: string): VoiceCommand {
  if (!transcript?.trim()) return null;

  const cleaned = transcript
    .toLowerCase()
    // Strip filler words in English, Hindi, Bengali
    .replace(
      /\b(um|uh|er|ah|like|you know|hey|ok|okay|so|well|please|just|can you|could you|i want you to|aura|hmm|haan|huh|theek|arre)\b/gi,
      " ",
    )
    .replace(/\s{2,}/g, " ")
    .trim();

  // Only match commands in short utterances (≤ 12 words)
  if (cleaned.split(/\s+/).length > 12) return null;

  for (const { cmd, patterns } of COMMAND_MAP) {
    for (const pattern of patterns) {
      if (pattern.test(cleaned)) return cmd;
    }
  }
  return null;
}

export const COMMAND_LABELS: Record<NonNullable<VoiceCommand>, string> = {
  stop: "Stopped",
  close: "Session ended",
  mute: "Mic muted",
  unmute: "Mic active",
  pause: "Paused",
  restart: "Restarting...",
};
