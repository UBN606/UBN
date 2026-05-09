import fs from "node:fs";
import path from "node:path";

const HIGGSFIELD_BASE = "https://platform.higgsfield.ai/api/v1";

export function hasHiggsfieldKey() {
  return Boolean(process.env.HIGGSFIELD_API_KEY);
}

// Minimal Higgsfield client. The exact route/body shape varies by Higgsfield
// platform tier; this matches the public "image generation" surface they
// expose and is structured so the route can be swapped via env var.
export async function generateStill({ prompt, model, outPath, signal }) {
  const key = process.env.HIGGSFIELD_API_KEY;
  if (!key) throw new Error("HIGGSFIELD_API_KEY not set");
  const usedModel = model ?? process.env.HIGGSFIELD_MODEL ?? "nano-banana-pro";
  const route = process.env.HIGGSFIELD_IMAGE_ROUTE ?? "/images/generate";

  const submit = await fetch(`${HIGGSFIELD_BASE}${route}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({ model: usedModel, prompt, aspect_ratio: "16:9" }),
    signal,
  });
  if (!submit.ok) {
    const text = await submit.text();
    throw new Error(`Higgsfield submit failed (${submit.status}): ${text}`);
  }
  const submitJson = await submit.json();
  const jobId = submitJson.id ?? submitJson.job_id;
  if (!jobId) {
    if (submitJson.image_url) {
      return downloadTo(submitJson.image_url, outPath);
    }
    throw new Error(`Higgsfield response missing job id: ${JSON.stringify(submitJson)}`);
  }

  const url = await pollJob(jobId, key, signal);
  return downloadTo(url, outPath);
}

async function pollJob(jobId, key, signal) {
  const route = process.env.HIGGSFIELD_JOB_ROUTE ?? "/jobs";
  const start = Date.now();
  const timeoutMs = Number(process.env.HIGGSFIELD_TIMEOUT_MS ?? 300_000);
  while (Date.now() - start < timeoutMs) {
    const r = await fetch(`${HIGGSFIELD_BASE}${route}/${jobId}`, {
      headers: { authorization: `Bearer ${key}` },
      signal,
    });
    if (!r.ok) {
      const text = await r.text();
      throw new Error(`Higgsfield poll failed (${r.status}): ${text}`);
    }
    const j = await r.json();
    const status = (j.status ?? "").toLowerCase();
    if (status === "succeeded" || status === "completed") {
      const url =
        j.result?.image_url ??
        j.output?.image_url ??
        j.image_url ??
        j.assets?.[0]?.url;
      if (!url) throw new Error(`Higgsfield job ${jobId} returned no asset URL`);
      return url;
    }
    if (status === "failed" || status === "error") {
      throw new Error(`Higgsfield job ${jobId} failed: ${JSON.stringify(j)}`);
    }
    await new Promise((r) => setTimeout(r, 3000));
  }
  throw new Error(`Higgsfield job ${jobId} timed out`);
}

async function downloadTo(url, outPath) {
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  const r = await fetch(url);
  if (!r.ok) throw new Error(`Asset download failed (${r.status}) for ${url}`);
  const buf = Buffer.from(await r.arrayBuffer());
  fs.writeFileSync(outPath, buf);
  return outPath;
}
