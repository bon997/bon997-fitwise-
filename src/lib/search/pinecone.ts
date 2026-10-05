/**
 * Semantic search with Pinecone hosted embeddings (multilingual-e5-large, 1024-d, cosine).
 * Optional: when PINECONE_API_KEY is unset every function no-ops and the
 * matcher falls back to SQL candidate selection with semantic = null.
 *
 * Create the index once:
 *   pc.createIndex({ name: "fitwise-jobs", dimension: 1024, metric: "cosine",
 *                    spec: { serverless: { cloud: "aws", region: "us-east-1" } } })
 */
import { Pinecone } from "@pinecone-database/pinecone";

const MODEL = "multilingual-e5-large";
const NAMESPACE = "jobs";

let pc: Pinecone | null = null;
export const semanticEnabled = () => Boolean(process.env.PINECONE_API_KEY);

function index() {
  pc ??= new Pinecone({ apiKey: process.env.PINECONE_API_KEY! });
  return pc.index({ name: process.env.PINECONE_INDEX ?? "fitwise-jobs", namespace: NAMESPACE });
}

async function embed(inputs: string[], inputType: "passage" | "query"): Promise<number[][]> {
  pc ??= new Pinecone({ apiKey: process.env.PINECONE_API_KEY! });
  const res = await pc.inference.embed({ model: MODEL, inputs, parameters: { inputType, truncate: "END" } });
  return res.data.map((d) => {
    if (!("values" in d) || !d.values) throw new Error("Expected dense embedding");
    return d.values;
  });
}

export function jobEmbeddingText(j: { title: string; company: string; description: string; requirements: string; skills: { name: string }[] }) {
  return `${j.title} at ${j.company}. Skills: ${j.skills.map((s) => s.name).join(", ")}. ${j.requirements} ${j.description}`.slice(0, 6000);
}

/** Upsert job vectors in batches (Pinecone embed accepts up to 96 inputs per call). */
export async function upsertJobs(
  jobs: { id: string; text: string; location: string | null; remote: boolean; postedAt: Date | null }[],
) {
  if (!semanticEnabled() || jobs.length === 0) return;
  for (let i = 0; i < jobs.length; i += 96) {
    const batch = jobs.slice(i, i + 96);
    const vectors = await embed(batch.map((j) => j.text), "passage");
    await index().upsert({
      records: batch.map((j, k) => ({
        id: j.id,
        values: vectors[k],
        metadata: {
          remote: j.remote,
          location: (j.location ?? "").toLowerCase(),
          posted_ts: j.postedAt ? Math.floor(j.postedAt.getTime() / 1000) : 0,
        },
      })),
    });
  }
}

export async function deleteJobs(ids: string[]) {
  if (!semanticEnabled() || ids.length === 0) return;
  await index().deleteMany({ ids });
}

/**
 * e5 cosine similarities cluster in ~0.70–0.90 for related text. Rescale so
 * the semantic component spreads over 0–1 instead of always reading ~80%.
 */
export function calibrate(cosine: number): number {
  return Math.min(1, Math.max(0, (cosine - 0.72) / (0.88 - 0.72)));
}

/** Nearest jobs to a profile (or free-text query). Returns job id → calibrated similarity. */
export async function querySimilarJobs(
  queryText: string,
  opts: { topK?: number; postedAfter?: Date; remoteOnly?: boolean } = {},
): Promise<Map<string, number>> {
  if (!semanticEnabled()) return new Map();
  const vector = await queryVector(queryText);
  const filter: Record<string, unknown> = {};
  if (opts.postedAfter) filter.posted_ts = { $gte: Math.floor(opts.postedAfter.getTime() / 1000) };
  if (opts.remoteOnly) filter.remote = { $eq: true };

  const res = await index().query({
    vector,
    topK: opts.topK ?? 100,
    filter: Object.keys(filter).length ? filter : undefined,
  });
  return new Map((res.matches ?? []).map((m) => [m.id, calibrate(m.score ?? 0)]));
}

/** Small in-process cache so repeated scoring for the same profile embeds once. */
const queryCache = new Map<string, number[]>();
async function queryVector(text: string): Promise<number[]> {
  const key = text.slice(0, 6000);
  const hit = queryCache.get(key);
  if (hit) return hit;
  const [v] = await embed([key], "query");
  if (queryCache.size > 500) queryCache.delete(queryCache.keys().next().value!);
  queryCache.set(key, v);
  return v;
}

export function cosine(a: number[], b: number[]): number {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return na && nb ? dot / Math.sqrt(na * nb) : 0;
}

/**
 * Calibrated similarity between a profile and specific jobs, using the job
 * vectors already stored in Pinecone. Jobs not yet embedded are absent from
 * the map (→ semantic = null for them).
 */
export async function semanticScores(profileText: string, jobIds: string[]): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  if (!semanticEnabled() || jobIds.length === 0) return out;
  const q = await queryVector(profileText);
  for (let i = 0; i < jobIds.length; i += 100) {
    const { records } = await index().fetch({ ids: jobIds.slice(i, i + 100) });
    for (const [id, rec] of Object.entries(records)) {
      if (rec.values?.length) out.set(id, calibrate(cosine(q, rec.values)));
    }
  }
  return out;
}
