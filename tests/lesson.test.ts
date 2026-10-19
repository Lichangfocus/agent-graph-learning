import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { runInNewContext } from "node:vm";
import { loadAtlas } from "../engine/lib/atlas";
import { lessonStatus, lessonToOverlay, readLessons } from "../engine/lib/lesson";
import { mergeOverlay } from "../engine/lib/overlay";
import { DEMO_PACK_DIR, REPO_ROOT, dataDir } from "../engine/lib/paths";
import { privacyViolations } from "../engine/lib/privacy";
import { LogEventSchema, type LogEvent } from "../engine/lib/schemas/atlas";
import { LessonSchema } from "../engine/lib/schemas/lesson";
import { loadUserPack } from "../engine/lib/userpack";
import { toWorldView } from "../engine/lib/world-view";

const demoLesson = JSON.parse(readFileSync(join(DEMO_PACK_DIR, "lessons", "u-lesson-demo.json"), "utf-8"));
const clone = () => JSON.parse(JSON.stringify(demoLesson));
const ev = (ts: string, action: LogEvent["action"], payload?: Record<string, unknown>, node = "u-lesson-demo"): LogEvent =>
  ({ ts, node, action, ...(payload ? { payload } : {}) });

test("lesson: demo lesson parses and becomes a kind=lesson overlay node with quiz + links", () => {
  const lessons = readLessons(DEMO_PACK_DIR);
  assert.equal(lessons.length, 1);
  const { node, edges } = lessonToOverlay(lessons[0]);
  assert.equal(node.kind, "lesson");
  assert.equal(node.quiz?.length, 3);
  assert.equal((node.data as { lesson: { chapters: unknown[] } }).lesson.chapters.length, 2);
  assert.ok(!("quiz" in (node.data as { lesson: object }).lesson));
  assert.deepEqual(edges.map((e) => [e.src, e.dst, e.claim_type]), [["u-lesson-demo", "s1", "个人判断"]]);
  const merged = mergeOverlay(loadAtlas(), loadUserPack(DEMO_PACK_DIR));
  assert.deepEqual(merged.diagnostics.errors, []);
  assert.ok(merged.topics.find((t) => t.id === "t-civ")!.members.some((m) => m.id === "u-lesson-demo"));
  const view = toWorldView(merged);
  const v = view.nodes.find((n) => n.id === "u-lesson-demo") as Record<string, unknown>;
  assert.equal(v.node_type, "lesson");
  assert.ok(v.lesson && v.quiz);
});

test("lesson schema: rejects unknown source refs, unsourced 事实, bad sort buckets, guess answer out of range", () => {
  const a = clone(); a.chapters[0].scenes[1].marks[0].src = ["nope"];
  assert.match(String(LessonSchema.safeParse(a).error), /不存在的来源 nope/);
  const b = clone(); delete b.chapters[1].scenes[0].items[0].src;
  assert.match(String(LessonSchema.safeParse(b).error), /缺来源/);
  const c = clone(); c.chapters[1].interaction.items[0].bucket = "zzz";
  assert.equal(LessonSchema.safeParse(c).success, false);
  const d = clone(); d.chapters[0].interaction.answer = 9999;
  assert.equal(LessonSchema.safeParse(d).success, false);
  const e = clone(); e.quiz = e.quiz.slice(0, 2);
  assert.equal(LessonSchema.safeParse(e).success, false, "至少 3 题才能点亮");
  assert.ok(LessonSchema.safeParse(clone()).success);
});

test("lesson status: new → progress (chapters, interactions) → lit → takeaway → done only after 完成", () => {
  const id = "u-lesson-demo";
  assert.equal(lessonStatus([], id).status, "new");
  const log: LogEvent[] = [
    ev("2026-10-20T20:00:00+08:00", "open", { view: "lesson" }),
    ev("2026-10-20T20:03:00+08:00", "play", { chapter: "c1", interaction: "i-clock", guess: 1400, ok: false }),
    ev("2026-10-20T20:04:00+08:00", "play", { chapter: "c1", progress: 1 }),
    ev("2026-10-20T20:04:30+08:00", "play", { chapter: "c1", progress: 1 }),
    ev("2026-10-20T20:05:00+08:00", "quiz", { correct: 2, total: 3 }),
  ];
  let s = lessonStatus(log, id);
  assert.equal(s.status, "progress");
  assert.deepEqual(s.chaptersDone, ["c1"]);
  assert.deepEqual(s.interactionsDone, ["i-clock"]);
  log.push(ev("2026-10-20T20:06:00+08:00", "quiz", { correct: 3, total: 3 }));
  log.push(ev("2026-10-20T20:08:00+08:00", "note", { kind: "takeaway", text: "先问是事实还是解释" }));
  s = lessonStatus(log, id);
  assert.equal(s.status, "lit");
  assert.equal(s.litAt, "2026-10-20T20:06:00+08:00");
  assert.equal(s.takeaway, "先问是事实还是解释");
  log.push(ev("2026-10-20T20:09:00+08:00", "done", { reply: "完成" }));
  s = lessonStatus(log, id);
  assert.equal(s.status, "done");
  assert.equal(s.doneAt, "2026-10-20T20:09:00+08:00");
  assert.equal(lessonStatus(log, "s1").status, "new", "只看本课的事件");
  assert.ok(LogEventSchema.safeParse(log.at(-1)).success, "done 是合法日志动作");
});

