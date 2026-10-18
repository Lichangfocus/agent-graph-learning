import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { handleLogGet, handleLogPost } from "../engine/lib/log-api";

const tmp = () => mkdtempSync(join(tmpdir(), "log-api-"));
const ev = (ts: string, node = "s1", action = "open") => ({ ts, node, action });

test("GET：无 LEARN_DATA_DIR 不可写，有数据包可写", () => {
  const dir = tmp();
  try {
    assert.equal((handleLogGet({ LEARN_DEVICE: "t1" }).body as { writable: boolean }).writable, false);
    const r = handleLogGet({ LEARN_DATA_DIR: dir, LEARN_DEVICE: "t1" });
    assert.deepEqual(r.body, { writable: true, device: "t1", file: "log/t1.jsonl" });
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("POST：写入有效事件、重复跳过、无效拒绝，忽略客户端 device", () => {
  const dir = tmp();
  const env = { LEARN_DATA_DIR: dir, LEARN_DEVICE: "t1" };
  try {
    const events = [ev("2026-01-01T00:00:00Z"), { ...ev("2026-01-02T00:00:00Z"), device: "evil" }, ev("not-a-date"), ev("2026-01-03T00:00:00Z", "s1", "bogus")];
    const r1 = handleLogPost({ events }, env);
    assert.equal(r1.status, 200);
    assert.deepEqual(r1.body, { written: 2, skipped: 0, rejected: 2, file: "log/t1.jsonl" });
    const lines = readFileSync(join(dir, "log", "t1.jsonl"), "utf-8").trim().split("\n").map((l) => JSON.parse(l));
    assert.equal(lines.length, 2);
    assert.ok(lines.every((l) => l.device === "t1"));
    const r2 = handleLogPost({ events }, env);
    assert.deepEqual(r2.body, { written: 0, skipped: 2, rejected: 2, file: "log/t1.jsonl" });
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("POST：示例包 409，超过 500 条 413", () => {
  const r = handleLogPost({ events: [ev("2026-01-01T00:00:00Z")] }, {});
  assert.equal(r.status, 409);
  const dir = tmp();
  try {
    const many = Array.from({ length: 501 }, (_, i) => ev(new Date(i * 1000).toISOString()));
    assert.equal(handleLogPost({ events: many }, { LEARN_DATA_DIR: dir, LEARN_DEVICE: "t1" }).status, 413);
    assert.equal(existsSync(join(dir, "log")), false);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
