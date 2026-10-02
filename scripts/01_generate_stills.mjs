import "../src/env.mjs";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { generateStill, hasHiggsfieldKey } from "../src/higgsfield.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");

const shots = JSON.parse(
  fs.readFileSync(path.join(repoRoot, "config/shots.json"), "utf8")
).shots.filter((s) => !s.existing);

const workDir = process.env.WORK_DIR ?? "./outputs";
const stillsDir = path.join(workDir, "stills");
fs.mkdirSync(stillsDir, { recursive: true });

if (!hasHiggsfieldKey()) {
  console.log(
    "HIGGSFIELD_API_KEY or HIGGSFIELD_SECRET not set. Falling back to manual prompt export."
  );
  const out = path.join(workDir, "manual_stills.md");
  const md = [
    "# Manual still generation (Higgsfield UI, nano-banana-pro, 16:9)",
    "",
    "Drop the resulting PNGs as SHOT_XX.png into outputs/stills/, then run npm run animate.",
    "",
  ];
  for (const s of shots) {
    md.push(`## ${s.id}`);
    md.push("");
    md.push(s.still_prompt);
    md.push("");
  }
  fs.writeFileSync(out, md.join("\n"));
  console.log(`wrote ${out}`);
  process.exit(0);
}

for (const s of shots) {
  const outPath = path.join(stillsDir, `${s.id}.png`);
  if (fs.existsSync(outPath)) {
    console.log(`skip exists: ${outPath}`);
    continue;
  }
  console.log(`generate: ${s.id}`);
  await generateStill({ prompt: s.still_prompt, outPath });
}
console.log("stills complete.");
