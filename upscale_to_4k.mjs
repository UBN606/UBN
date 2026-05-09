import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { parseArgs } from "node:util";

const { values } = parseArgs({
  options: {
    input: { type: "string" },
    output: { type: "string" },
    only: { type: "string" },
    skip: { type: "string" },
    overwrite: { type: "boolean", default: false },
  },
  allowPositionals: true,
});

const inputDir = values.input ?? process.env.JUBILEE_CLIPS_IN ?? "./outputs/clips_raw";
const outputDir = values.output ?? process.env.JUBILEE_CLIPS_OUT ?? "./outputs/clips_4k";
const only = values.only ? new Set(values.only.split(",")) : null;
const skip = values.skip ? new Set(values.skip.split(",")) : new Set();

if (!fs.existsSync(inputDir)) {
  console.error(`Input dir does not exist: ${inputDir}`);
  process.exit(1);
}
fs.mkdirSync(outputDir, { recursive: true });

const files = fs
  .readdirSync(inputDir)
  .filter((f) => /^SHOT_\d{2}\.mp4$/.test(f))
  .sort();

const targets = files.filter((f) => {
  const id = f.replace(/\.mp4$/, "");
  if (only && !only.has(id)) return false;
  if (skip.has(id)) return false;
  return true;
});

if (targets.length === 0) {
  console.log("Nothing to upscale.");
  process.exit(0);
}

for (const file of targets) {
  const src = path.join(inputDir, file);
  const dst = path.join(outputDir, file);
  if (fs.existsSync(dst) && !values.overwrite) {
    console.log(`skip exists: ${dst}`);
    continue;
  }
  console.log(`upscale: ${src} -> ${dst}`);
  await ffmpeg([
    "-y",
    "-i", src,
    "-vf", "scale=3840:2160:flags=lanczos",
    "-c:v", "libx264",
    "-preset", "slow",
    "-crf", "16",
    "-pix_fmt", "yuv420p",
    "-c:a", "copy",
    dst,
  ]);
}

function ffmpeg(args) {
  return new Promise((resolve, reject) => {
    const child = spawn("ffmpeg", args, { stdio: "inherit" });
    child.on("error", reject);
    child.on("exit", (code) =>
      code === 0 ? resolve() : reject(new Error(`ffmpeg exited ${code}`))
    );
  });
}
