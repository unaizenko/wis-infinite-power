(function defineBigNumberPage(WIS) {
  "use strict";
  WIS.UI.BigNumbers = Object.freeze({ create(context) {
    const M = WIS.Meta.BigNumbers, B = WIS.Core.BigNum;
    const state = WIS.Core.Runtime.state, $ = id => document.getElementById(id);
    let selected = false, lastGraham = false;
    const text = (id, value) => { const el = $(id); if (el.textContent !== value) el.textContent = value; };
    const f = x => {
      const n = B.BN(x);
      if (B.gt(n, 0) && B.lt(n, 0.001)) return WIS.UI.Format.scientificMultiplier(n);
      return context.format(n, 4);
    };
    const quantity = (value, order) => `${f(value)} ${M.SYMBOLS[order]}`;
    const sourceText = (raw, final, label) => WIS.UI.SourcePreview.text({
      raw, final, label, resource: "symbol", unit: "秒", extra: []
    }, f);
    const source = (id, raw, final, label) => {
      $(id).classList.add("source-gain-preview"); text(id, sourceText(raw, final, label));
    };
    const rows = [], milestones = [], treeRows = [];
    function renderTree() {
      const v = M.treeView(state), locked = context.getCatchUpStatus().locked === true;
      text("tree-target", v.phase === "complete" ? `TREE(${v.rank})` : v.rank < 3
        ? `目标：TREE(${v.target})　标签：${v.labels}` : `TREE(${v.rank}) → TREE(${v.target})　标签：${v.labels}`);
      for (const phase of ["explicit", "super", "complete"]) $("tree-" + phase).hidden = v.phase !== phase;
      if (v.phase === "explicit") {
        text("tree-sequence-title", v.labels === 3 ? "三标签坏序列" : `${v.labels}标签坏序列`);
        text("tree-sequence", `当前：T${context.format(v.currentIndex, 0)}`);
        const thresholdText = `T${context.format(v.thresholdIndex, 0)}`;
        const decayText = `T${context.format(v.decayIndex, 0)}`;
        text("tree-construction-threshold", `实际构造阈值：${thresholdText}`);
        text("tree-decay-threshold", `实际衰减阈值：${decayText}`);
        $("tree-unlock").hidden = v.canEnter;
        text("tree-unlock-target", `超构造解锁：${thresholdText}`);
        $("tree-unlock-bar").value = v.unlockProgress;
        text("tree-unlock-progress", `${context.format(v.unlockProgress * 100, 2)}%`);
        text("tree-construction", context.format(v.construction, 4));
        text("tree-rate", `+${context.format(v.constructionRate, 4)} /秒`);
        treeRows.forEach(({ key, level, effect, cost, button }) => {
          const u = v.upgrades[key]; level.textContent = `Lv.${u.level}`; cost.textContent = `费用：${f(u.cost)}`;
          const multiplier = context.format(u.multiplier, 2);
          effect.textContent = key === "label"
            ? `高阶坏序列推进 ×${u.effect}/级\n${u.active ? `当前 ×${multiplier} · 超过${decayText}后生效`
              : u.level > 0 ? `高阶倍率 ×${multiplier} · 超过${decayText}后生效\n达到${decayText}后解锁升级` : `达到${decayText}后解锁升级`}`
            : `${key === "node" ? "树构造点获取" : "坏序列推进"} ×${u.effect}/级 · 当前 ×${multiplier}`;
          button.textContent = key === "label" && !u.active ? "升级：锁定" : "升级";
          button.disabled = locked || !u.canPurchase;
        });
        $("tree-entry").hidden = false;
        text("tree-entry-base", `若现在进入超构造：进度倍率 ×${context.format(v.superMultiplier, 2)}`);
        $("tree-enter").disabled = locked || !v.canEnter;
        $("tree-enter").hidden = !v.canEnter;
        $("tree-entry-note").hidden = false;
      } else if (v.phase === "super") {
        $("tree-super-bar").value = v.superProgressFraction;
        text("tree-super-progress", `TREE(${v.rank}) → TREE(${v.target})：${f(v.superCompleted)} / ${f(v.superRequirement)}（${(v.superProgressFraction * 100).toFixed(2)}%）`);
        text("tree-super-base", `实际总进度倍率 ×${v.superMultiplier.toFixed(3)}`);
        text("tree-super-sources", `来源：${v.superSources.map(source => `${source.name} ×${f(source.multiplier)}`).join(" · ")}`);
        text("tree-super-eta", Number.isFinite(v.remainingSeconds)
          ? `预计：${WIS.UI.Format.elapsedTime(Math.ceil(v.remainingSeconds))}` : "预计：极长（以进度需求为准）");
      } else {
        text("tree-complete-rank", `TREE(${v.rank})`);
        text("tree-next-note", v.available ? `下一目标：TREE(${v.target})　标签：${v.labels}` : "后续 TREE 阶位暂未开放");
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
      const v = M.view(state), order = v.dominantOrder, graham = v.gIndex > 0;
      text("big-number-page-dominant", v.tree.rank >= 3 ? `TREE(${v.tree.rank})` : graham ? `G${v.gIndex}` : quantity(v.amounts[order], order));
      source("big-number-page-rate", graham ? v.baseSpeed : v.rates[order], graham ? v.speed : v.rates[order], graham ? "%" : M.SYMBOLS[order]);
      $("big-number-page-rate").hidden = v.tree.rank >= 3;
      text("big-number-secondary", graham ? `次级：${quantity(v.amounts[4], 4)}；Q = ${f(v.amounts[4])}`
        : order > 0 ? `次级：${quantity(v.amounts[order - 1], order - 1)}` : "更高阶符号尚未解锁");
      source("big-number-base", M.currentBaseYRate(state), M.currentBaseYRate(state), "Y");
      $("big-number-base").title = "战力提供的 Y 来源：每秒开始时取值，该秒内保持固定。Y 是固定符号，数字表示持有系数。";
      $("super-fractal-panel").hidden = !graham;
      if (graham !== lastGraham) $("fractal-panel").open = !graham;
      lastGraham = graham;
      text("fractal-summary", `分形：已完成 ${v.fractalLevel}/5`);
      rows.forEach(({ el, status, button }, i) => {
        const done = i < v.fractalLevel, next = i === v.fractalLevel;
        el.hidden = !done && !next;
        el.classList.toggle("fractal-complete", done);
        el.classList.toggle("fractal-future", !done && !next);
        text(status.id, `费用：${quantity(M.COSTS[i], Math.max(0, i - 1))}`);
        status.hidden = done;
        button.disabled = !next || !M.canPurchase(state, i + 1) || context.getCatchUpStatus().locked === true;
        button.textContent = done ? "已强化" : next ? "强化" : "需要上一分形";
      });
      if (graham) {
        const complete = v.gIndex >= M.maximumG(state);
        text("super-fractal-next", complete ? treeUnlocked ? "G64 · 本阶段完成；大数·树已开放" : "G64 · 本阶段完成；完成古戈尔成就后开放大数·树" : `下一阶位：G${v.gIndex + 1}`);
        text("super-fractal-progress", complete ? "本阶段已完成" : `${f(v.progress)} / ${f(v.requirement)}`);
        $("super-fractal-bar").value = complete ? 100 : Math.min(100, B.toNumber(B.mul(B.div(v.progress,v.requirement),100), 0));
        text("super-fractal-sources", `基础：${M.BASE_SUPER_SPEED}%/秒 · Graham里程碑：×${v.milestoneMultiplier} · 超越分形：×${f(v.fractalMultiplier)}`);
        const nextTarget = M.MILESTONES.find(g => g > v.gIndex);
        milestones.forEach(({ el, rank }) => {
          el.classList.toggle("complete", v.gIndex >= rank); el.classList.toggle("next", nextTarget === rank);
          el.textContent = `G${rank}${v.gIndex >= rank ? " ✓" : nextTarget === rank ? " · 下一目标" : ""}`;
        });
      }
      for (let i = 0; i < 5; i++) {
        const el = $("big-number-detail-" + i); el.hidden = i > order;
        el.classList.add("source-gain-preview");
        text(el.id, `${quantity(v.amounts[i], i)}
${sourceText(v.rates[i], v.rates[i], M.SYMBOLS[i])}
累计获得 ${f(v.resources[i].total)} · 累计消费 ${f(v.resources[i].spent)}${v.resources[i].residual.length ? " · 含已保存尾账" : ""}`);
      }
    }
    function bind() {
      $("ordinary-actions-tab").addEventListener("click", () => { selected = false; render(); });
      $("big-number-tab").addEventListener("click", () => { selected = M.isUnlocked(state); render(); });
      $("tree-tab").addEventListener("click", () => { selected = M.treeUnlocked(state) ? "tree" : false; render(); });
      const treeAction = action => {
        if (context.getCatchUpStatus().locked) return;
        const previous = context.achievementStates();
        context.performSavedAction(action, () => { context.notifyNewAchievements(previous); WIS.Core.Runtime.call("render"); render(); });
      };
      $("tree-enter").addEventListener("click", () => treeAction(() => M.enterTreeSuper(state)));
      $("tree-next").addEventListener("click", () => treeAction(() => M.startNextTree(state)));
      for (const [key, rule] of Object.entries(M.TREE_UPGRADES)) {
        const el = document.createElement("article"); el.className = "tree-upgrade";
        const title = document.createElement("strong"), level = document.createElement("span"), cost = document.createElement("small");
        const effect = document.createElement("p"); effect.className = "tree-upgrade-effect";
        title.textContent = rule.name; title.title = rule.description;
        const button = document.createElement("button"); button.type = "button"; button.className = "primary-button";
        button.id = `tree-upgrade-${key}`; button.textContent = "升级";
        button.title = rule.description;
        button.addEventListener("click", () => treeAction(() => M.purchaseTreeUpgrade(state, key)));
        el.append(title, level, effect, cost, button); $("tree-upgrades").append(el); treeRows.push({ key, level, effect, cost, button });
      }
      for (let i = 0; i < 5; i++) {
        const el = document.createElement("article"); el.className = "fractal-row";
        const label = document.createElement("div"), title = document.createElement("strong"), effect = document.createElement("p"), status = document.createElement("small");
        title.textContent = `分形-${i + 1}`;
        effect.className = "source-gain-preview";
        effect.textContent = sourceText(B.ONE, B.ONE, M.SYMBOLS[i]);
        if (i === 4) effect.title = "解锁后获得 G1";
        status.id = `fractal-status-${i}`; label.append(title, effect, status);
        const button = document.createElement("button"); button.type = "button"; button.className = "primary-button";
        button.id = `buy-fractal-${i + 1}`;
        button.addEventListener("click", () => {
          if (context.getCatchUpStatus().locked) return;
          const previous = context.achievementStates();
          context.performSavedAction(() => M.purchase(state, i + 1), () => {
            context.notifyNewAchievements(previous); WIS.Core.Runtime.call("render"); render();
          });
        });
        el.append(label, button); $("fractal-list").append(el); rows.push({ el, status, button });
        const detail = document.createElement("p"); detail.id = "big-number-detail-" + i; $("big-number-details").append(detail);
      }
      for (const rank of M.MILESTONES) {
        const el = document.createElement("span"); $("graham-milestones").append(el); milestones.push({ el, rank });
      }
      render();
    }
    return { render, bind, isSelected: () => selected };
  } });
}(window.WIS));
