# 05 · 测试

按《体验验证机制 v1》分两块：

| | **A 单元 / 自动化** | **B 真实数据测试** |
|---|---|---|
| 内容 | `tests/*.test.ts` 单元测试；脚本化 UI 场景（Playwright，`自动化/scenarios/web/`）；代码断言；视觉基线 | 用 focus 的私有数据包（画像、日志、私人单元）跑全量测试与真实学习流程 |
| 数据 | `examples/demo-pack`、`units/demo-hokusai`、种子数据 | `LEARN_DATA_DIR=../learn-data`（box 或 Mac） |
| 在哪跑 | 云端 box / CI | box（focus 已授权学者读写 learn-data）或 Mac；产物只进 learn-data，不进公开仓库 |
| 产物 | `自动化/reports/` 精选报告入 Git；`自动化/runs/` 不入 Git | `learn-data/builds/`；本仓库 `真实数据测试/记录/` 只写结论 |

- 命令、用例、人工验证清单、运行记录：[单元测试.md](单元测试.md)。
- 体验验证配置：[体验验证/config.yaml](体验验证/config.yaml)；预期锁 `体验验证/expectations.lock.json`（只由 focus 更新）。
- 流程：④ → ⑤（`npm test` + `npm run check` 全绿）→ ⑤.5（界面类改动）→ ⑥ focus review。AI 判定只是建议，MV 项由 focus 勾。
- 闸门：判定 ≤ $1/次；computer use 探索 ≤ 50 步 / $3；禁点对外发送、支付、删除、发布。
