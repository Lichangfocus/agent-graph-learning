# 云端 → Mac 同步机制（学者 / Scholar）

**原则：云端（box）为主，Mac 只跟随。** Mac 每 10 分钟把云端最新集成的工作快进拉到本地，供 focus 本地运行和调试；不会丢弃 focus 的任何本地修改。

## 分支策略

| 分支 | 含义 | 谁写 |
|---|---|---|
| `main` | 已 review 合入的稳定版 | 只由 focus 合入 PR |
| `cloud/grok/TASK-xxx-*` | 每个任务的工作分支（可叠加），对应一个 PR | box 上的 worker |
| `dev/latest` | **云端最新已集成工作**，Mac 跟随此分支 | 只由 `publish-latest.sh` 更新 |

`dev/latest` 不合入 `main`，也不开 PR；它只是一个"指针"。

## box 端：每个 worker 推送后必须执行

```bash
git push origin <你的工作分支>
04-开发/sync/publish-latest.sh          # 把当前 HEAD 发布到 dev/latest
```

- 只能发布已推送到 origin 的提交。
- 默认要求快进（新提交是当前 `dev/latest` 的后代）。叠加分支（如 TASK-002 基于 TASK-001）天然满足；
  并行分支请先 `git merge origin/dev/latest` 再发布。确需回退时用 `FORCE=1`。

## Mac 端

- 目录：真实位置 `~/Scholar/`（`agent-graph-learning/` 与 `learn-data/` 并列）；桌面上的 `~/Desktop/学者` 和旧路径 `~/code/learn` 都是指向它的软链接，日常从桌面进入即可。
  - 为什么不直接放桌面：macOS 隐私保护（TCC）禁止 launchd 启动的 `/bin/bash` 访问 `~/Desktop`（实测 `Operation not permitted`，exit 126）。放在家目录 + 桌面软链接，无需给 bash 开「完全磁盘访问权限」。
- 脚本：`~/Scholar/.sync/pull.sh`（源文件 `04-开发/sync/mac/pull.sh`，每轮自动自更新）。
- launchd：`com.lichang.scholar-sync`，`StartInterval=600` + `RunAtLoad`，安装用 `04-开发/sync/mac/install.sh`。
- 每轮：对框架仓库（`dev/latest`）和 `learn-data`（`main`）分别 `fetch` →
  - 有未提交的本地改动 → **跳过**，写日志和 `.sync/NOTICE-<仓库>.txt`；
  - 可快进 → `merge --ff-only`；
  - 云端改写了分支且本地没有独有提交 → 对齐；有独有提交 → 跳过；
  - `package-lock.json` 变化（或缺 `node_modules`）→ `npm ci`。
- 日志：`~/Desktop/学者/.sync/sync.log`。
- 暂停：`touch ~/Desktop/学者/.sync/PAUSE`；恢复：`rm ~/Desktop/学者/.sync/PAUSE`。
  彻底停用：`launchctl bootout gui/$(id -u)/com.lichang.scholar-sync`。
