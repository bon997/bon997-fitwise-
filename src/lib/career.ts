import { one, sql } from "./db";
import { can } from "./plans";
import { previewPlan, type CareerPlan } from "./agents/career";

export type StoredPlan = { plan: CareerPlan; target_role: string | null; horizon: number; locale: string; created_at: Date };

export const getCareerPlan = (userId: string) =>
  one<StoredPlan>("SELECT plan, target_role, horizon, locale, created_at FROM career_plans WHERE user_id = $1", [userId]);

export const saveCareerPlan = (userId: string, plan: CareerPlan, targetRole: string | null, horizon: number, locale: string) =>
  one<StoredPlan>(
    `INSERT INTO career_plans (user_id, plan, target_role, horizon, locale) VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (user_id) DO UPDATE SET plan = EXCLUDED.plan, target_role = EXCLUDED.target_role,
       horizon = EXCLUDED.horizon, locale = EXCLUDED.locale, created_at = now()
     RETURNING plan, target_role, horizon, locale, created_at`,
    [userId, JSON.stringify(plan), targetRole, horizon, locale],
  );

/** What a user may see: Premium sees everything; others see the path and first steps. */
export const visiblePlan = (plan: CareerPlan, user: Parameters<typeof can>[0]) =>
  can(user, "career_coach") ? { ...plan, locked: false } : previewPlan(plan);
export type VisiblePlan = ReturnType<typeof visiblePlan>;

/** "Material Planner / Materialplanerare" → ["Material Planner", "Materialplanerare"]. */
export const titleVariants = (role: string) =>
  role.split(/\s*[/|,(]\s*|\s+eller\s+|\s+or\s+/i).map((s) => s.replace(/[)]/g, "").trim()).filter((s) => s.length >= 3).slice(0, 3);

/** Open jobs right now whose title contains the role (any variant), for each role. */
export async function openJobCounts(roles: string[]): Promise<Record<string, number>> {
  const out: Record<string, number> = {};
  await Promise.all(roles.map(async (role) => {
    const variants = titleVariants(role);
    if (!variants.length) return void (out[role] = 0);
    const [row] = await sql<{ n: number }>(
      `SELECT count(*)::int AS n FROM jobs WHERE is_active AND title ILIKE ANY ($1::text[])`,
      [variants.map((v) => `%${v.replace(/[%_\\]/g, "\\$&")}%`)],
    );
    out[role] = row?.n ?? 0;
  }));
  return out;
}

export const planRoles = (p: CareerPlan) => [...p.path.map((s) => s.role), ...p.alternatives.map((a) => a.role)];
