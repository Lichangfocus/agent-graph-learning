import { existsSync, readdirSync } from "node:fs";
import { dirname, isAbsolute, join, resolve } from "node:path";

/**
 * 框架 / 数据分离的唯一路径入口。
 * - 框架仓库根：向上查找带 atlas/ 与 package.json 的目录（也可用 LEARN_REPO_ROOT 覆盖）。
 * - 数据包：LEARN_DATA_DIR（相对框架根解析，推荐 ../learn-data）；未设置时用示例包 examples/demo-pack。
 */
function findRepoRoot(start = process.cwd()): string {
  if (process.env.LEARN_REPO_ROOT) return resolve(process.env.LEARN_REPO_ROOT);
  let dir = resolve(start);
  for (;;) {
    if (existsSync(join(dir, "atlas")) && existsSync(join(dir, "package.json"))) return dir;
    const parent = dirname(dir);
    if (parent === dir) return resolve(start);
    dir = parent;
  }
}

export const REPO_ROOT = findRepoRoot();
export const DEMO_PACK_DIR = join(REPO_ROOT, "examples", "demo-pack");
export const WEB_PUBLIC_DIR = join(REPO_ROOT, "apps", "web", "public");
export const PUBLIC_UNITS_DIR = join(REPO_ROOT, "units");
export const ATLAS_PATH = join(REPO_ROOT, "atlas", "world-map.json");

export function dataDir(env: Record<string, string | undefined> = process.env): string {
  const raw = env.LEARN_DATA_DIR?.trim();
  if (!raw) return DEMO_PACK_DIR;
  return isAbsolute(raw) ? raw : resolve(REPO_ROOT, raw);
}

/** 是否在用真实的个人数据包（而不是示例包）。 */
export function usingUserData(env: Record<string, string | undefined> = process.env): boolean {
  return dataDir(env) !== DEMO_PACK_DIR;
}

export function dataPath(...parts: string[]): string {
  return join(dataDir(), ...parts);
}

export function profilePath(file = "learner-profile.yaml"): string {
  return dataPath("profile", file);
}

export function courseGraphPath(): string {
  return dataPath("curriculum", "graph.yaml");
}

/** 单元来源：公开单元（框架 units/）+ 数据包私人单元（units-private/）。 */
export function unitRoots(): string[] {
  return [PUBLIC_UNITS_DIR, dataPath("units-private")].filter((dir) => existsSync(dir));
}

export function listUnitDirs(): { id: string; dir: string; private: boolean }[] {
  const seen = new Set<string>();
  const out: { id: string; dir: string; private: boolean }[] = [];
  for (const root of unitRoots()) {
    for (const entry of readdirSync(root, { withFileTypes: true })) {
      if (!entry.isDirectory() || seen.has(entry.name)) continue;
      if (!existsSync(join(root, entry.name, "source.md"))) continue;
      seen.add(entry.name);
      out.push({ id: entry.name, dir: join(root, entry.name), private: root !== PUBLIC_UNITS_DIR });
    }
  }
  return out;
}

export function unitDir(id: string): string | undefined {
  return listUnitDirs().find((unit) => unit.id === id)?.dir;
}

/** 单元静态素材根：公开单元在 apps/web/public/assets/units/<id>，私人单元在 <data>/units-private/<id>/public。 */
export function unitAssetDir(id: string): string {
  const unit = listUnitDirs().find((item) => item.id === id);
  if (unit?.private) return join(unit.dir, "public");
  return join(WEB_PUBLIC_DIR, "assets", "units", id);
}

/** 单元视频：公开在 apps/web/public/videos，私人在 <data>/units-private/<id>/video。 */
export function unitVideoPath(id: string): string {
  const unit = listUnitDirs().find((item) => item.id === id);
  if (unit?.private) return join(unit.dir, "video", `${id}.mp4`);
  return join(WEB_PUBLIC_DIR, "videos", `${id}.mp4`);
}
