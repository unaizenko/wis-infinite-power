"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

global.window = global;
window.confirm = () => true;

const root = path.resolve(__dirname, "..");
function load(relativePath) {
  const filename = path.join(root, relativePath);
  vm.runInThisContext(fs.readFileSync(filename, "utf8"), { filename });
}

[
  "js/vendor/break_eternity.min.js",
  "js/core/namespace.js",
  "js/core/bignum.js",
  "js/core/config.js",
  "js/core/registry.js",
  "js/core/formulas.js",
  "js/core/penalties.js",
  "js/core/integration.js",
  "js/core/runtime.js",
  "js/core/state.js",
  "js/core/resources.js",
  "js/core/effects.js",
  "js/core/sources.js",
  "js/core/reset.js"
].forEach(load);

WIS.Meta.Achievements = Object.freeze({
  has: (current, key) => current.unlockedAchievements?.[key] === true,
  record: (current, key) => { current.unlockedAchievements[key] = true; }
});
WIS.Meta.Treasures = Object.freeze({ add() {} });

let state = WIS.Core.State.fresh();
let lastNotice = "";
WIS.Core.Runtime.bind({
  state: () => state,
  setState: (nextState) => { state = nextState; },
  save: () => {},
  render: () => {},
  showNotice: (message) => { lastNotice = message; },
  switchPage: () => {},
  achievementStates: () => ({}),
  notifyNewAchievements: () => {},
  cultivationUnlocked: () => true,
  treasuresUnlocked: () => true,
  format: (value) => String(value),
  freshState: () => WIS.Core.State.fresh(),
  updateLifetimeStatistics: () => {},
  checkActiveChallengeCompletion: () => WIS.Meta.Challenges?.checkActiveChallengeCompletion?.(),
  resetTransientAccumulators: () => {},
  resetCultivationPage: () => {},
  applyResourceSoftcapProgressive: (gain) => gain,
  celestialDeclineExponent: () => WIS.Cultivation.ImmortalLogic?.celestialDeclineExponent?.() ?? 1
});
WIS.Core.Resources.bind(() => state);

load("js/cultivation/immortal-logic.js");
load("js/cultivation/immortal.js");
load("js/power/scale-logic.js");
load("js/power/scale.js");
load("js/meta/challenges.js");

const Immortal = WIS.Cultivation.ImmortalLogic;
const Scale = WIS.Power.ScaleLogic;
const Challenges = WIS.Meta.Challenges;
const config = WIS.Core.Config;
const { ZERO, ONE, add, sub, mul, div, pow, sqrt, log10, abs, max, gt, gte, lt, eq, isFiniteBN, toNumber } = WIS.Core.BigNum;

function reset(overrides = {}) {
  state = WIS.Core.State.fresh();
  state.cultivation.active = "immortal";
  Object.assign(state, overrides);
  return state;
}

function close(actual, expected, relativeTolerance = 1e-12, message = "") {
  const scale = max(ONE, abs(expected));
  const error = toNumber(div(abs(sub(actual, expected)), scale), Infinity);
  assert.ok(error <= relativeTolerance,
    `${message} actual=${actual} expected=${expected}`);
}

function closeLog10(actual, expectedLog10, tolerance = 1e-10, message = "") {
  assert.ok(gt(actual, ZERO) && isFiniteBN(actual), `${message} 应为有限正数，实际 ${actual}`);
  close(log10(actual), expectedLog10, tolerance, message);
}

// 道祖突破只取消五衰并开放购买；五项能力购买后才生效。
const daoRequirement = config.immortalPower.realmCosts.daoAncestor;
const daoConfig = config.immortalPower.daoAncestor;
function expectedDaoDomainExponent(ratio) {
  const magnitude = Math.log10(1 + ratio);
  return daoConfig.domainBaseExponent +
    daoConfig.domainGrowthCoefficient * Math.log10(1 + magnitude);
}
function expectedDaoAssimilationQ(ratio) {
  const magnitude = Math.log10(1 + ratio);
  return 1 / (1 + daoConfig.assimilationCoefficient * Math.log10(1 + magnitude));
}
reset({ advancedRealmLevel: 10, qiRefiningUnlocked: true, foundationUnlocked: true,
  goldenCoreUnlocked: true, immortalPower: daoRequirement, reincarnationElapsedSeconds: 0 });
