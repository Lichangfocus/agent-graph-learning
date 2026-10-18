#!/bin/bash
# 学者（Scholar）Mac 端同步：云端（box）为主，定时把最新代码快进拉到本地。
# 由 launchd（com.lichang.scholar-sync）每 10 分钟 + 登录时运行；也可手动运行。
# 原则：只在工作区干净时快进；有本地改动就跳过并记日志，绝不丢弃 focus 的修改。
#   暂停：touch "$SCHOLAR_HOME/.sync/PAUSE"   恢复：rm 该文件
set -uo pipefail
export PATH="$HOME/.local/share/node-v24.19.0/bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin"
export GIT_TERMINAL_PROMPT=0
SCHOLAR_HOME="${SCHOLAR_HOME:-$HOME/Desktop/学者}"
SYNC_DIR="$SCHOLAR_HOME/.sync"
LOG="$SYNC_DIR/sync.log"
mkdir -p "$SYNC_DIR"
log() { echo "$(date '+%F %T') $*" >> "$LOG"; }

# 日志只保留最近 3000 行
if [ -f "$LOG" ] && [ "$(wc -l < "$LOG")" -gt 4000 ]; then tail -n 3000 "$LOG" > "$LOG.tmp" && mv "$LOG.tmp" "$LOG"; fi

if [ -e "$SYNC_DIR/PAUSE" ]; then log "PAUSE 文件存在，跳过本轮"; exit 0; fi
LOCK="$SYNC_DIR/.lock"
if ! mkdir "$LOCK" 2>/dev/null; then
  # 超过 30 分钟的锁视为残留
  if [ -n "$(find "$LOCK" -maxdepth 0 -mmin +30 2>/dev/null)" ]; then rmdir "$LOCK"; mkdir "$LOCK"; else log "上一轮仍在运行，跳过"; exit 0; fi
fi
trap 'rmdir "$LOCK" 2>/dev/null' EXIT

STATUS=0
# sync_repo <目录> <分支> <有 package-lock 时是否 npm ci: yes/no>
sync_repo() {
  local dir="$1" branch="$2" npm="$3" name; name="$(basename "$dir")"
  if [ ! -d "$dir/.git" ]; then log "[$name] ✗ 不是 git 仓库：$dir"; STATUS=1; return; fi
  cd "$dir" || { log "[$name] ✗ 无法进入 $dir"; STATUS=1; return; }
  if ! out="$(git fetch --prune origin 2>&1)"; then log "[$name] ✗ fetch 失败：$out"; STATUS=1; return; fi
  local remote="origin/$branch"
  if ! git rev-parse -q --verify "$remote" >/dev/null; then log "[$name] ✗ 远端没有 $remote"; STATUS=1; return; fi
  if [ -n "$(git status --porcelain --untracked-files=no)" ]; then
    log "[$name] ⚠ 有本地未提交改动，跳过同步（不会动你的修改）。改完提交/暂存后会自动恢复。"
    echo "$(date '+%F %T') $name 有本地改动，已跳过同步" > "$SYNC_DIR/NOTICE-$name.txt"
    return
  fi
  local cur; cur="$(git symbolic-ref -q --short HEAD || echo DETACHED)"
  if [ "$cur" != "$branch" ]; then
    if git show-ref -q --verify "refs/heads/$branch"; then git checkout -q "$branch" 2>>"$LOG" || { log "[$name] ✗ 切换到 $branch 失败"; STATUS=1; return; }
    else git checkout -q -b "$branch" --track "$remote" 2>>"$LOG" || { log "[$name] ✗ 创建 $branch 失败"; STATUS=1; return; }; fi
    log "[$name] 已从 $cur 切换到 $branch"
  fi
  local old new; old="$(git rev-parse HEAD)"; new="$(git rev-parse "$remote")"
  if [ "$old" = "$new" ]; then rm -f "$SYNC_DIR/NOTICE-$name.txt"; log "[$name] = 已是最新 ${new:0:7}"; return; fi
  if git merge-base --is-ancestor HEAD "$remote"; then
    git merge -q --ff-only "$remote" 2>>"$LOG" || { log "[$name] ✗ 快进失败（可能有未跟踪文件冲突）"; STATUS=1; return; }
  else
    # 非快进：云端改写了分支。只有当本地没有独有提交时才对齐，否则跳过保护 focus 的提交。
    local unique; unique="$(git rev-list HEAD --not --remotes=origin | wc -l | tr -d ' ')"
    if [ "$unique" != "0" ]; then
      log "[$name] ⚠ 本地有 $unique 个未推送的提交且云端分支被改写，跳过（请手动处理或推送到你自己的分支）"
      echo "$(date '+%F %T') $name 有未推送提交，已跳过同步" > "$SYNC_DIR/NOTICE-$name.txt"
      return
    fi
    git reset -q --keep "$remote" 2>>"$LOG" || { log "[$name] ✗ 对齐 $remote 失败"; STATUS=1; return; }
    log "[$name] ! 云端分支被改写，本地无独有提交，已对齐"
  fi
  rm -f "$SYNC_DIR/NOTICE-$name.txt"
  log "[$name] ✓ ${old:0:7} → ${new:0:7}  $(git log -1 --format=%s | cut -c1-80)"
  if [ "$npm" = yes ] && [ -f package-lock.json ]; then
    if [ ! -d node_modules ] || ! git diff --quiet "$old" "$new" -- package-lock.json; then
      log "[$name] package-lock 有变化，运行 npm ci …"
      if npm ci --no-audit --no-fund >>"$LOG" 2>&1; then log "[$name] ✓ npm ci 完成"; else log "[$name] ✗ npm ci 失败"; STATUS=1; fi
    fi
  fi
}

log "—— 开始同步"
sync_repo "$SCHOLAR_HOME/agent-graph-learning" "${FRAMEWORK_BRANCH:-dev/latest}" yes
sync_repo "$SCHOLAR_HOME/learn-data" main no
# 同步脚本自身随框架仓库更新
SRC="$SCHOLAR_HOME/agent-graph-learning/04-开发/sync/mac/pull.sh"
if [ -f "$SRC" ] && ! cmp -s "$SRC" "$SYNC_DIR/pull.sh"; then cp "$SRC" "$SYNC_DIR/pull.sh.new" && chmod +x "$SYNC_DIR/pull.sh.new" && mv "$SYNC_DIR/pull.sh.new" "$SYNC_DIR/pull.sh" && log "pull.sh 已自更新"; fi
log "—— 结束（status=${STATUS}）"
exit $STATUS
