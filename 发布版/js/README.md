# WIS 开发版模块说明

当前基线：WIS 0.1.6.2，传统 `<script>` + `window.WIS`，无 bundler，支持 `file://`。当前 build 以 `core/build-config.js` 为准。

长期约束见 `../AGENTS.md`，当前项目状态见 `../AGENT_CONTEXT.md`，测试见 `../TESTING.md`。

## 1. 目录职责

| 目录 | 当前职责 |
| --- | --- |
| `core/` | BigNum 适配、配置、State/Save、资源访问、Runtime/Evaluation、Effects/Sources、积分器、通用账本/概率/重置。仍有少量历史领域桥接。 |
| `power/` | Scale 行动/强化/公式/来源、Googol/softcap 相关逻辑、ScaleKernel。 |
| `cultivation/` | 仙道/修真资源、能力/境界、探寻与天劫、Exploration progress。 |
| `meta/` | Achievement、Challenge、BigNumbers、Treasure inventory/progress/rules/ledger。 |
| `simulation/` | Online/Offline 调度、FixedSegment、ResourceGroups、FixedSources、predictor/executor、ResourceEvolution、checkpoint、compiled micro、time/recovery。 |
| `ui/` | 中央格式化、SourcePreview、BigNumbers/Xiuzhen/Treasure 领域 UI、App 渲染与交互。 |
| `game.js` | Save/load、Runtime bind、模块组装、Simulation/UI context、主循环启动。 |

大文件 `immortal-logic.js`、`scale-logic.js`、`ui/app.js`、`simulation/offline.js` 当前不是自动拆分待办。

## 2. 版本轴

| 名称 | 当前值 | 含义 |
| --- | --- | --- |
| gameVersion | `0.1.6.2` | 玩家可见开发版本 |
| schemaVersion | `64` | Save envelope/State schema |
| buildId | `dev-0.1.6.2-qi-threshold-final-20260923` | 开发构建与静态缓存标识 |
| settlementRuleVersion | `1` | 持久化固定结算规则版本 |

Build mode 为 development，调速和公式详情入口开启。

## 3. 脚本装配

`index.html` 是唯一人工脚本成员/顺序真源，`js/script-manifest.json` 是生成结果。当前清单 71 个脚本。

大致顺序：

```text
build config / Decimal vendor
→ namespace / BigNum / common math / treasure rules
→ config / registry / integration / runtime / state / save / resources
→ Effects / Sources / power / cultivation registrations
→ meta / exploration / challenges
→ simulation kernels / FixedSources / predictor / executor / ResourceEvolution
→ CheckpointStrategy / FixedSegment / CompiledPlan / Step / Offline / Loop
→ UI modules / App
→ game.js
```

新增脚本时改 HTML，不手改 manifest；完整工作区用现有 `tools/update-script-manifest.cjs` 生成/检查。

## 4. 正式资源

当前逻辑 ID：

```text
core.joules
core.power
cultivation.immortal.mana
cultivation.immortal.immortalPower
cultivation.immortal.xianForce
cultivation.immortal.yuanForce
meta.bigNumbers.construction
```

`Core.Resources` 通过 Registry definition 访问，不按字符串短名推断领域。仙道特殊适配在 `cultivation/resources.js`。

xianForce / yuanForce 是正式 Resource，但公共旧 snapshot 外形保持兼容；residual/tail 不注册成正式 Resource。

## 5. Evaluation / Effects / Sources

`Runtime.withEvaluationState` 提供同步显式 state 求值作用域；Effects/Source 在候选环境读取当前绑定 state。

必须保持：

- 同步，不跨 await；
- candidate 只读/COW；
- 异常恢复 Runtime/Effects；
- 不跨 candidate 共享可变最终缓存；
- Source function/valueAt 同次 collection 一次求值；
- highestPower probe 只用当前 override/依赖合同。

当前 conversionGain 等热点使用 Evaluation/Effects 局部 memo，不使用模块级跨候选最终结果缓存。

## 6. Online 主路径

`simulation/loop.js`：

