import { dirname } from "node:path";
import { REPO_ROOT, unitAssetDir, unitDir as unitDirOf, unitVideoPath } from "../lib/paths";
import { execSync, spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync, existsSync, rmSync, writeFile } from "node:fs";
import { join, resolve } from "node:path";
import { loadUnitFromMarkdown } from "../lib/utils/content";
import { existsSync as fsExists, readFileSync } from "node:fs";

function checkFfmpeg(): boolean {
  try {
    execSync("ffmpeg -version", { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

function toSrtTime(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  const ms = Math.floor((sec - Math.floor(sec)) * 1000);
  const pad = (n: number, w = 2) => n.toString().padStart(w, "0");
  return `${pad(h)}:${pad(m)}:${pad(s)},${ms.toString().padStart(3, "0")}`;
}

async function main() {
  const unitId = process.argv[2] || "demo-hokusai";
  const dir = unitDirOf(unitId);
  const mdPath = join(dir ?? "", "source.md");
  if (!dir || !existsSync(mdPath)) {
    console.error(`Unit not found: ${unitId}`);
    process.exit(1);
  }
  const unit = loadUnitFromMarkdown(mdPath);
  const publicVideosDir = dirname(unitVideoPath(unitId));
  mkdirSync(publicVideosDir, { recursive: true });
  const outMp4 = join(publicVideosDir, `${unitId}.mp4`);
  const outSrt = join(publicVideosDir, `${unitId}.srt`);

  // Build SRT from scene narrations
  let cursor = 0;
  let srt = "";
  unit.sections.storyboard.forEach((sc, idx) => {
    const start = cursor;
    const end = cursor + sc.durationSec;
    srt += `${idx + 1}\n${toSrtTime(start)} --> ${toSrtTime(end)}\n${sc.narration}\n\n`;
    cursor = end;
  });
  writeFileSync(outSrt, srt, "utf-8");

  // Paths and helpers
  const artMap = new Map(unit.sections.artworks.map((a) => [a.id, a]));
  const localArtDir = join(unitAssetDir(unitId), "artworks");
  const findImg = (ref: string) => {
    const art = artMap.get(ref);
    if (!art) return ref;
    const candidates = ["jpg", "jpeg", "png", "webp"].map((ext) =>
      join(localArtDir, `${art.id}.${ext}`)
    );
    const found = candidates.find((p) => fsExists(p));
    return found ?? art.sourceUrl;
  };
  const workDir = resolve(REPO_ROOT, ".cache", "video", unitId);
  mkdirSync(workDir, { recursive: true });

  if (!checkFfmpeg()) {
    console.error(
      [
        "未检测到 ffmpeg，已输出字幕文件：",
        outSrt,
        "无法在该 VM 内自动渲染 MP4。你可以：",
        "1) 在本地安装 ffmpeg 后运行：npm run video:render -- <unitId>",
        "2) 或使用 Remotion/Manim 等管线（需额外安装）",
      ].join("\n")
    );
    process.exit(2);
  }

  // 1) Per-scene TTS (python edge-tts) and per-scene mp4 segments
  const voice = process.env.TTS_VOICE ?? "zh-CN-XiaoxiaoNeural";
  const concatListPath = join(workDir, "concat.txt");
  const concatLines: string[] = [];
  for (let i = 0; i < unit.sections.storyboard.length; i++) {
    const sc = unit.sections.storyboard[i];
    const img = findImg(sc.images[0]);
    const segBase = `scene-${String(i + 1).padStart(2, "0")}`;
    const mp3 = join(workDir, `${segBase}.mp3`);
    const wav = join(workDir, `${segBase}.wav`);
    const mp4 = join(workDir, `${segBase}.mp4`);
    // TTS synth via python module (more reliable in this VM)
    try {
      const py = `
import edge_tts, asyncio
async def main():
  communicate = edge_tts.Communicate(${JSON.stringify(sc.narration)}, voice=${JSON.stringify(
        voice
      )}, rate='0%')
  await communicate.save(${JSON.stringify(mp3)})
asyncio.get_event_loop().run_until_complete(main())
`;
      execSync(`python3 - <<'PY'\n${py}\nPY`, { stdio: "inherit" });
    } catch (e) {
      console.warn("edge-tts synthesis failed, will fallback to silence for this scene:", i + 1);
    }
    if (fsExists(mp3)) {
      execSync(`ffmpeg -y -i "${mp3}" -ar 44100 -ac 1 "${wav}"`, { stdio: "ignore" });
    } else {
      execSync(
        `ffmpeg -y -f lavfi -t ${sc.durationSec} -i anullsrc=r=44100:cl=mono "${wav}"`,
        { stdio: "ignore" }
      );
    }
    // Get audio duration
    const durStr = execSync(
      `ffprobe -v error -show_entries format=duration -of default=nk=1:nw=1 "${wav}"`
    )
      .toString()
      .trim();
    const audioDur = Math.max(0.1, parseFloat(durStr) || sc.durationSec);
    const targetDur = Math.min(Math.max(audioDur, 2), sc.durationSec + 6); // allow slight pad but cap
    // Gentle Ken Burns via zoompan kept minimal to avoid heavy CPU
    const vf =
      "scale=1920:1080:force_original_aspect_ratio=decrease," +
      "pad=1920:1080:(ow-iw)/2:(oh-ih)/2:black,format=yuv420p";
    const vopts = `-c:v libx264 -preset veryfast -pix_fmt yuv420p -r 30 -crf 30 -b:v 420k -maxrate 520k -bufsize 1200k`;
    const aopts = `-c:a aac -b:a 64k -ar 44100 -ac 1`;
    const cmd = `ffmpeg -y -loop 1 -i "${img}" -i "${wav}" -t ${targetDur} -vf "${vf}" ${vopts} ${aopts} -shortest "${mp4}"`;
    execSync(cmd, { stdio: "inherit" });
    concatLines.push(`file '${mp4.replace(/'/g, "'\\''")}'`);
  }
  writeFileSync(concatListPath, concatLines.join("\n"), "utf-8");

  // 2) Concat segments without re-encode, then add subtitles (mov_text)
  const merged = join(workDir, "merged.mp4");
  execSync(`ffmpeg -y -f concat -safe 0 -i "${concatListPath}" -c copy "${merged}"`, {
    stdio: "inherit",
  });
  execSync(
    `ffmpeg -y -i "${merged}" -i "${outSrt}" -c:v copy -c:a copy -c:s mov_text "${outMp4}"`,
    { stdio: "inherit" }
  );
  console.log(`Rendered narrated video: ${outMp4}`);
  // Copy to artifacts (size target ~20MB, CRF already high)
  const artifact = "/opt/cursor/artifacts/u01_narrated.mp4";
  try {
    execSync(`cp -f "${outMp4}" "${artifact}"`);
    console.log(`Saved artifact: ${artifact}`);
  } catch (e) {
    console.warn("Failed to save artifact copy:", e);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