assert.equal(Immortal.daoAncestorActive(), true);
assert.equal(Immortal.daoTimeLawExponent(), 1);
assert.ok(eq(Immortal.daoPowerSource(), ZERO), "未购买道祖威能时不得生成来源");
assert.equal(Immortal.daoDomainExponent(), 1, "未购买界域时不得提升灵域来源");
assert.equal(Immortal.daoAssimilationQ(), 1, "未购买天道同化时不得弱化软上限");
assert.equal(Immortal.celestialDeclineExponent(), 1, "刚突破道祖即应完全取消天人五衰");
Object.assign(state, {
  daoLawUnityUnlocked: true,
  daoDomainUnlocked: true,
  daoPowerUnlocked: true,
  daoTimeLawUnlocked: true,
  daoAssimilationUnlocked: true
});
close(Immortal.daoPowerSource(0), 1e54, 1e-12, "刚突破且仙灵力被消耗完时的道祖威能");
close(Immortal.daoDomainExponent(0), expectedDaoDomainExponent(0), 1e-12,
  "刚突破时界域基础指数");
close(Immortal.daoAssimilationQ(0), 1, 1e-12, "刚突破时天道同化不应凭空解除软上限");
close(Immortal.daoPowerSource(), 1e54 * Math.pow(2, 1.6), 1e-12, "I/R=1时道祖威能");
close(Immortal.daoDomainExponent(), expectedDaoDomainExponent(1), 1e-12, "I/R=1时界域");
close(Immortal.daoAssimilationQ(), expectedDaoAssimilationQ(1), 1e-12, "I/R=1时天道同化");

for (const hours of [1, 2, 4, 8, 24]) {
  state.reincarnationElapsedSeconds = hours * 3600;
  close(Immortal.daoTimeLawExponent(), 1 + 0.12 * Math.log2(1 + hours), 1e-12,
    `${hours}小时的时间法则指数`);
}
state.reincarnationElapsedSeconds = 3600;
state.totalElapsedSeconds = 1e12;
close(Immortal.daoTimeLawExponent(), 1.12, 1e-12, "时间法则不能读取历史总游戏时间");
assert.ok(Immortal.daoTimeLawExponent(1e12) > Immortal.daoTimeLawExponent(24 * 3600),
  "时间法则指数不得设置硬上限");

for (const ratio of [1, 1e3, 1e6, 1e9]) {
  state.immortalPower = mul(daoRequirement, ratio);
  close(Immortal.daoPowerSource(), 1e54 * Math.pow(1 + ratio, 1.6), 2e-12,
    `I/R=${ratio} 的道祖威能`);
  close(Immortal.daoDomainExponent(), expectedDaoDomainExponent(ratio), 1e-12,
    `I/R=${ratio} 的界域`);
  close(Immortal.daoAssimilationQ(), expectedDaoAssimilationQ(ratio), 1e-12,
    `I/R=${ratio} 的天道同化`);
  assert.ok(Immortal.daoAdjustedSoftcapExponent(0.6) < 1,
    "有限仙灵力不能直接解除正常量级软上限");
}

const daoAbilityPurchases = [
  ["daoLawUnity", "daoLawUnityUnlocked", "1e24"],
  ["daoDomain", "daoDomainUnlocked", "3e24"],
  ["daoPower", "daoPowerUnlocked", "1e25"],
  ["daoTimeLaw", "daoTimeLawUnlocked", "3e25"],
  ["daoAssimilation", "daoAssimilationUnlocked", "1e26"]
];
reset({ advancedRealmLevel: 10, immortalPower: "2e26" });
daoAbilityPurchases.forEach(([abilityId, stateKey, expectedCost]) => {
  assert.ok(eq(config.immortalPower.abilityCosts[abilityId], expectedCost), `${abilityId}费用必须正确`);
  const before = state.immortalPower.toString();
  Immortal.buyAbility(abilityId);
  assert.equal(state[stateKey], true, `${abilityId}必须购买后解锁`);
  close(sub(before, state.immortalPower), expectedCost, 1e-12, `${abilityId}必须消耗对应仙灵力`);
});

