import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildCanvaPlan } from "../src/canva_plan.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const outDir = path.join(repoRoot, "outputs");

const { planPath, runbookPath } = buildCanvaPlan({
  timelinePath: path.join(outDir, "jubilee_timeline.json"),
  outDir,
});
console.log(`wrote ${planPath}`);
console.log(`wrote ${runbookPath}`);
