(function defineTreasurePresentation(WIS) {
  "use strict";
  const B = WIS.Core.BigNum;
  const sourceNames = Object.freeze({
    "健身实际产生 J": "健身", "健身实际产生J": "健身", "打岩实际产生战力": "打岩",
    "极意实际产生战力": "极意", "当前量级有效时间": "当前量级停留时间",
    "有效探寻量": "探寻", "周天；成功吐纳另计": "周天、吐纳", "实际产生仙灵力": "仙灵力获取"
  });
  const sourcesByKey = Object.freeze({
    lawImprint:"实际获得气、体", originImprint:"涅力获取", fitnessMembershipCard: "健身", superLollipop: "健身", skyCrystal: "打岩", fiveSpiritStone: "极意",
    cosmicFiber: "当前量级停留时间", cosmicWill: "当前量级停留时间",
    tianNiPearl: "探寻、周天、吐纳", baLingChi: "周天、吐纳",
    mysteriousGreenBottle: "探寻", fuBao: "探寻", xuTianDing: "探寻", wanYaoFan: "探寻",
    phantomHeavenMirror: "探寻", mysticHeavenSacredTree: "探寻", mysticHeavenSpiritSlayingSword: "探寻",
    fiveElementsTreasure: "仙灵力获取", immortalCrystal: "仙灵力获取", yuanCrystal:"仙力获取"
  });
  const reported = new Map();
  function time(seconds, format, conservative = false) {
    if (seconds === null || seconds === undefined || !B.isFiniteBN(seconds) || B.lt(seconds, 0)) return "—";
    const value = B.BN(seconds);
    if (B.lt(value, .1)) return "即将获得";
    if (B.gte(value, 86400)) {
      const days = B.div(value, 86400), n = B.toNumber(days, Infinity);
      return `约${n < 10 ? (conservative ? Math.ceil(n * 10) / 10 : n).toFixed(1).replace(/\.0$/, "") : n < 1e9 ? (conservative ? Math.ceil(n) : Math.round(n)) : format(days, 3)}天`;
    }
    const n = Math.max(1, (conservative ? Math.ceil : Math.round)(B.toNumber(value, 0)));
    if (n < 60) return `约${n}秒`;
    if (n < 3600) return `约${Math.floor(n / 60)}分${n % 60 ? n % 60 + "秒" : ""}`;
    const minutes = conservative ? Math.ceil(n / 60) : Math.floor(n / 60);
    return `约${Math.floor(minutes / 60)}小时${minutes % 60 ? minutes % 60 + "分" : ""}`;
  }
  function percentage(info) {
    const progress = B.parseFinite(info.progress), demand = B.parseFinite(info.demand);
    if (info.remainderCertainty !== 'exact' || info.pendingInputs > 0 || !progress || !demand ||
        progress.lt(0) || !demand.gt(0) || progress.gt(demand)) return null;
    const fraction = B.div(progress, demand), n = B.toNumber(fraction, NaN);
    if (!Number.isFinite(n) || (n === 0 && B.gt(info.progress, 0)) || (n >= 1 && info.remainingPositive)) return null;
    return WIS.UI.Format.progressPercentage(n);
  }
  function pauseReason(key, info) {
    const reason = info.pausedReason;
    if (!reason) return "";
    if (reason.startsWith("来源暂无实际产出")) {
      if (["immortalCrystal", "fiveElementsTreasure"].includes(key)) return "当前无仙灵力产出";
      if (key === "yuanCrystal") return "当前无仙力产出";
      if (["fitnessMembershipCard", "superLollipop"].includes(key)) return "当前无健身产出";
      if (key === "skyCrystal") return "当前无打岩产出";
      if (key === "fiveSpiritStone") return "当前无极意产出";
      return "当前无持续产出";
    }
    // Show player-facing prerequisites only; never echo arbitrary engine errors.
    if (/^(当前未选择仙道|尚未取得对应成就|宝物界面尚未解锁|尚未取得五灵石获取资格|尚未解锁五行至宝|尚未取得虚本源|尚未达到超星系团量级|尚未达到宇宙结构量级|尚未解锁(?:通天|玄天)灵宝\d+)$/.test(reason))
      return reason.replace("获取资格", "");
    return "当前无法获取";
  }
  const imprintSources = Object.freeze({willImprint:"心", emperorImprint:"战力", sacredBodyImprint:"体", godBodyImprint:"体", sourceStoneImprint:"J", lawImprint:"气、体"});
  function progressView(key, info, format) {
    if (imprintSources[key]) {
      const source = key === "willImprint" ? "来源：获得或失去心" : "来源：实际获得" + imprintSources[key];
      const progress = "进度：" + format(info.progress,4) + " / " + format(info.demand,4);
      const requirement = key === "willImprint" ? "尚未取得魂成就" : key === "lawImprint" ? "尚未取得源能法则成就" : "尚未取得四极成就";
      const paused = info.pausedReason === "当前未选择武道" || info.pausedReason === requirement;
      const rule = key === "willImprint" ? "每获得或失去 1 心，积累 1 进度" : key === "lawImprint" ? "转换、自动产出与实际资源奖励均可积累；预览不计入" : "实际正向入账累计；预览、扣款与读取存档不计入";
      return {summary:paused ? info.pausedReason : progress, details:paused ? [source,progress] : [source,rule],
        lines:[source,progress,paused ? info.pausedReason : rule]};
    }
    const sources = (info.sources || []).map(s => sourceNames[s]).filter(Boolean).join("、") || sourcesByKey[key] || "暂无来源";
    const direct = B.gt(info.shengRate || 0, 0);
    const lines = ["来源：" + sources];
    if (direct) lines.push(`空玄·生：每秒 +${format(info.shengRate, 4)} 件`);
    const details = [lines[0]], summary = lines.slice(1);
    const pause = pauseReason(key, info);
    const blocked = info.remainderCertainty === 'blocked' || info.precision?.state === "blocked";
    if (info.closedHigh && !blocked) {
      const income = "进度收入：每秒 " + format(info.rate,4);
      lines.push(income);
      if (pause) lines.push(pause);
      if (pause || direct) details.push(income);
      if (pause || !direct) summary.push(pause || income);
      return {lines,details,summary:summary.join(" · ")};
    }
    if (blocked) {
      const failed = /ledger|invalid|failed|capacity/.test(info.precision?.code || "");
      lines.push(failed ? "结算异常，请重试" : "结算中");
      summary.push(lines[lines.length - 1]);
      if (failed) {
        const signature = `${info.precision?.code}|${info.precision?.message}`;
        if (reported.get(key) !== signature) {
          reported.set(key, signature);
          console.warn("WIS treasure display: settlement issue", { key, precision: info.precision, pausedReason: info.pausedReason });
        }
      }
    } else {
      reported.delete(key);
      const known = info.remainderCertainty === 'known-lower-bound';
      const seconds = info.displayRemainingSeconds;
      const eta = !B.gt(info.rate, 0) ? ((info.sources || []).length || sourcesByKey[key] ? "当前无产出" : "暂无来源")
        : info.displayEtaMode === 'unavailable' || seconds == null ? "暂无法估计"
        : info.displayEtaMode === 'conservative' ? `≤${B.lt(seconds, .1) ? '约0.1秒' : time(seconds, format, true)}`
        : time(seconds, format);
      const percent = percentage(info);
      const validDemand = B.parseFinite(info.demand);
      const demand = validDemand && validDemand.gt(0) ? format(validDemand, 4) : "暂无法计算";
      lines.push(`${known ? '已知进度' : '进度'}：${format(info.progress, 4)} / ${demand}`);
      details.push(lines[lines.length - 1]);
      const next = [percent, pause ? null : eta].filter(Boolean);
      if (next.length) summary.push((direct ? "自然获取" : "下一件") + " " + next.join(" · "));
      lines.push(`${direct ? "自然获取预计" : "预计"}：${eta}`);
      if (percent !== null) lines.push(`下次获得：${percent}`);
    }
    if (pause) {
      const status = (direct ? "自然获取暂停：" : "暂停：") + pause;
      lines.push(status);
      summary.push(status);
    }
    return {lines, details, summary:summary.join(" · ")};
  }

  function acquisition(key, info, format) {
    return progressView(key,info,format).lines.join("\n");
  }

  function mountProgress(content, progress) {
    const details = content.ownerDocument.createElement("details");
    details.className = "card-details treasure-details";
    details.append(content.ownerDocument.createElement("summary"), progress);
    content.append(details);
  }

  function renderProgress(progress, key, info, format) {
    if (!progress) return;
    const view = progressView(key, info, format);
    const summary = progress.previousElementSibling?.tagName === "SUMMARY" ? progress.previousElementSibling : null;
    const text = (summary ? view.details : view.lines).join("\n");
    if (progress.textContent !== text) progress.textContent = text;
    if (summary && summary.textContent !== view.summary) summary.textContent = view.summary;
  }
  function mount(root) {
    root.querySelectorAll("#treasure-list .item-row").forEach(card => {
      if (card.classList.contains("treasure-card")) return;
      const content = card.querySelector(".item-content"), title = content.querySelector("h2");
      const count = card.querySelector('[id$="-count"]'), effect = card.querySelector('[id$="-effect"]');
      const progress = card.querySelector('[id$="-final-chance"]') || card.querySelector('[id$="-chance"]');
      if (!count || !progress) return;
      content.querySelectorAll("p").forEach(p => p.remove());
      title.append(" ", count); count.textContent = "×0";
      if (effect) {
        effect.classList.add("treasure-effect");
        content.append(effect);
      }
      progress.classList.add("treasure-acquisition");
      mountProgress(content, progress);
      // Keep legacy IDs available to existing render bindings; no visible details.
      card.querySelector(".purchase-control").hidden = true;
      card.classList.add("treasure-card");
    });
  }
  WIS.UI.Treasures = Object.freeze({ time, percentage, acquisition, mountProgress, renderProgress, mount });
  mount(document);
}(window.WIS));
