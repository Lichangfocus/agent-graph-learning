import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { countLit, masteryFromLog } from "../engine/lib/mastery";
import { appendLogEvent, loadUserPack, readLog } from "../engine/lib/userpack";
import type { LogEvent } from "../engine/lib/schemas/atlas";

const ev = (ts: string, node: string, action: LogEvent["action"], payload?: Record<string, unknown>): LogEvent => ({ ts, node, action, payload });
const ids = ["a", "b", "c", "d", "e"];
const edges = [{ src: "a", dst: "b", kind: "prereq" as const }, { src: "c", dst: "d", kind: "related" as const }];

test("mastery from log: seen → learning → lit → mastered, levels never go backwards", () => {
  const s = masteryFromLog([
    ev("2026-10-18T08:00:00Z", "a", "open"),
    ev("2026-10-18T08:01:00Z", "a", "play", { progress: 0.7 }),
    ev("2026-10-18T08:02:00Z", "a", "quiz", { correct: 2, total: 3 }),
    ev("2026-10-18T08:03:00Z", "a", "quiz", { correct: 3, total: 3 }),
    ev("2026-10-18T09:00:00Z", "a", "open"),
  ], ids, edges);
  assert.equal(s.a.level, "lit");
  assert.equal(s.a.litAt, "2026-10-18T08:03:00Z");
  const later = masteryFromLog([
    ev("2026-10-18T08:03:00Z", "a", "lit"),
    ev("2026-10-18T20:00:00Z", "a", "review", { passed: true }),
  ], ids, edges);
  assert.equal(later.a.level, "lit", "复习间隔不足 1 天不算 mastered");
  const mastered = masteryFromLog([
    ev("2026-10-18T08:03:00Z", "a", "lit"),
    ev("2026-10-20T08:00:00Z", "a", "review", { passed: false }),
    ev("2026-10-21T08:00:00Z", "a", "review", { passed: true }),
  ], ids, edges);
  assert.equal(mastered.a.level, "mastered");
});

test("mastery from log: soft lock only when an unlit prereq exists; unknown nodes are ignored", () => {
  const s = masteryFromLog([ev("2026-10-18T08:00:00Z", "zzz", "lit")], ids, edges);
  assert.equal(s.b.level, "locked");
  assert.equal(s.a.level, null);
  assert.equal(s.d.level, null, "related 边不锁");
  const unlocked = masteryFromLog([ev("2026-10-18T08:00:00Z", "a", "lit")], ids, edges);
  assert.equal(unlocked.b.level, null);
  const openedLocked = masteryFromLog([ev("2026-10-18T08:00:00Z", "b", "open")], ids, edges);
  assert.equal(openedLocked.b.level, "seen", "软锁：锁定节点仍可打开");
});

test("mastery from log: events from several devices are order-independent (sorted by ts)", () => {
  const events = [
    ev("2026-10-19T08:00:00Z", "c", "review", { passed: true }),
    ev("2026-10-18T08:00:00Z", "c", "quiz", { correct: 3, total: 3 }),
  ];
  assert.equal(masteryFromLog(events, ids).c.level, "mastered");
  assert.equal(masteryFromLog([...events].reverse(), ids).c.level, "mastered");
  assert.deepEqual(countLit(masteryFromLog(events, ids)), { lit: 1, total: 5 });
});

test("user pack log: append-only per-device JSONL, merged across devices, bad lines reported not thrown", () => {
  const dir = mkdtempSync(join(tmpdir(), "learn-pack-"));
  try {
    appendLogEvent(ev("2026-10-18T10:00:00+08:00", "s1", "open"), "mac", dir);
    appendLogEvent(ev("2026-10-18T09:00:00+08:00", "s1", "quiz", { correct: 3, total: 3 }), "box", dir);
    appendLogEvent(ev("2026-10-18T11:00:00+08:00", "s2", "open"), "mac", dir);
    assert.equal(readFileSync(join(dir, "log", "mac.jsonl"), "utf-8").trim().split("\n").length, 2);
    assert.throws(() => appendLogEvent(ev("2026-10-18T11:00:00+08:00", "s2", "open"), "../evil", dir));
    assert.throws(() => appendLogEvent({ ts: "yesterday", node: "s2", action: "open" }, "mac", dir));
    writeFileSync(join(dir, "log", "phone.jsonl"), '{"ts":"2026-10-18T12:00:00Z","node":"s3","action":"open"}\nnot json\n');
    const problems: string[] = [];
    const log = readLog(dir, problems);
    assert.deepEqual(log.map((e) => `${e.device}:${e.node}:${e.action}`), ["box:s1:quiz", "mac:s1:open", "mac:s2:open", "phone:s3:open"]);
    assert.equal(problems.length, 1);
    mkdirSync(join(dir, "topics"));
    writeFileSync(join(dir, "topics", "bad.json"), '{"id":"no-prefix","domain":"history","name":"x","members":[]}');
    const pack = loadUserPack(dir);
    assert.equal(pack.topics.length, 0);
    assert.ok(pack.problems.some((p) => p.startsWith("topics/bad.json")));
    const state = masteryFromLog(log, ["s1", "s2", "s3"]);
    assert.equal(state.s1.level, "lit");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
