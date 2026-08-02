/**
 * Classification for the 4,684 playlists in the m3u-rest-api index.
 *
 * The upstream index is a flat, unmoderated list: alongside real categories
 * ("jazz", "germany", "80s") it carries scraper artefacts ("re", "na", "aac"),
 * internal tag namespaces ("lang_en", "loca_us") and catch-alls ("other",
 * "various"). Rendering it verbatim would give the user 4,684 meaningless
 * tabs, so every category is bucketed into a section and the noise is filtered
 * out of the browsable set.
 */

export type RadioGroup = "genre" | "decade" | "language" | "country" | "theme" | "other";

export interface RadioGroupMeta {
  id: RadioGroup;
  label: string;
  /** Short blurb shown under the section heading. */
  blurb: string;
  /** Tailwind classes for the section's accent, keeping each rail distinct. */
  accent: string;
  dot: string;
}

export const RADIO_GROUPS: RadioGroupMeta[] = [
  { id: "genre", label: "Genres", blurb: "Sound and style", accent: "text-purple-300", dot: "bg-purple-400" },
  { id: "decade", label: "Decades", blurb: "Travel back in time", accent: "text-amber-300", dot: "bg-amber-400" },
  { id: "country", label: "Countries", blurb: "Tune in worldwide", accent: "text-emerald-300", dot: "bg-emerald-400" },
  { id: "language", label: "Languages", blurb: "Listen in your tongue", accent: "text-sky-300", dot: "bg-sky-400" },
  { id: "theme", label: "Moods & Themes", blurb: "Whatever the moment calls for", accent: "text-pink-300", dot: "bg-pink-400" },
  { id: "other", label: "More", blurb: "Everything else worth a listen", accent: "text-fg-secondary", dot: "bg-white/40" },
];

/* ── Vocabularies ──────────────────────────────────────────────────────── */

const GENRES = new Set([
  "pop", "pop_music", "rock", "rock_music", "classic_rock", "hard_rock", "soft_rock", "punk", "punk_rock",
  "metal", "heavy_metal", "jazz", "smooth_jazz", "acid_jazz", "jazz_funk", "blues", "acoustic_blues",
  "classical", "classical_music", "opera", "country", "folk", "folk_music", "bluegrass", "electronic",
  "electronic_music", "electro", "house", "acid_house", "deep_house", "techno", "trance", "dance",
  "dance_electronic", "drum_and_bass", "dubstep", "ambient", "chillout", "chill", "lounge", "downtempo",
  "hip_hop", "rap", "r_n_b", "rnb", "r_and_b", "soul", "funk", "disco", "reggae", "ska", "dub", "reggaeton",
  "salsa", "latin", "latin_music", "bachata", "merengue", "cumbia", "tango", "flamenco", "samba", "bossa_nova",
  "sertaneja", "forro", "mpb", "schlager", "oldies", "indie", "alternative", "alternative_rock", "grunge",
  "gospel", "christian_contemporary", "hits", "top_40", "top40", "top_hits", "classic_hits", "charts",
  "adult_contemporary", "easy_listening", "easy_listening_music", "instrumental", "soundtrack", "world",
  "world_music", "new_age", "swing", "big_band", "brazilian_music", "regional_music", "international_music",
  "pop_rock", "progressive_rock", "psychedelic", "hardcore", "industrial", "trap", "garage", "breakbeat",
  "eurodance", "italo_disco", "synthpop", "j_pop", "k_pop", "anime", "chanson", "fado", "afrobeat",
  "bollywood", "classic", "classics", "retro", "retro_music", "ballads", "urban", "traditional",
]);

