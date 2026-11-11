(function defineActionView(WIS) {
  "use strict";
  const B = WIS.Core.BigNum;
  // Read published values only: never evaluate rules, pay, roll RNG or save.
  function nextManaRequirement(next, current) {
    if (next === undefined) return { status: "pending" };
    const amount = B.BN(next), stock = B.BN(current);
    if (!B.isFiniteBN(amount) || B.isNaNBN(amount) || !B.gt(amount, 0) ||
        !B.isFiniteBN(stock) || B.isNaNBN(stock) || B.lt(stock, 0)) return { status: "unavailable" };
    const distant = B.gt(stock, 0) && B.gt(B.sub(B.log10(amount), B.log10(stock)), 6);
    return { status: distant ? "distant" : "ready", amount };
  }
  function training({ enough, busy, previewGain }) {
    if (busy) return { enabled: false, reasonCode: "busy", label: "正在处理…", reason: "当前操作完成后即可继续。" };
    if (!enough) return { enabled: false, reasonCode: "need-j", label: "锻炼", reason: "至少需要 10 J。" };
    const low = previewGain != null && B.isFiniteBN(previewGain) && !B.isNaNBN(previewGain) && B.gte(previewGain, 0) && B.lt(previewGain, 1);
    return { enabled: true, reasonCode: null, label: "锻炼", reason: low ? "上次计算的收益不足 1 战力；继续积累 J 后可再试。" : "" };
  }
  function previewFailure(error) {
    const code = typeof error?.code === "string" ? error.code : "preview-unavailable";
    const detail = typeof error?.message === "string" ? error.message : String(error || "");
    return { code, message: "暂时无法计算收益。", details: code + (detail ? "\n" + detail : "") };
  }
  WIS.UI.ActionView = Object.freeze({ nextManaRequirement, training, previewFailure });
}(window.WIS));
