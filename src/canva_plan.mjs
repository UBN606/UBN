import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");

// Reads outputs/jubilee_timeline.json (produced by build_timeline.mjs) and
// writes outputs/canva_build_plan.json plus outputs/canva_runbook.md.
// The plan is consumed by an MCP-driven Canva session; this file does not
// call Canva directly.
export function buildCanvaPlan({ timelinePath, outDir }) {
  const timeline = JSON.parse(fs.readFileSync(timelinePath, "utf8"));

  const assets = [];
  for (const seg of timeline.segments) {
    for (const s of seg.shots) {
      assets.push({
        kind: "video",
        name: `jubilee_${s.id}`,
        source: { drive_path: `02_AI_VIDEO/I2V/${s.id}.mp4` },
      });
    }
  }
  for (let i = 1; i <= 12; i++) {
    const id = `VO-${String(i).padStart(2, "0")}`;
    assets.push({
      kind: "audio",
      name: `jubilee_${id}`,
      source: { drive_path: `01_VO_clean/${id}.mp3` },
    });
  }
  assets.push({
    kind: "audio",
    name: "jubilee_track_heaven",
    source: { drive_path: "05_AUDIO/track_heaven.mp3" },
  });

  const ops = [];
  ops.push({
    op: "add_text",
    layer: "title_card",
    start_s: timeline.title_card.start_s,
    duration_s: timeline.title_card.duration_s,
    lines: timeline.title_card.lines,
    font: timeline.title_card.font,
    style: timeline.title_card.style ?? "regular",
    color: timeline.title_card.color,
    background: timeline.title_card.background,
  });

  for (const seg of timeline.segments) {
    if (seg.shots.length === 0) continue;
    ops.push({
      op: "add_audio",
      asset: `jubilee_${seg.vo}`,
      start_s: seg.shots[0].start_s,
      end_s: seg.shots[seg.shots.length - 1].start_s + seg.shots[seg.shots.length - 1].duration_s,
      track: "vo",
    });
    for (const s of seg.shots) {
      ops.push({
        op: "add_video",
        asset: `jubilee_${s.id}`,
        start_s: s.start_s,
        duration_s: s.duration_s,
        track: "video",
      });
    }
  }

  ops.push({
    op: "add_audio",
    asset: "jubilee_track_heaven",
    start_s: 0,
    end_s: timeline.total_duration_s,
    level_db: timeline.music_bed.level_db,
    track: "music",
  });

  for (const c of timeline.citations) {
    ops.push({
      op: "add_text",
      layer: "citation",
      start_s: c.at_s,
      duration_s: c.duration_s,
      text: c.text,
      ...timeline.citation_style,
    });
  }

  ops.push({
    op: "add_text",
    layer: "closing_card",
    start_s: timeline.closing_card.start_s,
    duration_s: timeline.closing_card.duration_s,
    lines: timeline.closing_card.lines,
    font: timeline.closing_card.font,
    color: timeline.closing_card.color,
    background: timeline.closing_card.background,
  });

  const plan = {
    project: timeline.project,
    title: timeline.title,
    canvas: { aspect_ratio: "16:9", design_type: "doc" },
    total_duration_s: timeline.total_duration_s,
    assets,
    ops,
    export: { type: "mp4", export_quality: "pro" },
  };

  fs.mkdirSync(outDir, { recursive: true });
  const planPath = path.join(outDir, "canva_build_plan.json");
  fs.writeFileSync(planPath, JSON.stringify(plan, null, 2));

  const md = renderRunbook(plan);
  const mdPath = path.join(outDir, "canva_runbook.md");
  fs.writeFileSync(mdPath, md);
  return { planPath, runbookPath: mdPath };
}

function renderRunbook(plan) {
  const lines = [];
  lines.push(`# Canva assembly runbook: ${plan.title}`);
  lines.push("");
  lines.push(
    `Total duration: ${plan.total_duration_s}s. Aspect: ${plan.canvas.aspect_ratio}.`
  );
  lines.push("");
  lines.push("## 1. Upload assets");
  lines.push("");
  lines.push("For each asset below, call upload-asset-from-url with a Drive direct download URL:");
  lines.push("");
  for (const a of plan.assets) {
    lines.push(`- ${a.kind}: ${a.name} (${a.source.drive_path})`);
  }
  lines.push("");
  lines.push("## 2. Create design");
  lines.push("");
  lines.push("Call generate-design with design_type=doc, 16:9, dark background, gold typography.");
  lines.push("");
  lines.push("## 3. Apply ops");
  lines.push("");
  lines.push("Use perform-editing-operations to apply each op in order:");
  lines.push("");
  for (const op of plan.ops) {
    if (op.op === "add_text" && op.layer === "title_card") {
      lines.push(`- ${pad(op.start_s)} title_card (${op.duration_s}s): ${op.lines.join(" / ")}`);
    } else if (op.op === "add_text" && op.layer === "closing_card") {
      lines.push(`- ${pad(op.start_s)} closing_card (${op.duration_s}s): ${op.lines.join(" / ")}`);
    } else if (op.op === "add_text" && op.layer === "citation") {
      lines.push(`- ${pad(op.start_s)} citation (${op.duration_s}s): ${op.text}`);
    } else if (op.op === "add_video") {
      lines.push(`- ${pad(op.start_s)} video ${op.asset} (${op.duration_s}s)`);
    } else if (op.op === "add_audio") {
      const dur = op.end_s - op.start_s;
      const level = op.level_db != null ? `, ${op.level_db}dB` : "";
      lines.push(`- ${pad(op.start_s)} audio ${op.asset} (${dur}s, ${op.track}${level})`);
    }
  }
  lines.push("");
  lines.push("## 4. Export");
  lines.push("");
  lines.push(
    `Call export-design with format type=${plan.export.type}, export_quality=${plan.export.export_quality}.`
  );
  lines.push("");
  return lines.join("\n");
}

function pad(s) {
  const m = String(Math.floor(s / 60)).padStart(2, "0");
  const r = String(s % 60).padStart(2, "0");
  return `${m}:${r}`;
}
