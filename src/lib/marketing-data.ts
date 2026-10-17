// Landing page content. Everything here must be true: no invented numbers, quotes or customer names.

export const exampleJob = {
  title: "Senior Product Designer",
  company: "Northwind Labs",
  location: "Stockholm · Hybrid",
  salary: "65–78k SEK / mo",
  posted: "2 days ago",
  score: 87,
  matched: ["Figma", "Design systems", "User research", "Prototyping"],
  missing: ["Motion design"],
};

/** Short promises shown under the hero. */
export const promises = ["Free during beta", "No credit card", "Your resume is never sold", "Delete your data any time"];

/** Facts about how the product works (not usage claims, which we can't back up yet). */
export const stats = [
  { value: "5", label: "signals behind every fit score" },
  { value: "2×", label: "weight on a job's must-have skills" },
  { value: "0", label: "resumes shown to employers or sold" },
  { value: "1 click", label: "to download or delete your data" },
];

export const steps = [
  {
    n: "01",
    title: "Upload your resume",
    body: "We parse it into skills, seniority and experience — you review and correct anything we got wrong.",
  },
  {
    n: "02",
    title: "Get scored matches",
    body: "Every listing gets a fit score with the exact skills you match and the ones you're missing.",
  },
  {
    n: "03",
    title: "Apply with a tailored letter",
    body: "One click drafts a cover letter grounded in your real experience. Edit, send, and track it.",
  },
];

/**
 * Real quotes only, with the person's permission. The section stays hidden
 * while this list is empty. Example shape:
 * { quote: "…", name: "First name + initial", role: "Their role" }
 */
export const testimonials: { quote: string; name: string; role: string }[] = [];

/** Shown in place of testimonials until there are real ones. */
export const principles = [
  {
    title: "Honest scores",
    body: "Your fit score only measures how well you meet a job's requirements. Your preferences can reorder results, but never inflate the number.",
  },
  {
    title: "Nothing made up",
    body: "Cover letters are written only from experience in your resume. No invented results, no fake numbers. You review every word before it's sent.",
  },
  {
    title: "Your data, your call",
    body: "Your resume is used only to match you with jobs. Download everything or delete your account from your profile, any time.",
  },
];
