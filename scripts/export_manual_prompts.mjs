import "../src/env.mjs";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");

const shots = JSON.parse(
  fs.readFileSync(path.join(repoRoot, "config/shots.json"), "utf8")
).shots.filter((s) => !s.existing);

const outDir = path.join(repoRoot, "outputs");
fs.mkdirSync(outDir, { recursive: true });

const stills = ["# Manual still prompts (Higgsfield UI, 16:9)", ""];
const motion = ["# Manual motion prompts (Veo 3.1 Lite or LongCat-Video, 16:9)", ""];
for (const s of shots) {
  stills.push(`## ${s.id}`, "", s.still_prompt, "");
  motion.push(`## ${s.id} (${s.duration_s}s)`, "", s.motion_prompt, "");
}

fs.writeFileSync(path.join(outDir, "manual_stills.md"), stills.join("\n"));
fs.writeFileSync(path.join(outDir, "manual_motion.md"), motion.join("\n"));
console.log(`wrote outputs/manual_stills.md`);
console.log(`wrote outputs/manual_motion.md`);
