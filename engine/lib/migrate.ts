import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { REPO_ROOT } from "./paths";

/**
 * Atlas id 迁移（atlas/migrations/<from>-to-<to>.json）。读数据包时在内存里把旧 id 换成新 id：
 * 日志仍然只追加、文件不改写；pack.json 的 atlas_version 说明数据包按哪一版 Atlas 写的。
 */
export type Migration = { from: string; to: string; rename: Record<string, string> };

const cmp = (a: string, b: string) => {
  const x = a.split(".").map(Number), y = b.split(".").map(Number);
  for (let i = 0; i < 3; i++) if ((x[i] ?? 0) !== (y[i] ?? 0)) return (x[i] ?? 0) - (y[i] ?? 0);
  return 0;
};

export function loadMigrations(dir = join(REPO_ROOT, "atlas", "migrations")): Migration[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((f) => /^\d+\.\d+\.\d+-to-\d+\.\d+\.\d+\.json$/.test(f))
    .map((f) => JSON.parse(readFileSync(join(dir, f), "utf-8")) as Migration)
    .sort((a, b) => cmp(a.from, b.from));
}

/** 把 fromVersion 之后的所有改名合成一张表（链式：a→b、b→c 得 a→c）。 */
export function renameTable(fromVersion: string | undefined, migrations = loadMigrations()): Record<string, string> {
  const table: Record<string, string> = {};
  if (!fromVersion) return table;
  for (const m of migrations) {
    if (cmp(m.from, fromVersion) < 0) continue;
    for (const k of Object.keys(table)) if (m.rename[table[k]]) table[k] = m.rename[table[k]];
    for (const [k, v] of Object.entries(m.rename)) if (!(k in table) && k !== v) table[k] = v;
  }
  return table;
}

const REF_KEYS = new Set(["id", "domain", "node", "src", "dst"]);
/** 只改引用字段：domain / node / src / dst / topics[] / members[].id；用户自己的 u- id 不动。 */
export function renameRefs<T>(value: T, table: Record<string, string>): T {
  if (!Object.keys(table).length) return value;
  const r = (id: unknown) => (typeof id === "string" && !id.startsWith("u-") && table[id] ? table[id] : id);
  const walk = (v: unknown, key?: string): unknown => {
    if (Array.isArray(v)) return v.map((x) => walk(x, key === "topics" ? "topic-item" : key));
    if (v && typeof v === "object") return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, walk(x, k)]));
    if (key === "topic-item" || (key && REF_KEYS.has(key))) return r(v);
    return v;
  };
  return walk(value) as T;
}
