import fs from "node:fs";
import path from "node:path";

let _client;

function getClient() {
  if (_client) return _client;
  const id = process.env.HIGGSFIELD_API_KEY;
  const secret = process.env.HIGGSFIELD_SECRET;
  if (!id || !secret) {
    throw new Error(
      "HIGGSFIELD_API_KEY and HIGGSFIELD_SECRET must both be set."
    );
  }
  // Lazy-load so the rest of the pipeline works without the SDK installed.
  return import("@higgsfield/client/v2").then(({ createHiggsfieldClient }) => {
    _client = createHiggsfieldClient({ credentials: `${id}:${secret}` });
    return _client;
  });
}

export function hasHiggsfieldKey() {
  return Boolean(process.env.HIGGSFIELD_API_KEY && process.env.HIGGSFIELD_SECRET);
}

export async function generateStill({ prompt, outPath, modelPath, aspectRatio = "16:9", seed }) {
  const client = await getClient();
  const usedModel =
    modelPath ?? process.env.HIGGSFIELD_MODEL_PATH ?? "nano-banana-pro/text-to-image";

  const input = { prompt, aspect_ratio: aspectRatio };
  if (seed != null) input.seed = seed;

  const jobSet = await client.subscribe(usedModel, { input, withPolling: true });
  if (!jobSet.isCompleted) {
    throw new Error(`Higgsfield job did not complete: ${JSON.stringify(jobSet)}`);
  }
  const url = jobSet.jobs?.[0]?.results?.raw?.url;
  if (!url) {
    throw new Error(`Higgsfield job completed but no asset URL: ${JSON.stringify(jobSet)}`);
  }
  return downloadTo(url, outPath);
}

async function downloadTo(url, outPath) {
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  const r = await fetch(url);
  if (!r.ok) throw new Error(`Asset download failed (${r.status}) for ${url}`);
  const buf = Buffer.from(await r.arrayBuffer());
  fs.writeFileSync(outPath, buf);
  return outPath;
}
