/**
 * Resume file storage in a private Supabase Storage bucket ("resumes").
 * Returns the object path (not a public URL); serve via signed URLs.
 * If Supabase isn't configured, files aren't stored and null is returned —
 * parsing still works because the extracted text is saved in users.resume_text.
 */
export async function storeResume(userId: string, bytes: Buffer, mimeType: string, ext: string): Promise<string | null> {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!base || !key) return null;

  const path = `${userId}/${Date.now()}.${ext}`;
  const res = await fetch(`${base}/storage/v1/object/resumes/${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": mimeType, "x-upsert": "true" },
    body: new Uint8Array(bytes),
  });
  if (!res.ok) throw new Error(`Resume upload failed: ${res.status} ${await res.text()}`);
  return `resumes/${path}`;
}

/** Remove a stored resume ("resumes/<user>/<file>"). No-op without Supabase. */
export async function deleteResumeFile(objectPath: string): Promise<void> {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!base || !key || !objectPath.startsWith("resumes/")) return;
  const res = await fetch(`${base}/storage/v1/object/${objectPath}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${key}` },
  });
  if (!res.ok && res.status !== 404) throw new Error(`Resume delete failed: ${res.status}`);
}
