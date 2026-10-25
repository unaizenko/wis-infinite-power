(function defineMartialConfig(WIS) {
  "use strict";
  const branches = Object.freeze({ neijia: { name: "内家拳" }, inner: { name: "内功" }, moves: { name: "招式" }, jueji: { name: "绝技" }, special: { name: "特殊能力" }, shengong: { name: "神功" }, devour: { name: "宇宙流" }, shroud: { name: "秘境流" } });
  const upgradeResources = Object.freeze({ xingYi:"body", jiuYang:"qi", jiuYin:"qi", qianKun:"qi", xiangLong:"qi", liuMai:"qi", duoMing:"qi" });
  const abilities = [
    ["mingJin", "明劲", "neijia", 1, 1, { body: 3 }, [], "根据当前J，提升体提供的战力来源。"],
    ["yiJin", "易筋", "neijia", 1, 1, { body: 3 }, [], "提高锻体的兑换效率。"],
    ["anJin", "暗劲", "neijia", 1, 2, { body: 10 }, ["mingJin"], "提升体提供的战力来源。"],
    ["yiGu", "易骨", "neijia", 1, 3, { body: 20 }, ["yiJin"], "根据当前战力，提高锻体的兑换效率。"],
    ["huaJin", "化劲", "neijia", 1, 4, { qi: 30, body: 30 }, ["anJin"], "根据当前气，提升体提供的战力来源。"],
    ["gangJin", "罡劲", "neijia", 1, 30, { qi: 300, body: 300, heart: 40 }, ["huaJin"], "全局战力获取倍率×10。"],
    ["danJin", "丹劲", "neijia", 1, 60, { qi: 1000, body: 1000, heart: 120 }, ["gangJin"], "按1＋√当前已购买健身等级，提升凝气、锻体兑换效率与直接气、体基础获取；随后仍计算高值与心支撑减速。"],
    ["yiSui", "易髓", "neijia", 1, 6, { body: 100 }, ["yiGu"], "根据当前体，提高锻体的兑换效率。"],
    ["ganDong", "感动", "neijia", 1, 2, { heart: 1 }, [], "提高炼心的兑换效率。"],
    ["sanTi", "三体式", "neijia", 1, 3, { heart: 3 }, [], "提升全局J获取。"],
    ["taiJi", "国术·太极拳", "neijia", 1, 6, { heart: 10 }, [], "提升全局J与战力获取。", "guoshu"],
    ["xingYi", "国术·形意拳", "neijia", 12, 2, { heart: 15 }, [], "随等级提升全局J与战力获取。", "guoshu"],
    ["baGua", "国术·八卦掌", "neijia", 1, 8, { body: 200, heart: 20 }, [], "提升全局J与战力获取。", "guoshu"],
    ["stealHeaven", "盗天机", "neijia", 1, 5, { heart: 10 }, [], "解锁盗天机挑战；完成挑战后，心可进一步增强气、体获取。"],
    ["innerHarmony", "内三合", "special", 1, 10, { heart: 40 }, [], "解锁三合挑战；全部完成后，炼心可保留部分气、体。"],
    ["reverseArt", "逆练功法", "special", 1, 12, { heart: 60 }, [], "增加可同时修炼的内功名额。"],
    ["innate", "先天", "special", 1, 15, { heart: 120 }, [], "解锁任督二脉挑战；完成后提升气的兑换效率。"],
    ["changSheng", "神功·长生诀", "shengong", 1, 100, { heart: 120 }, ["innate"], "首次解锁清空所有内功等级与龙象修炼进度，不返还资源。此后内功解锁与付费升级价格乘以10×(当前内功种类数+1)。每秒基础产气为内功种类数的平方，可受丹劲、基因源能提升，随后受气高值与心支撑削弱。"],
    ["tianMo", "神功·天魔策", "shengong", 1, 200, { heart: 200 }, ["innate"], "每实际消耗1心，基础获得10气；受丹劲、基因源能提升，并按扣费后的库存与心计算高值及心支撑减速。"],
    ["ciHang", "神功·慈航剑典", "shengong", 1, 200, { heart: 200 }, ["innate"], "每实际消耗1心，基础获得10体；受丹劲、基因源能提升，并按扣费后的库存与心计算高值及心支撑减速。"],
    ["geneEnergy", "基因源能", "devour", 9, [200,400,800,1600,3200,6400,12800,25600,51200], { qi:1000,body:1000,heart:120 }, [], "每级使凝气、锻体兑换效率及直接气、体获取×2，最多9级；随后仍计算高值与心支撑减速。"],
    ["crystalMeditation", "水晶冥想", "devour", 1, 600, { heart:300 }, ["geneEnergy"], "炼心、神魂兑换效率×5，随后仍计算高值与神魂支撑减速。"],
    ["kuHai", "苦海", "shroud", 1, 1000, { qi:10000 }, [], "呼吸法倍率乘以1＋[log10(1＋当前气)]²；需已解锁呼吸法。"],
    ["mingQuan", "命泉", "shroud", 1, 2000, { body:10000 }, ["kuHai"], "极限运动倍率乘以1＋[log10(1＋当前体)]²；需已解锁极限运动。"],
    ["shenQiao", "神桥", "shroud", 1, 5000, { heart:1000 }, ["mingQuan"], "取消鬼背的J获取负面效果，鬼背战力倍率乘以1＋[log10(1＋当前心)]²；需已解锁并激活鬼背。"],
    ["jiuYang", "内功·九阳神功", "inner", 9, [1,1,2,2,3,3,4,4,5], {}, [], "随等级提升气提供的独立J来源。"],
    ["jiuYin", "内功·九阴真经", "inner", 9, [1,1,2,2,3,3,4,4,5], {}, [], "根据当前气和功法等级，提升全局战力获取。"],
    ["beiMing", "内功·北冥神功", "inner", 1, 3, {}, [], "根据当前J，提高凝气的兑换效率。"],
    ["longXiang", "内功·龙象般若功", "inner", 13, 5, { heart: 5 }, [], "提升气提供的J来源。解锁后通过修炼自动升级，当前体越多，修炼越快。"],
    ["taiXuan", "内功·太玄经", "inner", 1, 10, { heart: 20 }, [], "提高凝气的兑换效率，不占内功名额。"],
    ["jiaYi", "内功·嫁衣神功", "inner", 1, 12, { heart: 40 }, [], "大幅提高凝气与锻体的兑换效率，同时降低气、体提供的基础来源。"],
    ["qianKun", "招式·乾坤大挪移", "moves", 6, [1,2,4,8,16,32], { qi: 20 }, [], "让当前气提供额外的独立战力来源，随等级提升。"],
    ["xiangLong", "招式·降龙十八掌", "moves", 18, 1, {}, [], "随等级提升打岩来源，也受六脉神剑强化。"],
    ["liuMai", "招式·六脉神剑", "moves", 6, 1, { qi: 20 }, [], "根据当前气和等级，强化乾坤大挪移与降龙十八掌。"],
    ["duGu", "招式·独孤九剑", "moves", 1, 5, { heart: 20 }, [], "提高炼心的兑换效率。"],
    ["yueNv", "招式·越女剑法", "moves", 1, 8, { heart: 40 }, [], "提高神魂的兑换效率。"],
    ["xiaoLi", "绝技·小李飞刀", "jueji", 1, 8, { heart: 30 }, [], "根据当前心，提升集中来源。", "jueji"],
    ["lingXi", "绝技·灵犀一指", "jueji", 1, 8, { heart: 30 }, [], "拥有直感时，根据当前心进一步增强集中来源。", "jueji"],
    ["duoMing", "绝技·夺命十三剑", "jueji", 13, 2, { heart: 30 }, [], "随等级提升杀气来源。", "jueji"],
    ["shenDao", "绝技·神刀斩", "jueji", 1, 12, { heart: 60 }, [], "提升鬼脑来源。", "jueji"]
  ].map(([key,name,branch,maxLevel,price,requirements,prerequisites,description,group]) => Object.freeze({ key,name,branch,family:branch === "neijia" ? "human" : ["devour","shroud"].includes(branch) ? branch : "golden",maxLevel,price,upgradeResource:upgradeResources[key] || "soul",requirements:Object.freeze(requirements),prerequisites:Object.freeze(prerequisites),description,group,slot:branch === "inner" && key !== "taiXuan" }));
  const balance = Object.freeze({
    absolute:Object.freeze({qi:Object.freeze({threshold:1000,power:.25}),body:Object.freeze({threshold:1000,power:.25}),heart:Object.freeze({threshold:120,power:.25}),soul:Object.freeze({threshold:100,power:.15})}),
    relative:Object.freeze({qi:Object.freeze({support:"heart",floor:50,factor:5,power:.5}),body:Object.freeze({support:"heart",floor:50,factor:5,power:.5}),heart:Object.freeze({support:"soul",floor:10,factor:3,power:.5})}),
    heartReliefCap:.6,heartReliefPower:2
  });
  WIS.Cultivation.MartialConfig = Object.freeze({ balance, abilities:Object.freeze(abilities), branches, heartThresholds:Object.freeze({ "墙":1,"屋":10,"楼":40,"街":120,"城":1000 }) });
}(window.WIS));
