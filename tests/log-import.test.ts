import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { importExport } from "../engine/lib/log-import";
import { loadUserPack } from "../engine/lib/userpack";

const tmp = () => mkdtempSync(join(tmpdir(), "log-import-"));
const opts = (dir: string) => ({ device: "browser", dir });

test("jsonl 导入并去重，坏行计入 invalid 不抛错", () => {
  const dir = tmp();
  try {
    const text = [
      JSON.stringify({ ts: "2026-01-01T00:00:00Z", node: "s1", action: "open" }),
      "{坏行",
      JSON.stringify({ ts: "2026-01-02T00:00:00Z", node: "s1", action: "nope" }),
    ].join("\n");
    const s = importExport(text, "a.jsonl", opts(dir));
    assert.deepEqual(s.events, { imported: 1, duplicates: 0, invalid: 2 });
    const again = importExport(text, "a.jsonl", opts(dir));
    assert.deepEqual(again.events, { imported: 0, duplicates: 1, invalid: 2 });
    assert.equal(readFileSync(join(dir, "log", "browser.jsonl"), "utf-8").trim().split("\n").length, 1);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("learn.export.v1：日志 + 专题 + 连线落盘，数据包无 problems", () => {
  const dir = tmp();
  try {
    const text = JSON.stringify({
      schema: "learn.export.v1",
      log: [{ ts: "2026-01-01T00:00:00Z", node: "s1", action: "lit" }],
      topics: [{ id: "u-t1", domain: "history", name: "我的专题", members: [{ id: "s1" }] }],
      edges: [{ id: "u-e1", src: "s1", dst: "s2", kind: "related", note: "个人判断", claim_type: "个人判断" }],
    });
    const s = importExport(text, "x.json", opts(dir));
    assert.deepEqual([s.events.imported, s.topics.imported, s.edges.imported], [1, 1, 1]);
    const again = importExport(text, "x.json", opts(dir));
    assert.deepEqual([again.events.duplicates, again.topics.duplicates, again.edges.duplicates], [1, 1, 1]);
    const pack = loadUserPack(dir);
    assert.deepEqual(pack.problems, []);
    assert.equal(pack.topics.length, 1);
    assert.equal(pack.edges.length, 1);
    assert.equal(pack.log.length, 1);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("旧版 scholar.map.user.v1 转换：丢弃 null、未知动作与多余键", () => {
  const dir = tmp();
  try {
    const text = JSON.stringify({
      schema: "scholar.map.user.v1",
      log: [
        { ts: "2026-01-01T00:00:00Z", node: "s1", action: "quiz", payload: null },
        { ts: "2026-01-01T00:00:01Z", node: null, action: "note", payload: { a: 1 } },
        { ts: "2026-01-01T00:00:02Z", node: "s1", action: "mystery", payload: null },
      ],
      topics: [{ id: "u-old", domain: "history", name: "旧专题", description: "说明", kind: "x", status: "y", members: ["s1", "s2"] }],
      edges: [{ id: "u-oe", src: "s1", dst: "s2", kind: "prereq", note: "n", claim_type: "个人判断", status: "z" }],
    });
    const s = importExport(text, "old.json", opts(dir));
    assert.deepEqual(s.events, { imported: 2, duplicates: 0, invalid: 1 });
    assert.equal(s.topics.imported, 1);
    assert.equal(s.edges.imported, 1);
    const pack = loadUserPack(dir);
    assert.deepEqual(pack.problems, []);
    assert.equal(pack.topics[0].desc, "说明");
    assert.deepEqual(pack.topics[0].members, [{ id: "s1" }, { id: "s2" }]);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("CLI：npm run log / log:import 不带 --device 时第一个参数不会被吞掉", async () => {
  const { spawnSync } = await import("node:child_process");
  const { writeFileSync } = await import("node:fs");
  const dir = tmp();
  try {
    const env = { ...process.env, LEARN_DATA_DIR: dir, LEARN_DEVICE: "cli" };
    const run = (script: string, args: string[]) => spawnSync(process.execPath, ["--import", "tsx", script, ...args], { env, encoding: "utf-8" });
    const a = run("engine/pipeline/log-event.ts", ["s1", "open"]);
    assert.equal(a.status, 0, a.stderr);
    assert.match(readFileSync(join(dir, "log", "cli.jsonl"), "utf-8"), /"node":"s1","action":"open"/);
    const f = join(dir, "browser-export.jsonl");
    writeFileSync(f, JSON.stringify({ ts: "2026-10-18T08:00:00Z", node: "s2", action: "lit", payload: { via: "quiz" } }) + "\n");
    const b = run("engine/pipeline/log-import.ts", [f]);
    assert.equal(b.status, 0, b.stderr);
    assert.match(readFileSync(join(dir, "log", "browser.jsonl"), "utf-8"), /"node":"s2","action":"lit"/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
