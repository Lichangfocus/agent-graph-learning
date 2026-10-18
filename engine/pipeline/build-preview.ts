import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { copyFileSync, existsSync, mkdirSync, readFileSync, realpathSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, resolve, sep } from "node:path";
import { loadAllUnits } from "../lib/utils/content";
import { REPO_ROOT, WEB_PUBLIC_DIR, dataDir, dataPath, unitAssetDir, unitDir as unitDirOf, unitVideoPath, usingUserData } from "../lib/paths";
import { loadCourseGraph } from "../lib/utils/graph";
import { loadLearningProfile, loadProfileHighlights } from "../lib/utils/profile-highlights";

const run = promisify(execFile);

async function main() {
  const root = REPO_ROOT;
  const output = process.env.PREVIEW_OUT ? resolve(process.env.PREVIEW_OUT) : (usingUserData() ? dataPath("builds", "preview") : join(root, "demo", "preview"));
  const cache = join(output, ".cache");
  mkdirSync(cache, { recursive: true });
  const graph = loadCourseGraph();
  const profile = loadLearningProfile();
  const units = loadAllUnits();
  const images: Record<string, string> = {};

  function localFile(path: string) {
    const unitAsset = /^\/assets\/units\/([^/]+)\/(.+)$/.exec(path);
    const absolute = unitAsset ? join(unitAssetDir(unitAsset[1]), unitAsset[2]) : resolve(WEB_PUBLIC_DIR, path.replace(/^\//, ""));
    if (!existsSync(absolute)) return undefined;
    const real = realpathSync(absolute);
    const allowed = [WEB_PUBLIC_DIR, dataDir()].filter(existsSync).map((dir) => realpathSync(dir) + sep);
    if (!allowed.some((dir) => real.startsWith(dir))) throw new Error(`素材路径越出框架 public 与数据包：${path}`);
    return absolute;
  }

  async function embed(reference: string, candidates: string[] = []) {
    if (images[reference]) return;
    const input = [...candidates, reference].map(localFile).find(Boolean);
    if (!input) throw new Error(`缺少本地图片：${reference}。请先运行 npm run assets:download。`);
    const hash = createHash("sha256").update("jpeg-1400-q5-v1").update(readFileSync(input)).digest("hex");
    const destination = join(cache, `${hash}.jpg`);
    if (!existsSync(destination)) {
      await run("/usr/bin/ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", "-i", input,
        "-vf", "scale=w='min(1400,iw)':h='min(1400,ih)':force_original_aspect_ratio=decrease",
        "-frames:v", "1", "-q:v", "5", "-threads", "1", destination]);
    }
    images[reference] = `data:image/jpeg;base64,${readFileSync(destination).toString("base64")}`;
  }

  const previews = [];
  for (const unit of units) {
    const id = unit.frontmatter.id;
    const artworkImages: Record<string, string> = {};
    for (const artwork of unit.sections.artworks) {
      const candidates = [artwork.localAsset, ...["jpg", "jpeg", "png", "webp"].map((extension) =>
        `/assets/units/${id}/artworks/${artwork.id}.${extension}`)].filter((path): path is string => Boolean(path));
      await embed(artwork.sourceUrl, candidates);
      artworkImages[artwork.id] = artwork.sourceUrl;
    }
    for (const item of unit.sections.interactive.luminanceExplorers) await embed(item.imageUrl);
    for (const item of unit.sections.interactive.frequencyToggles) await embed(item.combinedImage);
    for (const scene of unit.sections.storyboard) {
      for (const image of scene.images) if (!artworkImages[image]) await embed(image);
    }
    const videoSource = unitVideoPath(id);
    const video = existsSync(videoSource) ? `${id}.mp4` : null;
    if (video) copyFileSync(videoSource, join(output, video));
    // Only order and unknown section text come from here; structured content uses
    // the exact same validated loader as the Next application.
    const raw = readFileSync(join(unitDirOf(id)!, "source.md"), "utf-8");
    const sections = [...raw.matchAll(/^##\s+(.+)\r?\n([\s\S]*?)(?=^##\s|$(?![\s\S]))/gm)]
      .map((match) => ({ heading: match[1].trim(), body: match[2].trim() }));
    previews.push({ ...unit, sourceSections: sections, artworkImages, video });
  }
  // Deduplicate equal local images referenced by both artwork URLs and interactives.
  const imageList = [...new Set(Object.values(images))];
  const imageRefs = Object.fromEntries(Object.entries(images).map(([reference, uri]) => [reference, imageList.indexOf(uri)]));
  const data = { graph, profile, profileHighlights: loadProfileHighlights(), units: previews, imageList, imageRefs };
  const template = readFileSync(join(root, "engine/templates/preview/template.html"), "utf-8");
  const css = readFileSync(join(root, "engine/templates/preview/app.css"), "utf-8");
  const js = readFileSync(join(root, "engine/templates/preview/app.js"), "utf-8");
  const json = JSON.stringify(data).replace(/<\/script/gi, "<\\/script");
  // replace with a callback: source text may contain literal $& / $' / $`.
  const html = template.replace("/*__PREVIEW_CSS__*/", () => css)
    .replace("/*__PREVIEW_APP__*/", () => js)
    .replace("/*__PREVIEW_DATA__*/null", () => json);
  const destination = join(output, "index.html");
  mkdirSync(dirname(destination), { recursive: true });
  writeFileSync(destination, html);
  console.log(`预览已生成：${destination}`);
  console.log(`HTML ${(statSync(destination).size / 1024 / 1024).toFixed(2)} MiB · ${units.length} 个单元 · ${imageList.length} 张内嵌图片`);
  console.log("双击 index.html 即可打开；视频与 HTML 放在同一目录。");
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
