import { usingUserData, dataDir } from "./paths";
import { LogEventSchema, type LogEvent } from "./schemas/atlas";
import { appendLogEvent, deviceName, readLog } from "./userpack";

/** dev 写回 API 的纯逻辑（路由文件只做 Request/Response 适配）。 */
export type ApiResult = { status: number; body: Record<string, unknown> };
type Env = Record<string, string | undefined>;

export const MAX_EVENTS = 500;

export function handleLogGet(env: Env = process.env): ApiResult {
  return { status: 200, body: { writable: usingUserData(env), device: deviceName(env), file: `log/${deviceName(env)}.jsonl` } };
}

const keyOf = (e: Pick<LogEvent, "ts" | "node" | "action">) => `${e.ts}|${e.node ?? ""}|${e.action}`;

export function handleLogPost(body: unknown, env: Env = process.env): ApiResult {
  if (!usingUserData(env)) return { status: 409, body: { error: "未设置 LEARN_DATA_DIR：示例数据包只读" } };
  const events = body && typeof body === "object" ? (body as { events?: unknown }).events : undefined;
  if (!Array.isArray(events)) return { status: 400, body: { error: "请求体应为 { events: [...] }" } };
  if (events.length > MAX_EVENTS) return { status: 413, body: { error: `一次最多 ${MAX_EVENTS} 条事件` } };

  const dir = dataDir(env);
  const device = deviceName(env);
  const file = `log/${device}.jsonl`;
  const seen = new Set(readLog(dir).map(keyOf));
  let written = 0, skipped = 0, rejected = 0;
  for (const raw of events) {
    const input = raw && typeof raw === "object" ? { ...(raw as Record<string, unknown>) } : raw;
    if (input && typeof input === "object") delete (input as Record<string, unknown>).device;
    const parsed = LogEventSchema.safeParse(input);
    if (!parsed.success) { rejected++; continue; }
    const key = keyOf(parsed.data);
    if (seen.has(key)) { skipped++; continue; }
    appendLogEvent(parsed.data, device, dir);
    seen.add(key);
    written++;
  }
  return { status: 200, body: { written, skipped, rejected, file } };
}
