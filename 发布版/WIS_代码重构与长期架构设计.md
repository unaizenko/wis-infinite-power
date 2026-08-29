# WIS 代码重构与长期架构设计说明

> 用途：提供给 Codex，作为当前 `WIS-无限战力系统` 项目的代码重构与后续扩展依据。  
> 当前项目仍保持纯 HTML + CSS + JavaScript 静态网页形式，不引入 React/Vue/Vite/Webpack 等构建框架。  
> 本次目标不是改动游戏玩法或数值，而是重构代码结构，使其可以长期支持多战力体系、多修行体系、多层转生与大量后期内容。

---

# 1. 当前问题

当前主要游戏逻辑集中在单个 `game.js` 中，文件已经非常庞大，包含：

- 游戏配置常量
- 默认状态
- 存档读取与迁移
- 离线收益
- J / 战力 / 法力计算
- 软上限
- 行动
- 强化
- 成就
- 挑战
- 宝物
- 仙道境界
- 仙道能力
- 探寻
- 散功重修
- 转世重修
- 小天劫
- UI 渲染
- DOM 事件绑定
- 主循环
- 自动保存

当前结构可以继续运行，但后续内容量会大幅增加，因此不应继续把所有逻辑堆叠在单个 `game.js` 中。

重构目标是：

1. 保持游戏当前行为和数值不变。
2. 按职责拆分代码。
3. 为未来多个修行体系、多个战力体系和无限转生预留结构。
4. UI 只负责显示和交互，不拥有游戏规则。
5. 资源、状态、效果、重置逻辑有明确归属。
6. 尽量减少模块间直接耦合。

---

# 2. 长期游戏结构设定

## 2.1 战力体系

当前战力体系为：

- 量级论

未来可能存在：

- VB 层级（如 9-C ~ 0）
- PSW
- 其他战力/等级体系

这些属于**互斥的战力体系**。

同一时间仅存在一个当前战力体系。

示例：

```js
state.powerSystem.active = "scale";
```

未来：

```js
state.powerSystem.active = "vb";
```

或者：

```js
state.powerSystem.active = "psw";
```

量级论不应再被视为整个游戏本身，而应作为一个可替换的 PowerSystem 模块。

---

## 2.2 六种修行体系

六种体系：

- 仙道
- 武道
- 科技
- 异能
- 职业者
- 神秘学

当前设计原则：

- 当前为六选一。
- 玩家选择一个体系后锁定。
- 未来不完全排除同时拥有多个体系的可能，但概率较低。

因此：

**代码结构必须允许多个体系模块同时存在，但玩法层当前仍限制为单选。**

推荐：

```js
state.cultivation = {
  active: "immortal",

  systems: {
    immortal: {...},
    martial: {...},
    technology: {...},
    psychic: {...},
    profession: {...},
    occult: {...}
  }
};
```

而不是只保存：

```js
state.cultivationSystem = "仙道";
```

这样以后如果需要开放双体系或多体系，不必再次重写存档结构。

---

# 3. 资源必须分域

这是本次重构的重要原则。

## 3.1 普通资源

当前普通资源：

- J
- 战力

它们属于游戏公共资源。

推荐：

```js
state.core.resources = {
  joules: 0,
  power: 0
};
```

---

## 3.2 体系资源

不同修行体系拥有自己的独立资源。

例如：

```js
state.cultivation.systems.immortal.resources = {
  mana: 0
};
```

未来可能：

```js
state.cultivation.systems.martial.resources = {
  // 武道资源
};

state.cultivation.systems.technology.resources = {
  // 科技资源
};
```

禁止继续把所有体系资源平铺到根 `state`：

```js
state.mana
state.xxx
state.yyy
```

---

## 3.3 Meta 资源

未来无限转生会产生新的高层资源。

这类资源属于 Meta 层，例如：

```js
state.meta.infinity = {
  currency: 0,
  upgrades: {}
};
```

Meta 资源跨越普通轮次和无限转生保留。

---

# 4. “永久”必须分等级

以后禁止笼统地把所有永久内容都放在同一个 permanent 概念中。

当前至少需要区分：

## 4.1 体系内永久

例如仙道：

- 灵根
- 转世相关永久效果
- 其他仅在仙道内部长期保留的奖励

这些内容：

