import { describe, expect, it, vi } from "vitest";
import { uploadResume, ResumeUploadError } from "@/lib/resume-upload";

const ok = (body: unknown) => new Response(JSON.stringify(body), { status: 200 });
const file = () => new File(["%PDF-1.4 cv"], "cv.pdf", { type: "application/pdf" });
const noWait = async () => {};

describe("uploadResume", () => {
  it("reports a file the phone can't read", async () => {
    const broken = { name: "cv.pdf", type: "application/pdf", arrayBuffer: () => Promise.reject(new Error("NotReadableError")) } as unknown as File;
    await expect(uploadResume(broken, { fetch: vi.fn(), wait: noWait, profileStamp: async () => null })).rejects.toEqual(new ResumeUploadError("unreadable"));
  });

  it("retries once after a quick network failure", async () => {
    const f = vi.fn().mockRejectedValueOnce(new TypeError("Failed to fetch")).mockResolvedValueOnce(ok({ user: { name: "A" } }));
    const { res, body } = await uploadResume(file(), { fetch: f, wait: noWait, profileStamp: async () => null });
    expect(res.ok).toBe(true);
    expect(body.user).toEqual({ name: "A" });
    expect(f).toHaveBeenCalledTimes(2);
  });

  it("recovers when the server finished despite the dropped connection", async () => {
    vi.useFakeTimers();
    const stamps = ["2026-11-01", "2026-11-01", "2026-11-12"];
    const profileStamp = async () => stamps.shift() ?? "2026-11-12";
    const f = vi.fn(async (url: string) => {
      if (url === "/api/me") return ok({ user: { name: "B" } });
      vi.advanceTimersByTime(30_000); // the upload hung for 30 s, then dropped
      throw new TypeError("Failed to fetch");
    });
    const { body } = await uploadResume(file(), { fetch: f as never, wait: noWait, profileStamp });
    vi.useRealTimers();
    expect(body.recovered).toBe(true);
    expect(body.user).toEqual({ name: "B" });
  });

  it("gives up with a network error when nothing changed", async () => {
    const f = vi.fn().mockRejectedValue(new TypeError("Failed to fetch"));
    await expect(uploadResume(file(), { fetch: f, wait: noWait, profileStamp: async () => "same" })).rejects.toEqual(new ResumeUploadError("network"));
  });
});
