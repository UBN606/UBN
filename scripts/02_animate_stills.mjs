import "../src/env.mjs";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { animateStill } from "../src/longcat.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");

const shots = JSON.parse(
  fs.readFileSync(path.join(repoRoot, "config/shots.json"), "utf8")
).shots.filter((s) => !s.existing);

const workDir = process.env.WORK_DIR ?? "./outputs";
const stillsDir = path.join(workDir, "stills");
const clipsDir = path.join(workDir, "clips_raw");
fs.mkdirSync(clipsDir, { recursive: true });

const missingStills = shots
  .map((s) => ({ s, p: path.join(stillsDir, `${s.id}.png`) }))
  .filter((x) => !fs.existsSync(x.p));

if (missingStills.length) {
  console.error(
    `Missing stills for: ${missingStills.map((x) => x.s.id).join(", ")}`
  );
  console.error(`Expected at: ${stillsDir}`);
  console.error("Run npm run stills first, or drop them in manually.");
  process.exit(1);
}

if (!process.env.LONGCAT_DIR || !process.env.LONGCAT_CHECKPOINT_DIR) {
  console.log(
    "LONGCAT_DIR or LONGCAT_CHECKPOINT_DIR not set. Falling back to motion-prompt export."
  );
  const out = path.join(workDir, "manual_motion.md");
  const md = [
    "# Manual i2v generation (LongCat-Video or Veo 3.1 Lite, 16:9)",
    "",
    "For each shot, feed outputs/stills/SHOT_XX.png plus the motion prompt into the model;",
    "save the resulting mp4 as outputs/clips_raw/SHOT_XX.mp4, then run npm run upscale.",
    "",
  ];
  for (const s of shots) {
    md.push(`## ${s.id} (${s.duration_s}s)`);
    md.push("");
    md.push(s.motion_prompt);
    md.push("");
  }
  fs.writeFileSync(out, md.join("\n"));
  console.log(`wrote ${out}`);
  process.exit(0);
}

for (const s of shots) {
  const outPath = path.join(clipsDir, `${s.id}.mp4`);
  if (fs.existsSync(outPath)) {
    console.log(`skip exists: ${outPath}`);
    continue;
  }
  console.log(`animate: ${s.id}`);
  await animateStill({
    stillPath: path.join(stillsDir, `${s.id}.png`),
    motionPrompt: s.motion_prompt,
    outPath,
    durationS: s.duration_s,
  });
}
console.log("animation complete.");
