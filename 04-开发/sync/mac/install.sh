#!/bin/bash
# 在 focus 的 Mac 上安装/重装同步 launchd agent。幂等。
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
HOME_DIR="$HOME/Desktop/学者"
mkdir -p "$HOME_DIR/.sync"
cp "$HERE/pull.sh" "$HOME_DIR/.sync/pull.sh"; chmod +x "$HOME_DIR/.sync/pull.sh"
PL="$HOME/Library/LaunchAgents/com.lichang.scholar-sync.plist"
sed "s#__HOME__#$HOME#g" "$HERE/com.lichang.scholar-sync.plist" > "$PL"
plutil -lint "$PL"
launchctl bootout "gui/$(id -u)/com.lichang.scholar-sync" 2>/dev/null || true
launchctl bootstrap "gui/$(id -u)" "$PL"
echo "✓ 已安装 com.lichang.scholar-sync（每 10 分钟 + 登录时）"