- 散功重修保留
- 普通转世保留
- 无限转生清除

推荐位置：

```js
state.cultivation.systems.immortal.persistent = {
  rootLevel: 0,
  ...
};
```

---

## 4.2 全局永久 / Meta

例如：

- 宝物
- 成就
- 统计
- 无限转生资源
- 无限强化

这些内容：

- 普通重置保留
- 散功保留
- 转世保留
- 无限转生仍保留

推荐位置：

```js
state.meta = {
  achievements: {},
  treasures: {},
  statistics: {},
  infinity: {}
};
```

---

# 5. 无限转生规则

未来抵达单体后会加入“无限转生”。

无限转生获得新资源，并用于强化界面的“无限强化”。

## 5.1 无限转生会重置

- 当前体系进度
- 体系内永久奖励（例如灵根）
- 当前体系选择
- 当前战力体系进度/量级
- J
- 战力
- 体系资源
- 体系境界
- 体系能力

## 5.2 无限转生不会重置

- 宝物
- 成就
- 统计
- 无限转生资源
- 无限强化

后续 VB / PSW 等战力体系发生在无限转生很后面，本次重构暂不为其设计具体重置规则，只保留模块化接口。

---

# 6. 推荐状态层级

长期推荐状态：

```js
state = {
  core: {
    resources: {
      joules: 0,
      power: 0
    },

    runtime: {
      // 当前轮次运行数据
    }
  },

  powerSystem: {
    active: "scale",

    systems: {
      scale: {
        progress: {},
        upgrades: {},
        actions: {}
      }
    }
  },

  cultivation: {
    active: "immortal",

    systems: {
      immortal: {
        resources: {
          mana: 0
        },

        progress: {
          realm: 0
        },

        abilities: {},

        persistent: {
          rootLevel: 0
        }
      }
    }
  },

  meta: {
    achievements: {},
    treasures: {},
    statistics: {},

    infinity: {
      currency: 0,
      upgrades: {}
    }
  }
};
```

实际迁移时可以逐步完成，不要求一次性把所有字段完全重命名，但最终方向应符合此分层。

---

# 7. 推荐目录结构

长期目录：

```text
js/
│
├─ core/
│  ├─ game.js
│  ├─ state.js
│  ├─ save.js
│  ├─ resources.js
│  ├─ reset.js
│  ├─ time.js
│  └─ utils.js
│
├─ power-systems/
│  ├─ registry.js
│  │
│  ├─ scale/
│  │  ├─ config.js
│  │  ├─ progression.js
│  │  ├─ upgrades.js
│  │  ├─ formulas.js
│  │  └─ actions.js
│  │
│  ├─ vb/
│  └─ psw/
│
├─ cultivation/
│  ├─ registry.js
│  │
│  ├─ immortal/
│  │  ├─ config.js
│  │  ├─ state.js
│  │  ├─ resources.js
│  │  ├─ realms.js
│  │  ├─ abilities.js
│  │  ├─ formulas.js
│  │  ├─ exploration.js
│  │  └─ reset.js
│  │
│  ├─ martial/
│  ├─ technology/
│  ├─ psychic/
│  ├─ profession/
│  └─ occult/
│
├─ meta/
│  ├─ achievements.js
│  ├─ treasures.js
│  ├─ challenges.js
│  ├─ statistics.js
│  └─ infinity-prestige.js
│
└─ ui/
   ├─ app.js
   ├─ navigation.js
   ├─ resources.js
   ├─ cards.js
   ├─ actions.js
   ├─ upgrades.js
   ├─ cultivation.js
   ├─ treasures.js
   ├─ challenges.js
   ├─ achievements.js
   ├─ statistics.js
   └─ settings.js
```

注意：

**本次不要一次创建大量空文件。**

第一轮实际重构建议只拆成约 12~15 个文件：

```text
js/
├─ core/
│  ├─ config.js
│  ├─ state.js
│  ├─ save.js
│  ├─ resources.js
│  └─ game.js
│
├─ power/
│  └─ scale.js
│
├─ cultivation/
│  └─ immortal.js
│
├─ meta/
│  ├─ achievements.js
│  ├─ treasures.js
│  └─ challenges.js
│
└─ ui/
   ├─ cards.js
   └─ ui.js
```

后续真正开发武道、VB 等内容时再继续细分。