reset({ advancedRealmLevel: 10, immortalPower: "1e24" });
state.unlockedAchievements.infantSpirit = true;
state.cultivation.systems.immortal.history.manualAbilities.daoLawUnityUnlocked = true;
assert.equal(Immortal.autoUpgradeImmortalAbilities(), 1, "道祖能力必须接入现有自动购买逻辑");
assert.equal(state.daoLawUnityUnlocked, true);

reset({ advancedRealmLevel: 9, qiRefiningUnlocked: true, foundationUnlocked: true,
  goldenCoreUnlocked: true, lawUnlocked: true, lawOriginUnlocked: true, mana: 1e30 });
const lawBeforeDao = Immortal.lawImmortalPowerMultiplier();
state.advancedRealmLevel = 10;
state.daoLawUnityUnlocked = true;
close(Immortal.lawImmortalPowerMultiplier(), Math.pow(lawBeforeDao, 1.6), 1e-12,
  "大道归一必须指数提升最终法则倍率");

reset({
  advancedRealmLevel: 10,
  qiRefiningUnlocked: true,
  foundationUnlocked: true,
  goldenCoreUnlocked: true,
  immortalPower: daoRequirement,
  spiritDomainUnlocked: true,
  daoDomainUnlocked: true,
  daoPowerUnlocked: true,
  daoTimeLawUnlocked: true,
  daoAssimilationUnlocked: true,
  reincarnationElapsedSeconds: 3600
});
const domainConfig = config.immortalPower.spiritDomain;
const plainDomainSource = mul(domainConfig.baseJoules, pow(
  add(ONE, div(daoRequirement, domainConfig.immortalPowerScale)),
  domainConfig.exponent
));
close(Immortal.spiritDomainJSource(), pow(plainDomainSource, Immortal.daoDomainExponent()), 2e-12,
  "界域只指数提升灵域独立来源");
assert.equal(Immortal.celestialDeclineExponent(), 1, "道祖阶段天人五衰必须完全失效");

// 道祖只正式解除至恒星；星系以上仍逐层接受天道同化。
state.immortalPower = mul(daoRequirement, 1e6);
const galaxyAmount = 1e70;
const daoStages = Scale.resourceSoftcapStageExponents(galaxyAmount);
assert.deepEqual(daoStages.map((entry) => entry.name), ["星系", "超星系团", "宇宙结构"]);
const rawDaoStages = Scale.resourceSoftcapStageExponents(galaxyAmount, "normal", true, false);
daoStages.forEach((entry, index) => {
  close(entry.exponent, Immortal.daoAdjustedSoftcapExponent(rawDaoStages[index].exponent), 1e-12,
    `道祖第${index + 1}层正常软上限应独立同化`);
});
close(Scale.specialResourceSoftcapExponent(galaxyAmount),
  rawDaoStages.reduce((product, entry) => product * entry.exponent, 1), 1e-12,
  "特殊/集中来源软上限不得受到天道同化");
state.joules = galaxyAmount;
state.reincarnationElapsedSeconds = 0;
const daoJBeforeTime = Scale.preSoftcapJGainFromSources([10]);
state.reincarnationElapsedSeconds = 3600;
close(Scale.preSoftcapJGainFromSources([10]), Math.pow(daoJBeforeTime, 1.12), 1e-12,
  "时间法则必须在J区域之后、正常量级软上限之前结算");
state.power = galaxyAmount;
const daoPowerBeforeSoftcap = Scale.preSoftcapPowerGainFromSources([Immortal.daoPowerSource()]);
assert.ok(lt(Scale.finalPowerGainFromSources([Immortal.daoPowerSource()]), daoPowerBeforeSoftcap),
  "道祖威能不得绕过正常战力量级软上限");

