(function defineBigNumberPage(WIS) {
  "use strict";
  WIS.UI.BigNumbers = Object.freeze({ create(context) {
    const M = WIS.Meta.BigNumbers, B = WIS.Core.BigNum;
    const state = WIS.Core.Runtime.state, $ = id => document.getElementById(id);
    let selected = false, lastGraham = false;
    const text = (id, value) => { const el = $(id); if (el.textContent !== value) el.textContent = value; };
    const f = x => {
      const n = B.BN(x);
      if (B.gt(n, 0) && B.lt(n, 0.001)) return n.toExponential(3);
      return context.format(n, 4);
    };
    const quantity = (value, order) => `${f(value)} ${M.SYMBOLS[order]}`;
    const rows = [], milestones = [];
    function render() {
      const unlocked = M.syncUnlock(state);
      const tab = $("big-number-tab"); tab.disabled = !unlocked;
      $("big-number-tabs").hidden = !unlocked;
      tab.hidden = !unlocked;
      tab.title = unlocked ? "符号层级与系数" : "";
      if (!unlocked) selected = false;
      $("ordinary-actions-panel").hidden = selected;
      $("big-number-panel").hidden = !selected;
      $("ordinary-actions-tab").setAttribute("aria-selected", String(!selected));
      tab.setAttribute("aria-selected", String(selected));
      if (!selected) return;
      const v = M.view(state), order = v.dominantOrder, graham = v.gIndex > 0;
      text("big-number-dominant", graham ? `G${v.gIndex}` : quantity(v.amounts[order], order));
      text("big-number-rate", graham ? `当前超分形速度：${f(v.speed)}%/秒` : `当前获取：+${quantity(v.rates[order], order)}/秒`);
      text("big-number-secondary", graham ? `次级：${quantity(v.amounts[4], 4)}；Q = ${f(v.amounts[4])}`
        : order > 0 ? `次级：${quantity(v.amounts[order - 1], order - 1)}` : "更高阶符号尚未解锁");
      text("big-number-base", `战力来源：${f(M.baseYRate(state.power))} Y/秒。Y 是固定符号；这里的数字只是持有系数。`);
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
        const complete = v.gIndex === 64;
        text("super-fractal-next", complete ? "G64 · 本阶段完成；后续层级暂未开放" : `下一阶位：G${v.gIndex + 1}`);
        text("super-fractal-progress", complete ? `保留进度：${f(v.progress)}%（不兑换未开放阶位）` : `${B.toNumber(v.progress, 0).toFixed(2)}% / 100%`);
        $("super-fractal-bar").value = complete ? 100 : Math.min(100, B.toNumber(v.progress, 0));
        text("super-fractal-sources", `基础：0.008%/秒 · Graham里程碑：×${v.milestoneMultiplier} · 超越分形：×${f(v.fractalMultiplier)}`);
        const nextTarget = M.MILESTONES.find(g => g > v.gIndex);
        milestones.forEach(({ el, rank }) => {
          el.classList.toggle("complete", v.gIndex >= rank); el.classList.toggle("next", nextTarget === rank);
          el.textContent = `G${rank}${v.gIndex >= rank ? " ✓" : nextTarget === rank ? " · 下一目标" : ""}`;
        });
      }
      for (let i = 0; i < 5; i++) {
        const el = $("big-number-detail-" + i); el.hidden = i > order;
        text(el.id, `${quantity(v.amounts[i], i)} · +${quantity(v.rates[i], i)}/秒 · 累计获得 ${f(v.resources[i].total)} · 累计消费 ${f(v.resources[i].spent)}${v.resources[i].residual.length ? " · 含已保存尾账" : ""}`);
      }
    }
    function bind() {
      $("ordinary-actions-tab").addEventListener("click", () => { selected = false; render(); });
      $("big-number-tab").addEventListener("click", () => { selected = M.syncUnlock(state); render(); });
      for (let i = 0; i < 5; i++) {
        const el = document.createElement("article"); el.className = "fractal-row";
        const label = document.createElement("div"), title = document.createElement("strong"), effect = document.createElement("p"), status = document.createElement("small");
        title.textContent = `分形-${i + 1}`;
        effect.textContent = `获得1 ${M.SYMBOLS[i]}/秒${i === 4 ? "；获得 G1/s" : ""}`;
        status.id = `fractal-status-${i}`; label.append(title, effect, status);
        const button = document.createElement("button"); button.type = "button"; button.className = "primary-button";
        button.id = `buy-fractal-${i + 1}`;
        button.addEventListener("click", () => {
          if (context.getCatchUpStatus().locked) return;
          const previous = context.achievementStates();
          try {
            if (M.purchase(state, i + 1)) {
              context.saveState(); context.notifyNewAchievements(previous); WIS.Core.Runtime.call("render");
            }
          } catch (error) { WIS.Core.Runtime.call("showNotice", `分形操作未完成：${error.message}`); }
          render();
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
