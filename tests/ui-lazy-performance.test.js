"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const appSource = fs.readFileSync(path.join(root, "js", "ui", "app.js"), "utf8");
const gameSource = fs.readFileSync(path.join(root, "game.js"), "utf8");

const ensureStart = appSource.indexOf("  function ensureAdvancedRealmAbilityGroups()");
const ensureEnd = appSource.indexOf("  function renderAchievements()", ensureStart);
const ensureSource = appSource.slice(ensureStart, ensureEnd);

assert.match(ensureSource,
  /advancedRealmAbilityIndexesForLevel\(state\.advancedRealmLevel, ADVANCED_REALMS\.length\)/,
  "高级能力组只能创建当前境界以前的必要组");
assert.match(ensureSource, /filter\(\(realm\) => !rawById\(`\$\{realm\.slug\}-abilities`\)\)/,
  "重复ensure必须跳过已经创建的能力组");
assert.match(ensureSource, /document\.createElement\("template"\)[\s\S]*container\.appendChild\(template\.content\)/,
  "多个高级能力组必须通过DocumentFragment等价批量插入");
assert.equal((ensureSource.match(/sortCostGroups\(/g) || []).length, 0,
  "批量创建循环内不得排序");
assert.match(ensureSource, /markCostGroupsDirty\("cultivation"\)/,
  "一批新卡创建后只能把体系费用组标记为dirty");

const sandbox = { window: { WIS: { UI: {} } } };
vm.runInNewContext(appSource, sandbox, { filename: "app.js" });
const realmIndexes = sandbox.window.WIS.UI.App.advancedRealmAbilityIndexesForLevel;
assert.deepEqual([...realmIndexes(0, 10)], [], "新存档不能创建未来高级能力组");
assert.deepEqual([...realmIndexes(3, 10)], [2], "首次达到炼虚时只创建炼虚组");
assert.deepEqual([...realmIndexes(9, 10)], [2, 3, 4, 5, 6, 7, 8],
  "高进度旧存档只补齐当前境界以前的必要组");

const startupStart = gameSource.indexOf("  UI.bindEvents();");
const startupEnd = gameSource.indexOf("  async function finishInitialLoad", startupStart);
const startupSource = gameSource.slice(startupStart, startupEnd);
assert.doesNotMatch(startupSource, /ensureAchievementCards\(\)/,
  "启动阶段不得创建成就卡");
assert.match(appSource, /if \(pageName === "achievements"\) ensureAchievementCards\(\);/,
  "首次进入成就页时才创建成就卡");
assert.match(appSource, /if \(achievementCardsCreated \|\| container\.children\.length > 0\)/,
  "成就卡创建必须幂等");

assert.match(appSource,
  /function render\(\{ forceGlobal = false, forcePage = false \} = \{\}\)[\s\S]*if \(forceGlobal \|\| globalDirty\)[\s\S]*if \(forcePage \|\| dirtyPages\.has\(activePage\)\)/,
  "global和当前页面必须分别按dirty状态渲染");
assert.match(appSource, /runtime\.call\("renderImmediately", pageName\)/,
  "切换页面必须立即提交目标页面渲染");
assert.match(gameSource, /renderImmediately: \(pageName\) => \{[\s\S]*flushRender\(Date\.now\(\), \{ force: true \}\)/,
  "立即页面渲染必须同步更新时间节流器");

const requestStart = gameSource.indexOf("  function requestRender(pageName)");
const requestEnd = gameSource.indexOf("  function flushRender", requestStart);
const requestSource = gameSource.slice(requestStart, requestEnd);
assert.match(requestSource, /if \(pageName === "all"\) markPagesDirty\(\);/,
  "只有显式all请求可以把全部页面标脏");
assert.doesNotMatch(requestSource, /\n\s*markPagesDirty\(\);/,
  "普通requestRender不得无条件把全部页面标脏");
assert.match(requestSource, /else markCurrentPageDirty\(\)/,
  "普通资源变化只标记global和当前页");

for (const functionName of ["upgradeCostSortSignature", "cultivationCostSortSignature"]) {
  const start = gameSource.indexOf(`  function ${functionName}()`);
  const end = gameSource.indexOf("\n  }", start) + 4;
  const source = gameSource.slice(start, end);
  assert.doesNotMatch(source, /state\.(joules|power|mana|immortalPower)\b/,
    `${functionName}不得依赖普通资源余额`);
}

const tickStart = gameSource.indexOf("  function runMainTick()");
const tickEnd = gameSource.indexOf("  document.addEventListener", tickStart);
const tickSource = gameSource.slice(tickStart, tickEnd);
assert.equal((tickSource.match(/flushRender\(/g) || []).length, 1,
  "一个逻辑Tick最多提交一次常规render");

const pageContentStart = appSource.indexOf("  function renderPageContent(pageName)");
const pageContentEnd = appSource.indexOf("  function renderActionsPage", pageContentStart);
const pageContentSource = appSource.slice(pageContentStart, pageContentEnd);
assert.doesNotMatch(pageContentSource, /state\.(joules|power|mana|immortalPower)\s*=/,
  "展示层拆分不得修改四种核心资源");
assert.match(appSource, /const PAGE_NAMES = \["actions", "upgrades", "cultivation", "treasures", "challenges", "achievements", "statistics"\]/,
  "统计必须在内部页面顺序中位于成就之后并保持最末位");
assert.match(appSource, /actions: renderActionsPage[\s\S]*upgrades: renderUpgradesPage[\s\S]*cultivation: renderCultivationContentPage[\s\S]*treasures: renderTreasuresPage[\s\S]*challenges: renderChallenges[\s\S]*achievements: renderAchievementsPage[\s\S]*statistics: renderStatisticsPage/,
  "七个页面必须通过独立当前页渲染器分发");

console.log(JSON.stringify({
  passed: true,
  lazyAdvancedRealmGroups: true,
  lazyAchievementCards: true,
  pageRenderers: 7,
  ordinaryResourcesAffectCostSorting: false,
  batchInsertion: "template.content"
}, null, 2));
