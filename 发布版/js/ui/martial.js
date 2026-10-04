(function defineMartialUI(WIS) {
  "use strict";
  WIS.UI.Martial = Object.freeze({ create(context) {
    const M = WIS.Cultivation.Martial, C = WIS.Cultivation.MartialConfig;
    const R = WIS.Core.Runtime, B = WIS.Core.BigNum;
    const $ = id => document.getElementById(id);
    const labels = Object.freeze({ qi: "气", body: "体", heart: "心", soul: "神魂", joules: "J", power: "战力" });
    const actionNames = Object.freeze({ qi: "凝气", body: "锻体", heart: "炼心", soul: "神魂" });
    const families = [["golden", "金古黄梁"], ["human", "国术—人仙"], ["devour", "宇宙"], ["shroud", "秘境"]];
    const rows = [], abilities = [], challengeRows = [], summaryValues = [], heartRows = [], tabs = [], panels = [];
    let mounted = false, pending = false, activeFamily = "golden";
    const f = value => context.format(value, 3);
    const active = s => s.cultivation.active === "martial";
    const locked = () => pending || Boolean(context.getCatchUpStatus?.().locked);
    function el(tag, text = "", className = "") {
      const node = document.createElement(tag); node.textContent = text; node.className = className; return node;
    }
    function button(text, id, handler) {
      const node = el("button", text, "primary-button"); node.type = "button"; node.id = id;
      node.addEventListener("click", handler); return node;
    }
    function perform(action, render) {
      if (locked() || !active(R.getState())) return;
      pending = true;
      try { context.performSavedAction(() => action(R.getState()), render); }
      finally { pending = false; render(); renderSummary(); }
    }
    function item(parent, name, description) {
      const article = el("article", "", "item-row"), content = el("div", "", "item-content"), control = el("div", "", "purchase-control");
      content.append(el("h2", name), el("p", description)); article.append(content, control); parent.append(article);
      return { article, content, control };
    }
    function group(parent, name, description, open = false) {
      const details = el("details", "", "upgrade-group"), summary = el("summary"), copy = el("span");
      copy.append(el("b", name), el("small", description)); summary.append(copy);
      const list = el("div", "", "item-list"); details.append(summary, list); details.open = open; parent.append(details);
      return { details, list };
    }
    function switchFamily(key, focus = false) {
      activeFamily = key;
      for (const tab of tabs) {
        const selected = tab.dataset.martialPage === key;
        tab.classList.toggle("active", selected); tab.setAttribute("aria-selected", String(selected));
        tab.tabIndex = selected ? 0 : -1;
        if (selected && focus) tab.focus();
      }
      for (const panel of panels) {
        const selected = panel.dataset.martialBranch === key;
        panel.hidden = !selected; panel.classList.toggle("active", selected);
      }
    }
    function mount() {
      if (mounted) return; mounted = true;
      const actions = el("div", "", "upgrade-groups martial-section"); actions.id = "martial-actions"; actions.hidden = true;
      const actionGroup = group(actions, "武道行动", "手动转换消耗全部可用输入；自动化在设置中管理。", true);
      const descriptions = { qi: "将J凝练为气。", body: "将战力转为体。", heart: "以气、体炼心。", soul: "以气、体、心凝练神魂。" };
      for (const key of M.resourceKeys) {
        const row = item(actionGroup.list, actionNames[key], descriptions[key]); row.article.id = "martial-action-" + key;
        row.control.className = "action-control";
        const amount = el("span"), costs = el("small"), gain = el("p", "", "martial-action-preview");
        const convert = button(actionNames[key], "martial-convert-" + key, () => perform(s => M.convert(s, key), renderActions));
        row.content.append(gain); row.control.append(amount, costs, convert);
        rows.push({ key, ...row, amount, costs, gain, convert });
      }
      $("ordinary-actions-panel").append(actions);

      const cultivation = $("martial-progress");
      const overview = el("div", "", "martial-overview");
      overview.append(el("p", "首次解锁消耗神魂，后续升级按卡片所示消耗资源；前置要求本身不额外扣除。已解锁能力直接生效。", "martial-note"));
      const sources = el("p", "", "martial-note"); sources.id = "martial-sources"; overview.append(sources);
      const finalSources = el("p", "", "martial-note"); finalSources.id = "martial-final-sources";
      finalSources.title = "按当前状态分别结算各项武道来源，包含倍率、挑战限制与软上限；各项预览不代表全部来源合并后的总收益。";
      overview.append(finalSources);
      const heart = group(overview, "心 · 量级软上限", "达到门槛解除对应量级软上限，心不足时按当前值弱化。");
      heart.list.classList.add("martial-heart-table"); heart.list.id = "martial-heart-table";
      for (const name of ["爆墙", "爆屋", "爆楼", "爆街", "爆城"]) {
        const value = el("div"); heart.list.append(value); heartRows.push({ name, value });
      }
      cultivation.append(overview);
      const tablist = el("div", "", "cultivation-tabs"); tablist.setAttribute("role", "tablist"); tablist.setAttribute("aria-label", "武道界面"); cultivation.append(tablist);
      for (const [key, name] of families) {
        const tab = button(name, "martial-" + key + "-tab", () => switchFamily(key));
        tab.className = "cultivation-tab"; tab.dataset.martialPage = key;
        tab.setAttribute("role", "tab"); tab.setAttribute("aria-controls", "martial-" + key + "-panel");
        tab.addEventListener("keydown", event => {
          const index = tabs.indexOf(tab);
          const next = event.key === "ArrowRight" ? (index + 1) % 4 : event.key === "ArrowLeft" ? (index + 3) % 4 : event.key === "Home" ? 0 : event.key === "End" ? 3 : -1;
          if (next < 0) return; event.preventDefault(); switchFamily(families[next][0], true);
        });
        tabs.push(tab); tablist.append(tab);
        const panel = el("section", "", "cultivation-subpage"); panel.id = "martial-" + key + "-panel"; panel.dataset.martialBranch = key;
        panel.setAttribute("role", "tabpanel"); panel.setAttribute("aria-labelledby", tab.id); panels.push(panel); cultivation.append(panel);
        if (key === "devour" || key === "shroud") {
          const placeholder = group(panel, name, "待设计", true);
          placeholder.list.append(el("p", "尚未开放。", "catalog-empty")); continue;
        }
        const groups = el("div", "", "upgrade-groups"); panel.append(groups);
        if (key === "golden") {
          const slots = el("p", "", "martial-note"); slots.id = "martial-slots"; panel.prepend(slots);
        }
        const categories = key === "golden"
          ? [["inner", "内功", "首次解锁占用名额，升级不再占用；太玄经不占名额。"], ["moves", "招式", "提升武道来源与转换效率。"], ["jueji", "绝技", "各项能力按自身效果生效。"], ["special", "特殊能力", "挑战资格与内功名额。"]]
          : [["strength", "劲力", "明劲、暗劲、化劲"], ["body", "肉身", "易筋、易骨、易髓"], ["boxing", "国术", "拳法与武道修行"], ["special", "特殊能力", "挑战资格与特殊功法"]];
        const categoryLists = new Map(categories.map(([category, name, description], index) => [category, group(groups, name, description, index === 0).list]));
        for (const a of C.abilities.filter(a => (a.family || a.group || a.branch) === key)) {
          const category = key === "golden" ? a.branch : ["mingJin", "anJin", "huaJin"].includes(a.key) ? "strength" : ["yiJin", "yiGu", "yiSui"].includes(a.key) ? "body" : ["stealHeaven", "innerHarmony", "reverseArt", "innate"].includes(a.key) ? "special" : "boxing";
          const row = item(categoryLists.get(category), a.name, a.description);
          const prerequisites = (a.prerequisites || []).map(key => C.abilities.find(other => other.key === key)?.name || key);
          if (prerequisites.length) row.content.append(el("p", "能力前置：" + prerequisites.join("、")));
          row.article.id = "martial-ability-" + a.key;
          const level = el("span"), requirements = el("small"), price = el("small"), reason = el("small", "", "martial-reason");
          const buy = button("解锁", "martial-buy-" + a.key, () => perform(s => M.buy(s, a.key), () => { renderCultivation(); renderActions(); }));
          const effect = el("small", "", "martial-ability-effect"), nextEffect = el("small", "", "martial-ability-next");
          row.control.append(effect, nextEffect, level, requirements, price, reason, buy);
          abilities.push({ definition: a, ...row, effect, nextEffect, level, requirements, price, reason, buy });
        }
        if (key === "golden") {
          const placeholder = group(groups, "神功", "待设计"); placeholder.list.append(el("p", "神功内容尚未开放。", "catalog-empty"));
        }
      }
      switchFamily(activeFamily);

      const summary = el("div", "", "martial-summary"); summary.id = "martial-summary"; summary.hidden = true;
      for (const key of M.resourceKeys) {
        const row = el("div", "", "resource-row"), wrap = el("div", "", "resource-value"), value = el("strong"); value.id = "martial-summary-" + key;
        wrap.append(value); row.append(el("span", labels[key]), wrap); summary.append(row); summaryValues.push({ key, value });
      }
      $("special-resources").append(summary);

      // Fill the martial group already created by the shared challenge catalog.
      const challenges = $("challenge-list").querySelector('[data-catalog-system-group="武道"]');
      challenges.id = "martial-challenges";
      challenges.querySelector(".catalog-empty")?.remove();
      const count = el("p", "", "martial-note"); count.id = "martial-challenge-count"; challenges.append(count);
      const note = el("p", "进入挑战会重置资源与能力；已获得的挑战资格永久保留，可退出后重试。", "martial-note"); challenges.append(note);
      const list = challenges.querySelector(".item-list") || el("div", "", "item-list"); challenges.append(list);
      for (const [key, name, description, reward] of [
        ["martialStealHeaven", "盗天机", "挑战中关闭心对正常量级软上限的解除与弱化。目标：当前心达到30。", "按当前心提升气、体获取指数，解锁自动炼心。"],
        ["martialIntentQi", "意与气合", "气提供的J来源停用。目标：当前气≥100，且J≥1e9。", "气的J来源×3。三合挑战全部完成后解锁自动神魂。"],
        ["martialHeartIntent", "心与意合", "炼心效率减半。目标：当前心≥40。", "炼心效率×2。三合挑战全部完成后解锁自动神魂。"],
        ["martialQiPower", "气与力合", "J与战力失衡时降低领先侧的兑换效率。目标：气、体各≥200，J≥4.184e9，战力≥4.184e8；d=log10(1+J/10)−log10(1+战力)，|d|≤0.5。", "完成三合之一；三合全部完成解锁自动神魂。"],
        ["martialMeridians", "任督二脉", "占名额内功只允许一项。目标：当前气≥500、体≥500、心≥120。", "内功名额+2，获得先天成就提升气获取。"]
      ]) {
        const row = item(list, "挑战·" + name, description); row.article.dataset.challengeKey = key; row.article.dataset.catalogSystem = "武道";
        row.article.id = "martial-challenge-" + key;
        const prerequisiteKey = WIS.Core.Config.challenges[key]?.martialPrerequisite;
        const prerequisite = C.abilities.find(a => a.key === prerequisiteKey);
        if (prerequisite) row.content.append(el("p", `开启资格：解锁${prerequisite.name}；资格获得后永久保留。`));
        const rewardText = el("p", "奖励：" + reward); row.content.append(rewardText);
        const status = el("span");
        const start = button("开启挑战", "martial-challenge-button-" + key, () => {
          if (locked() || !active(R.getState())) return;
          if (R.getState().activeChallenge === key) context.exitChallenge(); else context.startChallenge(key);
          context.completePlayerAction(); renderChallenges(); renderSummary();
        });
        row.control.append(status, start); challengeRows.push({ key, ...row, status, start, rewardText });
      }
    }
    function renderActions() {
      mount(); const s = R.getState(), enabled = active(s);
      $("martial-actions").hidden = !enabled;
      for (const row of rows) {
        const p = M.preview(s, row.key);
        row.amount.textContent = "当前" + labels[row.key] + "：" + f(M.amount(s, row.key));
        row.costs.textContent = "消耗全部可用：" + Object.entries(p.costs || p.consumed || {}).map(([key, value]) => `${f(value)} ${labels[key] || key}`).join("、");
        row.gain.textContent = `预计 +${f(p.gain)} ${labels[row.key]}` + (p.reason ? ` · ${p.reason}` : "");
        row.convert.disabled = locked() || !enabled || !p.allowed || !B.gt(p.gain, B.ZERO);
      }
    }
    // Values come from the same read-only helpers used by production effects.
    function abilityEffect(s, key, level) {
      const running = s.meta?.challenges?.activeChallenge ?? s.activeChallenge;
      const qualification = { stealHeaven: "盗天机挑战", innerHarmony: "三合挑战", innate: "任督二脉挑战" }[key];
      if (qualification) return `${qualification}资格${level || s.meta?.martialQualifications?.[key] ? "已获得" : "未获得"}`;
      if (!level) return "未解锁";
      if (key === "reverseArt") return running === "martialMeridians" ? "名额加成暂不生效（挑战限 1 项）" : "内功名额 +1";
      if (key === "qianKun") return `招式战力来源 +${f(M.qiPowerSource(s, level))}/秒`;
      if (key === "jiaYi") return "凝气、锻体效率 ×4；气的J来源、体的战力来源 ×0.5";
      if (["jiuYang", "longXiang"].includes(key) && running === "martialIntentQi") return "气的J来源已被挑战停用";
      const target = {
        mingJin: "体的战力来源", anJin: "体的战力来源", huaJin: "体的战力来源",
        yiJin: "锻体效率", yiGu: "锻体效率", yiSui: "锻体效率",
        ganDong: "炼心效率", duGu: "炼心效率", sanTi: "J获取",
        taiJi: "J、战力获取", xingYi: "J、战力获取", baGua: "J、战力获取",
        jiuYang: "气的J来源", longXiang: "气的J来源", jiuYin: "战力获取",
        beiMing: "凝气效率", taiXuan: "凝气效率", xiangLong: "打岩来源",
        liuMai: "乾坤、降龙效果", yueNv: "神魂兑换效率", xiaoLi: "集中来源",
        lingXi: "集中来源", duoMing: "杀气来源", shenDao: "鬼脑来源"
      }[key];
      return `${target} ×${f(M.abilityMultiplier(s, key, level))}` + (key === "lingXi" && !s.intuitionPurchased ? "（需拥有直感）" : "");
    }
    function renderCultivation() {
      mount(); const s = R.getState(), enabled = active(s);
      $("martial-progress").hidden = !enabled;
      if (!enabled) return;
      $("martial-slots").textContent = `内功名额：已用 ${M.slotUsed(s)} / ${M.slots(s)}`;
      const sources = M.sources(s);
      $("martial-sources").textContent = `武道来源：+${f(sources.joules)} J/秒；体 +${f(sources.power)} 战力/秒；招式 +${f(sources.qiPower)} 战力/秒。`;
      const finals = WIS.UI.SourcePreview.query(["martialQiJ", "martialBodyPower", "martialQiPower"], s);
      $("martial-final-sources").textContent = `最终获取：气 +${f(finals[0].final)} J/秒；体 +${f(finals[1].final)} 战力/秒；招式 +${f(finals[2].final)} 战力/秒。`;
      for (const row of heartRows) {
        const need = M.heartRequirement(row.name), reached = B.gte(M.amount(s, "heart"), need);
        row.value.textContent = `${row.name}：心 ${f(need)} · ${reached ? "已达到" : "未达到"}`;
      }
      for (const row of abilities) {
        const v = M.abilityView(s, row.definition.key);
        row.level.textContent = `层级：${v.level}/${v.maxLevel}`;
        row.effect.textContent = "当前：" + abilityEffect(s, v.key, v.level);
        row.nextEffect.hidden = v.level >= v.maxLevel || Boolean(s.meta?.martialQualifications?.[v.key]);
        row.nextEffect.textContent = row.nextEffect.hidden ? "" : `${v.level ? v.key === "longXiang" ? "下级修炼效果" : "升级后" : "解锁后"}：${abilityEffect(s, v.key, v.level + 1)}`;
        row.requirements.textContent = "当前值前置（不扣除）：" + Object.entries(v.requirements || {}).map(([key, value]) => `${labels[key] || key}≥${f(value)}`).join("、");
        row.price.textContent = `${labels[v.costResource] || "神魂"}价格：${f(v.cost)}`;
        row.reason.textContent = v.reason || ""; row.buy.textContent = v.level >= v.maxLevel ? "已满级" : v.level ? "升级" : "解锁";
        row.buy.disabled = locked() || !v.allowed; row.article.classList.toggle("purchased", v.level > 0);
      }
    }
    function renderChallenges() {
      mount(); const s = R.getState(), enabled = active(s), meta = WIS.Meta.Challenges;
      $("martial-challenges").hidden = !enabled;
      let completed = 0;
      for (const row of challengeRows) {
        const running = s.activeChallenge === row.key, count = s.challengeCompletions?.[row.key] || 0;
        const unlocked = meta.challengeUnlocked(row.key); if (count) completed++;
        row.article.hidden = !running && (!meta.challengeVisible(row.key) || Boolean(count && s.hideCompletedChallenges));
        const reward = WIS.Core.Config.challenges[row.key]?.rewardDescription;
        if (reward) row.rewardText.textContent = "奖励：" + reward;
        row.status.textContent = running ? "挑战进行中" : count ? "已完成 · 奖励永久生效" : unlocked ? "资格已解锁" : "资格未解锁";
        row.start.textContent = running ? "退出挑战" : count ? "重试（无额外奖励）" : "开启挑战";
        row.start.disabled = locked() || !enabled || (!running && !meta.challengeStartable(row.key));
      }
      $("martial-challenge-count").textContent = `完成 ${completed}/5`;
    }
    function renderSummary() {
      mount(); const s = R.getState(), enabled = active(s); $("martial-summary").hidden = !enabled;
      for (const row of summaryValues) row.value.textContent = f(M.amount(s, row.key));
      if (enabled) {
        for (const id of ["mana-resource", "immortal-power-resource", "xianForce-resource", "yuanForce-resource", "nieForce-resource", "universeCoefficient-resource"]) if ($(id)) $(id).hidden = true;
        $("special-resources").hidden = false;
      }
     
    }
    mount();
    return Object.freeze({ renderActions, renderCultivation, renderChallenges, renderSummary });
  } });
}(window.WIS));
