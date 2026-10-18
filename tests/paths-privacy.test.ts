import assert from "node:assert/strict";
import { test } from "node:test";
import { join, resolve } from "node:path";
import { DEMO_PACK_DIR, REPO_ROOT, dataDir, usingUserData } from "../engine/lib/paths";
import { privacyViolations } from "../engine/lib/privacy";

test("LEARN_DATA_DIR: defaults to demo pack; relative paths resolve against the framework root", () => {
  assert.equal(dataDir({}), DEMO_PACK_DIR);
  assert.equal(usingUserData({}), false);
  assert.equal(dataDir({ LEARN_DATA_DIR: "../learn-data" }), resolve(REPO_ROOT, "../learn-data"));
  assert.equal(dataDir({ LEARN_DATA_DIR: "/tmp/pack" }), "/tmp/pack");
  assert.equal(usingUserData({ LEARN_DATA_DIR: "../learn-data" }), true);
  assert.equal(DEMO_PACK_DIR, join(REPO_ROOT, "examples", "demo-pack"));
});

test("privacy: personal data paths are rejected outside examples/demo-pack and 历史/", () => {
  assert.deepEqual(privacyViolations([
    "profile/learner-profile.yaml", "log/mac.jsonl", "units-private/u01/source.md", "course-q4-2026.md",
    "examples/demo-pack/profile/learner-profile.yaml", "engine/lib/atlas.ts", "atlas/world-map.json", ".env", ".env.example",
  ]), ["profile/learner-profile.yaml", "log/mac.jsonl", "units-private/u01/source.md", "course-q4-2026.md", ".env"]);
});
