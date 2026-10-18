#!/usr/bin/env bash
# publish-latest.sh — 把「当前已集成的最新云端工作」发布到 GitHub 分支 dev/latest。
# focus 的 Mac 每 10 分钟从 dev/latest 快进拉取（见同目录 README.md）。
#
# 用法（在 box 上，任一 worker 推送完自己的分支后执行）：
#   04-开发/sync/publish-latest.sh            # 发布当前 HEAD
#   04-开发/sync/publish-latest.sh <ref>      # 发布指定提交/分支
#   FORCE=1 04-开发/sync/publish-latest.sh    # 允许非快进（例如回滚到更早的分支）
#
# 规则：
#  - 只发布已推送到 origin 的提交（避免 Mac 拿到 box 上没人能复现的东西）。
#  - 默认要求新提交是 dev/latest 的后代（快进），保护 Mac 端的 ff-only 拉取；
#    非快进时 Mac 端会记录 “非快进，跳过/重置” 提示，见 README。
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"
REF="${1:-HEAD}"
SHA="$(git rev-parse --verify "$REF^{commit}")"
git fetch -q origin
if [ -z "$(git branch -r --contains "$SHA" | grep -v 'origin/dev/latest' || true)" ]; then
  echo "✗ $SHA 还没推送到任何 origin 分支。先 git push 你的工作分支再发布。" >&2
  exit 1
fi
if git rev-parse -q --verify origin/dev/latest >/dev/null; then
  CUR="$(git rev-parse origin/dev/latest)"
  if [ "$CUR" = "$SHA" ]; then echo "= dev/latest 已是 $SHA"; exit 0; fi
  if ! git merge-base --is-ancestor "$CUR" "$SHA"; then
    if [ "${FORCE:-0}" != "1" ]; then
      echo "✗ $SHA 不是当前 dev/latest ($CUR) 的后代。请先把 dev/latest 合进你的分支，或 FORCE=1 强制。" >&2
      exit 1
    fi
    echo "! 非快进发布（FORCE=1）"
  fi
fi
git push -f origin "$SHA:refs/heads/dev/latest"
echo "✓ dev/latest -> $SHA ($(git log -1 --format=%s "$SHA"))"