---

# 8. 模块依赖原则

推荐依赖方向：

```text
core
↑
power / cultivation / meta
↑
UI
↑
game bootstrap
```

要求：

## 禁止

```text
仙道 → UI
UI → 仙道内部状态实现
量级论 → 仙道内部函数
仙道 → 量级论内部函数
```

## 推荐

模块之间通过以下公共层通信：

- state
- resources
- effects
- registry
- reset

---

# 9. 普通资源统一通过 Resource API

修行体系不应直接到处写：

```js
state.joules += x;
state.power -= x;
```

建议提供统一接口：

```js
Resources.get("joules");
Resources.get("power");

Resources.add("joules", amount);
Resources.add("power", amount);

Resources.spend("joules", amount);
Resources.spend("power", amount);

Resources.canAfford("power", cost);
```

体系资源：

```js
Resources.getSystem("immortal", "mana");
Resources.addSystem("immortal", "mana", amount);
Resources.spendSystem("immortal", "mana", amount);
```

这样以后：

- 挑战
- 宝物
- 无限强化
- 全局倍率
- 统计记录
- 资源拦截

都可以通过统一资源接口实现。

---

# 10. UI 只读取游戏逻辑

确定采用：

```text
游戏逻辑
↓
UI 页面读取游戏逻辑
```

而不是：

```text
页面本身拥有游戏规则
```

因此：

- UI 不计算战力公式。
- UI 不决定强化是否生效。
- UI 不维护独立游戏状态。
- UI 只负责读取当前状态、显示信息、触发游戏逻辑 API。

例如：

```js
GameActions.train();
```

而不是 UI 代码内部直接执行：

```js
state.joules = 0;
state.power += ...
```

---

# 11. 强化与能力卡片改为自动生成

当前 `index.html` 中大量强化、境界、能力卡片为手写 HTML。

后续六体系、无限强化和新战力体系加入后，这种方式维护成本过高。

因此逐步改为数据驱动。

示例：

```js
const SCALE_UPGRADES = [
  {
    id: "gym",
    name: "跑步",
    group: "normal",

    cost: {
      resource: "power",
      value: 20
    },

    description: "根据当前战力提升J获取倍率。",

    unlock: state => true,

    effect: state => ({
      jMultiplier: ...
    })
  }
];
```

UI：

```js
renderUpgradeCards(SCALE_UPGRADES);
```

HTML 最终只保留：

```html
<div id="upgrade-list"></div>
```

---

# 12. 数据驱动的边界

不是所有游戏机制都必须完全配置化。

适合配置化：

- 普通强化
- 简单能力
- 境界
- 固定费用
- 解锁条件
- 普通倍率
- 普通指数
- 卡片文字

适合保留独立代码：

- 探寻
- 小天劫
- 散功重修
- 转世重修
- 无限转生
- 复杂概率流程
- 多阶段状态机制

不要为了配置化而创造一套复杂的自制脚本语言。

原则：

> 简单内容配置化，复杂机制代码化。

---

# 13. 计算公式总体结构保持不变

当前计算体系的数学结构是合理的，应继续保留。

当前核心结构：

```text
来源_i
= 来源软上限(
    ((来源基础 + 来源加法)
    × 来源乘区)
    ^ 来源指数
  )

来源汇总
= Σ 来源_i

最终获取
= 区域软上限(
    (来源汇总
    × 区域乘区)
    ^ 区域指数
  )
```

即：

```text
来源层
↓
来源汇总
↓
区域乘区
↓
区域指数
↓
区域软上限
```

该结构继续作为 J / 战力 / 法力等资源的基础计算模型。

---

# 14. 不采用“购买能力时动态修改公式”

禁止采用类似：

```js
formula.addEffect(effect);
```

然后重置时：

```js
formula.removeEffect(effect);
```

原因：

- 容易出现状态与公式不同步。
- 存档加载需要重新构造公式。
- 散功/转世/无限转生容易遗留旧效果。
- 挑战临时效果更难维护。

核心原则：

> 状态是唯一事实来源。

能力是否存在，只由状态决定。

---

# 15. 保留“中性值”原则

当前结构中：

- 未解锁乘区 → ×1
- 未解锁指数 → ^1
- 未解锁加法 → +0
- 未触发软上限 → 恒等函数

