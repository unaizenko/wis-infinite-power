(function defineInfinityConfig(WIS) {
  'use strict';
  const rows = [
    ['B1-1','regular','无限宝物',1,[],null,null,'treasure',0,0,'宝物保留上限为 max(999, 999 × 累计获得无限点数)，包含本次收益。'],
    ['B1-2','regular','挑战-1',1,[],null,null,'retainChallenges',0,1,'无限转生保留福、禄、寿、五弊的完成奖励。'],
    ['B2','regular','无限-1',2,['B1-1','B1-2'],null,null,'points',1,0,'无限点数获取 ×2。'],
    ['B3-1','regular','界限突破-1',3,['B2'],null,null,'earlySoftcap',2,0,'削弱恒星及以前的量级软上限30%。'],
    ['B3-2','regular','界限突破-2',3,['B2'],null,null,'lateSoftcap',2,1,'削弱星系至宇宙结构的量级软上限30%。'],
    ['B4','regular','古戈尔适应',5,['B3-1','B3-2'],null,null,'googol',3,0,'削弱古戈尔惩罚强度35%。'],
    ['B5-1','regular','挑战-2',8,['B4'],null,null,'retainPowerChallenges',4,0,'无限转生保留完全境界、无月、星球压制挑战的完成次数与奖励。'],
    ['B5-2','regular','挑战-3',8,['B4'],null,null,'retainCosmicChallenges',4,1,'无限转生保留太阳之力、银河、黑洞挑战的完成次数与奖励。'],
    ['B6','regular','古戈尔延迟',32,['B5-1','B5-2'],null,null,'googolDelay',5,0,'古戈尔惩罚改为每满10个数量级增加一次；1e110起第一次、1e120第二次，区间内不加重。'],
    ['C1','systems','体系无限',5,[],null,null,'systems',0,0,'解锁体系单体突破资格。'],
    ['C2','systems','自律体系',10,['C1'],null,null,'autoCultivation',1,0,'在设置的自动化管理中选择仙道或武道；无限转生后自动选择，保留原选择奖励。默认关闭。'],
    ['C3','systems','无限大数',50,['C2'],null,null,'universeY',2,0,'根据当前单体宇宙系数N，使Y获取 ×(1+N)^4。离线按起点N冻结倍率。'],
    ['C4','systems','圆环之理',100,['C3'],null,null,'ringChallenge',3,0,'解锁无限挑战·圆环之理：保留成就、无限点数和无限强化，重置其他内容，抵达单体量级，获得普通成就·一证永证。'],
    ['C5','systems','体系多元',500,['C4'],null,null,'systemsMultiverse',4,0,'解锁体系进入多元的突破资格；仙道可突破第四步·踏天。'],
    ['D1-1','numbers','超越葛立恒',1,[],null,null,'grahamCap',0,0,'允许G65及以上阶位。'],
    ['D1-2','numbers','超越树',1,[],null,null,'treeCap',0,1,'允许TREE(4)及以上阶位。'],
    ['D2-1','numbers','分形递进',2,['D1-1'],null,null,'fractal',1,0,'前一级分形资源强化后一级获取：1 + √log10(F前 + 1)。'],
    ['D2-2','numbers','G-T',2,['D1-2'],null,null,'construction',1,1,'树构造点获取 ×(1 + G/8)²。'],
    ['D3','numbers','大数挑战-1',5,['D2-1','D2-2'],null,null,'numberChallenges',2,0,'解锁真G1、真葛立恒、真TREE3。'],
    ['D4','numbers','T-G',7,['D3'],null,null,'grahamRequirement',3,0,'G阶位提升需求 ÷10^max(0,TREE−3)，在G超升阶减法之后、真葛立恒次方之前计算。'],
    ['D5','numbers','G树分离',12,['D4'],null,null,'earlyTree',4,0,'抵达G1即可开启大数·树界面并推进树构造。'],
    ['D6','numbers','G超升阶',21,['D5'],null,null,'gRankReduction',5,0,'G原始进度需求先减去当前G阶位，减完后最低为42；之后应用T-G除法与真葛立恒次方。'],
    ['D7-1','numbers','自律分形',24,['D6'],null,null,'autoFractal',6,0,'解锁自动升级分形，可在设置的自动化管理中开关。'],
    ['D7-2','numbers','自律构造',24,['D6'],null,null,'autoTreeUpgrades',6,1,'解锁自动升级节点、分枝、标签构造及已解锁的超构造增幅，可在设置的自动化管理中开关。'],
    ['D7-3','numbers','自律超构造',24,['D6'],null,null,'autoTreeSuper',6,2,'解锁自动进入超构造，可在设置的自动化管理中设定进入倍率；满足解锁条件和倍率后自动进入。'],
    ['D8','numbers','超构造点',30,['D7-1','D7-2','D7-3'],null,null,'superConstructionPoints',7,0,'超构造期间也获得树构造点；不推进普通坏序列。'],
    ['D9','numbers','超构造强化',36,['D8'],null,null,'superConstructionUpgrades',8,0,'超构造期间也可升级树构造强化，支持长按及自律构造；进入时锁定的基础倍率不变。'],
    ['D10','numbers','树构造超越',42,['D9'],null,null,'continuousTreeSuper',9,0,'完成当前TREE目标后保持超构造，沿用锁定基础倍率推进下一目标。离线只累计进度，返回在线后升阶。'],
    ['D11-1','numbers','超构造推进-1',49,['D10'],null,null,'superTimeBoost',10,0,'超构造倍率 ×(1 + √(本次超构造游戏秒数/600))。跨TREE保留计时，退出超构造或转生重置；离线计入时间，新增倍率返回在线后生效。'],
    ['D11-2','numbers','超构造推进-2',49,['D10'],null,null,'superUpgradeBoost',10,1,'解锁树构造强化4·超构造增幅：每级超构造倍率×1.2。首级1000构造点，费用依次×10、×11、×12.1……，支持长按和自动升级。'],
    ['D11-3','numbers','超构造推进-3',49,['D10'],null,null,'superRankBoost',10,2,'超构造倍率 ×1.2^当前已完成TREE阶位；在线升阶后立即更新。'],
    ['E1','tempo','快速',3,[],null,null,'quick',0,0,'J与战力获取 ×100。'],
    ['E2-1','tempo','在线-1',5,['E1'],'tempo','online','tempoGain',1,0,'J、战力倍率从10000衰减至50，约92分钟衰减至最低。'],
    ['E2-2','tempo','常规-1',5,['E1'],'tempo','steady','tempoGain',1,1,'J与战力固定 ×2000。'],
    ['E2-3','tempo','离线-1',5,['E1'],'tempo','offline','tempoGain',1,2,'J、战力倍率从500增长至5000，约27小时增长至最高。'],
    ['E3-1','tempo','在线-2',7,['E2-1'],null,'online','tempoSoftcap',2,0,'J、战力量级软上限削弱效果从60%降至10%，112分钟衰减至最低。'],
    ['E3-2','tempo','常规-2',7,['E2-2'],null,'steady','tempoSoftcap',2,1,'量级软上限固定削弱30%。'],
    ['E3-3','tempo','离线-2',7,['E2-3'],null,'offline','tempoSoftcap',2,2,'J、战力量级软上限削弱效果从10%升至55%，约27小时增长至最高。'],
    ['E4','tempo','节奏挑战-1',9,['E3-1','E3-2','E3-3'],null,null,'fastChallenge',3,0,'解锁无限挑战·快速：开启时进行一次无限转生，5秒内抵达宇宙结构。']
  ];
  const nodes=Object.freeze(Object.fromEntries(rows.map(([id,branch,name,price,prerequisites,exclusiveGroup,route,effectId,row,column,description])=>
    [id,Object.freeze({id,branch,name,price,implemented:true,prerequisites:Object.freeze(prerequisites),prerequisiteMode:id==='E4'?'any':'all',exclusiveGroup,route,effectId,position:Object.freeze({row,column}),description})])));
  WIS.Meta.InfinityConfig=Object.freeze({nodes,branches:Object.freeze({regular:'常规',systems:'体系',numbers:'大数',tempo:'节奏'}),
    minimumTree:3,treasureCap:999,pointMultiplier:2,softcapWeakening:.30,googolWeakening:.35,earlyLastStage:'恒星',
    retainedChallenges:Object.freeze(['innateDeficiency','powerless','longevity','fiveMisfortunes']),
    retainedChallengeGroups:Object.freeze({
      'B5-1':Object.freeze(['completeRealm','moonless','planetSuppression']),
      'B5-2':Object.freeze(['solarPower','galaxy','blackHole'])
    }),
    gRankMinimum:42,
    fractalLogOffset:1,fractalPower:.5,fractalReward:10,gTreeDivisor:8,gTreePower:2,
    gRequirement:100,gChallengeCoefficient:.01,gRewardExponent:.95,treeChallengeExponent:1.10,treeReward:3,
    gCapacityStart:64,gCapacityDivisor:8,gCapacityPower:2,
    treeTimeBoostSeconds:600,treeRankBoost:1.2,
    treeGBase:10,treeGStart:3,treeWork:'1e9',treeDecayWork:'1e9',treeSeconds:28800,treeTimeGrowth:1.4,
    quickMultiplier:100,tempo:Object.freeze({online:Object.freeze({floor:50,amplitude:9950,halfLife:90}),steady:2000,
      offline:Object.freeze({floor:500,amplitude:4500,halfLife:1800})}),
    softcapTempo:Object.freeze({online:Object.freeze({floor:.10,amplitude:.50,halfLife:120}),steady:.30,
      offline:Object.freeze({floor:.10,amplitude:.45,halfLife:1800})}),
    fastSeconds:5,fastTargetScale:14,fastStockOffset:10,fastLogOffset:1,
    challenges:Object.freeze({
      trueG1:Object.freeze({name:'真 G1',maxCompletions:1,infinityUpgrade:'D3',targetG:1,resetBigNumbers:true,catalogSystem:'大数',description:'各低层分形累计削弱高层获取。',achievementKey:'trueG1',rewardDescription:'解锁成就·真 G1'}),
      trueGraham:Object.freeze({name:'真葛立恒',maxCompletions:1,infinityUpgrade:'D3',targetG:64,resetBigNumbers:true,catalogSystem:'大数',description:'G提升需求提高至原需求^(1 + 0.01×G)。',achievementKey:'trueGraham',rewardDescription:'解锁成就·真葛立恒'}),
      trueTree3:Object.freeze({name:'真 TREE3',maxCompletions:1,infinityUpgrade:'D3',targetTree:3,resetBigNumbers:true,catalogSystem:'大数',description:'超构造阈值提高至原阈值^1.10。',achievementKey:'trueTree3',rewardDescription:'解锁成就·真 TREE3'}),
      infinityRing:Object.freeze({name:'圆环之理',maxCompletions:1,infinityUpgrade:'C4',targetXiuzhenRealm:7,catalogSystem:'无限',resetLevel:'infinity',achievementKey:'eternalWitness',description:'保留成就、无限点数和无限强化，重置其他游戏进度，重新抵达单体宇宙量级。期间可进行普通、体系挑战及转生；退出不恢复原进度。',rewardDescription:'获得普通成就·一证永证：无限转生及以下等级转生不再重置体系挑战'}),
      infinityFast:Object.freeze({name:'快速',maxCompletions:1,infinityUpgrade:'E4',deadlineSeconds:5,requiredScaleIndex:14,catalogSystem:'无限',resetLevel:'infinity',rewardKey:'infinityFast',description:'开启时进行一次无限转生；5秒内抵达宇宙结构，超时失败。',rewardDescription:'宇宙意志的双对数永久提升无限点数获取'})
    })});
}(window.WIS));

