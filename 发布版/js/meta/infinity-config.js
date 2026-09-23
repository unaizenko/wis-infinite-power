(function defineInfinityConfig(WIS) {
  'use strict';
  const rows = [
    ['B1-1','regular','无限宝物',1,[],null,null,'treasure',0,0,'宝物保留上限为 max(999, 999 × 累计获得无限点数)，包含本次收益。'],
    ['B1-2','regular','挑战-1',1,[],null,null,'retainChallenges',0,1,'无限转生保留福、禄、寿、五弊的完成奖励。'],
    ['B2','regular','无限-1',2,['B1-1','B1-2'],null,null,'points',1,0,'无限点数获取 ×2。'],
    ['B3-1','regular','界限突破-1',3,['B2'],null,null,'earlySoftcap',2,0,'削弱恒星及以前的量级软上限30%。'],
    ['B3-2','regular','界限突破-2',3,['B2'],null,null,'lateSoftcap',2,1,'削弱星系至宇宙结构的量级软上限30%。'],
    ['B4','regular','古戈尔适应',5,['B3-1','B3-2'],null,null,'googol',3,0,'削弱古戈尔惩罚强度35%。'],
    ['C1','systems','体系无限',5,[],null,null,'systems',0,0,'尚未实装，后续开放。当前不可购买。'],
    ['D1-1','numbers','超越葛立恒',1,[],null,null,'grahamCap',0,0,'允许G65及以上阶位。'],
    ['D1-2','numbers','超越树',1,[],null,null,'treeCap',0,1,'允许TREE(4)及以上阶位。'],
    ['D2-1','numbers','分形递进',2,['D1-1'],null,null,'fractal',1,0,'前一级分形资源强化后一级获取：1 + √log10(F前 + 1)。'],
    ['D2-2','numbers','G-T',2,['D1-2'],null,null,'construction',1,1,'树构造点获取 ×(1 + G/8)²。'],
    ['D3','numbers','大数挑战-1',5,['D2-1','D2-2'],null,null,'numberChallenges',2,0,'解锁真G1、真葛立恒、真TREE3。'],
    ['D4','numbers','T-G',7,['D3'],null,null,'grahamRequirement',3,0,'G阶位提升需求 ÷10^max(0,TREE−3)。'],
    ['E1','tempo','快速',3,[],null,null,'quick',0,0,'J与战力获取 ×100。'],
    ['E2-1','tempo','在线-1',5,['E1'],'tempo','online','tempoGain',1,0,'倍率从10000衰减至50，半衰期90游戏秒。'],
    ['E2-2','tempo','常规-1',5,['E1'],'tempo','steady','tempoGain',1,1,'J与战力固定 ×2000。'],
    ['E2-3','tempo','离线-1',5,['E1'],'tempo','offline','tempoGain',1,2,'倍率从500增长至5000，半衰期1800游戏秒。'],
    ['E3-1','tempo','在线-2',7,['E2-1'],null,'online','tempoSoftcap',2,0,'量级软上限削弱60%逐渐降至10%，半衰期120游戏秒。'],
    ['E3-2','tempo','常规-2',7,['E2-2'],null,'steady','tempoSoftcap',2,1,'量级软上限固定削弱30%。'],
    ['E3-3','tempo','离线-2',7,['E2-3'],null,'offline','tempoSoftcap',2,2,'量级软上限削弱10%逐渐升至55%，半衰期1800游戏秒。'],
    ['E4','tempo','节奏挑战-1',9,['E3-1','E3-2','E3-3'],null,null,'fastChallenge',3,0,'解锁挑战·快速：5秒内达到宇宙结构。']
  ];
  const nodes=Object.freeze(Object.fromEntries(rows.map(([id,branch,name,price,prerequisites,exclusiveGroup,route,effectId,row,column,description])=>
    [id,Object.freeze({id,branch,name,price,implemented:id!=='C1',prerequisites:Object.freeze(prerequisites),prerequisiteMode:id==='E4'?'any':'all',exclusiveGroup,route,effectId,position:Object.freeze({row,column}),description})])));
  WIS.Meta.InfinityConfig=Object.freeze({nodes,branches:Object.freeze({regular:'常规',systems:'体系',numbers:'大数',tempo:'节奏'}),
    minimumTree:3,treasureCap:999,pointMultiplier:2,softcapWeakening:.30,googolWeakening:.35,earlyLastStage:'恒星',
    retainedChallenges:Object.freeze(['innateDeficiency','powerless','longevity','fiveMisfortunes']),
    fractalLogOffset:1,fractalPower:.5,fractalReward:10,gTreeDivisor:8,gTreePower:2,
    gRequirement:100,gChallengeCoefficient:.01,gRewardExponent:.95,treeChallengeExponent:1.10,treeReward:3,
    gCapacityStart:64,gCapacityDivisor:8,gCapacityPower:2,
    treeGBase:10,treeGStart:3,treeWork:'1e9',treeDecayWork:'1e9',treeSeconds:28800,treeTimeGrowth:1.4,
    quickMultiplier:100,tempo:Object.freeze({online:Object.freeze({floor:50,amplitude:9950,halfLife:90}),steady:2000,
      offline:Object.freeze({floor:500,amplitude:4500,halfLife:1800})}),
    softcapTempo:Object.freeze({online:Object.freeze({floor:.10,amplitude:.50,halfLife:120}),steady:.30,
      offline:Object.freeze({floor:.10,amplitude:.45,halfLife:1800})}),
    fastSeconds:5,fastTargetScale:14,fastStockOffset:10,fastLogOffset:1,
    challenges:Object.freeze({
      trueG1:Object.freeze({name:'真G1',maxCompletions:1,infinityUpgrade:'D3',targetG:1,resetBigNumbers:true,catalogSystem:'大数',description:'各低层分形累计削弱高层获取。',rewardDescription:'所有分形获取 ×10'}),
      trueGraham:Object.freeze({name:'真葛立恒',maxCompletions:1,infinityUpgrade:'D3',targetG:64,resetBigNumbers:true,catalogSystem:'大数',description:'G提升需求提高至原需求^(1 + 0.01×G)。',rewardDescription:'正常状态G提升需求变为原需求^0.95'}),
      trueTree3:Object.freeze({name:'真TREE3',maxCompletions:1,infinityUpgrade:'D3',targetTree:3,resetBigNumbers:true,catalogSystem:'大数',description:'超构造阈值提高至原阈值^1.10。',rewardDescription:'树构造点获取 ×3'}),
      infinityFast:Object.freeze({name:'快速',maxCompletions:1,infinityUpgrade:'E4',deadlineSeconds:5,requiredScaleIndex:14,catalogSystem:'节奏',description:'5秒内达到宇宙结构，超时失败。',rewardDescription:'宇宙意志的双对数提升无限点数获取'})
    })});
}(window.WIS));
