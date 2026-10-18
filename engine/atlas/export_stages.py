#!/usr/bin/env python3
"""把 engine/roadmap/stages.py（人类文明 11 阶段，Python 数据源）导出成 atlas/src/history-stages.json。
只用标准库。npm run atlas:stages"""
import json, os, sys
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.join(ROOT, "engine", "roadmap"))
import stages  # noqa: E402

out = {"stages": stages.STAGES, "drivers": getattr(stages, "DRIVERS", [])}
dst = os.path.join(ROOT, "atlas", "src", "history-stages.json")
os.makedirs(os.path.dirname(dst), exist_ok=True)
with open(dst, "w", encoding="utf-8") as f:
    json.dump(out, f, ensure_ascii=False, indent=1, default=list)
print(f"wrote {dst}: {len(stages.STAGES)} stages")
