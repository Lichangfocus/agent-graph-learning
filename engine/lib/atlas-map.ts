import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { MergedGraph } from "./overlay";
import { REPO_ROOT } from "./paths";
import type { LogEvent } from "./schemas/atlas";

/** 把合并后的图 + 日志注入单文件星图模板（离线、file:// 可用、无外部请求）。 */
export function renderAtlasMap(graph: MergedGraph, log: LogEvent[], pack: { owner: string; demo: boolean }): string {
  const template = readFileSync(join(REPO_ROOT, "engine", "templates", "atlas-map", "template.html"), "utf-8");
  const { diagnostics: _diagnostics, ...g } = graph;
  void _diagnostics;
  const json = JSON.stringify({ graph: g, log, pack, builtAt: new Date().toISOString() }).replace(/<\//g, "<\\/");
  return template.replace("/*__ATLAS_DATA__*/null", () => json);
}
