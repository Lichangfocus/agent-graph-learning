/**
 * npm run log:import -- <file...> [--device browser]
 * 把浏览器导出（.jsonl / learn.export.v1 / 旧版 scholar.map.user.v1）合并进数据包：
 * 日志按 ts|node|action 去重追加到 log/<device>.jsonl；u- 专题写 topics/；连线追加 overlay/edges.jsonl。
 */
import { readFileSync } from "node:fs";
import { dataDir, usingUserData } from "../lib/paths";
import { importExport } from "../lib/log-import";
import { sanitizeDevice } from "../lib/userpack";

const args = process.argv.slice(2);
const di = args.indexOf("--device");
const device = sanitizeDevice(di >= 0 ? args[di + 1] ?? "" : "browser");
const files = di >= 0 ? args.filter((_, i) => i !== di && i !== di + 1) : args;

if (!usingUserData()) {
  console.error("未设置 LEARN_DATA_DIR：示例数据包只读。例：LEARN_DATA_DIR=../learn-data npm run log:import -- export.json");
  process.exit(2);
}
if (!files.length) {
  console.error("用法：npm run log:import -- <file...> [--device browser]");
  process.exit(64);
}

let failed = false;
for (const file of files) {
  try {
    const s = importExport(readFileSync(file, "utf-8"), file, { device, dir: dataDir() });
    const f = (k: keyof typeof s) => `${s[k].imported} 导入 / ${s[k].duplicates} 重复 / ${s[k].invalid} 无效`;
    console.log(`${file}\n  日志：${f("events")}\n  专题：${f("topics")}\n  连线：${f("edges")}`);
  } catch (e) {
    failed = true;
    console.error(`${file}：${e instanceof Error ? e.message : String(e)}`);
  }
}
process.exit(failed ? 1 : 0);