这个原则继续保留。

例如：

```js
function superpowerExponent() {
  if (!state.superpowerPurchased) return 1;
  return state.superpowerEvolutionPurchased ? 1.06 : 1.05;
}
```

公式始终保留“异能指数”这个位置。

能力购买后只是改变：

```text
1 → 1.05 → 1.06
```

而不是修改公式结构。

---

# 16. 公式系统需要升级为“固定公式 + 动态效果收集”

长期不建议让一个核心函数硬编码所有未来能力。

错误方向：

```js
powerMultiplierGroups() {
  战五渣
  超凡之力
  天生神力
  ...
  仙道能力1
  仙道能力2
  ...
  武道能力1
  ...
  无限强化1
  ...
}
```

推荐：

```js
const multipliers = [
  ...ScaleSystem.getPowerMultipliers(state),
  ...Cultivation.getPowerMultipliers(state),
  ...Meta.getPowerMultipliers(state),
  ...Challenge.getPowerMultipliers(state)
];
```

最终：

```js
calculateRegionGain(
  sources,
  {
    multipliers,
    exponents,
    softcaps
  }
);
```

注意：

这不是“购买后把效果永久加入公式”。

实际流程是：

```text
每次计算
↓
询问各系统当前提供什么效果
↓
收集当前有效效果
↓
执行固定公式
```

下一次计算会重新读取当前状态。

---

# 17. 推荐统一 Effect 描述

可以逐步建立标准效果类型。

建议支持：

```text
sourceAdditive
sourceMultiplier
sourceExponent
sourceSoftcap

regionMultiplier
regionExponent
regionSoftcap
```

效果指定 target。

例如：

## 崩山

```js
{
  id: "mountainCollapse",
  target: "rock",
  layer: "sourceExponent",
  value: 1.10
}
```

## 异能

```js
{
  id: "superpower",
  target: "power",
  layer: "regionExponent",
  value: 1.05
}
```

## 御物

```js
{
  id: "materialControl",
  target: "magicTreasure",
  layer: "sourceMultiplier",
  value: 5
}
```

这样：

- 量级论
- 仙道
- 武道
- 科技
- 宝物
- 挑战
- 无限强化

都可以通过统一效果接口作用于普通资源。

---

# 18. Effect 系统只处理数值效果

不要让 Effect 系统负责所有游戏机制。

Effect 系统主要用于：

- 加法
- 乘法
- 指数
- 软上限

复杂机制仍然放在各自模块中。

例如：

```text
飞升灵界：
天材地宝上限 +10
```

属于能力逻辑。

```text
散功重修
```

属于 Reset / Immortal 机制。

```text
转世重修
```

属于 Immortal reset。

```text
无限转生
```

属于 Meta prestige。

---

# 19. 示例：未来鬼脑公式

鬼脑计算可以最终变成：

```js
function ghostBrainSource() {
  return calculateSourceGain({
    base: ghostBrainBase(),

    multipliers:
      Effects.getSourceMultipliers("ghostBrain"),

    exponents:
      Effects.getSourceExponents("ghostBrain"),

    softcaps:
      Effects.getSourceSoftcaps("ghostBrain")
  });
}
```

当前可能自动收集：

```text
精神领域 ×5
裂天 ×X
无限强化 ×Y
宝物 ×Z
未来体系效果
```

但鬼脑本身的核心公式不需要随着新能力增加而不断修改。

---

# 20. Reset 系统需要独立

未来重置层级会很多：

```text
普通重置
散功重修
转世重修
无限转生
```

不建议每个重置函数都手写数十个：

```js
state.xxx = false;
state.xxx = 0;
state.xxx = false;
```

建议建立统一 Reset API：

```js
Reset.apply("scatter");
Reset.apply("reincarnation");
Reset.apply("infinity");
```

并使用 Reset Profile：

```js
RESET_PROFILES = {
  scatter: {...},
  reincarnation: {...},
  infinity: {...}
};
```

未来可以进一步给状态或配置声明：

```text
resetScope = scatter
resetScope = reincarnation
resetScope = infinity
resetScope = never
```

目标是避免新增能力后忘记添加重置逻辑。

---

# 21. 战力体系应提供统一接口

量级论、VB、PSW 等应实现相似接口。

例如：

