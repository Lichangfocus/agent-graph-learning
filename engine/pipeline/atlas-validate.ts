/** npm run atlas:validate —— 校验 Atlas，并在设置了 LEARN_DATA_DIR 时校验数据包与合并结果。 */
import { loadAtlas, validateAtlasGraph } from "../lib/atlas";
import { masteryFromLog, countLit } from "../lib/mastery";
import { mergeOverlay } from "../lib/overlay";
import { dataDir, usingUserData } from "../lib/paths";
import { loadUserPack } from "../lib/userpack";

try {
  const atlas = loadAtlas();
  const diag = validateAtlasGraph(atlas);
  console.log(`Atlas v${atlas.version}: 节点 ${atlas.nodes.length}，边 ${atlas.edges.length}，警告 ${diag.warnings.length}`);
  for (const w of diag.warnings) console.warn(`WARN: ${w}`);
  const pack = loadUserPack();
  const merged = mergeOverlay(atlas, pack);
  const mastery = masteryFromLog(pack.log, merged.nodes.map((n) => n.id), merged.edges);
  const { lit, total } = countLit(mastery);
  console.log(`数据包 ${usingUserData() ? dataDir() : "（示例包）" + dataDir()}: 自建节点 ${pack.nodes.length} · 自建边 ${pack.edges.length} · 自建 topic ${pack.topics.length} · 日志 ${pack.log.length} 条 · 已点亮 ${lit} / ${total}`);
  const problems = [...pack.problems, ...merged.diagnostics.errors];
  for (const p of problems) console.error(`ERROR: ${p}`);
  console.log(problems.length ? "结果: FAIL" : "结果: PASS");
  if (problems.length) process.exitCode = 1;
} catch (e) {
  console.error(e instanceof Error ? e.message : e);
  console.error("结果: FAIL");
  process.exitCode = 1;
}