reset({
  advancedRealmLevel: 10,
  qiRefiningUnlocked: true,
  foundationUnlocked: true,
  goldenCoreUnlocked: true,
  circulationUnlocked: true,
  mana: "1",
  immortalPower: "1e26",
  joules: "1e1000000",
  power: "1e1000000",
  daoTimeLawUnlocked: true,
  daoPowerUnlocked: true,
  daoAssimilationUnlocked: true,
  reincarnationElapsedSeconds: 24 * 3600
});
WIS.Core.Effects.beginTick(state);
const fastManaStartedAt = Date.now();
const fastManaSettlement = Immortal.automaticManaGainProgressive(1);
const fastManaElapsedMs = Date.now() - fastManaStartedAt;
const fastManaLog10 = log10(state.mana).toString();
assert.ok(fastManaSettlement.segments <= 32, "高速法力结算不得超过32个自适应分段");
assert.equal(fastManaSettlement.capped, false, "自适应分段必须完整结算整个tick");
assert.notEqual(fastManaLog10, "NaN", "高速法力结算后的法力对数必须有效");
[state.joules, state.power, state.mana, state.immortalPower].forEach((resource) => {
  assert.ok(isFiniteBN(resource), `高速结算后资源必须保持有限：${resource}`);
});

// 成就解锁与挑战重置。
reset({
  advancedRealmLevel: 10,
  mana: 1e80,
  immortalPower: 1e30,
  joules: 1e60,
  power: 1e60,
  foundationUnlocked: true,
  goldenCoreUnlocked: true,
  lawUnlocked: true,
  immortalApertureLevel: 20,
  daoLawUnityUnlocked: true,
  daoDomainUnlocked: true,
  daoPowerUnlocked: true,
  daoTimeLawUnlocked: true,
  daoAssimilationUnlocked: true,
  bestQiLayer: 4321
});
state.unlockedAchievements.scale4 = true;
state.unlockedAchievements.selfSeveringSlash = true;
assert.equal(Challenges.challengeUnlocked("qiRefiningHundredThousandYears"), true);
Challenges.startChallenge("qiRefiningHundredThousandYears");
assert.equal(state.activeChallenge, "qiRefiningHundredThousandYears");
assert.equal(state.cultivation.active, "immortal");
assert.ok(eq(state.joules, ZERO));
assert.ok(eq(state.power, ZERO));
assert.ok(eq(state.mana, ZERO));
assert.ok(eq(state.immortalPower, ZERO));
assert.equal(state.currentQiLayer, 1);
assert.equal(state.bestQiLayer, 4321, "挑战重置必须保留历史最高炼气层数");
assert.equal(state.qiRefiningUnlocked, true);
assert.equal(state.foundationUnlocked, false);
assert.equal(state.goldenCoreUnlocked, false);
assert.equal(state.advancedRealmLevel, 0);
assert.equal(state.lawUnlocked, false);
assert.equal(state.immortalApertureLevel, 0);
assert.equal(state.daoLawUnityUnlocked, false);
assert.equal(state.daoDomainUnlocked, false);
assert.equal(state.daoPowerUnlocked, false);
assert.equal(state.daoTimeLawUnlocked, false);
assert.equal(state.daoAssimilationUnlocked, false);
assert.equal(Immortal.daoAncestorActive(), false);

state.mana = Immortal.qiLayerRequirement(2);
Immortal.unlockFoundation();
assert.equal(state.currentQiLayer, 2, "挑战内筑基按钮应改为提升炼气层数");
assert.equal(state.bestQiLayer, 4321, "历史最高层与永久奖励必须等到退出挑战时再更新");
assert.equal(state.foundationUnlocked, false, "挑战内不得突破筑基");
state.currentQiLayer = 100;
state.mana = Immortal.qiLayerRequirement(101);
Immortal.unlockFoundation();
assert.equal(state.currentQiLayer, 101, "炼气层数应能超过正常境界层数限制");
Immortal.unlockGoldenCore();
Immortal.unlockAdvancedRealm(0);
assert.equal(state.goldenCoreUnlocked, false);
assert.equal(state.advancedRealmLevel, 0);

