import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dataPath, unitDir, usingUserData } from "../engine/lib/paths";
import { test } from "node:test";
import { runInNewContext } from "node:vm";
import { loadAllUnits } from "../engine/lib/utils/content";
import { loadCourseGraph } from "../engine/lib/utils/graph";
import { layoutGraph } from "../engine/lib/utils/graph-layout";
import { loadLearningProfile, loadProfileHighlights } from "../engine/lib/utils/profile-highlights";
import { mergeProgress, ProgressSchema, type Progress } from "../engine/lib/progress";
import type { Unit } from "../engine/lib/schemas/unit";

// 这组测试针对「用个人数据包构建的单元预览」（含私人单元 u01/u02）：
// 需要 LEARN_DATA_DIR=../learn-data 且已运行 npm run preview:build；否则跳过（公开 CI 没有私人数据）。
const previewPath = dataPath("builds", "preview", "index.html");
const SKIP = usingUserData() && existsSync(previewPath) && unitDir("u01") ? false
  : "需要 LEARN_DATA_DIR=../learn-data 并先 npm run preview:build（私人单元 u01/u02）";
const html = SKIP ? "" : readFileSync(previewPath, "utf-8");
const data = SKIP ? JSON.parse("{}") : JSON.parse(html.match(/<script id="preview-data" type="application\/json">([\s\S]*?)<\/script>/)![1]);
const script = SKIP ? "" : html.match(/<script>([\s\S]*?)<\/script>/)![1];
const ptest = (name: string, fn: () => void | Promise<void>) => test(name, { skip: SKIP }, fn);

function renderer(hash = "#/map", initialProgress: Progress = { version: 1, units: {} }) {
  const listeners: Record<string, (event: unknown) => void> = {};
  const elements: Record<string, {
    innerHTML: string; textContent: string; value: string; hidden: boolean;
    showModal: () => void; reset: () => void;
    onsubmit?: (event: { preventDefault: () => void }) => void;
    addEventListener: (name: string, callback: (event: unknown) => void) => void;
  }> = {};
  const element = (id: string) => elements[id] ??= {
    innerHTML: "", textContent: "", value: "", hidden: false,
    showModal: () => {}, reset: () => {},
    addEventListener: (name, callback) => { listeners[`${id}/${name}`] = callback; },
  };
  element("preview-data").textContent = JSON.stringify(data);
  const store = new Map([["scholar-engine:progress:v1", JSON.stringify(initialProgress)]]);
  const context = {
    document: { getElementById: element, querySelectorAll: () => [], addEventListener: (name: string, callback: (event: unknown) => void) => { listeners[name] = callback; } },
    localStorage: { getItem: (key: string) => store.get(key) ?? null, setItem: (key: string, value: string) => store.set(key, value) },
    window: { addEventListener: () => {}, scrollTo: () => {} },
    location: { hash }, setTimeout: () => 1, clearTimeout: () => {},
    // Tests expose internal helpers only inside this isolated VM, never in the HTML.
    __test: {} as {
      openNotes: (anchor: string) => void;
      revisionBrief: (notes: unknown[]) => string;
      validateProgress: (value: unknown) => Progress;
      mergeProgress: (prior: Progress, next: Progress) => Progress;
      layoutGraph: () => ReturnType<typeof layoutGraph>;
      questionHTML: (unit: Unit, question: Unit["sections"]["checkYourself"][number], i: number) => string;
      litHTML: (unit: Unit) => string;
      sectionBody: (unit: Unit, key: string, body: string) => string;
    },
  };
  runInNewContext(script.replace(/\}\)\(\);\s*$/, "globalThis.__test = { validateProgress, mergeProgress, layoutGraph, questionHTML, litHTML, sectionBody, openNotes, revisionBrief };})();"), context);
  return { ...context, elements, store, listeners };
}
const plain = <T>(value: T): T => JSON.parse(JSON.stringify(value));

