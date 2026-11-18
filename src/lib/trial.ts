import { one } from "./db";
import { hasProfile } from "./matching";
import { paywallEnabled, TRIAL_DAYS } from "./plans";
import type { UserRow } from "./data";

/**
 * Starts the free Pro trial once per account: on the first CV upload, or, for people who already
 * had a CV when the paywall was switched on, on their next dashboard visit. Only for Basic
 * accounts without a subscription, and only while the paywall is on. Returns the updated user.
 */
export async function ensureTrial(user: UserRow): Promise<UserRow> {
  if (!paywallEnabled() || TRIAL_DAYS <= 0 || user.trial_ends_at || user.role === "admin") return user;
  if (!hasProfile(user) || (user.plan && user.plan !== "basic") || user.stripe_subscription_id) return user;
  const row = await one<{ trial_ends_at: Date }>(
    `UPDATE users SET trial_ends_at = now() + make_interval(days => $2)
     WHERE id = $1 AND trial_ends_at IS NULL RETURNING trial_ends_at`,
    [user.id, TRIAL_DAYS],
  );
  return row ? { ...user, trial_ends_at: row.trial_ends_at } : user;
}