test("lesson status: the in-browser lessonStatus is identical to the engine", () => {
  const code = readFileSync(join(REPO_ROOT, "engine", "templates", "atlas-map", "template.html"), "utf-8");
  const m = code.match(/function lessonStatus\([\s\S]*?\n}\n/);
  assert.ok(m, "template 里要有顶层 function lessonStatus(…) … \\n}");
  const browser = runInNewContext(`${m![0]}; lessonStatus`) as typeof lessonStatus;
  const id = "u-lesson-demo";
  const logs: LogEvent[][] = [
    [],
    [ev("2026-10-20T20:00:00+08:00", "open")],
    [ev("2026-10-20T20:01:00+08:00", "play", { chapter: "c2", progress: 1 }), ev("2026-10-20T20:00:00+08:00", "play", { chapter: "c1", progress: 1 }), ev("2026-10-20T20:02:00+08:00", "play", { chapter: "c2", interaction: "i-claims", score: 2, total: 3 })],
    [ev("2026-10-20T20:05:00+08:00", "lit", { via: "manual" }), ev("2026-10-20T20:06:00+08:00", "note", { kind: "takeaway", text: "a" }), ev("2026-10-20T20:07:00+08:00", "note", { kind: "takeaway", text: "b" })],
    [ev("2026-10-20T20:09:00+08:00", "done", { reply: "完成" }), ev("2026-10-20T20:05:00+08:00", "quiz", { correct: 3, total: 3 }), ev("2026-10-20T20:06:00+08:00", "note", { text: "非 takeaway" })],
  ];
  for (const log of logs) assert.deepEqual(JSON.parse(JSON.stringify(browser(log, id))), JSON.parse(JSON.stringify(lessonStatus(log, id))));
});

test("privacy rule: lessons/ is personal (only examples/demo-pack may track it)", () => {
  assert.deepEqual(privacyViolations(["lessons/u-lesson-01.json", "examples/demo-pack/lessons/u-lesson-demo.json"]), ["lessons/u-lesson-01.json"]);
});

const realLesson = join(dataDir(), "lessons", "u-lesson-01.json");
test("第一课 u-lesson-01（私人，需 LEARN_DATA_DIR）: 20–30 分钟、2–3 个互动、5–6 题、课前说明含书架、截止 10/23、事实都有来源", { skip: existsSync(realLesson) ? false : "第一课在私人数据包里，设置 LEARN_DATA_DIR=../learn-data 后运行" }, () => {
  const l = LessonSchema.parse(JSON.parse(readFileSync(realLesson, "utf-8")));
  assert.equal(l.due, "2026-10-23");
  const chMinutes = l.chapters.reduce((a, c) => a + c.minutes, 0);
  assert.ok(chMinutes >= 20 && chMinutes <= 30, `章节合计 ${chMinutes} 分钟`);
  assert.ok(l.minutes >= 20 && l.minutes <= 30);
  const inter = l.chapters.filter((c) => c.interaction).length;
  assert.ok(inter >= 2 && inter <= 3, `互动 ${inter} 个`);
  assert.ok(l.quiz.length >= 5 && l.quiz.length <= 6);
  assert.ok(l.prep.reading.length >= 2 && l.prep.reading.every((r) => r.url?.startsWith("https://weread.qq.com/")));
  assert.equal(l.close.phrase, "完成");
  assert.ok(new Set(l.chapters.map((c) => c.part)).size === 2, "上篇（W0）+ 下篇（W1）");
  const pack = loadUserPack(dataDir());
  assert.ok(pack.lessons.includes("u-lesson-01"));
  assert.deepEqual(mergeOverlay(loadAtlas(), pack).diagnostics.errors, []);
});
