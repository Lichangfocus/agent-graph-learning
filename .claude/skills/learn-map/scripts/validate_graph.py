#!/usr/bin/env python3
"""校验学习地图的图谱数据（site.json 或注入前的数据对象）。

用法: python3 validate_graph.py <site.json>
退出码: 0 = 通过（可能有警告）, 1 = 有必须修复的错误
"""
import json
import sys
from collections import defaultdict

def main(path):
    errors, warnings = [], []
    try:
        site = json.load(open(path, encoding='utf-8'))
    except Exception as e:
        print(f"ERROR: JSON 无法解析: {e}")
        return 1

    if not site.get('reorder'):
        warnings.append("缺少 site.reorder（顺序重构声明——这张图和教科书顺序差在哪、为什么）")
    for field in ('id', 'title', 'nodes', 'edges'):
        if field not in site:
            errors.append(f"缺少顶层字段: {field}")
    nodes = site.get('nodes', [])
    edges = site.get('edges', [])

    ids = [n.get('id') for n in nodes]
    if len(ids) != len(set(ids)):
        errors.append("存在重复的节点 id")
    idset = set(ids)

    for n in nodes:
        for field in ('id', 'name', 'icon', 'evidence', 'screens'):
            if field not in n:
                errors.append(f"节点 {n.get('id','?')} 缺少字段 {field}")
        if not n.get('evidence'):
            warnings.append(f"节点 {n.get('id')} 没有掌握证据 evidence")
        c = n.get('canon')
        if not c:
            warnings.append(f"节点 {n.get('id')} 缺少原始知识层 canon（课本原文/出处）")
        else:
            for cf in ('term', 'formal', 'source'):
                if not c.get(cf):
                    warnings.append(f"节点 {n.get('id')} 的 canon 缺少 {cf}")
        quizzes = [s for s in n.get('screens', []) if 'quiz' in s]
        if not quizzes:
            errors.append(f"节点 {n.get('id')} 没有任何 quiz 屏（无法做掌握确认）")
        for s in quizzes:
            q = s['quiz']
            oks = [o for o in q.get('opts', []) if o.get('ok')]
            if len(oks) != 1:
                errors.append(f"节点 {n.get('id')} 的 quiz「{q.get('q','?')[:20]}…」必须恰好 1 个正确选项")

    hard_adj = defaultdict(set)
    all_adj = defaultdict(set)
    for e in edges:
        f, t = e.get('from'), e.get('to')
        if f not in idset or t not in idset:
            errors.append(f"边 {f}->{t} 引用了不存在的节点")
            continue
        if f == t:
            errors.append(f"自环: {f}")
        if e.get('type') not in ('hard', 'soft', 'cross'):
            errors.append(f"边 {f}->{t} 的 type 必须是 hard/soft/cross")
        all_adj[f].add(t)
        if e.get('type') == 'hard':
            hard_adj[f].add(t)

    # 环检测（全边）
    WHITE, GRAY, BLACK = 0, 1, 2
    color = {i: WHITE for i in idset}
    cycle = []
    def visit(u, path):
        color[u] = GRAY
        for v in all_adj[u]:
            if color.get(v) == GRAY:
                cycle.append(path + [v])
                return False
            if color.get(v) == WHITE and not visit(v, path + [v]):
                return False
        color[u] = BLACK
        return True
    for i in idset:
        if color[i] == WHITE and not visit(i, [i]):
            break
    if cycle:
        errors.append(f"图中有环: {' -> '.join(cycle[0])}")

    # 起点检查：至少一个节点没有硬先修
    hard_targets = {t for f, ts in hard_adj.items() for t in ts}
    starts = idset - hard_targets
    if not starts:
        errors.append("没有任何起点节点（每个节点都有硬先修，孩子无从开始）")

    # 年龄单调性（硬边上，先修的起始年龄不应大于后继）
    age = {n['id']: n.get('ageStart') for n in nodes if n.get('ageStart') is not None}
    for f, ts in hard_adj.items():
        for t in ts:
            if f in age and t in age and age[f] > age[t]:
                warnings.append(f"硬边 {f}->{t}: 先修的年龄({age[f]})大于后继({age[t]})，检查方向是否反了")

    # 硬边传递冗余
    def reach(a, b, adj, skip):
        seen, stack = set(), [a]
        while stack:
            x = stack.pop()
            for y in adj[x]:
                if (x, y) == skip:
                    continue
                if y == b:
                    return True
                if y not in seen:
                    seen.add(y)
                    stack.append(y)
        return False
    for f, ts in list(hard_adj.items()):
        for t in ts:
            if reach(f, t, hard_adj, (f, t)):
                warnings.append(f"硬边 {f}->{t} 是传递冗余（已有其他硬路径），建议删除或降为 soft")

    # 孤立节点
    touched = set(all_adj) | {t for ts in all_adj.values() for t in ts}
    for i in idset - touched:
        warnings.append(f"节点 {i} 没有任何边，孤立在地图上")

    print(f"节点 {len(nodes)} 个，边 {len(edges)} 条，起点 {len(starts)} 个")
    for w in warnings:
        print(f"WARN: {w}")
    for e in errors:
        print(f"ERROR: {e}")
    print("结果:", "FAIL" if errors else "PASS")
    return 1 if errors else 0

if __name__ == '__main__':
    if len(sys.argv) != 2:
        print(__doc__)
        sys.exit(1)
    sys.exit(main(sys.argv[1]))
