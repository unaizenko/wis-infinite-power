(function defineTreasurePresentation(WIS) {
  "use strict";
  const B = WIS.Core.BigNum;
  const sourceNames = Object.freeze({
    "健身实际产生 J": "健身", "健身实际产生J": "健身", "打岩实际产生战力": "打岩",
    "极意实际产生战力": "极意", "当前量级有效时间": "当前量级停留时间",
    "有效探寻量": "探寻", "周天；成功吐纳另计": "周天、吐纳", "实际产生仙灵力": "仙灵力获取"
  });
  const sourcesByKey = Object.freeze({
    fitnessMembershipCard: "健身", superLollipop: "健身", skyCrystal: "打岩", fiveSpiritStone: "极意",
    cosmicFiber: "当前量级停留时间", cosmicWill: "当前量级停留时间",
    tianNiPearl: "探寻、周天、吐纳", baLingChi: "周天、吐纳",
    mysteriousGreenBottle: "探寻", fuBao: "探寻", xuTianDing: "探寻", wanYaoFan: "探寻",
    phantomHeavenMirror: "探寻", mysticHeavenSacredTree: "探寻", mysticHeavenSpiritSlayingSword: "探寻",
    fiveElementsTreasure: "仙灵力获取", immortalCrystal: "仙灵力获取"
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
    if (info.remainderCertainty !== 'exact' || info.pendingInputs > 0 || !B.isFiniteBN(info.progress) || !B.isFiniteBN(info.demand) ||
        B.lt(info.progress, 0) || !B.gt(info.demand, 0) || B.gt(info.progress, info.demand)) return null;
    const fraction = B.div(info.progress, info.demand), n = B.toNumber(fraction, NaN);
    if (!Number.isFinite(n) || (n === 0 && B.gt(info.progress, 0)) || (n >= 1 && info.remainingPositive)) return null;
    const percent = n * 100;
    if (percent > 0 && percent < .1) return "小于0.1%";
    if (percent < 100 && Number(percent.toFixed(1)) === 100) return "大于99.9%";
    return percent.toFixed(1) + "%";
  }
  function pauseReason(key, info) {
    const reason = info.pausedReason;
    if (!reason) return "";
    if (reason.startsWith("来源暂无实际产出")) {
      if (["immortalCrystal", "fiveElementsTreasure"].includes(key)) return "当前无仙灵力产出";
      if (["fitnessMembershipCard", "superLollipop"].includes(key)) return "当前无健身产出";
      if (key === "skyCrystal") return "当前无打岩产出";
      if (key === "fiveSpiritStone") return "当前无极意产出";
      return "当前无持续产出";
    }
    // Show player-facing prerequisites only; never echo arbitrary engine errors.
    if (/^(当前未选择仙道|尚未取得对应成就|宝物界面尚未解锁|尚未取得五灵石获取资格|尚未解锁五行至宝|尚未达到超星系团量级|尚未达到宇宙结构量级|尚未解锁(?:通天|玄天)灵宝\d+)$/.test(reason))
      return reason.replace("获取资格", "");
    return "当前无法获取";
  }
  function acquisition(key, info, format) {
    const sources = (info.sources || []).map(s => sourceNames[s]).filter(Boolean).join("、") || sourcesByKey[key] || "暂无来源";
    const lines = ["来源：" + sources];
    const blocked = info.remainderCertainty === 'blocked' || info.precision?.state === "blocked";
    if (blocked) {
      const failed = /ledger|invalid|failed|capacity/.test(info.precision?.code || "");
      lines.push(failed ? "结算异常，请重试" : "结算中");
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
      const eta = !B.gt(info.rate, 0) ? "暂无来源"
        : info.displayEtaMode === 'unavailable' || seconds == null ? "暂无法估计"
        : info.displayEtaMode === 'conservative' ? `≤${B.lt(seconds, .1) ? '约0.1秒' : time(seconds, format, true)}`
        : time(seconds, format);
      const percent = percentage(info);
      const demand = B.isFiniteBN(info.demand) && B.gt(info.demand, 0) ? format(info.demand, 4) : "暂无法计算";
      lines.push(`${known ? '已知进度' : '进度'}：${format(info.progress, 4)} / ${demand}`);
      lines.push(`预计：${eta}`);
      if (percent !== null) lines.push(`下一件：${percent}`);
    }
    const pause = pauseReason(key, info);
    if (pause) lines.push("暂停：" + pause);
    return lines.join("\n");
  }
  function mount(root) {
    root.querySelectorAll("#treasure-list .item-row").forEach(card => {
      if (card.classList.contains("treasure-card")) return;
      const content = card.querySelector(".item-content"), title = content.querySelector("h2");
      const count = card.querySelector('[id$="-count"]'), effect = card.querySelector('[id$="-effect"]');
      const progress = card.querySelector('[id$="-final-chance"]') || card.querySelector('[id$="-chance"]');
      if (!count || !effect || !progress) return;
      content.querySelectorAll("p").forEach(p => p.remove());
      title.append(" ", count); count.textContent = "×0";
      effect.classList.add("treasure-effect"); progress.classList.add("treasure-acquisition");
      content.append(effect, progress);
      // Keep legacy IDs available to existing render bindings; no visible details.
      card.querySelector(".purchase-control").hidden = true;
      card.classList.add("treasure-card");
    });
  }
  WIS.UI.Treasures = Object.freeze({ time, percentage, acquisition, mount });
  mount(document);
}(window.WIS));
