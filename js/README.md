# WIS 模块边界与迁移状态

本目录使用传统脚本与单一 `window.WIS` 命名空间，不依赖构建工具，并保持 `file://` 直接打开兼容。

- `core/`：配置、状态工厂、存储、资源、公式、Effect/Source 收集、注册表、运行时桥接和重置配置。
- `power/scale-logic.js`：量级论公式、行动、强化、自动化、进度与宝物判定；`power/scale.js` 只提供注册表适配和更新阶段。
- `cultivation/immortal-logic.js`：仙道法力公式、境界、能力、探寻、天劫与重修；`cultivation/immortal.js` 只提供注册表适配和更新阶段。
- `meta/`：成就定义与状态、宝物、挑战效果和挑战生命周期。
- `ui/app.js`：页面切换、渲染、设置与事件绑定；`ui/cards.js` 负责卡片挂载。
- `game.js`：状态装载、运行时绑定、主循环、离线结算、自动保存和跨系统阶段协调。

schema 38 起，真实状态和新存档均按 `core / powerSystem / cultivation / meta` 分域存储。旧平铺字段仅以不可枚举访问器保留给尚未迁出的调用点，不会写入存档。`Save.read()` 保留 envelope 的 `schemaVersion`，再由 `State.migrate(schemaVersion, data)` 执行显式迁移；schema 36/37 的旧平铺存档仍可读取。schema 38 使用分域归一化，只校正已知字段并保留未知体系、资源和 Meta 子域，新增 VB、武道或无限强化不需要加入旧字段表才能保存。`WIS.Core.State.domainView(state)` 返回递归冻结的分域快照。

第二轮已让量级论、仙道和挑战模块按当前激活体系提供标准 Effect，由 `Core.Effects` 动态收集乘区与指数；各修行体系通过 `Core.Sources` 提供独立 J / 战力来源，量级论只负责汇总，不读取仙道内部状态。主循环只调用 Registry 返回的当前体系更新与阶段钩子，体系自行取得收益率、维护被动判定累加器并执行进度。体系资源由 `Core.Resources` 直接解析 `cultivation.systems[systemId].resources[resourceId]`，Core 不维护仙道/武道白名单。散功、转世、挑战与无限重置的清除/保留字段由可执行 Reset Profile 决定，并支持 `meta.infinity` 等分域路径。页面渲染和按钮事件均位于 `ui/`，`game.js` 不再直接访问 DOM。量级强化、灵根、仙道能力与境界卡片由 `ui/cards.js` 的卡片目录挂载，`index.html` 只保留对应容器；所有已有固定费用卡片的排序值和费用文字均从 `Core.Config` 注入。

依赖方向：`core → power/cultivation/meta → ui → game.js`。领域模块不得依赖UI；UI不得修改数值公式。
