import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { LOG_ACTIONS, LogEventSchema, OverlayEdgeSchema, UserTopicSchema, type LogEvent } from "./schemas/atlas";
import { appendLogEvent, readLog } from "./userpack";

export type ImportSummary = {
  events: { imported: number; duplicates: number; invalid: number };
  topics: { imported: number; duplicates: number; invalid: number };
  edges: { imported: number; duplicates: number; invalid: number };
};

const keyOf = (e: Pick<LogEvent, "ts" | "node" | "action">) => `${e.ts}|${e.node ?? ""}|${e.action}`;
const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const pick = (o: Record<string, unknown>, keys: string[]) => Object.fromEntries(keys.filter((k) => o[k] !== undefined && o[k] !== null).map((k) => [k, o[k]]));

/** 解析导出文件为原始 { log, topics, edges }。无法识别时抛错。 */
function parseExport(text: string, filename: string): { log: unknown[]; topics: unknown[]; edges: unknown[]; legacy: boolean } {
  if (filename.endsWith(".jsonl")) {
    // 坏行保留为原始字符串，后面按 invalid 计数
    const log = text.split(/\r?\n/).filter((l) => l.trim()).map((l) => { try { return JSON.parse(l) as unknown; } catch { return null; } });
    return { log, topics: [], edges: [], legacy: false };
  }
  const data: unknown = JSON.parse(text);
  if (!isObj(data)) throw new Error("不是 JSON 对象");
  const arr = (v: unknown) => (Array.isArray(v) ? v : []);
  if (data.schema === "learn.export.v1") return { log: arr(data.log), topics: arr(data.topics), edges: arr(data.edges), legacy: false };
  if (data.schema === "scholar.map.user.v1") return { log: arr(data.log), topics: arr(data.topics), edges: arr(data.edges), legacy: true };
  throw new Error(`无法识别的文件格式：${filename}`);
}

/** 导入一个导出文件到数据包 dir：日志去重追加、专题/连线按 id 去重。 */
export function importExport(text: string, filename: string, opts: { device: string; dir: string }): ImportSummary {
  const { device, dir } = opts;
  const parsed = parseExport(text, filename);
  const sum: ImportSummary = {
    events: { imported: 0, duplicates: 0, invalid: 0 },
    topics: { imported: 0, duplicates: 0, invalid: 0 },
    edges: { imported: 0, duplicates: 0, invalid: 0 },
  };

  const seen = new Set(readLog(dir).map(keyOf));
  for (const raw of parsed.log) {
    let input: unknown = raw;
    if (parsed.legacy && isObj(raw)) {
      if (!(LOG_ACTIONS as readonly string[]).includes(String(raw.action))) { sum.events.invalid++; continue; }
      input = pick(raw, ["ts", "node", "action", "payload"]);
    }
    const r = LogEventSchema.safeParse(isObj(input) ? { ...input, device: undefined } : input);
    if (!r.success) { sum.events.invalid++; continue; }
    const key = keyOf(r.data);
    if (seen.has(key)) { sum.events.duplicates++; continue; }
    appendLogEvent(r.data, device, dir);
    seen.add(key);
    sum.events.imported++;
  }

  for (const raw of parsed.topics) {
    if (!isObj(raw) || typeof raw.id !== "string" || !raw.id.startsWith("u-")) { sum.topics.invalid++; continue; }
    const members = (Array.isArray(raw.members) ? raw.members : []).map((m) => (typeof m === "string" ? { id: m } : isObj(m) ? pick(m, ["id", "x", "y"]) : m));
    const topic = { ...pick(raw, ["id", "domain", "name", "created"]), desc: raw.desc ?? raw.description ?? undefined, members };
    const r = UserTopicSchema.safeParse(topic);
    if (!r.success) { sum.topics.invalid++; continue; }
    const path = join(dir, "topics", `${r.data.id}.json`);
    if (existsSync(path)) { sum.topics.duplicates++; continue; }
    mkdirSync(join(dir, "topics"), { recursive: true });
    writeFileSync(path, JSON.stringify(r.data, null, 2) + "\n");
    sum.topics.imported++;
  }

  const edgePath = join(dir, "overlay", "edges.jsonl");
  const edgeIds = new Set<string>();
  if (existsSync(edgePath)) {
    for (const line of readFileSync(edgePath, "utf-8").split(/\r?\n/)) {
      try { const e = JSON.parse(line) as { id?: string }; if (e.id) edgeIds.add(e.id); } catch { /* 跳过坏行 */ }
    }
  }
  for (const raw of parsed.edges) {
    if (!isObj(raw)) { sum.edges.invalid++; continue; }
    const r = OverlayEdgeSchema.safeParse(pick(raw, ["id", "src", "dst", "kind", "note", "claim_type", "sources"]));
    if (!r.success) { sum.edges.invalid++; continue; }
    if (edgeIds.has(r.data.id)) { sum.edges.duplicates++; continue; }
    mkdirSync(join(dir, "overlay"), { recursive: true });
    appendFileSync(edgePath, JSON.stringify(r.data) + "\n");
    edgeIds.add(r.data.id);
    sum.edges.imported++;
  }
  return sum;
}
