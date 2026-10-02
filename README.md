# UBN Jubilee v2 pipeline

Production scaffold for "The Jubilee of Jubilees: The Day the Universe Was Made Whole."
Owns Steps 1 to 5 of the handoff: keyframe stills, image-to-video, 4K upscale,
timeline build, Canva assembly plan.

This repo is deployable code, not a runtime in this sandbox. Run the steps on a
machine with Drive credentials, ffmpeg, and a GPU large enough for LongCat-Video.

## Layout

```
build_timeline.mjs        Step 4: writes outputs/jubilee_timeline.json from VO_TO_SHOTS
upscale_to_4k.mjs         Step 3: ffmpeg lanczos 1080p to 2160p
config/shots.json         All 36 shots, prompts for SHOT_26 to SHOT_36
config/canva_overlays.json Title card, closing card, citation overlays, music bed
src/drive.mjs             Google Drive download/upload via googleapis
src/higgsfield.mjs        Step 1: Higgsfield API client, env-key with manual fallback
src/longcat.mjs           Step 2: shells torchrun into a local LongCat-Video clone
src/canva_plan.mjs        Step 5: builds canva_build_plan.json plus runbook
scripts/01_generate_stills.mjs
scripts/02_animate_stills.mjs
scripts/03_export_canva_plan.mjs
scripts/export_manual_prompts.mjs   Exports both manual prompt files at once
```

## Setup

```
npm install
cp .env.example .env
```

Fill in `.env`:

- `GOOGLE_APPLICATION_CREDENTIALS`: path to a Drive-scoped service account JSON,
  shared into the project Drive folders as Editor.
- `HIGGSFIELD_API_KEY` plus `HIGGSFIELD_SECRET`: optional credential pair.
  Both must be set or Step 1 writes `outputs/manual_stills.md` for manual
  generation in the Higgsfield UI. Optional `HIGGSFIELD_MODEL_PATH` overrides
  the SDK model path; default is `nano-banana-pro/text-to-image`.
- `LONGCAT_DIR` and `LONGCAT_CHECKPOINT_DIR`: path to a local clone of
  https://github.com/meituan-longcat/LongCat-Video and its weights. Without
  them, Step 2 writes `outputs/manual_motion.md` instead.

## Run order

```
npm run stills          # Step 1: SHOT_26.png ... SHOT_36.png in outputs/stills/
npm run animate         # Step 2: SHOT_26.mp4 ... SHOT_36.mp4 in outputs/clips_raw/
npm run upscale         # Step 3: 4K versions in outputs/clips_4k/
npm run timeline        # Step 4: outputs/jubilee_timeline.json
npm run canva-plan      # Step 5: outputs/canva_build_plan.json plus runbook
```

For Step 5, hand `outputs/canva_build_plan.json` and `outputs/canva_runbook.md`
to a Claude session connected to the Canva MCP. The plan lists every asset to
upload, every editing op in time order, and the export call.

## Existing assets in Drive (do not regenerate)

- Project root: `1Gu3CLlc3hY4ovUABsNABU0oP1Ge1U-RO`
- Clips: `02_AI_VIDEO/I2V/SHOT_02.mp4` to `SHOT_25.mp4` (already 4K)
- VO clean: `1VVbpLYzmTl-M_Uw3t2NEBpLpgY_Kr9NF` (VO-01.mp3 to VO-12.mp3)
- Audio: `1hAG2j9jbZBO60RnmIL37kXS6KtkRDCH3` (track_heaven.mp3)

## Rules baked in

- No em dashes in committed prose, runbooks, or overlay text.
- Generation prompts never use the name "Jesus"; they reference "the teacher,"
  "the robed figure," or a physical description.
- Every shot in the timeline is a real animated clip; no stills, no Ken Burns.
- SHOT_02 to SHOT_25 are listed as `existing: true` in `config/shots.json` and
  are never regenerated.

## Fallback paths

- No Higgsfield key: `npm run stills` writes prompts to
  `outputs/manual_stills.md`. Generate in the Higgsfield UI, drop PNGs into
  `outputs/stills/`, then run `npm run animate`.
- No LongCat: `npm run animate` writes motion prompts to
  `outputs/manual_motion.md`. Generate in Google Flow (Veo 3.1 Lite), drop mp4s
  into `outputs/clips_raw/`, then run `npm run upscale`.
- `npm run manual-prompts` writes both manual files at once.
