/**
 * npm run data:link —— 把数据包私人单元的静态素材链接进 apps/web/public（仅本机，已 .gitignore），
 * 让 Next dev 能直接显示 ../learn-data/units-private/<id>/public 与 video/。
 * 公开仓库永远不会提交这些链接（见 .gitignore 与 check:privacy）。
 */
import { existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { REPO_ROOT, WEB_PUBLIC_DIR, listUnitDirs } from "../lib/paths";

const assetsRoot = join(WEB_PUBLIC_DIR, "assets", "units");
const videosRoot = join(WEB_PUBLIC_DIR, "videos");
mkdirSync(assetsRoot, { recursive: true });
mkdirSync(videosRoot, { recursive: true });
// 先清掉上一次的链接（只删符号链接，不碰真实文件）
for (const root of [assetsRoot, videosRoot]) {
  for (const name of readdirSync(root)) {
    const p = join(root, name);
    if (lstatSync(p).isSymbolicLink()) rmSync(p);
  }
}
let linked = 0;
for (const unit of listUnitDirs().filter((u) => u.private)) {
  const pub = join(unit.dir, "public");
  if (existsSync(pub) && !existsSync(join(assetsRoot, unit.id))) { symlinkSync(pub, join(assetsRoot, unit.id)); linked++; }
  const video = join(unit.dir, "video");
  if (existsSync(video)) {
    for (const f of readdirSync(video)) {
      if (!existsSync(join(videosRoot, f))) { symlinkSync(join(video, f), join(videosRoot, f)); linked++; }
    }
  }
}
// 把链接写进 .git/info/exclude（只在本机生效），保证永远不会被 git add 进公开仓库
const exclude = join(REPO_ROOT, ".git", "info", "exclude");
if (existsSync(join(REPO_ROOT, ".git", "info"))) {
  const marker = "# >>> learn data:link (auto)";
  const end = "# <<< learn data:link";
  const lines = [assetsRoot, videosRoot].flatMap((root) => readdirSync(root)
    .filter((n) => lstatSync(join(root, n)).isSymbolicLink())
    .map((n) => "/" + join(root, n).slice(REPO_ROOT.length + 1)));
  const old = existsSync(exclude) ? readFileSync(exclude, "utf-8") : "";
  const kept = old.replace(new RegExp(`${marker}[\\s\\S]*?${end}\\n?`), "");
  writeFileSync(exclude, `${kept.trimEnd()}\n${marker}\n${lines.join("\n")}\n${end}\n`);
}
console.log(`data:link 完成：${linked} 个私人素材链接`);