// 需求曲线及三个挑战专属来源。
const sampledLayers = [1000, 10000, 25000, 50000, 75000, 100000];
const baseLog = toNumber(log10(config.costs.immortal.foundation), 0);
for (const layer of sampledLayers) {
  const x = (layer - 1) / 99999;
  const expectedRequirementLog = baseLog + (308 - baseLog) * Math.pow(x, 1.05);
  closeLog10(Immortal.qiLayerRequirement(layer), expectedRequirementLog, 2e-12,
    `${layer}层突破需求`);
  closeLog10(Immortal.qiLayerManaMultiplier(layer), 0.0004 * (layer - 1), 2e-12,
    `${layer}层法力倍率`);
  closeLog10(Immortal.qiLayerManaSourceMultiplier(layer), 0.0006 * (layer - 1), 2e-12,
    `${layer}层法力J/战力倍率`);
}
closeLog10(Immortal.qiLayerRequirement(100000), 308, 1e-12, "十万层需求");
assert.ok(isFiniteBN(Immortal.qiLayerRequirement(100001)) && gt(Immortal.qiLayerRequirement(100001), "1e308"),
  "大数实现必须允许十万层后继续增长且不得产生Infinity");

state.currentQiLayer = 100000;
state.mana = 1e20;
const challengeSources = Immortal.externalSources();
const manaJ = challengeSources.find((source) => source.id === "manaJ");
const manaPower = challengeSources.find((source) => source.id === "qiManaPower");
close(manaPower.value, mul(add(ONE, state.mana), pow(10, 0.0006 * 99999)), 2e-12,
  "法力战力必须作为软上限前独立来源生成");
assert.ok(gt(manaJ.value, Immortal.manaJRawBonus()), "法力J来源必须获得炼气层数强化");
state.power = 1e35;
const qiPowerEvaluationAmount = Scale.resourceSoftcapIntegrationEvaluationAmount(state.power);
const qiPowerEquivalentRaw = Scale.automaticPowerRawPerSecondAt(qiPowerEvaluationAmount);
const qiPowerSettled = Scale.automaticPowerSettledPerSecondAt(qiPowerEvaluationAmount);
assert.ok(isFiniteBN(qiPowerSettled) && lt(qiPowerSettled, qiPowerEquivalentRaw),
  "炼气法力战力必须进入公共区域与正常量级软上限，不能最终加算");

// 2、3、5层正常量级软上限逐层修正；法力来源获得第二次抗性。
const layeredSoftcapSamples = [2, 3, 5].map((count) => [
  // 炼气境界已正式解除首层“爆墙”，故从第二层开始计正在生效的层数。
  sqrt(mul(config.softcaps[count].threshold, config.softcaps[count + 1].threshold)),
  count
]);
for (const [amount, expectedCount] of layeredSoftcapSamples) {
  const baseStages = Scale.resourceSoftcapStageExponents(amount, "normal", true, false);
  const normalStages = Scale.resourceSoftcapStageExponents(amount, "normal");
  const manaStages = Scale.resourceSoftcapStageExponents(amount, "mana");
  assert.equal(normalStages.length, expectedCount);
  assert.equal(manaStages.length, expectedCount);
  baseStages.forEach((entry, index) => {
    const globalExpected = 1 - (1 - entry.exponent) * Immortal.qiGlobalSoftcapQ();
    const manaExpected = 1 - (1 - globalExpected) * Immortal.qiManaSoftcapQ();
    close(normalStages[index].exponent, globalExpected, 1e-12,
      `${expectedCount}层场景的第${index + 1}层全局抗性`);
    close(manaStages[index].exponent, manaExpected, 1e-12,
      `${expectedCount}层场景的第${index + 1}层法力额外抗性`);
    assert.ok(manaStages[index].exponent > normalStages[index].exponent);
  });
  const activeChallenge = state.activeChallenge;
  state.activeChallenge = null;
  const specialExponentWithoutChallenge = Scale.specialResourceSoftcapExponent(amount);
  state.activeChallenge = activeChallenge;
  close(Scale.specialResourceSoftcapExponent(amount), specialExponentWithoutChallenge, 1e-12,
    "挑战与集中来源等特殊软上限不得获得炼气抗性");
}
close(Immortal.qiAdjustedSoftcapExponent(0.6, false), 0.8, 1e-12,
  "十万层普通来源的^0.60应调整为^0.80");
close(Immortal.qiAdjustedSoftcapExponent(0.6, true), 0.96, 1e-12,
  "十万层法力J/战力的^0.60应调整为^0.96");

