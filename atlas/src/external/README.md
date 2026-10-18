# atlas/src/external · 外部构建快照

| 文件 | 来源 | 快照时间 |
|---|---|---|
| `scholar-engine-world-map.v3.json` | scholar-engine `knowledge/world-map.json`（另一个 worker 构建的电影化地图数据，schema `version: 3`：10 领域 · 33 topic · 47 节点 · 138 边） | 2026-10-18 15:41（北京时间） |

- 这是**原样快照**，不参与 `npm run atlas:build`，`atlas/world-map.json`（`learn.atlas.v1`）不受影响。
- 两边 schema 有差异（`home_topic` vs `topics[]`、节点字段等），直接 `--from` 只能并入部分边并产生警告，所以 TASK-002 先写字段映射，再并入真源 `atlas/src/`。
- 试并：`npm run atlas:build -- --from atlas/src/external/scholar-engine-world-map.v3.json`（会改写 `atlas/world-map.json`，试完 `git checkout atlas/world-map.json`）。
- 许可：与 Atlas 相同，CC BY-SA 4.0。