```text
wall time enqueue
→ pendingContinuousTime
→ drainOnlineSlice
→ advanceGameStep(≤ cadence)
→ 完整 settlement
→ debit pending time
→ request render / optional continuation
```

当前：

- cadence 0.1s；
- 每 slice 最多 8 个完整 step；
- 默认约 12ms soft wall budget；
- budget 只在完整 step 之间检查；
- 一个重 step 不会被中途切断；
- 炼气批购例外地先完成私有精确计算：未完成的 foreground step 整体回滚，时间仍在原队列；唯一 continuation 续算后重试并一次提交原 step，不发布半次购买。手动批购也由同一个 owner 续算；import/reset/state 身份或玩法输入变化使候选失效；
- Qi work 同时使用 3ms 软预算和每片最多 4096 term / 256 block；预算只决定 yield，不参与费用数学。部分 block 仅在候选中，完整纯数学 block 使用最多 8192 项 LRU；候选不进入 Save；
- 尚有 runnable debt 时用单个 `setTimeout(0)` continuation；
- online/offline barrier 按 time ledger 顺序处理。
- recovery 的 Qi 计算复用已有私有 generator，不新增 runner；不跨 yield 保留 Runtime/Evaluation 作用域。

重型玩家动作若连续执行，需要在动作之间 cooperative yield；不要把 0.1s cadence 理解成浏览器并行线程。

## 7. Offline 主路径

当前正式链：

```text
Offline task
→ CheckpointStrategy.plan
→ FixedSegment.createWork
→ ContinuousExecutor
→ ResourceEvolution
→ FixedSegment peripheral settlement
→ token/root validation
→ install
→ accept + debt/clock/checkpoint
```

### Checkpoint budget

Budget v3 持久化 frames/predictor/statistics/directWork。

`directWork` 当前只做整个恢复会话的累计诊断/记账。Config 仍有 `maxDirectWork=8192`，但正式 `CheckpointStrategy` 与 `ResourceEvolution` 已取消“累计达到8192就强制 micro/拒绝正常执行”的门禁；真实数值继续累加，不能清零/取模伪造。

### Executor / capability

- selector 依据 movement/strong/extreme/capability 选择路径；
- true layer transition 保守；same-layer 高层使用实际 movement，不因 layer>=2 永久 extreme；
- compiled-micro 是保守路径，但 previousKind 不会永久锁死它；
- `scale-external-feedback-unvalidated` 仍可真实失败并完整回滚；Offline 对该 fixed-20s 组合使用 runtime-local temporary fallback，少量 micro 后正常 selector 若选择其他合法 executor 就恢复；
- 失败 candidate 不 install/accept，不扣 debt。

`offline-strategy.js` 保留历史策略/预算实现，但当前正式主 planner 是 `CheckpointStrategy`；不要把它的旧 8192 语义当成生产事实。

## 8. ResourceEvolution / Predictor

`ResourceEvolution` 在私有 candidate/COW 中推进六资源与 progress totals；FixedSources/ResourceGroups 是正式来源和读写入口。

存在：

- weak large-fixed；
- fixed fallback；
- DiscreteMap/predictor；
- Scale/Coupled kernel；
- compiled micro/replay fallback。

这些不是“谁更先进就全局替换谁”的关系；选择受当前 capability/validation 合同约束。

## 9. Exploration

### Exploration progress

`cultivation/exploration-progress.js` 负责天材地宝 progress/requirement/carry/retained settlement。高精度路径已有 lazy/reuse 优化；Online 不得改用 Offline approximate。

### Manual Mana integration

手动探寻 actual/Preview 通过 `ImmortalLogic → ScaleLogic.applyResourceSoftcapDynamicRateOverTime → Core.Integration.createAdaptiveWork`。

当前优化：

1. work-local static source / Effects preparation；
2. exact sample memo；
3. autonomous scalar representational cycle fast-forward。

Cycle fast-forward 只压缩严格相同的 reject/accept 控制二周期，保留：

- 原 tolerance；
- full/half；
- endpoint；
- logical accepted/rejected/evaluation；
- 最终 state / Preview / Save。

