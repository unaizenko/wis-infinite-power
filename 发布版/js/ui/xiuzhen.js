(function defineXiuzhenUI(WIS) {
  "use strict";
  WIS.UI.Xiuzhen = Object.freeze({ create(context) {
    const X = WIS.Cultivation.Xiuzhen, R = WIS.Core.Runtime, B = WIS.Core.BigNum;
    const $ = id => document.getElementById(id), rows = [], groups = [];
    let mounted = false, lastRealm = -1;
    const f = value => context.format(value, 4);
    function el(tag, text, className) {
      const n = document.createElement(tag); if (text) n.textContent = text; if (className) n.className = className; return n;
    }
    function fold(title, id) {
      const n = el("details", "", "upgrade-group xiuzhen-fold"); n.id = id; n.open = true;
      n.append(el("summary", title)); return n;
    }
    function perform(action) {
      if (context.getCatchUpStatus().locked) return;
      context.performSavedAction(() => action(R.getState()), () => {R.call("render");render();},
        () => WIS.Meta.Challenges.checkActiveChallengeCompletion());
    }
    function row(parent, name, description, cost, resource, action, key) {
      const item = el("article", "", "item-row"), content = el("div", "", "item-content");
      content.append(el("h2", name), el("p", description));
      const control = el("div", "", "purchase-control"), price = el("small", `消耗 ${f(cost)} ${X.labels[resource]}`);
      const button = el("button", "强化", "primary-button"); button.type = "button"; button.id = "xiuzhen-" + key;
      button.addEventListener("click", () => perform(action)); control.append(price, button); item.append(content, control); parent.append(item);
      let preview;
      if (["buy-xianForce", "buy-yuanForce"].includes(key)) {
        preview = el("span", "", "source-gain-preview"); preview.id = key + "-source-preview";
        control.prepend(preview);
      }
      return { item, price, button, preview };
    }
    function bind() {
      if (mounted) return; mounted = true;
      const oldRealm = $("realm-card-list").closest("details");
      oldRealm.querySelector("b").textContent = "仙道·炼气道";
      const realms = fold("仙道·修真道", "xiuzhen-realms");
      realms.open = false;
      $("immortal-realms-panel").append(realms);
      const note = el("p", "", "big-number-note"); note.id = "xiuzhen-unlock-note"; realms.append(note);
      X.realms.forEach(r => rows.push({ type: "realm", definition: r, ...row(realms, r.name,
        r.level < 4 ? r.level === 2 ? "开放仙力体系；获得成就·婴变为仙，解锁仙道挑战·阴虚阳实。" : r.level === 3 ? "开放元力体系。" : "完成挑战·化凡后解锁；开放意境、元神。"
          : `永久取消${["星系", "超星系团", "宇宙结构"][r.level - 4]}软上限（挑战重新施加时除外）。`, r.cost, r.resource,
        state => X.get(state).realm === r.level - 1 && X.breakthrough(state), "realm-" + r.level) }));
      const abilitiesPanel = $("immortal-abilities-panel"), oldContent = abilitiesPanel.querySelector(".upgrade-groups");
      const oldAbilities = fold("仙道·炼气道能力", "qi-path-abilities");
      abilitiesPanel.insertBefore(oldAbilities, oldContent); oldAbilities.append(oldContent);
      const newAbilities = fold("仙道·修真道能力", "xiuzhen-abilities"); abilitiesPanel.append(newAbilities);
      X.realms.forEach(r => {
        const group = fold(r.name, "xiuzhen-ability-group-" + r.level); groups.push({ group, level: r.level }); newAbilities.append(group);
        X.abilities.filter(a => a.realm === r.level).forEach(a => rows.push({ type: "ability", definition: a,
          ...row(group, a.name, a.description, a.cost, a.resource, state => X.buy(state, a.key), "buy-" + a.key) }));
      });
      for (const [key, description, reward] of [
        ["mortalTransformation", "禁用探寻及已获得的仙道能力、倍率、指数和特殊效果，保留吐纳、其他法力来源及炼气道基础突破，重新抵达炼气道·化神。", "可突破修真道·化神"],
        ["yinVoidYangReal", "使J、战力获取变为^0.85；同时受到福、禄、寿最高档挑战限制，重新抵达第一步·问鼎。", "可突破第二步·窥涅。"]
      ]) {
        const card = el("article", "", "item-row"); card.id = "xiuzhen-challenge-" + key;
        card.dataset.challengeKey = key; card.dataset.catalogSystem = "仙道";
        const content = el("div", "", "item-content"); content.append(el("h2", "挑战·" + WIS.Core.Config.challenges[key].name), el("p", description), el("p", "奖励：" + reward));
        const control = el("div", "", "purchase-control"), status = el("span"); status.id = "xiuzhen-challenge-status-" + key;
        const button = el("button", "开启挑战", "primary-button"); button.type = "button"; button.id = "xiuzhen-challenge-button-" + key;
        button.addEventListener("click", () => { if (context.getCatchUpStatus().locked) return;
          if (R.state.activeChallenge === key) WIS.Meta.Challenges.exitChallenge(); else WIS.Meta.Challenges.startChallenge(key); context.completePlayerAction(); renderChallenges(); });
        control.append(status, button); card.append(content, control);
        $("challenge-list").querySelector('[data-catalog-system-group="仙道"] > .item-list').append(card);
      }
      render(); renderChallenges();
    }
    function renderChallenges() {
      if (!mounted) return;
      const s = R.getState();
      for (const key of ["mortalTransformation", "yinVoidYangReal"]) {
        const running = s.activeChallenge === key, count = s.challengeCompletions[key] || 0;
        $("xiuzhen-challenge-" + key).hidden = !WIS.Meta.Challenges.challengeUnlocked(key);
        $("xiuzhen-challenge-status-" + key).textContent = running ? "挑战进行中" : `完成：${count}/1`;
        const button = $("xiuzhen-challenge-button-" + key);
        button.textContent = running ? "退出挑战" : count ? "重复挑战（无额外奖励）" : "开启挑战";
        button.disabled = context.getCatchUpStatus().locked || (!!s.activeChallenge && !running);
      }
      WIS.UI.Cards.updateCatalogGroupCounts($("challenge-list"), "挑战");
    }
    function render() {
      if (!mounted) return;
      const s = R.getState(), n = X.get(s), unlocked = X.unlocked(s), locked = context.getCatchUpStatus().locked;
      $("xiuzhen-realms").hidden = !X.available(s);
      $("xiuzhen-abilities").hidden = !X.available(s) || n.realm < 1;
      $("xiuzhen-unlock-note").hidden = !unlocked;
      $("xiuzhen-unlock-note").textContent = X.sealed(s)
        ? (X.qiPathSealed(s) ? "化凡挑战期间仙道能力封印；结束后按当前已获得状态恢复。"
          : "炼气十万年期间修真道封印，历史境界不解除软上限；无限炼气可继续推进。退出后恢复原有修真道资格。")
        : `当前：${n.realm ? X.realms[n.realm - 1].name : "等待突破第一步·化神"}。炼气道继续生效；两道不是二选一。`;
      rows.forEach(r => {
        const d = r.definition, done = r.type === "realm" ? n.realm >= d.level : !!n.abilities[d.key];
        const available = r.type === "realm" ? n.realm === d.level - 1 && X.canBreakthrough(s) : X.canBuy(s, d.key);
        r.item.hidden = r.type === "realm" ? d.level > n.realm + 1 : d.realm > n.realm;
        r.item.classList.toggle("purchased", done); r.price.hidden = done;
        r.item.classList.toggle("xiuzhen-locked", !unlocked || (r.type === "ability" && n.realm < d.realm));
        r.button.textContent = done ? r.type === "ability" ? "已强化" : "已突破"
          : r.type === "realm" ? (d.level === 4 && !s.challengeCompletions.yinVoidYangReal ? "需要完成阴虚阳实" : "突破") : "强化";
        r.button.disabled = locked || done || !available;
        if (r.preview) WIS.UI.SourcePreview.write(r.preview, d.key, context.format, s, { assumeUnlocked: !done });
      });
      if (n.realm !== lastRealm) {
        groups.forEach(({ group, level }) => { group.open = level === Math.max(1, n.realm); }); lastRealm = n.realm;
      }
      groups.forEach(({ group, level }) => {
        group.hidden = n.realm < level;
        group.classList.toggle("xiuzhen-locked", !unlocked || n.realm < level);
      });
      if (X.qiPathSealed(s)) $("qi-path-abilities").querySelectorAll("button").forEach(b => { b.disabled = true; });
    }
    return { bind, render, renderChallenges };
  } });
}(window.WIS));
