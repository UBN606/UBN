import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const VO_TO_SHOTS = {
  "VO-01": ["SHOT_02", "SHOT_03", "SHOT_04", "SHOT_05"],
  "VO-02": ["SHOT_07", "SHOT_06"],
  "VO-03": ["SHOT_09", "SHOT_26", "SHOT_27"],
  "VO-04": ["SHOT_10", "SHOT_11", "SHOT_12", "SHOT_28"],
  "VO-05": ["SHOT_13", "SHOT_29"],
  "VO-06": ["SHOT_14", "SHOT_15"],
  "VO-07": ["SHOT_16", "SHOT_17", "SHOT_18"],
  "VO-08": ["SHOT_19", "SHOT_20", "SHOT_21", "SHOT_30", "SHOT_31"],
  "VO-09": ["SHOT_22", "SHOT_08", "SHOT_32"],
  "VO-10": ["SHOT_25", "SHOT_23", "SHOT_33", "SHOT_34"],
  "VO-11": ["SHOT_24", "SHOT_35", "SHOT_36"],
  "VO-12": ["SHOT_25"],
};

const shots = JSON.parse(
  fs.readFileSync(path.join(__dirname, "config/shots.json"), "utf8")
);
const overlays = JSON.parse(
  fs.readFileSync(path.join(__dirname, "config/canva_overlays.json"), "utf8")
);

const shotById = Object.fromEntries(shots.shots.map((s) => [s.id, s]));

const referenced = new Set();
const segments = [];
let cursor_s = overlays.title_card.duration_s;

for (const [vo, shotIds] of Object.entries(VO_TO_SHOTS)) {
  const segShots = [];
  for (const id of shotIds) {
    referenced.add(id);
    const s = shotById[id];
    const dur = s?.duration_s ?? 5;
    segShots.push({ id, duration_s: dur, start_s: cursor_s, vo });
    cursor_s += dur;
  }
  segments.push({ vo, shots: segShots });
}

const titleStart = 0;
const titleEnd = overlays.title_card.duration_s;
const closingStart = cursor_s;
const closingEnd = closingStart + overlays.closing_card.duration_s;

const unreferenced = shots.shots
  .filter((s) => !referenced.has(s.id))
  .map((s) => s.id);

const timeline = {
  project: shots.project,
  title: shots.title,
  total_duration_s: closingEnd,
  title_card: { start_s: titleStart, end_s: titleEnd, ...overlays.title_card },
  closing_card: {
    start_s: closingStart,
    end_s: closingEnd,
    ...overlays.closing_card,
  },
  segments,
  citations: overlays.citation_overlays,
  citation_style: overlays.citation_style,
  music_bed: overlays.music_bed,
  warnings: unreferenced.length
    ? [`Shots not placed in VO_TO_SHOTS: ${unreferenced.join(", ")}`]
    : [],
};

const outDir = path.join(__dirname, "outputs");
fs.mkdirSync(outDir, { recursive: true });
const outPath = path.join(outDir, "jubilee_timeline.json");
fs.writeFileSync(outPath, JSON.stringify(timeline, null, 2));

const fmt = (s) =>
  `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

console.log(`title_card 00:00 -> ${fmt(titleEnd)}`);
for (const seg of segments) {
  const segDur = seg.shots.reduce((a, s) => a + s.duration_s, 0);
  const segStart = seg.shots[0].start_s;
  console.log(
    `${seg.vo} ${fmt(segStart)} -> ${fmt(segStart + segDur)}  ${seg.shots
      .map((s) => `${s.id}(${s.duration_s}s)`)
      .join(" ")}`
  );
}
console.log(`closing_card ${fmt(closingStart)} -> ${fmt(closingEnd)}`);
console.log(`total: ${fmt(closingEnd)} (${closingEnd}s)`);
if (timeline.warnings.length) {
  for (const w of timeline.warnings) console.warn(`warning: ${w}`);
}
console.log(`wrote ${outPath}`);