不满足严格门禁即走原 adaptive solver。

### Preview lifecycle

- 第一次可见且无 snapshot：高值 DOM 先 render/paint，再在后续 task 计算精确 Preview；
- snapshot + dirty 控制后续刷新；
- hidden/折叠/非当前区域不做无意义工作；
- 手动“刷新预览”按钮已移除，但程序刷新入口仍存在；
- ordinary click 完成 action 后按现有合同同步最终 Preview。

### Hold scheduling

探寻 pointer hold 使用 cooperative 调度：

```text
formal explore commit
→ merged UI render
→ rest timer
→ rAF
→ next host task
→ still holding ? repeat : stop
```

hold 中间不计算 Preview，只保持 dirty；释放/取消后最多一次最终精确 Preview。正式 Online MainLoop 在 repeats 之间继续运行。

## 10. Integration 当前特殊优化

`core/integration.js:createAdaptiveWork` 的 representational-cycle 优化是**严格等价压缩**，不是新精度模型。

关键原则：

- opt-in autonomous/context contract；
- 精确 Decimal/control-state 比较；
- 观察至少两个相同完整周期；
- 批量跳过的只是重复 quadrature；
- remaining 仍按原 Decimal subtraction 语义推进；
- endpoint 留给原 solver；
- diagnostics 区分 actual 与 logical evaluations；
- unknown/vector/invalid context 默认不启用。

不要改成近似 ULP/tolerance 快路。

## 11. 大数显示

中央入口：`ui/format.js`。

当前显示层规则：

```text
1e99999999      -> 1e99999999
1e100000000     -> ee8
1e-99999999     -> 1e-99999999
1e-100000000    -> e-e8
```

更高 layer 使用 `ee/eee/(e^N)` 及对应负向 `e-e/e-ee/...`。

`SourcePreview`、BigNumbers 与其它玩家详情入口已经统一中央 formatter；内部 serialize/toString/Save 不改。

高层资源若 ee+ 库存/rate 格式化字符串相同，可追加 presentation-only 相对速率；该提示使用已有库存和已发布 rate，不新跑公式。

## 12. Treasure / BigNumbers

- `meta/treasure-rules.js` 是 requirement / compatibility chance 参数权威来源；
- `treasure-ledger.js` 负责状态适配和兼容数学 API；
- Treasure `high-geometric-batch` / precision-limited / pending 等保持当前语义；
- BigNumbers 正式进度/里程碑在 `meta/big-numbers.js`；普通 progress 可以批量，但改变规则的事件仍由正式外围结算语义决定。

不要把 Treasure progress 机制解释成真实掉落概率。

## 13. Save / Recovery

存档按 core / powerSystem / cultivation / meta 分域；旧字段访问器保持兼容。

当前：

```text
schemaVersion = 64
settlementRuleVersion = 1
```

Offline recovery 保存 pending task、debt、segment budget、time ledger 等已提交状态。运行时临时 UI/hold/capability presentation 状态不进入 Save，除非现有 recovery 合同明确包含。

纯显示/缓存/调度重构不要提升 schema。

## 14. UI 状态边界

UI render/view/query 不写正式游戏状态。

当前关键 UI 合同：

- 主资源速率读取正式 step 已发布 `tmp.rates`；
- 高层相对增长提示只读已有 rate/current；
- SourcePreview/公式详情只做展示；
- Exploration Preview 无持久副作用；
- 首次 Preview 不阻塞首个高值 paint；
- long hold 合并中间 Preview/render，但正式 action 每次立即提交。

## 15. 模块身份

### ACTIVE

Core/Power/Cultivation/Meta 正式模块；FastForward；Accuracy；Simulation 当前主链；UI；game bootstrap。

### ACTIVE + REFERENCE/DIAGNOSTIC

- `FixedSources.continuousWork`
- Profiler
- TreasureEvents 某些预测/测试 API

### COMPATIBILITY / LEGACY-PRESENT

- `simulation/offline-strategy.js`
- Projection 旧 API
- State 旧访问器
- TreasureLedger alias
- Resources 旧 facade
- legacy randomMode/recovery 兼容

