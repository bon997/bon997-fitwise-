/** Types and the ATS keyword check for the cover letter pack. Safe to use in the browser. */

export type RequirementMatch = { requirement: string; match: "strong" | "partial" | "gap"; evidence: string; interview_tip: string };
export type ApplicationPack = {
  letter: string;
  requirements: RequirementMatch[];
  achievement_note: string;
  keywords: string[];
  email: { subject: string; body: string };
};

/** Does the letter contain the keyword (case- and accent-insensitive, as a whole phrase)? */
export function letterHasKeyword(letter: string, keyword: string): boolean {
  const norm = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "");
  const k = norm(keyword).trim();
  if (!k) return false;
  const esc = k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+");
  // Swedish adds endings ("säkerhetslager" → "säkerhetslagret", "leverantör" → "leverantörerna"),
  // so words of 5+ letters may carry up to 4 more letters; short ones ("plan", "MM") must match exactly.
  // Words ending in -er/-el/-en also drop that e before an ending: "lager" → "lagret", "nyckel" → "nyckeln" is fine, "regel" → "reglerna".
  const inflects = /\p{L}$/u.test(k) && k.length >= 5;
  const ending = inflects ? "\\p{L}{0,4}" : "";
  const contracted = inflects && /[^aeiouyåäö]e[rln]$/.test(k) ? `|${esc.slice(0, -2)}${esc.slice(-1)}\\p{L}{1,4}` : "";
  return new RegExp(`(^|[^\\p{L}\\p{N}])(?:${esc}${ending}${contracted})($|[^\\p{L}\\p{N}])`, "u").test(norm(letter));
}

