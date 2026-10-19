import { loadAtlas } from "./atlas";
import { renderAtlasMap, type MapOptions } from "./atlas-map";
import { mergeOverlay } from "./overlay";
import { dataDir, usingUserData } from "./paths";
import { deviceName, loadUserPack, type UserPack } from "./userpack";

/** 主视图星图：Atlas + 当前数据包覆盖层 + 日志。demo 构建与 Next 应用共用。
 *  离线构建的设备名固定为 browser（导出后 log:import 进 log/browser.jsonl，也不把构建机主机名写进公开 demo）。 */
export function renderMainMap(opts: MapOptions = {}): string {
  const atlas = loadAtlas();
  const pack = activePack();
  const merged = mergeOverlay(atlas, pack);
  return renderAtlasMap(merged, pack.log, { owner: pack.meta?.owner ?? "local", demo: !usingUserData(), device: opts.endpoint ? deviceName() : "browser" }, opts);
}

/** 公开在线版（SITE_ATLAS_ONLY=1，由 site:build 设置）：只用公共 Atlas，不带示例包的日志 / 自建节点，访客从 0 点亮开始。 */
export function activePack(): UserPack {
  if (process.env.SITE_ATLAS_ONLY === "1") return { dir: "", meta: undefined, problems: [], topics: [], nodes: [], edges: [], log: [] };
  return loadUserPack(dataDir());
}
