import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";

// Runs LongCat-Video's run_demo_image_to_video.py for one shot.
// Expects a local clone of https://github.com/meituan-longcat/LongCat-Video at
// LONGCAT_DIR with weights at LONGCAT_CHECKPOINT_DIR. Output is an mp4 written
// to outPath. Caller is responsible for GPU availability.
export async function animateStill({ stillPath, motionPrompt, outPath, durationS }) {
  const longcatDir = process.env.LONGCAT_DIR;
  const checkpoint = process.env.LONGCAT_CHECKPOINT_DIR;
  if (!longcatDir) throw new Error("LONGCAT_DIR not set");
  if (!checkpoint) throw new Error("LONGCAT_CHECKPOINT_DIR not set");
  if (!fs.existsSync(stillPath)) throw new Error(`Missing still: ${stillPath}`);

  fs.mkdirSync(path.dirname(outPath), { recursive: true });

  const args = [
    "--standalone",
    "--nproc_per_node=1",
    "run_demo_image_to_video.py",
    `--checkpoint_dir=${checkpoint}`,
    `--image_path=${stillPath}`,
    `--prompt=${motionPrompt}`,
    `--output_path=${outPath}`,
  ];
  if (durationS) args.push(`--duration_s=${durationS}`);
  if (process.env.LONGCAT_ENABLE_COMPILE === "1") args.push("--enable_compile");

  await runChild("torchrun", args, { cwd: longcatDir });
  if (!fs.existsSync(outPath)) {
    throw new Error(`LongCat finished but no output at ${outPath}`);
  }
  return outPath;
}

function runChild(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: "inherit", ...opts });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${cmd} exited with code ${code}`));
    });
  });
}