const THEMES = new Set([
  "news", "talk", "news_talk", "talks_show", "sports", "sport", "comedy", "culture", "entertainment",
  "religious", "religion", "christian", "bible", "spiritual", "evangelical", "catholic", "islamic", "quran",
  "education", "educational", "kids", "children", "christmas", "holiday", "workout", "fitness", "party",
  "club", "relax", "relaxing", "sleep", "study", "meditation", "romantic", "love", "public", "public_radio",
  "community", "college", "university", "audiobooks", "podcast", "storytelling", "history", "science",
  "business", "politics", "health", "lifestyle", "variety", "eclectic", "mix", "information", "weather",
  "traffic", "contemporary", "adult", "show", "live", "nature", "gaming", "military",
]);

const COUNTRIES = new Set([
  "united_states", "united_states_of_america", "usa", "germany", "brazil", "brasil", "france", "canada",
  "italy", "italia", "spain", "russia", "russian_federation", "mexico", "netherlands", "greece", "colombia",
  "argentina", "australia", "poland", "chile", "switzerland", "turkey", "belgium", "portugal", "austria",
  "romania", "peru", "india", "china", "japan", "south_korea", "indonesia", "philippines", "thailand",
  "vietnam", "malaysia", "singapore", "pakistan", "bangladesh", "sri_lanka", "nepal", "united_kingdom",
  "england", "scotland", "wales", "ireland", "sweden", "norway", "denmark", "finland", "iceland", "estonia",
  "latvia", "lithuania", "ukraine", "belarus", "czech_republic", "czechia", "slovakia", "hungary", "bulgaria",
  "serbia", "croatia", "slovenia", "bosnia", "albania", "macedonia", "montenegro", "moldova", "georgia",
  "armenia", "azerbaijan", "kazakhstan", "uzbekistan", "israel", "lebanon", "syria", "jordan", "iraq", "iran",
  "saudi_arabia", "united_arab_emirates", "qatar", "kuwait", "egypt", "morocco", "algeria", "tunisia", "libya",
  "nigeria", "ghana", "kenya", "uganda", "tanzania", "south_africa", "ethiopia", "senegal", "ivory_coast",
  "cameroon", "zimbabwe", "zambia", "venezuela", "ecuador", "bolivia", "paraguay", "uruguay", "cuba",
  "dominican_republic", "puerto_rico", "guatemala", "honduras", "el_salvador", "nicaragua", "costa_rica",
  "panama", "jamaica", "haiti", "trinidad_and_tobago", "new_zealand", "luxembourg", "malta", "cyprus",
  "europe", "asia", "africa", "north_america", "south_america", "oceania", "latin_america", "middle_east",
  "caribbean", "scandinavia", "balkans",
]);

const LANGUAGES = new Set([
  "english", "german", "deutsch", "spanish", "espanol", "portuguese", "portugues", "french", "francais",
  "italian", "dutch", "greek", "turkish", "russian", "polish", "chinese", "mandarin", "cantonese", "japanese",
  "korean", "arabic", "hebrew", "hindi", "urdu", "bengali", "tamil", "telugu", "punjabi", "marathi",
  "gujarati", "malayalam", "kannada", "swedish", "norwegian", "danish", "finnish", "icelandic", "czech",
  "slovak", "hungarian", "romanian", "bulgarian", "serbian", "croatian", "slovenian", "albanian", "ukrainian",
  "belarusian", "lithuanian", "latvian", "estonian", "catalan", "basque", "galician", "welsh", "irish",
  "gaelic", "afrikaans", "swahili", "amharic", "yoruba", "igbo", "hausa", "zulu", "persian", "farsi",
  "pashto", "thai", "vietnamese", "indonesian", "malay", "tagalog", "filipino", "brazilian", "mexican",
  "multilingual", "bilingual",
]);

/**
 * Slugs that exist upstream but mean nothing to a listener — scraper leftovers,
 * container formats, and buckets so broad they are not a category at all.
 */
