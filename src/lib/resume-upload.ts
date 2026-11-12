/**
 * Client-side CV upload that survives flaky mobile connections.
 *
 * "Failed to fetch" means the browser got no answer at all. On phones that happens when:
 *  - the file comes from Google Drive / WhatsApp / iCloud and the browser can't read it any more, or
 *  - the connection drops while the server is still reading the CV (that takes 10–40 s).
 * So we read the file into memory first (a clear error if that fails), retry a fast network
 * failure once, and after a slow one check whether the server finished anyway.
 */

export type UploadFailure = "unreadable" | "network";

export class ResumeUploadError extends Error {
  constructor(public reason: UploadFailure) {
    super(reason);
  }
}

type Result = { res: Response; body: Record<string, unknown> };

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function profileStamp(): Promise<string | null | undefined> {
  try {
    const r = await fetch("/api/me", { cache: "no-store" });
    if (!r.ok) return undefined;
    const b = await r.json();
    return b.user?.profile_updated_at ?? null;
  } catch {
    return undefined;
  }
}

export async function uploadResume(file: File, deps = { fetch: (...a: Parameters<typeof fetch>) => fetch(...a), wait, profileStamp }): Promise<Result> {
  let data: ArrayBuffer;
  try {
    data = await file.arrayBuffer();
  } catch {
    throw new ResumeUploadError("unreadable");
  }
  if (data.byteLength === 0) throw new ResumeUploadError("unreadable");
  const copy = new File([data], file.name, { type: file.type });

  const before = await deps.profileStamp();

  for (let attempt = 0; attempt < 2; attempt++) {
    const form = new FormData();
    form.append("file", copy);
    const started = Date.now();
    try {
      const res = await deps.fetch("/api/resume", { method: "POST", body: form });
      const body = await res.json().catch(() => ({}));
      return { res, body };
    } catch {
      const quick = Date.now() - started < 5000;
      if (quick && attempt === 0) {
        await deps.wait(1500);
        continue; // probably never reached the server: try once more
      }
      // Slow failure: the server may still be reading the CV. Check for up to ~45 s.
      if (before !== undefined) {
        for (let i = 0; i < 9; i++) {
          await deps.wait(5000);
          const now = await deps.profileStamp();
          if (now && now !== before) {
            const me = await deps.fetch("/api/me", { cache: "no-store" });
            const body = await me.json().catch(() => ({}));
            return { res: me, body: { ...body, recovered: true } };
          }
        }
      }
      throw new ResumeUploadError("network");
    }
  }
  throw new ResumeUploadError("network");
}
