import { route } from "@/lib/http";
import { requireUser } from "@/lib/auth";
import { defaultReportMonth, monthKey, parseMonth, reportCsv, reportRows } from "@/lib/activity-report";
import { labels } from "@/lib/format";
import { localeFromRequest } from "@/i18n/server";

/**
 * GET /api/applications/report?month=YYYY-MM
 * The month's applications as a CSV file for Arbetsförmedlingen's activity report.
 */
export const GET = route(async (req: Request) => {
  const user = await requireUser(req);
  const locale = localeFromRequest(req);
  const month = parseMonth(new URL(req.url).searchParams.get("month")) ?? defaultReportMonth();
  const rows = await reportRows(user.id, month);
  const status = labels(locale).status as Record<string, string>;
  const name = `${locale === "sv" ? "aktivitetsrapport" : "activity-report"}-${monthKey(month)}.csv`;
  return new Response(reportCsv(rows, locale, (s) => status[s] ?? s), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${name}"`,
      "Cache-Control": "private, no-store",
    },
  });
});
