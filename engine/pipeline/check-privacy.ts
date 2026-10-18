/**
 * npm run check:privacy —— 公开框架仓库不得出现个人数据（03-spec §4 隐私规则）。
 * 检查 git 跟踪的文件：禁止 profile/、log/、units-private/、annotations/ 等数据包路径（examples/demo-pack 除外），
 * 禁止已知的个人文件名、被跟踪的符号链接。
 */
import { execFileSync } from "node:child_process";
import { REPO_ROOT } from "../lib/paths";
import { privacyViolations } from "../lib/privacy";

const files = execFileSync("git", ["ls-files", "-z"], { cwd: REPO_ROOT, encoding: "utf-8" }).split("\0").filter(Boolean);
const symlinks = execFileSync("git", ["ls-files", "-s"], { cwd: REPO_ROOT, encoding: "utf-8" })
  .split("\n").filter((l) => l.startsWith("120000 ")).map((l) => l.split("\t")[1] + "（符号链接，可能指向数据包）");
const bad = [...privacyViolations(files), ...symlinks];
if (bad.length) {
  console.error(`隐私检查 FAIL：以下路径属于个人数据包，应放进私有 learn-data：\n${bad.map((p) => "  - " + p).join("\n")}`);
  process.exitCode = 1;
} else console.log(`隐私检查 PASS（${files.length} 个跟踪文件）`);
