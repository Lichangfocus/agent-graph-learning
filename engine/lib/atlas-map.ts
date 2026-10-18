import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { MergedGraph } from "./overlay";
import { REPO_ROOT } from "./paths";
import type { LogEvent } from "./schemas/atlas";
import { toWorldView } from "./world-view";

export type MapPack = { owner: string; demo: boolean; device?: string };
export type MapOptions = {
  /** dev 模式写回端点（如 "/api/events"）；离线构建不传，产物里不含任何网络代码。 */
  endpoint?: string;
  /** HUD 上的附加链接（单元列表、预览等）。 */
  links?: { href: string; label: string }[];
};

/** dev 写回：只在 endpoint 存在时注入。失败的事件留在 localStorage 待下次重试。 */
function writerSnippet(endpoint: string): string {
  const ep = JSON.stringify(endpoint);
  return `(function(){var EP=${ep};var busy=false;
sink=function(evs){if(!evs||!evs.length)return;busy=true;fetch(EP,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({events:evs})})
.then(function(r){return r.json().then(function(j){if(!r.ok)throw new Error(j&&j.error||r.status);return j})})
.then(function(j){markSynced(evs);setSync("已写入 "+j.file,true)})
.catch(function(e){setSync("未写入数据包（"+e.message+"），已存本地",false)}).then(function(){busy=false})};
fetch(EP).then(function(r){return r.json()}).then(function(j){if(j.writable){setSync("写回 "+j.file,true);if(U.log.length)sink(U.log.slice())}else{sink=null;setSync("示例数据：只存本地",false)}}).catch(function(){sink=null});
})();`;
}

/** 把合并后的图 + 日志注入单文件星图模板（电影感星图 v0.2；离线、file:// 可用）。 */
export function renderAtlasMap(graph: MergedGraph, log: LogEvent[], pack: MapPack, opts: MapOptions = {}): string {
  const template = readFileSync(join(REPO_ROOT, "engine", "templates", "atlas-map", "template.html"), "utf-8");
  const payload = {
    world: toWorldView(graph),
    log,
    pack: { owner: pack.owner, demo: pack.demo, device: pack.device ?? "browser" },
    links: opts.links ?? [],
    builtAt: new Date().toISOString(),
  };
  const json = JSON.stringify(payload).replace(/</g, "\\u003c");
  let html = template.replace("/*__ATLAS_DATA__*/null", () => json);
  html = html.replace("/*__WRITER__*/", () => (opts.endpoint ? writerSnippet(opts.endpoint) : ""));
  return html;
}
