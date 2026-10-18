# atlas/migrations

Atlas 改 id 时加一张 `<from>-to-<to>.json`（`{from, to, rename: {旧id: 新id}}`）。
读数据包时（`engine/lib/migrate.ts`）按 `pack.json` 的 `atlas_version` 在内存里改写引用：日志文件不改写、仍只追加。

| 文件 | 说明 |
|---|---|
| `0.1.0-to-0.2.0.json` | TASK-002：换成 scholar-engine world-map v3 的 id 体系（38 个改名；同名的 id 不列） |
