import assert from "node:assert/strict";
import { test } from "node:test";
import { layoutGraph } from "../engine/lib/utils/graph-layout";
import { shuffleOptions } from "../engine/lib/utils/quiz";
import { PROGRESS_KEY, ProgressSchema, importProgress, mergeProgress, updateUnitProgress, type Progress } from "../engine/lib/progress";
import { loadProfileHighlights } from "../engine/lib/utils/profile-highlights";
import { loadCourseGraph } from "../engine/lib/utils/graph";
import { loadUnitFromMarkdown } from "../engine/lib/utils/content";
import { resolve } from "node:path";
import { unitDir } from "../engine/lib/paths";
import type { CourseGraph } from "../engine/lib/schemas/graph";

test("layers use the longest hard + soft path and ignore cross cycles", () => {
  const nodes = ["a", "b", "c", "d"].map((id, i) => ({
    id, name: id, icon: "x", domain: "test", module: "M1", week: i + 1, desc: id,
  }));
  const edges: CourseGraph["edges"] = [
    { from: "a", to: "d", type: "hard", why: "short path" },
    { from: "a", to: "b", type: "hard", why: "start" },
    { from: "b", to: "c", type: "soft", why: "middle" },
    { from: "c", to: "d", type: "soft", why: "end" },
    { from: "d", to: "a", type: "cross", why: "association" },
  ];
  const layout = layoutGraph({ nodes, edges });
  assert.deepEqual(layout.nodes.map((node) => node.layer), [0, 1, 2, 3]);
  assert.throws(() => layoutGraph({ nodes, edges: [...edges, { from: "d", to: "a", type: "soft", why: "cycle" }] }), /有环/);
});

test("canonical graph remains available and positions each dependency later", () => {
  const graph = loadCourseGraph();
  const layers = new Map(layoutGraph(graph).nodes.map((node) => [node.id, node.layer]));
  for (const edge of graph.edges.filter((edge) => edge.type !== "cross")) {
    assert.ok(layers.get(edge.to)! > layers.get(edge.from)!);
  }
  // 课程图来自数据包（LEARN_DATA_DIR，默认示例包）；有 source.md 的节点标 built
  for (const node of graph.nodes) assert.equal(node.status, unitDir(node.id) ? "built" : "planned");
  assert.ok(graph.nodes.some((node) => node.status === "built"));
});

test("option shuffling is stable and preserves every option without mutating input", () => {
  const options = Object.freeze(["correct", "misconception", "other"]);
  assert.deepEqual(shuffleOptions(options, "q1"), shuffleOptions(options, "q1"));
  assert.deepEqual([...shuffleOptions(options, "q2")].sort(), [...options].sort());
  assert.deepEqual(options, ["correct", "misconception", "other"]);
});

test("progress schema rejects incompatible, malformed and oversized imports", () => {
  for (const value of [
    { version: 2, units: {} },
    { version: 1, units: { u01: { lit: "yes", answers: {} } } },
    { version: 1, units: { u01: { lit: true, retelling: "a".repeat(201), answers: {} } } },
    { version: 1, units: { u01: { lit: true, litAt: "yesterday", answers: {} } } },
  ]) assert.equal(ProgressSchema.safeParse(value).success, false);
});

test("imports preserve achievements, add records and retain newer retellings", () => {
  const current: Progress = { version: 1, units: {
    u01: { lit: true, litAt: "2026-10-07T12:00:00.000Z", retelling: "newer", answers: { q1: true, q2: false } },
  } };
  const incoming: Progress = { version: 1, units: {
    u01: { lit: false, litAt: "2026-10-06T12:00:00.000Z", retelling: "older", answers: { q1: false, q2: true } },
    u02: { lit: false, answers: { q1: false } },
  } };
  const merged = mergeProgress(current, incoming);
  assert.equal(merged.units.u01.lit, true);
  assert.equal(merged.units.u01.retelling, "newer");
  assert.deepEqual(merged.units.u01.answers, { q1: true, q2: true });
  assert.ok(merged.units.u02);
  assert.equal(current.units.u01.answers.q2, false);
});

test("AI context contains only 2–4 highlights drawn from the data pack profile", () => {
  const highlights = loadProfileHighlights();
  assert.ok(highlights.length >= 2 && highlights.length <= 4);
  assert.ok(highlights.some((item) => item.includes("类比")));
  assert.ok(highlights.every((item) => !item.includes("临床训练")));
});

test("saved answers survive retry and file imports merge without damaging existing records", async () => {
  const store = new Map<string, string>();
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  const browser = Object.assign(new EventTarget(), { localStorage: {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => { store.set(key, value); },
  } });
  Object.defineProperty(globalThis, "window", { value: browser, configurable: true });
  let changes = 0;
  browser.addEventListener("scholar-engine:progress-change", () => { changes += 1; });
  try {
    updateUnitProgress("u01", { answers: { q1: false } });
    updateUnitProgress("u01", { answers: { q1: true } });
    updateUnitProgress("u01", { lit: true, litAt: "2026-10-07T12:00:00.000Z", retelling: "my explanation" });
    await importProgress(new File([JSON.stringify({ version: 1, units: {
      u01: { lit: false, answers: { q1: false, q2: true } },
      u02: { lit: true, answers: {} },
    } })], "progress.json", { type: "application/json" }));
    const saved = ProgressSchema.parse(JSON.parse(store.get(PROGRESS_KEY)!));
    assert.equal(saved.units.u01.lit, true);
    assert.equal(saved.units.u01.retelling, "my explanation");
    assert.deepEqual(saved.units.u01.answers, { q1: true, q2: true });
    assert.equal(saved.units.u02.lit, true);
    assert.equal(changes, 4);
    const before = store.get(PROGRESS_KEY);
    await assert.rejects(importProgress(new File(['{"version":2,"units":{}}'], "invalid.json")));
    assert.equal(store.get(PROGRESS_KEY), before);
    store.set(PROGRESS_KEY, "damaged json");
    assert.throws(() => updateUnitProgress("u01", { answers: { q1: true } }));
    assert.equal(store.get(PROGRESS_KEY), "damaged json");
  } finally {
    if (originalWindow) Object.defineProperty(globalThis, "window", originalWindow);
    else Reflect.deleteProperty(globalThis, "window");
  }
});


test("u02 function map loads with five bins (private unit, needs LEARN_DATA_DIR)", { skip: unitDir("u02") ? false : "u02 是私人单元，设置 LEARN_DATA_DIR=../learn-data 后运行" }, () => {
  const unit = loadUnitFromMarkdown(resolve(unitDir("u02")!, "source.md"));
  assert.equal(unit.frontmatter.id, "u02");
  assert.equal(unit.sections.interactive.functionMaps.length, 1);
  assert.equal(unit.sections.interactive.functionMaps[0].bins.length, 5);
  assert.equal(unit.sections.interactive.functionMaps[0].works.length, 4);
});
