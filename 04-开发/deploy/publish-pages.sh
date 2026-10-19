#!/usr/bin/env bash
# publish-pages.sh — 构建公开站点并发布到 gh-pages 分支（GitHub Pages 来源 = gh-pages /）。
# 用法（box 上，发布 dev/latest 之后执行）：
#   04-开发/deploy/publish-pages.sh            # 构建当前 HEAD
# 规则：
#  - 必须在干净工作区、且 HEAD 已推送到 origin（线上内容可复现）。
#  - 永远不带 LEARN_DATA_DIR（site:build 自己也会拒绝）。
#  - gh-pages 是只放构建产物的孤立分支，每次一个提交，提交说明带源提交号。
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"
if [ -n "$(git status --porcelain --untracked-files=no)" ]; then echo "✗ 工作区有未提交改动，先提交再发布。" >&2; exit 1; fi
SHA="$(git rev-parse HEAD)"
git fetch -q origin
if [ -z "$(git branch -r --contains "$SHA")" ]; then echo "✗ $SHA 还没推送到 origin。" >&2; exit 1; fi
OUT="$(mktemp -d)/site"
env -u LEARN_DATA_DIR SITE_OUT="$OUT" npm run -s site:build
TMP="$(mktemp -d)"
git -C "$TMP" init -q -b gh-pages
cp -a "$OUT"/. "$TMP"/
git -C "$TMP" add -A
git -C "$TMP" -c user.name="Grok Bot (学者)" -c user.email="lichangfocus@users.noreply.github.com" commit -q -m "pages: $(git log -1 --format='%h %s' "$SHA")"
git -C "$TMP" -c http.version=HTTP/1.1 -c http.postBuffer=524288000 push -q -f "$(git remote get-url origin)" gh-pages:gh-pages
echo "✓ gh-pages ← $SHA；约 1 分钟后生效：https://lichangfocus.github.io/agent-graph-learning/"
