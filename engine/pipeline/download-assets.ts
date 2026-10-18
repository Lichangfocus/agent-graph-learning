import { unitAssetDir, unitDir as unitDirOf } from "../lib/paths";
import { mkdirSync, writeFileSync } from "node:fs";
import { createWriteStream, existsSync } from "node:fs";
import { basename, extname, join, resolve } from "node:path";
import { loadAllUnits } from "../lib/utils/content";
import { Readable } from "node:stream";
import type { ReadableStream } from "node:stream/web";
import { pipeline } from "node:stream/promises";
import { existsSync as fsExists, readFileSync } from "node:fs";

async function downloadFile(url: string, outPath: string) {
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Knowledge-Translation-Engine/0.1 (+https://cursor.run; contact: demo@example.com)",
      "Accept": "image/*,*/*;q=0.8",
    },
    redirect: "follow",
  } as RequestInit);
  if (!res.ok || !res.body) {
    throw new Error(`HTTP ${res.status} for ${url}`);
  }
  const stream = createWriteStream(outPath);
  await pipeline(Readable.fromWeb(res.body as ReadableStream<Uint8Array>), stream);
}

function inferExt(url: string, contentType?: string): string {
  const ext = extname(new URL(url).pathname);
  if (ext) return ext;
  if (!contentType) return ".jpg";
  if (contentType.includes("png")) return ".png";
  if (contentType.includes("webp")) return ".webp";
  return ".jpg";
}

async function main() {
    const units = loadAllUnits();
  for (const u of units) {
    const unitDir = join(unitAssetDir(u.frontmatter.id), "artworks");
    mkdirSync(unitDir, { recursive: true });
    // optional assets.json to prefer render/original urls
    const assetMap: Record<string, { render_url?: string; original_url?: string; commons_page?: string }> = {};
    const assetsJsonPath = join(unitDirOf(u.frontmatter.id) ?? "", "assets.json");
    if (fsExists(assetsJsonPath)) {
      try {
        const js = JSON.parse(readFileSync(assetsJsonPath, "utf-8"));
        if (Array.isArray(js.assets)) {
          for (const a of js.assets) assetMap[a.id] = a;
        }
      } catch {}
    }
    for (const art of u.sections.artworks) {
      try {
        const preferred = assetMap[art.id];
        let url = preferred?.render_url ?? preferred?.original_url ?? art.sourceUrl;
        if (preferred?.commons_page && /commons\.wikimedia\.org\/wiki\/File:/.test(preferred.commons_page)) {
          const fileNameEnc = preferred.commons_page.split("/wiki/File:")[1];
          if (fileNameEnc) {
            url = `https://commons.wikimedia.org/wiki/Special:FilePath/${fileNameEnc}?width=1920`;
          }
        }
        const ext = inferExt(url);
        const outPath = join(unitDir, `${art.id}${ext}`);
        if (existsSync(outPath)) {
          console.log(`Skip existing: ${outPath}`);
          continue;
        }
        console.log(`Downloading ${url} -> ${outPath}`);
        await downloadFile(url, outPath);
      } catch (e) {
        console.error(`Failed to download ${art.id}:`, (e as Error).message);
      }
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
