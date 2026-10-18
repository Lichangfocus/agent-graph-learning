import assert from "node:assert/strict";
import { test } from "node:test";
import { loadAtlas, parseAtlas, validateAtlasGraph } from "../engine/lib/atlas";
import { AtlasSchema, LogEventSchema, OverlayEdgeSchema, OverlayNodeSchema, QuizSchema } from "../engine/lib/schemas/atlas";
import { buildAtlas } from "../engine/pipeline/atlas-build";

const atlas = loadAtlas();

test("schema: committed atlas/world-map.json is valid learn.atlas.v1", () => {
  assert.equal(AtlasSchema.safeParse(atlas).success, true);
  assert.equal(atlas.schema, "learn.atlas.v1");
  assert.equal(atlas.license, "CC BY-SA 4.0");
  assert.ok(atlas.domains.length >= 10, "M0 要求约 10 个领域");
});

test("schema: committed atlas equals a fresh build from atlas/src (no hand edits drift)", () => {
  const fresh = buildAtlas(atlas.updated);
  assert.deepEqual(fresh, atlas);
});

test("schema: 11 history nodes are ready with exactly 3 valid quiz items and driver lines", () => {
  const history = atlas.nodes.filter((n) => n.topics.includes("t-civ"));
  assert.deepEqual(history.map((n) => n.id), ["s1", "s2", "s3", "s4", "s5", "s6", "s7", "s8", "s9", "s10", "s11"]);
  for (const n of history) {
    assert.equal(n.status, "ready", n.id);
    assert.equal(n.quiz?.length, 3, n.id);
    for (const q of n.quiz!) assert.ok(q.answer < q.options.length);
    assert.equal((n.data?.drivers as unknown[]).length, 4, n.id);
    assert.ok(n.time && n.time.ya[0] >= n.time.ya[1], `${n.id}: ya 区间应从早到晚`);
  }
});

test("schema: rejects bad ids, unknown edge kinds, missing claim_type and out-of-range answers", () => {
  const bad = structuredClone(atlas) as unknown as { nodes: { id: string }[]; edges: Record<string, unknown>[] };
  bad.nodes[0].id = "Bad Id!";
  assert.equal(AtlasSchema.safeParse(bad).success, false);
  const badEdge = structuredClone(atlas) as unknown as { edges: Record<string, unknown>[] };
  badEdge.edges[0].kind = "inspires";
  assert.equal(AtlasSchema.safeParse(badEdge).success, false);
  const noClaim = structuredClone(atlas) as unknown as { edges: Record<string, unknown>[] };
  delete noClaim.edges[0].claim_type;
  assert.equal(AtlasSchema.safeParse(noClaim).success, false);
  assert.equal(QuizSchema.safeParse({ q: "x", options: ["a", "b"], answer: 2 }).success, false);
});

test("schema: overlay ids must start with u- and log events need ISO timestamps with offset", () => {
  const node = { id: "steam", kind: "concept", name: "x", summary: "y", domain: "d-eng", topics: ["t-energy"] };
  assert.equal(OverlayNodeSchema.safeParse(node).success, false);
  assert.equal(OverlayNodeSchema.safeParse({ ...node, id: "u-steam" }).success, true);
  assert.equal(OverlayEdgeSchema.safeParse({ id: "e1", src: "a", dst: "b", kind: "related", note: "n" }).success, false);
  assert.equal(LogEventSchema.safeParse({ ts: "2026-10-18 08:00", node: "s1", action: "open" }).success, false);
  assert.equal(LogEventSchema.safeParse({ ts: "2026-10-18T08:00:00+08:00", node: "s1", action: "open" }).success, true);
  assert.equal(LogEventSchema.safeParse({ ts: "2026-10-18T08:00:00Z", node: "s1", action: "teleport" }).success, false);
});

test("graph: atlas has no semantic errors; every node reachable via some edge", () => {
  const diag = validateAtlasGraph(atlas);
  assert.deepEqual(diag.errors, []);
  assert.deepEqual(diag.warnings.filter((w) => w.includes("孤立")), []);
});

test("graph: detects duplicate ids, dangling refs, topic/member mismatch and prereq cycles", () => {
  const g = structuredClone(atlas);
  g.nodes.push({ ...g.nodes[0] });
  g.edges.push({ id: "e-dangling", src: "s1", dst: "nope", kind: "related", note: "x", claim_type: "AI推断" });
  g.topics[0].members.push({ id: "ghost" });
  g.edges.push({ id: "e-c1", src: "n-transformer", dst: "n-deeplearning", kind: "prereq", note: "cycle", claim_type: "AI推断" });
  const { errors } = validateAtlasGraph(g);
  assert.ok(errors.some((e) => e.includes("重复的 id")));
  assert.ok(errors.some((e) => e.includes("e-dangling")));
  assert.ok(errors.some((e) => e.includes("ghost")));
  assert.ok(errors.some((e) => e.startsWith("prereq 边有环")));
  assert.throws(() => parseAtlas(g), /语义校验失败/);
});

test("fact-check (TASK-005): every history node and every 事实 edge carries sources; no personal course weeks in public Atlas", () => {
  const atlas = loadAtlas();
  for (const n of atlas.nodes.filter((x) => x.topics.includes("t-civ"))) assert.ok(n.sources && n.sources.length >= 2, `${n.id} 缺来源`);
  for (const e of atlas.edges.filter((x) => x.claim_type === "事实" || (x.claim_type === "主流解释" && !x.id.startsWith("e-next-")))) {
    assert.ok(e.sources && e.sources.length >= 1, `${e.id}（${e.claim_type}）缺来源`);
  }
  const text = JSON.stringify(atlas);
  assert.doesNotMatch(text, /课程\s*W\d|"weeks"/);
});