const DENYLIST = new Set([
  "other", "others", "various", "va", "misc", "miscellaneous", "unknown", "undefined", "null", "none",
  "radio", "music", "fm", "am", "internet_only", "local", "frequency", "top", "top_", "years", "generic",
  "aac", "aac_", "mp3", "ogg", "flac", "opus", "hls", "icecast", "shoutcast", "stream", "streaming",
  "test", "default", "all", "any", "na", "n_a", "re", "un", "el", "la", "de", "es", "en", "fr", "it", "pt",
  "ru", "br", "us", "ca", "ar", "mx", "tr", "gr", "ng", "oc", "al", "mi", "he", "va_", "int", "web",
  "online", "new", "old", "best", "good", "nice", "cool", "hot", "the", "and", "for", "with",
]);

/* ── Rules ─────────────────────────────────────────────────────────────── */

/** "80s", "90er", "1970s", "2000s", "2018", "20s_30s_40s" and friends. */
const DECADE_RE = /^(\d{2}|\d{4})(s|er)$/;
const YEAR_RE = /^(19[2-9]\d|20[0-3]\d)$/;
const MULTI_DECADE_RE = /^\d{2}s(_\d{2}s)+$/;

/** Upstream tag namespaces: `lang_en`, `lang_ger`, `loca_us`, `loca_br`. */
const NAMESPACE_RE = /^(lang|loca|locale|cc|iso)_/;

export function classifySlug(slug: string): RadioGroup {
  const s = slug.toLowerCase().trim();

  if (DECADE_RE.test(s) || YEAR_RE.test(s) || MULTI_DECADE_RE.test(s)) return "decade";
  if (LANGUAGES.has(s)) return "language";
  if (COUNTRIES.has(s)) return "country";
  if (GENRES.has(s)) return "genre";
  if (THEMES.has(s)) return "theme";

  // Compound slugs inherit the group of a recognised head or tail token, so
  // "classic_rock_hits" files under genre and "christian_hip_hop" under genre.
  const parts = s.split("_");
  if (parts.length > 1) {
    for (const set of [
      [GENRES, "genre"] as const,
      [THEMES, "theme"] as const,
      [COUNTRIES, "country"] as const,
      [LANGUAGES, "language"] as const,
    ]) {
      const [vocab, group] = set;
      if (vocab.has(parts[0]) || vocab.has(parts[parts.length - 1])) return group;
    }
  }

  return "other";
}

/**
 * Whether a category is worth showing. Filters scraper noise, tag namespaces,
 * and categories too small to be worth a tap.
 */
export function isBrowsableSlug(slug: string, count: number, minCount = 25): boolean {
  const s = slug.toLowerCase().trim();
  if (!s) return false;
  if (count < minCount) return false;
  if (DENYLIST.has(s)) return false;
  if (NAMESPACE_RE.test(s)) return false;
  // Bare 1–2 character slugs are country/language codes, not labels.
  if (s.replace(/[^a-z0-9]/g, "").length <= 2) return false;
  // Slugs that are pure punctuation or digits without being a year/decade.
  if (/^\d+$/.test(s) && !YEAR_RE.test(s)) return false;
  return true;
}

/** Turn "classic_rock" / "hip-hop" into "Classic Rock" / "Hip Hop". */
export function prettifyName(slug: string): string {
  const ACRONYMS: Record<string, string> = {
    usa: "USA", uk: "UK", us: "US", bbc: "BBC", edm: "EDM", rnb: "R&B", dj: "DJ",
    fm: "FM", am: "AM", tv: "TV", nyc: "NYC", la: "LA", uae: "UAE",
  };
  return slug
    .split(/[_\-\s]+/)
    .filter(Boolean)
    .map((word) => ACRONYMS[word.toLowerCase()] ?? word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/**
 * Hand-picked categories for the landing rail — broad, high-quality, and
 * recognisable rather than simply the biggest playlists.
 */
export const FEATURED_SLUGS = [
  "indian", "pop", "rock", "jazz", "classical", "news", "dance", "electronic",
  "hip_hop", "chillout", "lofi", "country", "metal", "reggae", "blues", "soul",
  "ambient", "latin", "soundtrack", "80s", "90s", "talk",
];
