import assert from "node:assert/strict";
import { test } from "node:test";
import { loadAtlas } from "../engine/lib/atlas";
import { mergeOverlay } from "../engine/lib/overlay";
import { DEMO_PACK_DIR } from "../engine/lib/paths";
import { loadUserPack } from "../engine/lib/userpack";
import type { OverlayEdge, OverlayNode, UserTopic } from "../engine/lib/schemas/atlas";

const atlas = loadAtlas();
const node = (id: string, extra: Partial<OverlayNode> = {}): OverlayNode =>
  ({ id, kind: "concept", name: id, summary: "s", status: "stub", domain: "tech", topics: ["t-energy"], ...extra });
const edge = (id: string, src: string, dst: string): OverlayEdge => ({ id, src, dst, kind: "related", note: "n", claim_type: "AI推断" });

test("overlay merge: demo pack merges cleanly and never mutates the atlas", () => {
  const before = JSON.stringify(atlas);
  const merged = mergeOverlay(atlas, loadUserPack(DEMO_PACK_DIR));
  assert.deepEqual(merged.diagnostics.errors, []);
  assert.equal(JSON.stringify(atlas), before);
  assert.equal(merged.nodes.length, atlas.nodes.length + 1);
  assert.equal(merged.nodes.find((n) => n.id === "u-steam-engine")?.source, "user");
});

test("overlay merge: user topic is a view — members keep one node, gain the topic id, no copies", () => {
  const merged = mergeOverlay(atlas, loadUserPack(DEMO_PACK_DIR));
  const s9 = merged.nodes.filter((n) => n.id === "s9");
  assert.equal(s9.length, 1);
  assert.deepEqual(s9[0].topics, ["t-civ", "u-t-energy-history"]);
  assert.deepEqual(atlas.nodes.find((n) => n.id === "s9")!.topics, ["t-civ"]);
  const topic = merged.topics.find((t) => t.id === "u-t-energy-history")!;
  assert.equal(topic.source, "user");
  assert.ok(topic.members.some((m) => m.id === "u-steam-engine"));
});

test("overlay merge: cannot override atlas ids; duplicates, dangling edges and unknown domains are dropped with errors", () => {
  const t: UserTopic = { id: "u-t-x", domain: "nowhere", name: "x", members: [] };
  const merged = mergeOverlay(atlas, {
    nodes: [node("u-a"), node("u-a"), node("u-b", { domain: "nowhere" }), { ...node("u-c"), id: "s1" } as OverlayNode],
    edges: [edge("u-e1", "u-a", "s1"), edge("u-e2", "u-a", "u-ghost"), edge("e-s1-s2", "u-a", "s2")],
    topics: [t],
  });
  const errs = merged.diagnostics.errors.join("\n");
  assert.equal(merged.nodes.filter((n) => n.id === "u-a").length, 1);
  assert.match(errs, /u-a 重复/);
  assert.match(errs, /u-b 的领域 nowhere 不存在/);
  assert.match(errs, /s1 与 Atlas 冲突/);
  assert.match(errs, /u-e2 引用了不存在的节点/);
  assert.match(errs, /e-s1-s2 与 Atlas 冲突/);
  assert.match(errs, /u-t-x 的领域 nowhere 不存在/);
  assert.equal(merged.nodes.find((n) => n.id === "s1")!.name, atlas.nodes.find((n) => n.id === "s1")!.name);
  assert.ok(merged.edges.some((e) => e.id === "u-e1"));
});

test("overlay merge: user prereq edge that creates a cycle is reported", () => {
  const merged = mergeOverlay(atlas, { nodes: [], topics: [], edges: [{ ...edge("u-loop", "transformer", "deep-learning"), kind: "prereq" }] });
  assert.ok(merged.diagnostics.errors.some((e) => e.startsWith("prereq 边有环")));
});