```js
{
  id: "scale",

  getCurrentTier(),
  getNextTier(),
  getProgress(),

  getAvailableActions(),
  getAvailableUpgrades(),

  getEffects(),

  update()
}
```

UI 不关心当前体系使用：

```text
普通人
爆砖
爆墙
```

还是：

```text
9-C
9-B
9-A
```

UI 只调用：

```js
PowerSystems.getActive().getCurrentTier();
```

---

# 22. 修行体系应提供统一接口

例如：

```js
{
  id: "immortal",

  getResources(),
  getActions(),
  getAbilities(),
  getEffects(),

  getState(),
  reset(type),

  update()
}
```

当前只有：

```js
cultivation.active = "immortal";
```

未来如需要多体系：

```js
cultivation.active = [
  "immortal",
  "martial"
];
```

整体状态结构仍可继续使用。

---

# 23. Decimal 大数底层

当前开发版与发布版均采用本地 `break_eternity.js`，正式发布版本为 `0.1.4.5`，由 `js/core/bignum.js` 统一适配，当前存档 Schema 为 47。J、战力、法力、仙灵力、累计资源、资源来源、费用、需求、量级阈值与软上限数值均使用 Decimal；JSON 存档将其写为字符串，旧 Number 存档继续兼容。

等级、炼气层数、挑战完成次数、时间、概率、指数参数、ID、UI 索引和布尔状态继续使用 Number。任何领域模块都不得把 Decimal 转为 Number 后继续做资源算术；只有对数数量级、概率、积分分段和循环计数等明确的控制量可以通过适配层转换。

脚本加载顺序固定为：

```text
core/build-config.js
→ vendor/break_eternity.min.js
→ core/namespace.js
→ core/bignum.js
→ core/config.js
→ 其余模块
```

开发版与发布版均支持 `1e368`、`1e1000`、`1e1000000` 等有限大数，并为更高 break_eternity layer 预留底层能力。两者核心运行逻辑基本一致；`build-config.js` 仅控制开发版开启调速和来源公式详情、发布版关闭这两项开发功能。

未来可能包括：

- G1 ~ G64
- TREE(3)
- N 或 ω
- ↑
- →
- 高级函数
- 大序数
- 无限盒子
- 无限指数塔
- 超指数塔
- 论外量级

因此：

> Decimal 负责可计算的大数量值。  
> Number 负责控制参数。  
> Progression / Magnitude 系统负责符号量级。

---

# 24. 符号量级不要继续使用大量 boolean

当前类似：

```js
symbolicPowerMilestones = {
  graham64: false,
  tree3: false
};
```

长期不推荐继续扩展成：

```js
graham64
tree3
omega
arrow
conway
...
```

建议改为统一 Magnitude 状态。

例如：

```js
powerMagnitude = {
  domain: "numeric",
  value: 1e80
};
```

符号阶段：

```js
powerMagnitude = {
  domain: "symbolic",
  stage: "graham",
  level: 64
};
```

或者：

```js
powerMagnitude = {
  domain: "symbolic",
  stage: "tree",
  level: 3
};
```

比较大小应基于层级顺序，而不是试图计算 TREE(3) 的实际数值。

---

# 25. 当前不应修改的内容

本次重构不是数值平衡调整。

除非为了修复明确的结构性 Bug，否则：

- 不修改费用
- 不修改倍率
- 不修改指数
- 不修改软上限
- 不修改解锁顺序
- 不修改散功规则
- 不修改转世规则
- 不修改成就奖励
- 不修改宝物概率
- 不修改离线收益逻辑
- 不修改当前 UI 表现
- 不修改当前玩法节奏

优先保证重构前后行为一致。

---

# 26. 静态网页兼容要求

当前项目需要继续支持：

- GitHub Pages
- 帽子云等静态托管
- 无 Node.js 运行依赖
- 无 npm 构建步骤

尽量继续支持直接打开：

```text
index.html
```

即可运行。

如果采用多个传统 `<script>` 文件，需要保证加载顺序正确。

不要在第一轮重构中引入会破坏 `file://` 直接打开兼容性的复杂 ES Module 架构。

可以采用统一命名空间：

```js
window.WIS = window.WIS || {};
```

例如：

```js
WIS.Core = {};
WIS.Resources = {};
WIS.Scale = {};
WIS.Immortal = {};
WIS.Meta = {};
WIS.UI = {};
```

