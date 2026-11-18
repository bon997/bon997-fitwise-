import { describe, expect, it } from "vitest";
import { trackerStats } from "@/lib/tracker-stats";

const now = Date.parse("2026-11-18T12:00:00Z");
const days = (n: number) => new Date(now - n * 864e5).toISOString();

describe("trackerStats", () => {
  it("is empty-safe", () => {
    const s = trackerStats([], now);
    expect(s).toMatchObject({ sent: 0, interview_rate: null, success_rate: null });
  });

  it("counts interviews from the timeline, so a rejection after an interview still counts", () => {
    const s = trackerStats(
      [
        { status: "draft", applied_at: null, reached_interview: false },
        { status: "applied", applied_at: days(2), reached_interview: false },
        { status: "applied", applied_at: days(20), reached_interview: false },
        { status: "interviewing", applied_at: days(10), reached_interview: true },
        { status: "rejected", applied_at: days(30), reached_interview: true },
        { status: "offer", applied_at: days(40), reached_interview: true },
      ],
      now,
    );
    expect(s).toEqual({
      saved: 1, sent: 5, active: 3, waiting: 2, interviews: 3, offers: 1,
      interview_rate: 60, success_rate: 20, this_week: 1,
    });
  });
});
