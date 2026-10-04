(function defineMartialConfig(WIS) {
  "use strict";
  const branches = Object.freeze({ neijia: { name: "内家拳" }, inner: { name: "内功" }, moves: { name: "招式" }, jueji: { name: "绝技" }, special: { name: "特殊能力" } });
  const upgradeResources = Object.freeze({ xingYi:"body", jiuYang:"qi", jiuYin:"qi", qianKun:"qi", xiangLong:"qi", liuMai:"qi", duoMing:"qi" });
  const abilities = [
    ["mingJin", "明劲", "neijia", 1, 1, { body: 3 }, [], "根据当前J，提升体提供的战力来源。"],
    ["yiJin", "易筋", "neijia", 1, 1, { body: 3 }, [], "提高锻体的兑换效率。"],
    ["anJin", "暗劲", "neijia", 1, 2, { body: 10 }, ["mingJin"], "提升体提供的战力来源。"],
    ["yiGu", "易骨", "neijia", 1, 3, { body: 20 }, ["yiJin"], "根据当前战力，提高锻体的兑换效率。"],
    ["huaJin", "化劲", "neijia", 1, 4, { qi: 30, body: 30 }, ["anJin"], "根据当前气，提升体提供的战力来源。"],
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
  ].map(([key,name,branch,maxLevel,price,requirements,prerequisites,description,group]) => Object.freeze({ key,name,branch,family:branch === "neijia" ? "human" : "golden",maxLevel,price,upgradeResource:upgradeResources[key] || "soul",requirements:Object.freeze(requirements),prerequisites:Object.freeze(prerequisites),description,group,slot:branch === "inner" && key !== "taiXuan" }));
  WIS.Cultivation.MartialConfig = Object.freeze({ abilities:Object.freeze(abilities), branches, heartThresholds:Object.freeze({ "墙":1,"屋":10,"楼":40,"街":120,"城":1000 }) });
}(window.WIS));
