import assert from "node:assert/strict";
import { test } from "node:test";
import { runInNewContext } from "node:vm";
import { loadAtlas } from "../engine/lib/atlas";
import { renderAtlasMap } from "../engine/lib/atlas-map";
import { masteryFromLog } from "../engine/lib/mastery";
import { mergeOverlay } from "../engine/lib/overlay";
import { DEMO_PACK_DIR } from "../engine/lib/paths";
import type { LogEvent } from "../engine/lib/schemas/atlas";
import { loadUserPack } from "../engine/lib/userpack";

const atlas = loadAtlas();
const pack = loadUserPack(DEMO_PACK_DIR);
const merged = mergeOverlay(atlas, pack);
const html = renderAtlasMap(merged, pack.log, { owner: "demo", demo: true });

test("demo map: single offline file — data injected once, no network, no modules, '</' escaped", () => {
  assert.ok(!html.includes("/*__ATLAS_DATA__*/"));
  assert.doesNotMatch(html, /<script[^>]+src=|<link[^>]+href=|@import|\bfetch\(|import\s*\(|https?:\/\/(?!www\.w3\.org)/);
  const json = html.match(/<script id="atlas-data" type="application\/json">([\s\S]*?)<\/script>/)![1];
  assert.ok(!json.includes("</"));
  const data = JSON.parse(json);
  assert.equal(data.graph.nodes.length, merged.nodes.length);
  assert.equal(data.log.length, pack.log.length);
  assert.equal(data.graph.diagnostics, undefined);
});

test("demo map: in-browser mastery rules are identical to engine/lib/mastery.ts", () => {
  const src = html.match(/function masteryFromLog\([\s\S]*?\n}\n/)![0];
  const browser = runInNewContext(`${src}; masteryFromLog`) as typeof masteryFromLog;
  const ids = merged.nodes.map((n) => n.id);
  const events: LogEvent[] = [
    ...pack.log,
    { ts: "2026-10-18T09:00:00Z", node: "deep-learning", action: "quiz", payload: { correct: 1, total: 3 } },
    { ts: "2026-10-18T09:00:00Z", node: "s3", action: "lit" },
    { ts: "2026-10-20T09:00:00Z", node: "s3", action: "review", payload: { passed: true } },
    { ts: "2026-10-18T09:30:00Z", node: "s4", action: "play", payload: { progress: 0.2 } },
  ];
  const strip = (x: unknown) => JSON.parse(JSON.stringify(x));
  assert.deepEqual(strip(browser(events, ids, merged.edges)), strip(masteryFromLog(events, ids, merged.edges)));
});
