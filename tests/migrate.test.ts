import assert from "node:assert/strict";
import { test } from "node:test";
import { loadAtlas } from "../engine/lib/atlas";
import { loadMigrations, renameRefs, renameTable } from "../engine/lib/migrate";

test("migration 0.1.0 → 0.2.0: every old id maps to an id that exists in the current Atlas", () => {
  const atlas = loadAtlas();
  const ids = new Set([...atlas.domains, ...atlas.topics, ...atlas.nodes].map((x) => x.id));
  const table = renameTable("0.1.0");
  assert.ok(Object.keys(table).length >= 30);
  for (const [from, to] of Object.entries(table)) assert.ok(ids.has(to), `${from} → ${to} 不存在`);
  assert.deepEqual(renameTable("0.2.0"), {}, "已是新版的数据包不改名");
  assert.equal(loadMigrations()[0].from, "0.1.0");
});

test("renameRefs rewrites references only, never user ids", () => {
  const table = { tech: "d-eng", "t-energy": "t-energy", "fossil-energy": "n-fossil", history: "d-hist" };
  const node = { id: "u-x", domain: "tech", topics: ["t-energy"], name: "history" };
  assert.deepEqual(renameRefs(node, table), { id: "u-x", domain: "d-eng", topics: ["t-energy"], name: "history" });
  const topic = { id: "u-t", domain: "history", members: [{ id: "fossil-energy" }, { id: "u-x" }] };
  assert.deepEqual(renameRefs(topic, table).members, [{ id: "n-fossil" }, { id: "u-x" }]);
  assert.equal(renameRefs({ ts: "t", node: "fossil-energy", action: "open" }, table).node, "n-fossil");
});

test("loadUserPack: a pack written for Atlas 0.1.0 is read with migrated ids (files untouched)", async () => {
  const { mkdtempSync, mkdirSync, writeFileSync, readFileSync } = await import("node:fs");
  const { tmpdir } = await import("node:os");
  const { join } = await import("node:path");
  const { loadUserPack } = await import("../engine/lib/userpack");
  const { mergeOverlay } = await import("../engine/lib/overlay");
  const dir = mkdtempSync(join(tmpdir(), "agl-mig-"));
  mkdirSync(join(dir, "overlay")); mkdirSync(join(dir, "log"));
  writeFileSync(join(dir, "pack.json"), JSON.stringify({ schema: "learn.userpack.v1", owner: "t", atlas_version: "0.1.0", engine_version: "0.1.0" }));
  writeFileSync(join(dir, "overlay", "nodes.jsonl"), JSON.stringify({ id: "u-n", kind: "concept", name: "n", summary: "s", status: "stub", domain: "tech", topics: ["t-computing"] }) + "\n");
  const logLine = JSON.stringify({ ts: "2026-10-18T08:00:00+08:00", node: "transformer", action: "open" }) + "\n";
  writeFileSync(join(dir, "log", "mac.jsonl"), logLine);
  const pack = loadUserPack(dir);
  assert.deepEqual(pack.problems, []);
  assert.equal(pack.nodes[0].domain, "d-eng");
  assert.deepEqual(pack.nodes[0].topics, ["t-cs"]);
  assert.equal(pack.log[0].node, "n-transformer");
  assert.deepEqual(mergeOverlay(loadAtlas(), pack).diagnostics.errors, []);
  assert.equal(readFileSync(join(dir, "log", "mac.jsonl"), "utf-8"), logLine);
});