ptest("preview embeds canonical validated units, graph, profile and source section order", () => {
  assert.deepEqual(data.graph, loadCourseGraph());
  assert.deepEqual(data.profile, plain(loadLearningProfile()));
  assert.deepEqual(data.profileHighlights, loadProfileHighlights());
  for (const unit of loadAllUnits()) {
    const preview = data.units.find((item: Unit) => item.frontmatter.id === unit.frontmatter.id);
    assert.deepEqual({ frontmatter: preview.frontmatter, sections: preview.sections }, plain(unit));
    const headings = [...readFileSync(`${unitDir(unit.frontmatter.id)}/source.md`, "utf-8").matchAll(/^##\s+(.+)$/gm)].map(match => match[1].trim());
    assert.deepEqual(preview.sourceSections.map((section: { heading: string }) => section.heading), headings);
  }
});

ptest("HTML has no runtime network references, modules, fetch or unresolved build placeholders", () => {
  assert.ok(!html.includes("fetch("));
  assert.ok(!/<(?:script|link|img|video|source)\b[^>]*(?:src|href)\s*=\s*["']https?:\/\//i.test(html));
  assert.ok(!/<script\b[^>]*type=["']module/i.test(html));
  assert.ok(!html.includes("/*__PREVIEW_"));
  assert.ok(data.imageList.every((uri: string) => uri.startsWith("data:image/jpeg;base64,")));
});

ptest("map renders all nodes and vanilla layout exactly matches the Next layout", () => {
  const view = renderer();
  assert.deepEqual(plain(view.__test.layoutGraph().nodes), layoutGraph(loadCourseGraph()).nodes);
  for (const node of data.graph.nodes) assert.ok(view.elements.app.innerHTML.includes(`data-select="${node.id}"`));
  assert.ok(view.elements.app.innerHTML.includes('href="#/unit/u01"'));
  assert.ok(view.elements.app.innerHTML.includes('href="#/unit/u02"'));
  assert.ok(!view.elements.app.innerHTML.includes('href="#/unit/u03"'));
  assert.ok(view.elements.app.innerHTML.includes("为什么不按教科书顺序"));
});

ptest("unit rendering includes ordered sections, concept and question anchors, local video and canon labels", () => {
  const view = renderer("#/unit/u01");
  const markup = view.elements.app.innerHTML;
  const anchors = ["hook-question", "core-narrative", "key-concepts", "artworks", "video-storyboard", "interactive-components", "mastery-evidence", "check-yourself", "ai-and-future-life"];
  let previous = -1;
  for (const anchor of anchors) {
    const index = markup.indexOf(`data-anchor="u01#${anchor}"`);
    assert.ok(index > previous, anchor); previous = index;
  }
  assert.ok(markup.includes("转述，非原文引用"));
  assert.ok(markup.includes('data-note="u01#check-yourself/q2"'));
  assert.ok(markup.includes('data-note="u01#key-concepts/'));
  assert.ok(markup.includes('src="u01.mp4"'));
  assert.ok(markup.includes("类比的边界"));
  assert.ok(markup.includes("data-luminance"));
  assert.ok(markup.includes("data-frequency"));
  assert.ok(!markup.includes("data-light"));
});

ptest("progress import rejects corruption and merges identically to the shared progress code", () => {
  const view = renderer();
  for (const invalid of [
    { version: 2, units: {} },
    { version: 1, units: { u01: { lit: false, retelling: "x".repeat(201), answers: {} } } },
    { version: 1, units: { u01: { lit: false, answers: { q1: "true" } } } },
    { version: 1, units: JSON.parse('{"__proto__":{"lit":false,"answers":{}}}') },
  ]) assert.throws(() => view.__test.validateProgress(invalid));
  const old: Progress = { version: 1, units: { u01: { lit: true, litAt: "2026-10-07T10:00:00Z", retelling: "new", answers: { q1: true, q2: false } } } };
  const next: Progress = { version: 1, units: { u01: { lit: false, litAt: "2026-10-06T10:00:00Z", retelling: "old", answers: { q1: false, q2: true } } } };
  assert.deepEqual(plain(view.__test.mergeProgress(old, next)), mergeProgress(old, next));
  assert.ok(ProgressSchema.safeParse(view.__test.mergeProgress(old, next)).success);
});

ptest("retelling and lighting are offered only after every MCQ is correct", () => {
  const unit = data.units.find((item: Unit) => item.frontmatter.id === "u01");
  const incomplete = renderer("#/unit/u01", { version: 1, units: { u01: { lit: false, answers: { q1: true, q2: true, q3: false } } } });
  assert.ok(!incomplete.__test.litHTML(unit).includes("data-light"));
  const complete = renderer("#/unit/u01", { version: 1, units: { u01: { lit: false, answers: { q1: true, q2: true, q3: true } } } });
  assert.ok(complete.__test.litHTML(unit).includes('maxlength="200"'));
  assert.ok(complete.__test.litHTML(unit).includes("data-light"));
});

ptest("content and annotation anchors escape markup instead of treating it as HTML", () => {
  const view = renderer("#/unit/u01");
  const unit = plain(data.units.find((item: Unit) => item.frontmatter.id === "u01"));
  unit.sections.keyConcepts[0].term = '<img src=x onerror="alert(1)">';
  unit.sections.keyConcepts[0].explanation = "<script>alert(1)</script>";
  const markup = view.__test.sectionBody(unit, "key-concepts", "");
  assert.ok(markup.includes("&lt;img"));
  assert.ok(markup.includes("&lt;script&gt;"));
  assert.ok(!markup.includes("<script>"));
  assert.ok(!markup.includes("<img src=x"));
});


ptest("annotations persist all four intents and export source anchors grouped by unit", () => {
  const view = renderer("#/unit/u01");
  const anchors = ["u01#key-concepts/明度", "u01#check-yourself/q2"];
  for (const [index, intent] of ["change", "question", "confirm", "resource"].entries()) {
    view.__test.openNotes(anchors[index % 2]);
    view.document.getElementById("note-intent").value = intent;
    view.document.getElementById("note-text").value = `feedback ${intent}\nwith a second line`;
    view.elements["note-form"].onsubmit!({ preventDefault: () => {} });
  }
  const stored = JSON.parse(view.store.get("scholar-engine:notes:v1")!);
  assert.equal(stored.notes.length, 4);
  assert.equal(view.elements["notes-count"].textContent, 4);
  const brief = view.__test.revisionBrief(stored.notes);
  assert.equal(brief.match(/^## u01 /gm)?.length, 1);
  assert.equal(brief.match(/^### u01#/gm)?.length, 2);
  assert.ok(brief.includes("units/u01/source.md"));
  for (const tag of ["change / 要改", "question / 有疑问", "confirm / 认可", "resource / 补资料"]) assert.ok(brief.includes(`[${tag}]`));
  assert.ok(brief.includes("  > with a second line"));
});
