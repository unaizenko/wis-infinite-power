"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const gameSource = fs.readFileSync(path.join(root, "game.js"), "utf8");
const appSource = fs.readFileSync(path.join(root, "js", "ui", "app.js"), "utf8");
const achievementSource = fs.readFileSync(path.join(root, "js", "meta", "achievements.js"), "utf8");

assert.match(
  gameSource,
  /async function simulateOfflineProgressChunked[\s\S]*Math\.min\(OFFLINE_MAX_STEPS,[\s\S]*const chunkSize = 20;/,
  "启动离线结算必须分块，并继续受offlineMaxSteps限制"
);

const startupSection = gameSource.slice(gameSource.indexOf("UI.bindEvents();"));
assert.ok(
  startupSection.indexOf('switchPage("actions");') < startupSection.indexOf("queueInitialOfflineProgress"),
  "首次基础render必须早于启动离线结算"
);
assert.doesNotMatch(startupSection.slice(0, startupSection.indexOf("queueInitialOfflineProgress")), /ensureAchievementCards\(\)/,
  "启动首次绘制前不得创建全部成就卡");

assert.match(
  appSource,
  /if \(!dirtyCostGroupPages\.has\(activePage\)\) return;[\s\S]*sortByCost\(rawById\(`\$\{activePage\}-page`\)\)/,
  "费用组只能在当前页dirty时重新排序"
);
assert.match(appSource, /achievements: renderAchievementsPage/,
  "成就页必须仅由当前页面渲染器刷新");
assert.match(
  gameSource,
  /setInterval\(\(\) => \{[\s\S]*renderResourceDebugPanel\(\);[\s\S]*\}, 1000\);/,
  "开发版来源调试必须使用独立的1000ms刷新器"
);

const renderSection = appSource.slice(appSource.indexOf("  function render({"), appSource.indexOf("  function bindHoldButton"));
assert.doesNotMatch(renderSection, /window\.renderResourceDebug/, "普通4Hz render不得刷新来源调试");
assert.match(renderSection, /renderCurrentPageOnly = true;[\s\S]*renderPage\(activePage\);[\s\S]*dirtyPages\.delete\(activePage\);[\s\S]*finally/,
  "完整render只能写当前页面，并在完成后清除当前页dirty状态");
assert.match(appSource, /if \(achievementCardsCreated \|\| container\.children\.length > 0\)/,
  "成就动态卡片必须最多创建一次");

const mainTickSection = gameSource.slice(gameSource.indexOf("  function runMainTick()"), gameSource.indexOf("  document.addEventListener", gameSource.indexOf("  function runMainTick()")));
assert.equal((mainTickSection.match(/flushRender\(/g) || []).length, 1, "一个逻辑Tick最多提交一次完整render");
assert.equal((mainTickSection.match(/\brender\(/g) || []).length, 0, "逻辑Tick内不得直接调用完整render");
assert.match(gameSource, /render: requestRender,/, "模块的runtime.render必须只提交渲染请求");
assert.match(gameSource, /function requestRender\(pageName\)[\s\S]*renderPending = true;/,
  "连续解锁和自动购买必须合并为一个待提交render");

const notifyStart = achievementSource.indexOf("  function notifyNewAchievements");
const notifySection = achievementSource.slice(
  notifyStart,
  achievementSource.indexOf("  WIS.Meta.Achievements = Object.freeze", notifyStart)
);
assert.equal((notifySection.match(/achievementDefinitions\(\)/g) || []).length, 1,
  "一次成就批处理只能计算一次完整成就定义");
assert.match(appSource, /achievementNoticeQueue\.push\(batch\)/,
  "多批成就提示必须排队显示");

console.log(JSON.stringify({
  passed: true,
  offlineMaximumSteps: 600,
  offlineChunkSize: 20,
  resourceDebugIntervalMilliseconds: 1000,
  maximumUiFrequencyHertz: 4,
  lazyPageRendering: true
}, null, 2));
