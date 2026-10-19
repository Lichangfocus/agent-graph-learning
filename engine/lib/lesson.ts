import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import type { LogEvent, OverlayEdge, OverlayNode } from "./schemas/atlas";
import { LessonSchema, type Lesson } from "./schemas/lesson";

/** 读数据包 lessons/*.json；坏文件只报告。 */
export function readLessons(dir: string, problems: string[] = []): Lesson[] {
  const d = join(dir, "lessons");
  if (!existsSync(d)) return [];
  const out: Lesson[] = [];
  for (const f of readdirSync(d).filter((x) => x.endsWith(".json")).sort()) {
    try { out.push(LessonSchema.parse(JSON.parse(readFileSync(join(d, f), "utf-8")))); } catch (e) {
      problems.push(`lessons/${f}: ${e instanceof Error ? e.message.split("\n").slice(0, 6).join(" ") : String(e)}`);
    }
  }
  return out;
}

/** 课 → 一个 kind=lesson 的自建节点（整课内容放 data.lesson，题目放 quiz 以便点亮规则复用）+ 指向相关节点的边。 */
export function lessonToOverlay(lesson: Lesson): { node: OverlayNode; edges: OverlayEdge[] } {
  const { quiz, ...body } = lesson;
  const node: OverlayNode = {
    id: lesson.id, kind: "lesson", name: lesson.title, summary: lesson.summary, status: "ready",
    domain: lesson.domain, topics: [lesson.topic], icon: lesson.icon ?? "📖",
    data: { short: lesson.short, lesson: body },
    quiz,
    sources: lesson.sources.map(({ title, url, note }) => ({ title, ...(url ? { url } : {}), ...(note ? { note } : {}) })),
  };
  const edges: OverlayEdge[] = lesson.links.map((l, i) => ({
    id: `${lesson.id}-l${i + 1}`, src: lesson.id, dst: l.node, kind: l.kind, note: l.note, claim_type: "个人判断",
  }));
  return { node, edges };
}

export type LessonStatus = {
  status: "new" | "progress" | "lit" | "done";
  chaptersDone: string[];
  interactionsDone: string[];
  takeaway?: string;
  litAt?: string;
  doneAt?: string;
};

/**
 * 课的状态完全由日志推算（与星图里的 JS 版逐字等价，tests/lesson.test.ts 校验）：
 * - done：有 done 事件（学习者回复「完成」；网页里输入或在对话里回复后由 agent 记一条）
 * - lit：quiz 全对且题数 ≥ 3，或有 lit 事件
 * - progress：有任何事件
 * - chaptersDone：play 事件 payload.chapter 且 progress === 1；interactionsDone：play 事件 payload.interaction
 * - takeaway：最后一条 note 且 payload.kind === "takeaway" 的 text
 */
export function lessonStatus(events: LogEvent[], id: string): LessonStatus {
  const out: LessonStatus = { status: "new", chaptersDone: [], interactionsDone: [] };
  const evs = events.filter((e) => e.node === id).sort((a, b) => Date.parse(a.ts) - Date.parse(b.ts));
  let any = false, lit = false, done = false;
  for (const e of evs) {
    any = true;
    const p = (e.payload ?? {}) as Record<string, unknown>;
    if (e.action === "play") {
      if (typeof p.chapter === "string" && p.progress === 1 && !out.chaptersDone.includes(p.chapter)) out.chaptersDone.push(p.chapter);
      if (typeof p.interaction === "string" && !out.interactionsDone.includes(p.interaction)) out.interactionsDone.push(p.interaction);
    } else if (e.action === "quiz") {
      const total = Number(p.total ?? 0), correct = Number(p.correct ?? 0);
      if (total >= 3 && correct === total && !lit) { lit = true; out.litAt = e.ts; }
    } else if (e.action === "lit") {
      if (!lit) { lit = true; out.litAt = e.ts; }
    } else if (e.action === "note") {
      if (p.kind === "takeaway" && typeof p.text === "string") out.takeaway = p.text;
    } else if (e.action === "done") {
      if (!done) { done = true; out.doneAt = e.ts; }
    }
  }
  out.status = done ? "done" : lit ? "lit" : any ? "progress" : "new";
  return out;
}