避免大量污染 `window`。

---

# 27. 第一轮实际重构目标

第一轮建议完成：

## 27.1 拆分配置

从 `game.js` 中移出：

- 费用
- 量级配置
- 境界配置
- 挑战配置
- 软上限配置

到：

```text
core/config.js
```

---

## 27.2 拆分状态与存档

移动：

- defaultState
- freshDefaultState
- normalizeState
- loadState
- saveState
- importSave
- exportSave
- resetGame

到：

```text
core/state.js
core/save.js
```

---

## 27.3 建立 Resource API

新增：

```text
core/resources.js
```

把 J / 战力 / 法力等读取、增加、消耗逐步迁移到统一接口。

---

## 27.4 拆分量级论

把：

- 量级
- 普通行动
- 普通强化
- 普通资源相关公式

逐步迁移到：

```text
power/scale.js
```

后续再细分。

---

## 27.5 拆分仙道

把：

- 法力
- 境界
- 仙道能力
- 探寻
- 小天劫
- 散功
- 转世

迁移到：

```text
cultivation/immortal.js
```

第一轮不必强行拆成很多仙道子文件。

---

## 27.6 拆分 Meta

迁移：

```text
成就
宝物
挑战
```

到：

```text
meta/
```

---

## 27.7 拆分 UI

把：

- render
- DOM 更新
- UI 显隐
- 卡片生成
- 导航
- 设置

从游戏逻辑中移除。

第一轮：

```text
ui/ui.js
ui/cards.js
```

即可。

---

# 28. 第二轮重构目标

第一轮稳定后再做：

- 自动生成强化卡片
- 自动生成仙道能力卡片
- PowerSystem Registry
- Cultivation Registry
- Effect Collector
- Reset Profile
- 更完整的状态分域
- 仙道继续拆分为 realms / abilities / exploration / reset

---

# 29. 验收标准

重构完成后必须保证：

## 游戏功能

- 原存档可以正常读取。
- 原存档迁移后不丢失进度。
- J / 战力 / 法力计算一致。
- 自动资源一致。
- 离线收益一致。
- 所有强化可正常购买。
- 所有仙道境界可正常突破。
- 探寻正常。
- 宝物正常。
- 成就正常。
- 挑战正常。
- 散功正常。
- 转世正常。
- 小天劫正常。
- 自动保存正常。
- 导入导出正常。
- 黑白主题正常。

## 架构

- UI 不直接实现游戏公式。
- 修行体系不直接依赖 UI。
- 普通资源与体系资源分域。
- 仙道模块可以独立维护。
- 量级论模块可以独立维护。
- Meta 数据明确区分于体系内永久数据。
- 后续可以增加武道模块而无需修改仙道代码。
- 后续可以增加 VB 战力体系而无需重写量级论代码。
- 后续可以加入无限转生而无需重新推翻状态结构。

---

# 30. Codex 执行原则

重构时优先遵循：

1. **先保持行为一致，再优化。**
2. 每次只迁移一类职责。
3. 每迁移一部分后检查是否仍可运行。
4. 不在架构重构过程中顺便调整游戏数值。
5. 尽量复用当前已有函数。
6. 不为了“漂亮”而一次性重写全部代码。
7. 优先小步迁移。
8. 所有存档字段迁移必须兼容旧版本。
9. 新架构允许未来扩展，但不要提前实现未设计好的玩法。
10. 不创建大量暂时没有用途的空文件。

---

# 31. 核心架构结论

最终目标不是：

```text
把一个大 game.js
拆成几个同样互相耦合的大文件
```

而是形成：

```text
Core
├─ State
├─ Resources
├─ Save
├─ Reset
└─ Time

PowerSystem
└─ Scale / VB / PSW ...

Cultivation
└─ Immortal / Martial / Technology / ...

Meta
├─ Achievements
├─ Treasures
├─ Challenges
├─ Statistics
└─ Infinity

UI
└─ 只读取上述逻辑
```

计算体系采用：

```text
固定公式结构
+
每次计算时动态收集当前有效效果
```

而不是：

```text
购买能力后动态修改公式对象
```

游戏状态始终是唯一事实来源。

这一结构应作为 WIS 后续长期开发的基础。