当前没有整模块 REMOVABLE 结论。

## 16. 开发/发布边界

当前 ZIP 是 development runtime。默认不修改发布版、不发布、不 commit、不 push。

完整开发工作区若有 manifest 工具：

```text
node tools/update-script-manifest.cjs --check
```

修改脚本成员才需要生成新清单；普通逻辑修改只更新 build/cache 标识时保持成员/顺序不变。


## TREE v1（2026-09-21）

- `meta.bigNumbers.tree` 保存显式构造、手动超构造和完成态；默认止于 TREE(3)，D1-2 允许 TREE(4)+。
- 解锁复用 `Achievements.has(state, "googol")` 与 `BigNumbers.get(state).gIndex >= 64`。
- `meta/big-numbers.js` 集中规则；`meta/big-number-resources.js` 注册唯一新库存 `meta.bigNumbers.construction`，snapshot=false，核心六资源模拟接口保持。
- TREE 构造点来源为 `(gIndex/64)×2^node`；分枝全程 ×1.5/级，标签只在正式阈值后 ×1.6/级，跨阈值 O(1) 分段。G64 跨界只计解锁后的时间，旧 G64 progress 不兑换。
- schema 63；TREE3 永久成就只解锁无限，不恢复当前 TREE。普通 reset 保留 BigNumbers；无限转生及三个大数挑战进入时清空当前 BigNumbers，保留无限资格。
- 行动页增加“大数·树”，内部没有新 tab；构造库存与 sequenceWork 历史分离。
- 本次完整说明和验收见 `../docs/tree-v1-20260921.md`。

- TREE 旧显示修正（已由下述解锁进度 UI 替代）：来源及三个强化的当前倍率常驻显示。schema 仍为62。见 `../docs/tree-refinement-20260921.md`。

- TREE 当前显式 UI 使用中央 k/M 显示整数下标；阈值前显示正式 sequenceIndex/thresholdIndex 解锁进度，阈值后仅显示基础倍率与手动入口。标签升级在正式门槛前锁定；旧等级保留，阈值后生效。正式推进公式未变。详见 `../docs/tree-progress-20260921.md`。

## 无限层 v1（2026-09-22）

- `meta/infinity-config.js`：21节点、前置/互斥、4挑战和首版参数；`meta/infinity.js`：永久状态、购买、收益、候选重置和正式效果。
- `ui/infinity.js`：行动/无限及强化/无限强化；手机2×2分支标签，一次一棵树。
- `game.js` 使用既有导入快照与 scheduler/catch-up 生命周期提交/回滚无限转生；购买发布 meta 根，拒绝旧候选。
- `runElapsed` 为游戏时间。在线/在线恢复保持 ONLINE_EXACT；true offline 保持 OFFLINE_APPROX。快速挑战5秒窗口共用离散执行顺序，来源与时钟账本仍按原来源记账。
- G/TREE 默认上限不变，节点解锁后最小延伸；B5及单体内容不在本版。详见 ../`docs/infinity-v1-report.md`。

## 导入恢复交接（2026-09-22）

prepareSave 成功仅表示一个调用完成；导入使用 captureOnly，再由 Loop.handoffImportRecovery 在事务 hold 与恢复门控内转交有序时间元数据。complete 才是全部区间交接完成的证据；失败走既有 import rollback。保留12ms预算、source/speed/compensation/RNG与原runner。详见 ../docs/import-recovery-handoff-20260922.md。

## TREE 后期规则

G64 后需求与 TREE/D4 规则由 `meta/infinity-config.js` 和 `meta/infinity.js` 权威计算；`meta/big-numbers.js` 使用闭式/对数阶费用求和，无逐阶长循环。TREE 构造与衰减阈值分别计算，D1-2 解锁后升阶自动开始下一阶构造。高阶超构造需求及完成比例保持 BigNum 表示，UI 仅将时间转为估算。旧 G65+ 进度用可选 `gCapacityModel` 标记一次换算。参见 ../docs/tree-late-rules-20260923.md。
