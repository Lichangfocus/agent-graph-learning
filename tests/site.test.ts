import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { REPO_ROOT } from "../engine/lib/paths";

const SCRIPT = join(REPO_ROOT, "engine/pipeline/build-site.ts");

function runSite(env: NodeJS.ProcessEnv) {
  return spawnSync(process.execPath, ["--import", "tsx", SCRIPT], { cwd: REPO_ROOT, env, encoding: "utf-8" });
}

test("site:build: example pack → static site with star map, legacy maps/my and Pages meta files", () => {
  const out = mkdtempSync(join(tmpdir(), "agl-site-"));
  try {
    const env: NodeJS.ProcessEnv = { ...process.env, SITE_OUT: out };
    delete env.LEARN_DATA_DIR;
    const r = runSite(env);
    assert.equal(r.status, 0, r.stderr || r.stdout);
    assert.match(r.stdout, /节点 47，已点亮 0/, "在线版只含公共 Atlas（47 节点），不带示例包的点亮记录");
    const index = readFileSync(join(out, "index.html"), "utf-8");
    assert.ok(index.includes("学者 · 人类知识星图"));
    assert.ok(index.includes('rel="manifest"'));
    assert.ok(!index.includes('src="/') && !index.includes('href="/'), "首页资源路径必须是相对路径");
    for (const f of ["maps/ai-training/index.html", "my/index.html", ".nojekyll", "404.html", "version.json", "manifest.webmanifest", "favicon.svg"]) {
      assert.ok(existsSync(join(out, f)), `缺少 ${f}`);
    }
    const version = JSON.parse(readFileSync(join(out, "version.json"), "utf-8"));
    assert.ok(version.nodes > 0 && typeof version.atlasVersion === "string");
  } finally {
    rmSync(out, { recursive: true, force: true });
  }
});

test("site:build: refuses to run with LEARN_DATA_DIR set", () => {
  const out = mkdtempSync(join(tmpdir(), "agl-site-"));
  try {
    const r = runSite({ ...process.env, SITE_OUT: out, LEARN_DATA_DIR: "/tmp/x" });
    assert.notEqual(r.status, 0);
    assert.match(r.stderr, /LEARN_DATA_DIR/);
  } finally {
    rmSync(out, { recursive: true, force: true });
  }
});
