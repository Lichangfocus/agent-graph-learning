import { appendFileSync, existsSync, mkdirSync, readdirSync, readFileSync } from "node:fs";
import { hostname } from "node:os";
import { join } from "node:path";
import { renameRefs, renameTable } from "./migrate";
import { dataDir } from "./paths";
import {
  LogEventSchema, OverlayEdgeSchema, OverlayNodeSchema, PackMetaSchema, UserTopicSchema,
  type LogEvent, type OverlayEdge, type OverlayNode, type UserTopic,
} from "./schemas/atlas";

/** 用户数据包（learn.userpack.v1）读写。目录约定见 learn-data/README.md 与 03-spec §2.3。 */
export type UserPack = {
  dir: string;
  meta?: ReturnType<typeof PackMetaSchema.parse>;
  nodes: OverlayNode[];
  edges: OverlayEdge[];
  topics: UserTopic[];
  log: LogEvent[];
  problems: string[];
};

function readJsonl<T>(path: string, parse: (v: unknown) => T, problems: string[]): T[] {
  if (!existsSync(path)) return [];
  const out: T[] = [];
  readFileSync(path, "utf-8").split(/\r?\n/).forEach((line, i) => {
    if (!line.trim()) return;
    try { out.push(parse(JSON.parse(line))); } catch (e) {
      problems.push(`${path}:${i + 1} ${e instanceof Error ? e.message.split("\n")[0] : String(e)}`);
    }
  });
  return out;
}

const parseWith = <T>(schema: { parse: (v: unknown) => T }) => (v: unknown) => schema.parse(v);

export function readLog(dir = dataDir(), problems: string[] = []): LogEvent[] {
  const logDir = join(dir, "log");
  if (!existsSync(logDir)) return [];
  const events: LogEvent[] = [];
  for (const file of readdirSync(logDir).filter((f) => f.endsWith(".jsonl")).sort()) {
    const device = file.replace(/\.jsonl$/, "");
    for (const e of readJsonl(join(logDir, file), parseWith(LogEventSchema), problems)) events.push({ ...e, device: e.device ?? device });
  }
  // 稳定排序：时间相同时保持文件内顺序
  return events.map((e, i) => [e, i] as const).sort((a, b) => Date.parse(a[0].ts) - Date.parse(b[0].ts) || a[1] - b[1]).map(([e]) => e);
}

export function loadUserPack(dir = dataDir()): UserPack {
  const problems: string[] = [];
  let meta: UserPack["meta"];
  const metaPath = join(dir, "pack.json");
  if (existsSync(metaPath)) {
    try { meta = PackMetaSchema.parse(JSON.parse(readFileSync(metaPath, "utf-8"))); } catch (e) { problems.push(`pack.json: ${String(e).split("\n")[0]}`); }
  }
  const topics: UserTopic[] = [];
  const topicDir = join(dir, "topics");
  if (existsSync(topicDir)) {
    for (const f of readdirSync(topicDir).filter((f) => f.endsWith(".json")).sort()) {
      try { topics.push(UserTopicSchema.parse(JSON.parse(readFileSync(join(topicDir, f), "utf-8")))); } catch (e) {
        problems.push(`topics/${f}: ${e instanceof Error ? e.message.split("\n")[0] : String(e)}`);
      }
    }
  }
  // 数据包按旧版 Atlas 写的 → 在内存里按 atlas/migrations 改写引用（文件不改，日志仍只追加）
  const table = renameTable(meta?.atlas_version);
  return {
    dir, meta, problems,
    topics: renameRefs(topics, table),
    nodes: renameRefs(readJsonl(join(dir, "overlay", "nodes.jsonl"), parseWith(OverlayNodeSchema), problems), table),
    edges: renameRefs(readJsonl(join(dir, "overlay", "edges.jsonl"), parseWith(OverlayEdgeSchema), problems), table),
    log: renameRefs(readLog(dir, problems), table),
  };
}

/** 设备名：LEARN_DEVICE 或主机名，规整为 [a-z0-9_-]。 */
export function deviceName(env: Record<string, string | undefined> = process.env): string {
  return sanitizeDevice(env.LEARN_DEVICE ?? hostname().split(".")[0]);
}

export function sanitizeDevice(raw: string): string {
  return raw.toLowerCase().replace(/[^a-z0-9_-]/g, "-") || "local";
}

/** 只追加写日志：log/<device>.jsonl。多设备各写各的文件，git 合并不冲突。 */
export function appendLogEvent(event: LogEvent, device: string, dir = dataDir()): LogEvent {
  if (!/^[a-z0-9][a-z0-9_-]*$/i.test(device)) throw new Error(`非法设备名: ${device}`);
  const parsed = LogEventSchema.parse({ ...event, device });
  mkdirSync(join(dir, "log"), { recursive: true });
  appendFileSync(join(dir, "log", `${device}.jsonl`), JSON.stringify(parsed) + "\n");
  return parsed;
}
