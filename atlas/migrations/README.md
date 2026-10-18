# atlas/migrations

节点改名 / 合并时在这里加迁移表（`YYYY-MM-DD-<说明>.json`：`{"from": "old-id", "to": "new-id"}` 数组），
用户数据包里的引用按迁移表重写，不断链。v0.1 暂无迁移。
