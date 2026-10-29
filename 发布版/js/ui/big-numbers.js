(function defineBigNumberPage(WIS) {
  "use strict";
  WIS.UI.BigNumbers = Object.freeze({ create(context) {
    const M = WIS.Meta.BigNumbers, B = WIS.Core.BigNum;
    const state = WIS.Core.Runtime.state, $ = id => document.getElementById(id);
    let selected = false, lastGraham = false;
    const text = (id, value) => { const el = $(id); if (el.textContent !== value) el.textContent = value; };
    const f = (x, digits = 4) => {
      const n = B.BN(x);
      if (B.gt(n, 0) && B.lt(n, 0.001)) return WIS.UI.Format.scientificMultiplier(n);
      return context.format(n, digits);
    };
    const rankText = value => typeof value==="number" && Number.isSafeInteger(value) ? String(value) : WIS.UI.Format.number(value,0);
    const quantity = (value, order) => `${f(value, 2)} ${M.SYMBOLS[order]}`;
    const rows = [], milestones = [], treeRows = [];
    function renderTree() {
      const v = M.treeView(state), locked = context.getCatchUpStatus().locked === true;
      text("tree-target", v.phase === "complete" ? `TREE(${rankText(v.rank)})` : B.lt(v.rank,3)
        ? `目标：TREE(${rankText(v.target)})` : `TREE(${rankText(v.rank)}) → TREE(${rankText(v.target)})`);
      for (const phase of ["explicit", "super", "complete"]) $("tree-" + phase).hidden = v.phase !== phase;
      $("tree-construction-panel").hidden = v.phase !== "explicit" && !(v.phase === "super" && v.superPointIncome);
      $("tree-upgrades").hidden = v.phase !== "explicit" && !v.superUpgrades;
      if (!$("tree-construction-panel").hidden) {
        const decayText = `T${context.format(v.decayIndex, 0)}`;
        text("tree-construction", context.format(v.construction, 4));
        text("tree-rate", `+${context.format(v.constructionRate, 4)} /秒`);
        treeRows.forEach(({ key, el, level, effect, cost, button }) => {
          const u = v.upgrades[key]; el.hidden = !u.unlocked; if (!u.unlocked) return; level.textContent = `Lv.${u.level}`; cost.textContent = `费用：${f(u.cost)}`;
          const multiplier = context.format(u.multiplier, 2);
          effect.textContent = key === "label"
            ? `实际衰减阈值 ×${u.effect}/级\n当前：${decayText}\n下一等级：T${context.format(v.nextDecayIndex, 0)}${u.active ? "" : `\n达到当前阈值后可升级`}`
            : key === "amplify" ? `超构造倍率 ×${u.effect}/级 · 当前 ×${multiplier}\n本次升级后，下一费用 ×${f(B.mul(u.growth,B.pow(u.growthStep,u.level)))}`
            : `${key === "node" ? "树构造点获取" : "坏序列推进"} ×${u.effect}/级 · 当前 ×${multiplier}`;
          button.textContent = key === "label" && !u.active ? "升级：锁定" : "升级";
          button.disabled = locked || !u.canPurchase;
        });
      }
      if (v.phase === "explicit") {
        text("tree-sequence-title", B.eq(v.labels,3) ? "三标签坏序列" : `${rankText(v.labels)}标签坏序列`);
        text("tree-sequence", `当前：T${context.format(v.currentIndex, 0)}`);
        const thresholdText = `T${context.format(v.thresholdIndex, 0)}`;
        const decayText = `T${context.format(v.decayIndex, 0)}`;
        text("tree-construction-threshold", `实际构造阈值：${thresholdText}`);
        text("tree-decay-threshold", `实际衰减阈值：${decayText}`);
        $("tree-unlock").hidden = v.canEnter;
        text("tree-unlock-target", `超构造解锁：${thresholdText}`);
        $("tree-unlock-bar").value = v.unlockProgress;
        text("tree-unlock-progress", `${context.format(v.unlockProgress * 100, 2)}%`);
        $("tree-entry").hidden = false;
        text("tree-entry-base", `若现在进入超构造：进度倍率 ×${context.format(v.superMultiplier, 2)}`);
        $("tree-enter").disabled = locked || !v.canEnter;
        $("tree-enter").hidden = !v.canEnter;
        text("tree-entry-note", v.continuousSuper && B.gt(v.superProgress,0)
          ? `已保留超构造进度：${f(v.superCompleted)}；再次进入后继续结算。继续构造可提高超构造基础。`
          : "继续构造可提高超构造基础。");
        $("tree-entry-note").hidden = false;
      } else if (v.phase === "super") {
        $("tree-super-bar").value = v.superProgressFraction;
        text("tree-super-progress", `TREE(${rankText(v.rank)}) → TREE(${rankText(v.target)})：${f(v.superCompleted)} / ${f(v.superRequirement)}（${f(B.mul(v.superProgress,100))}%）`);
        $("tree-super-time").hidden = !WIS.Meta.Infinity.has(state,"D11-1");
        text("tree-super-time", `本次超构造时间：${f(v.superElapsedSeconds)} 游戏秒（跨TREE保留）`);
        text("tree-super-base", `实际总进度倍率 ×${context.format(v.superMultiplier, 3)}`);
        text("tree-super-sources", `来源：${v.superSources.map(source => `${source.name} ×${f(source.multiplier)}`).join(" · ")}`);
        text("tree-super-eta", Number.isFinite(v.remainingSeconds)
          ? `按当前倍率预计：${WIS.UI.Format.elapsedTime(Math.ceil(v.remainingSeconds))}` : "预计：极长（以进度需求为准）");
      } else {
        text("tree-complete-rank", `TREE(${rankText(v.rank)})`);
        text("tree-next-note", v.available ? `下一目标：TREE(${rankText(v.target)})` : "后续 TREE 阶位暂未开放");
        $("tree-next").hidden = !v.available; $("tree-next").disabled = locked;
      }
    }
    function render() {
      const unlocked = M.isUnlocked(state);
      const treeUnlocked = M.treeUnlocked(state);
      const tab = $("big-number-tab"); tab.disabled = !unlocked;
      $("big-number-tabs").hidden = !unlocked && !treeUnlocked;
      tab.hidden = !unlocked;
      tab.title = unlocked ? "符号层级与系数" : "";
      $("tree-tab").hidden = !treeUnlocked;
      if (selected === "tree" ? !treeUnlocked : !unlocked) selected = false;
      $("ordinary-actions-panel").hidden = !!selected;
      $("big-number-panel").hidden = selected !== true;
      $("tree-panel").hidden = selected !== "tree";
      $("ordinary-actions-tab").setAttribute("aria-selected", String(!selected));
      tab.setAttribute("aria-selected", String(selected === true));
      $("tree-tab").setAttribute("aria-selected", String(selected === "tree"));
      if (!selected) return;
      if (selected === "tree") { renderTree(); return; }
      const v = M.view(state), order = v.dominantOrder, graham = B.gt(v.gIndex,0);
      text("big-number-page-dominant", B.gte(v.tree.rank,3) ? `TREE(${rankText(v.tree.rank)})` : graham ? `G${rankText(v.gIndex)}` : quantity(v.amounts[order], order));
      text("big-number-secondary", graham ? `次级：${quantity(v.amounts[4], 4)}；Q = ${f(v.amounts[4], 2)}`
        : order > 0 ? `次级：${quantity(v.amounts[order - 1], order - 1)}` : "更高阶符号尚未解锁");
      $("super-fractal-panel").hidden = !graham;
      if (graham !== lastGraham) $("fractal-panel").open = !graham;
      lastGraham = graham;
      text("fractal-summary", `分形：已完成 ${v.fractalLevel}/5`);
      rows.forEach(({ el, stock, effect, status, button }, i) => {
        const done = i < v.fractalLevel, next = i === v.fractalLevel;
        const holdings = `当前资源：${quantity(v.amounts[i], i)}`;
        if (stock.textContent !== holdings) stock.textContent = holdings;
        const preview = `当前获取：+${quantity(v.rates[i], i)}/秒` + (done ? ""
          : `\n强化后新增来源：+${quantity(WIS.Meta.Infinity.fractalGainMultiplier(state, i), i)}/秒${i === 4 ? "；解锁 G1" : ""}`);
        if (effect.textContent !== preview) effect.textContent = preview;
        el.hidden = !done && !next;
        el.classList.toggle("fractal-complete", done);
        el.classList.toggle("fractal-future", !done && !next);
        text(status.id, `费用：${quantity(M.COSTS[i], Math.max(0, i - 1))}`);
        status.hidden = done;
        button.disabled = !next || !M.canPurchase(state, i + 1) || context.getCatchUpStatus().locked === true;
        button.textContent = done ? "已强化" : next ? "强化" : "需要上一分形";
      });
      if (graham) {
        const maximum = M.maximumG(state), complete = maximum !== null && B.gte(v.gIndex,maximum);
        text("super-fractal-next", complete ? treeUnlocked ? `G${rankText(v.gIndex)} · 本阶段完成；大数·树已开放` : `G${rankText(v.gIndex)} · 本阶段完成；完成古戈尔成就后开放大数·树` : `下一阶位：G${rankText(M.rankAdd(v.gIndex,1))}`);
        text("super-fractal-progress", complete ? "本阶段已完成" : `${f(v.progress)} / ${f(v.requirement)}`);
        $("super-fractal-bar").value = complete ? 100 : Math.min(100, B.toNumber(B.mul(B.div(v.progress,v.requirement),100), 0));
        text("super-fractal-sources", `当前进度速度：${f(v.speed)}%/秒 · 基础：${M.BASE_SUPER_SPEED}%/秒 · Graham里程碑：×${v.milestoneMultiplier} · 超越分形：×${f(v.fractalMultiplier)}`);
        const nextTarget = M.MILESTONES.find(g => B.gt(g,v.gIndex));
        milestones.forEach(({ el, rank }) => {
          el.classList.toggle("complete", B.gte(v.gIndex,rank)); el.classList.toggle("next", nextTarget === rank);
          el.textContent = `G${rank}${B.gte(v.gIndex,rank) ? " ✓" : nextTarget === rank ? " · 下一目标" : ""}`;
        });
      }
    }
    function bind() {
      $("ordinary-actions-tab").addEventListener("click", () => { selected = false; render(); });
      $("big-number-tab").addEventListener("click", () => { selected = M.isUnlocked(state); render(); });
      $("tree-tab").addEventListener("click", () => { selected = M.treeUnlocked(state) ? "tree" : false; render(); });
      const treeAction = action => {
        if (context.getCatchUpStatus().locked) return;
        const previous = context.achievementStates();
        return context.performSavedAction(action, () => { context.notifyNewAchievements(previous); WIS.Core.Runtime.call("render"); render(); });
      };
      $("tree-enter").addEventListener("click", () => treeAction(() => M.enterTreeSuper(state)));
      $("tree-next").addEventListener("click", () => treeAction(() => M.startNextTree(state)));
      for (const [key, rule] of Object.entries(M.TREE_UPGRADES)) {
        const el = document.createElement("article"); el.className = "tree-upgrade";
        const title = document.createElement("strong"), level = document.createElement("span"), cost = document.createElement("small");
        const effect = document.createElement("p"); effect.className = "tree-upgrade-effect";
        title.textContent = key === "amplify" ? `4·${rule.name}` : rule.name; title.title = rule.description;
        const button = document.createElement("button"); button.type = "button"; button.className = "primary-button";
        button.id = `tree-upgrade-${key}`; button.textContent = "升级";
        button.title = rule.description;
        el.append(title, level, effect, cost, button); $("tree-upgrades").append(el); treeRows.push({ key, el, level, effect, cost, button });
        context.bindHoldButton(button.id, () => treeAction(() => M.purchaseTreeUpgrade(state, key)), {
          managedCommit: true, canRepeat: () => selected === "tree" && context.isControlVisible(button) && M.canPurchaseTreeUpgrade(state,key)
        });
      }
      for (let i = 0; i < 5; i++) {
        const el = document.createElement("article"); el.className = "fractal-row";
        const label = document.createElement("div"), title = document.createElement("strong"), stock = document.createElement("p"), effect = document.createElement("p"), status = document.createElement("small");
        title.textContent = `分形-${i + 1}`;
        stock.className = "fractal-stock";
        effect.className = "fractal-rate source-gain-preview";
        if (i === 0) effect.title = "当前获取包含战力来源与已解锁分形来源及其倍率。战力来源每秒开始时取值，该秒内保持固定。";
        status.id = `fractal-status-${i}`; label.append(title, stock, effect, status);
        const button = document.createElement("button"); button.type = "button"; button.className = "primary-button";
        button.id = `buy-fractal-${i + 1}`;
        button.addEventListener("click", () => {
          if (context.getCatchUpStatus().locked) return;
          const previous = context.achievementStates();
          context.performSavedAction(() => M.purchase(state, i + 1), () => {
            context.notifyNewAchievements(previous); WIS.Core.Runtime.call("render"); render();
          });
        });
        el.append(label, button); $("fractal-list").append(el); rows.push({ el, stock, effect, status, button });
      }
      for (const rank of M.MILESTONES) {
        const el = document.createElement("span"); $("graham-milestones").append(el); milestones.push({ el, rank });
      }
      render();
    }
    return { render, bind, isSelected: () => selected };
  } });
}(window.WIS));