// 退出、历史最佳和重复挑战：奖励只按最佳层重新计算，完成次数不叠加。
state.currentQiLayer = 100000;
Challenges.exitChallenge();
assert.equal(state.bestQiLayer, 100000);
assert.equal(state.challengeCompletions.qiRefiningHundredThousandYears, 1);
close(Immortal.qiChallengeReward(), 1e6, 1e-12, "十万层永久吐纳奖励");
const firstReward = Immortal.qiChallengeReward();
Challenges.startChallenge("qiRefiningHundredThousandYears");
assert.equal(state.activeChallenge, "qiRefiningHundredThousandYears", "已完成挑战应允许重复进入");
state.currentQiLayer = 50000;
Challenges.exitChallenge();
assert.equal(state.bestQiLayer, 100000);
assert.equal(state.challengeCompletions.qiRefiningHundredThousandYears, 1);
assert.ok(eq(Immortal.qiChallengeReward(), firstReward), "重复挑战不得叠乘或降低永久奖励");

state.challengeCompletions.innateDeficiency = config.challenges.innateDeficiency.maxCompletions;
Challenges.startChallenge("innateDeficiency");
assert.equal(state.activeChallenge, "innateDeficiency", "普通已完成挑战也必须允许重复进入");
state.highestScaleIndex = 4;
assert.equal(Challenges.checkActiveChallengeCompletion(), true, "重复挑战达到原目标后应正常结束");
assert.equal(state.challengeCompletions.innateDeficiency,
  config.challenges.innateDeficiency.maxCompletions,
  "重复完成挑战不得突破完成次数上限或再次增加奖励层数");
assert.match(lastNotice, /重复挑战成功.*无额外奖励/,
  "普通重复挑战完成时必须明确提示无额外奖励");

// 数值推进诊断：扣除直接法力层数倍率后，逐层法力需求仍持续变难，不会在后半程反向加速。
let previousNetRequirementLog = -Infinity;
for (let layer = 1; layer <= 100000; layer += 1) {
  const requirementLog = toNumber(log10(Immortal.qiLayerRequirement(layer)), Infinity);
  const netRequirementLog = requirementLog - toNumber(log10(Immortal.qiLayerManaMultiplier(layer)), Infinity);
  assert.ok(netRequirementLog >= previousNetRequirementLog,
    `第${layer}层扣除直接法力倍率后的需求不应下降`);
  previousNetRequirementLog = netRequirementLog;
}

state.activeChallenge = "qiRefiningHundredThousandYears";
state.cultivation.active = "immortal";
state.qiRefiningUnlocked = true;
state.currentQiLayer = 1;
for (let targetLayer = 2; targetLayer <= 100000; targetLayer += 1) {
  state.mana = Immortal.qiLayerRequirement(targetLayer);
  assert.equal(Immortal.advanceQiLayer(false), true,
    `从${targetLayer - 1}层推进到${targetLayer}层应保持有限且一次只提升一层`);
}
assert.equal(state.currentQiLayer, 100000, "完整模拟必须安全推进至炼气十万层");
assert.ok(isFiniteBN(state.mana), "完整推进不得把资源污染为Infinity");
state.activeChallenge = null;

// 存档字段必须可往返；best无硬上限，当前层在Number终点内安全归一化。
state.bestQiLayer = 123456;
state.currentQiLayer = 100000;
const restored = WIS.Core.State.normalizeDomain(WIS.Core.State.toSerializable(state));
assert.equal(restored.bestQiLayer, 123456);
assert.equal(restored.currentQiLayer, 100000);

assert.match(lastNotice, /退出挑战|开启挑战|挑战目标达成|重复挑战成功/);
console.log(JSON.stringify({
  passed: true,
  daoTimeExponents: Object.fromEntries([1, 2, 4, 8, 24].map((hours) => [hours,
    1 + 0.12 * Math.log2(1 + hours)])),
  qiRequirementLog10: Object.fromEntries(sampledLayers.map((layer) => [layer,
    toNumber(log10(Immortal.qiLayerRequirement(layer)), Infinity)])),
  maximumReward: Immortal.qiChallengeReward(100000),
  fastManaSegments: fastManaSettlement.segments,
  fastManaElapsedMs,
  fastManaLog10
}, null, 2));
