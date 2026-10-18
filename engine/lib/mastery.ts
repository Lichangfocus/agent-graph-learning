import type { AtlasEdge, LogEvent, MasteryLevel } from "./schemas/atlas";

/**
 * 掌握度完全由日志推算（03-spec §2.5）：
 * - seen：有 open / play / quiz / note / ask 任一事件
 * - learning：play 进度 ≥ 0.5，或答过题但未全对
 * - lit：有 lit 事件，或一次 quiz 事件 payload.correct === payload.total 且 total ≥ 3
 * - mastered：lit 之后，至少隔 minReviewDays 天有一次 review 且 payload.passed === true
 * - locked：以上都没有，且存在未 lit 的 prereq 前置节点（软锁：仍可打开）
 * - 否则为 null（未接触、无前置限制）→ 界面显示为「未开始」
 */
export type MasteryState = { level: MasteryLevel | null; litAt?: string; lastEvent?: string };

const DAY = 86_400_000;

export function masteryFromLog(
  events: LogEvent[],
  nodeIds: string[],
  edges: Pick<AtlasEdge, "src" | "dst" | "kind">[] = [],
  options: { minReviewDays?: number } = {},
): Record<string, MasteryState> {
  const minReview = (options.minReviewDays ?? 1) * DAY;
  const state: Record<string, MasteryState> = Object.fromEntries(nodeIds.map((id) => [id, { level: null }]));
  const rank: Record<MasteryLevel, number> = { locked: 0, seen: 1, learning: 2, lit: 3, mastered: 4 };
  const raise = (s: MasteryState, level: MasteryLevel) => { if (!s.level || rank[level] > rank[s.level]) s.level = level; };
  const sorted = [...events].sort((a, b) => Date.parse(a.ts) - Date.parse(b.ts));
  for (const e of sorted) {
    if (!e.node || !state[e.node]) continue;
    const s = state[e.node];
    s.lastEvent = e.ts;
    const p = (e.payload ?? {}) as Record<string, unknown>;
    switch (e.action) {
      case "open": case "note": case "ask": raise(s, "seen"); break;
      case "play": raise(s, typeof p.progress === "number" && p.progress >= 0.5 ? "learning" : "seen"); break;
      case "quiz": {
        const total = Number(p.total ?? 0), correct = Number(p.correct ?? 0);
        if (total >= 3 && correct === total) { raise(s, "lit"); s.litAt ??= e.ts; } else raise(s, "learning");
        break;
      }
      case "lit": raise(s, "lit"); s.litAt ??= e.ts; break;
      case "review":
        if (s.litAt && p.passed === true && Date.parse(e.ts) - Date.parse(s.litAt) >= minReview) raise(s, "mastered");
        break;
      default: break;
    }
  }
  const isLit = (id: string) => { const l = state[id]?.level; return l === "lit" || l === "mastered"; };
  for (const id of nodeIds) {
    if (state[id].level) continue;
    const prereqs = edges.filter((e) => e.kind === "prereq" && e.dst === id).map((e) => e.src);
    if (prereqs.some((p) => !isLit(p))) state[id].level = "locked";
  }
  return state;
}

/** 只给数量，不给百分比（产品规则）。 */
export function countLit(state: Record<string, MasteryState>): { lit: number; total: number } {
  const values = Object.values(state);
  return { lit: values.filter((s) => s.level === "lit" || s.level === "mastered").length, total: values.length };
}
