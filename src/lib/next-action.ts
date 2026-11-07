/**
 * "What should I do today?" — the dashboard's top card.
 *
 * Pure functions over data the dashboard already loads, so the advice is
 * instant, free (no AI call) and testable. The profile checklist mirrors
 * computeResumeScore exactly: every "+N" shown is the real number of points
 * that step adds to profile strength.
 */

export type ChecklistItem = {
  key: "skills" | "roles" | "described" | "dated" | "years" | "education" | "places";
  done: boolean;
  /** Profile-strength points still available from this step (0 when done or unscored). */
  gain: number;
  /** How far along, for steps with a count (e.g. 7 of 15 skills). */
  have?: number;
  want?: number;
};

type Role = { title?: string; start?: string | null; summary?: string | null };

export function profileChecklist(p: {
  skills: string[];
  experience: Role[];
  yearsExperience: number | null;
  locations: string[];
  remoteOnly: boolean;
  education?: unknown[];
}): ChecklistItem[] {
  const roles = p.experience.slice(0, 5);
  const skills = Math.min(p.skills.length, 15);
  const described = Math.min(roles.filter((r) => (r.summary ?? "").trim().length >= 60).length, 3);
  const dated = roles.length > 0 && roles.every((r) => r.start);
  const round = (n: number) => Math.round(n);
  return [
    { key: "skills", done: skills >= 15, gain: round((15 - skills) * 2.5), have: skills, want: 15 },
    { key: "roles", done: roles.length >= 3, gain: (3 - Math.min(roles.length, 3)) * 8, have: Math.min(roles.length, 3), want: 3 },
    { key: "described", done: described >= 3, gain: (3 - described) * 8, have: described, want: 3 },
    { key: "dated", done: dated, gain: dated ? 0 : 8 },
    { key: "years", done: p.yearsExperience != null, gain: p.yearsExperience != null ? 0 : 7 },
    // Not part of profile strength, but parts of every fit score depend on them:
    // education is 20 of 100 points wherever an ad asks for a degree.
    { key: "education", done: (p.education?.length ?? 0) > 0, gain: 0 },
    { key: "places", done: p.locations.length > 0 || p.remoteOnly, gain: 0 },
  ];
}

/** The open step worth the most points (unscored steps last). */
export function bestProfileStep(items: ChecklistItem[]): ChecklistItem | null {
  const open = items.filter((i) => !i.done);
  if (open.length === 0) return null;
  return [...open].sort((a, b) => b.gain - a.gain)[0];
}

export type NextAction =
  | { kind: "apply"; jobId: string; title: string; company: string; score: number; ready: number }
  | { kind: "profile"; step: ChecklistItem; strength: number }
  | { kind: "learn"; skill: string; jobs: number }
  | { kind: "browse" };

/**
 * Priority: a strong match waiting is the fastest route to an interview, so it
 * wins — unless the profile is too thin for scores to be trusted, in which case
 * fixing the profile comes first. Then the most common missing skill. Then browse.
 */
export function nextAction(input: {
  /** `ready` = the fit score's readiness is "ready" (80+ and no missing must-have). */
  matches: { id: string; title: string; company: string; score: number; ready: boolean; applied: boolean }[];
  strength: number;
  checklist: ChecklistItem[];
  gaps: { skill: string; jobs: number }[];
}): NextAction {
  const step = bestProfileStep(input.checklist);
  const thin = input.strength < 30 && step != null && step.gain >= 8;
  const ready = input.matches.filter((m) => m.ready && !m.applied);
  if (ready.length > 0 && !thin) {
    const top = ready[0];
    return { kind: "apply", jobId: top.id, title: top.title, company: top.company, score: top.score, ready: ready.length };
  }
  if (step && (thin || step.gain >= 8)) return { kind: "profile", step, strength: input.strength };
  if (input.gaps.length > 0) return { kind: "learn", skill: input.gaps[0].skill, jobs: input.gaps[0].jobs };
  if (step) return { kind: "profile", step, strength: input.strength };
  return { kind: "browse" };
}
