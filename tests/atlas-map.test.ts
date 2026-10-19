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
import { toWorldView } from "../engine/lib/world-view";

const atlas = loadAtlas();
const pack = loadUserPack(DEMO_PACK_DIR);
const merged = mergeOverlay(atlas, pack);
const html = renderAtlasMap(merged, pack.log, { owner: "demo", demo: true, device: "box" });
const DATA_RE = /<script id="atlas-data" type="application\/json">([\s\S]*?)<\/script>/;
const code = html.replace(DATA_RE, "");

test("offline map: data injected once, '<' escaped, no network code, no modules, writer placeholder removed", () => {
  assert.ok(!html.includes("/*__ATLAS_DATA__*/") && !html.includes("/*__WRITER__*/"));
  assert.equal(html.match(new RegExp(DATA_RE.source, "g"))!.length, 1);
  assert.doesNotMatch(code, /<script[^>]+src=|<link(?![^>]*href="data:)[^>]+href=|@import|\bfetch\(|import\s*\(|https?:\/\/(?!www\.w3\.org)/);
  const json = html.match(DATA_RE)![1];
  assert.ok(!json.includes("<"), "JSON 里的 < 必须转义，不能提前闭合 script");
  const data = JSON.parse(json);
  assert.equal(data.world.nodes.length, merged.nodes.length);
  assert.equal(data.log.length, pack.log.length);
  assert.deepEqual(data.pack, { owner: "demo", demo: true, device: "box" });
});

test("dev map: writer snippet injected only when an endpoint is given", () => {
  const dev = renderAtlasMap(merged, pack.log, { owner: "demo", demo: true }, { endpoint: "/api/events", links: [{ href: "/units/", label: "单元" }] });
  const devCode = dev.replace(DATA_RE, "");
  assert.match(devCode, /fetch\(EP/);
  assert.match(devCode, /"\/api\/events"/);
  assert.equal(JSON.parse(dev.match(DATA_RE)![1]).links[0].href, "/units/");
});

test("world view: same shape as scholar-engine v3 — 47+ nodes, belongs edges restored, 11 films with quiz", () => {
  const w = toWorldView(mergeOverlay(atlas, { nodes: [], edges: [], topics: [] }));
  assert.equal(w.nodes.length, atlas.nodes.length);
  const belongs = w.edges.filter((e) => e.kind === "belongs");
  assert.equal(belongs.length, atlas.nodes.length + atlas.topics.length);
  assert.equal(w.edges.length, belongs.length + atlas.edges.length);
  const films = w.nodes.filter((n) => "quiz" in n && Array.isArray(n.quiz));
  assert.equal(films.length, 11);
  const s1 = w.nodes.find((n) => n.id === "s1") as unknown as Record<string, unknown>;
  assert.equal(s1.home_topic, "t-civ");
  assert.ok(Array.isArray(s1.mech) && "k" in (s1.mech as object[])[0]);
  assert.ok(Array.isArray(s1.interp) && "who" in (s1.interp as object[])[0]);
  assert.equal(Object.keys(s1.drivers as object).length, 4);
  assert.ok(!("weeks" in s1), "公开 Atlas 不带个人课表周次");
  assert.equal(w.topics.find((t) => t.id === "t-civ")!.status, "active");
});

test("in-browser mastery rules are identical to engine/lib/mastery.ts", () => {
  const src = code.match(/function masteryFromLog\([\s\S]*?\n}\n/)![0];
  const browser = runInNewContext(`${src}; masteryFromLog`) as typeof masteryFromLog;
  const ids = merged.nodes.map((n) => n.id);
  const events: LogEvent[] = [
    ...pack.log,
    { ts: "2026-10-18T09:00:00Z", node: "n-deeplearning", action: "quiz", payload: { correct: 1, total: 3 } },
    { ts: "2026-10-18T09:00:00Z", node: "s3", action: "lit" },
    { ts: "2026-10-20T09:00:00Z", node: "s3", action: "review", payload: { passed: true } },
    { ts: "2026-10-18T09:30:00Z", node: "s4", action: "play", payload: { progress: 0.2 } },
  ];
  const strip = (x: unknown) => JSON.parse(JSON.stringify(x));
  assert.deepEqual(strip(browser(events, ids, merged.edges)), strip(masteryFromLog(events, ids, merged.edges)));
});

test("deep links: #node=, #/node/<id>, ?node= all resolve to the same node", () => {
  const start = code.indexOf("var hp={};");
  const end = code.indexOf("hp.node=decodeURIComponent(m[1]);", start) + "hp.node=decodeURIComponent(m[1]);".length;
  assert.ok(start > 0 && end > start, "hash parser snippet not found");
  const parse = (search: string, hash: string) => runInNewContext(code.slice(start, end) + ";hp", { location: { search, hash } });
  assert.equal(parse("", "#node=s4&t=12").node, "s4");
  assert.equal(parse("", "#node=s4&t=12").t, "12");
  assert.equal(parse("", "#/node/s4").node, "s4");
  assert.equal(parse("?node=s4", "").node, "s4");
  assert.equal(parse("?node=s4&t=30", "").t, "30");
});
