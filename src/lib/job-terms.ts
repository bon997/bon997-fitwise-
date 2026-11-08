/**
 * "Did you mean …?" for the admin's job searches. Platsbanken searches for the
 * exact words typed, so "lagistics" quietly finds little or nothing. These lists
 * hold common search words (Swedish and English) and places; a typed word close
 * to one of them — but not on the list — gets a suggestion. Words are never
 * changed automatically: the admin picks the suggestion or keeps what they typed.
 */

export const JOB_TERMS = [
  // Swedish
  "inköpare", "inköp", "upphandlare", "logistik", "logistiker", "lager", "lagerarbetare", "lagerchef", "truckförare",
  "chaufför", "lastbilschaufför", "transport", "speditör", "planerare", "produktionsplanerare", "materialplanerare",
  "säljare", "försäljning", "kundtjänst", "kundservice", "kundsupport", "butikssäljare", "butikschef", "kassapersonal",
  "ekonomi", "ekonomiassistent", "redovisning", "redovisningsekonom", "controller", "lönehandläggare", "revisor",
  "administratör", "assistent", "receptionist", "sekreterare", "projektledare", "projektkoordinator", "chef",
  "utvecklare", "systemutvecklare", "programmerare", "webbutvecklare", "testare", "systemadministratör", "nätverkstekniker",
  "ingenjör", "civilingenjör", "elektriker", "tekniker", "servicetekniker", "mekaniker", "montör", "svetsare", "snickare",
  "målare", "byggnadsarbetare", "rörmokare", "maskinoperatör", "operatör", "produktion", "kvalitet", "kvalitetsingenjör",
  "sjuksköterska", "undersköterska", "vårdbiträde", "personlig assistent", "läkare", "tandläkare", "tandsköterska",
  "lärare", "förskollärare", "barnskötare", "fritidspedagog", "elevassistent", "socionom", "kurator", "handläggare",
  "kock", "köksbiträde", "servitör", "servitris", "diskare", "bagare", "städare", "lokalvårdare", "fastighetsskötare",
  "vaktmästare", "väktare", "ordningsvakt", "hr", "rekryterare", "personalvetare", "marknadsföring", "kommunikatör",
  "designer", "grafisk formgivare", "jurist", "översättare", "tolk", "sommarjobb", "deltid", "heltid", "distans",
  // English
  "buyer", "purchasing", "procurement", "supply chain", "logistics", "warehouse", "forklift", "driver", "planner",
  "sales", "customer service", "customer support", "accounting", "accountant", "finance", "controller", "payroll",
  "administrator", "assistant", "receptionist", "project manager", "manager", "developer", "software developer",
  "software engineer", "frontend", "backend", "fullstack", "data analyst", "data engineer", "tester", "engineer",
  "electrician", "technician", "mechanic", "welder", "carpenter", "operator", "production", "quality",
  "nurse", "assistant nurse", "doctor", "teacher", "preschool teacher", "social worker", "cook", "chef", "waiter",
  "cleaner", "security", "marketing", "communications", "designer", "lawyer", "translator", "interpreter",
  "remote", "part time", "full time",
];

export const PLACES = [
  "stockholm", "göteborg", "malmö", "uppsala", "västerås", "örebro", "linköping", "helsingborg", "jönköping",
  "norrköping", "lund", "umeå", "gävle", "borås", "södertälje", "eskilstuna", "halmstad", "växjö", "karlstad",
  "sundsvall", "östersund", "trollhättan", "luleå", "lidingö", "borlänge", "tumba", "kristianstad", "kalmar",
  "falun", "skövde", "karlskrona", "skellefteå", "uddevalla", "varberg", "landskrona", "nyköping", "motala",
  "trelleborg", "ängelholm", "lerum", "alingsås", "sandviken", "visby", "kiruna", "mölndal", "kungsbacka",
  "solna", "sollentuna", "täby", "huddinge", "nacka", "botkyrka", "haninge", "järfälla", "partille", "enköping",
  "katrineholm", "piteå", "örnsköldsvik", "härnösand", "kumla", "arvika", "ystad", "hässleholm", "nässjö", "värnamo",
  "skåne", "västra götaland", "halland", "dalarna", "norrbotten", "västerbotten", "jämtland", "värmland", "gotland",
  "sweden", "sverige",
];

/** Optimal string alignment distance: insertions, deletions, substitutions and one swap of neighbours. */
export function editDistance(a: string, b: string): number {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)] as number[]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
    }
  }
  return d[a.length][b.length];
}

/**
 * A corrected version of `input`, or null when nothing looks misspelt.
 * Whole phrases on the list ("supply chain") are kept; otherwise each word of
 * 4+ letters that isn't a known word is swapped for the closest known word
 * within 1 edit (5–7 letters) or 2 edits (8+ letters).
 */
export function suggestSpelling(input: string, words: readonly string[] = JOB_TERMS): string | null {
  const text = input.trim().toLowerCase();
  if (text.length < 4) return null;
  const known = new Set(words);
  if (known.has(text)) return null;
  const vocab = [...new Set(words.flatMap((w) => [w, ...w.split(" ")]))];

  let changed = false;
  const out = text.split(/\s+/).map((w) => {
    if (w.length < 4 || vocab.includes(w)) return w;
    const max = w.length >= 8 ? 2 : 1;
    let best: string | null = null;
    let bestD = max + 1;
    for (const v of vocab) {
      if (Math.abs(v.length - w.length) > max) continue;
      const dist = editDistance(w, v);
      if (dist < bestD) { best = v; bestD = dist; }
    }
    if (best) { changed = true; return best; }
    return w;
  });
  return changed ? out.join(" ") : null;
}
