(function defineOnlineCompensation(WIS) {
  'use strict';
  WIS.Simulation = WIS.Simulation || {};
  // Only elapsed automatic production enters this scope. Manual actions,
  // refunds, asset conversion and treasure progress never read this factor.
  let productionFactor = 1;
  const fresh = () => ({ version: 1, balance: 0, totalGranted: 0, totalConsumed: 0,
    grantSequence: 0, lastConversion: null });
  function normalize(raw) {
    if (raw == null) return fresh();
    if (!raw || raw.version !== 1) throw Error('在线补偿版本无效');
    for (const key of ['balance', 'totalGranted', 'totalConsumed'])
      if (!Number.isFinite(raw[key]) || raw[key] < 0) throw Error('在线补偿时长无效');
    if (!Number.isSafeInteger(raw.grantSequence) || raw.grantSequence < 0 ||
        (raw.lastConversion !== null && raw.lastConversion !== 'conversion-' + raw.grantSequence))
      throw Error('在线补偿转换标识无效');
    if (Math.abs(raw.totalGranted - raw.totalConsumed - raw.balance) >
        1e-8 * Math.max(1, raw.totalGranted)) throw Error('在线补偿账目不一致');
    return { version: 1, balance: raw.balance, totalGranted: raw.totalGranted,
      totalConsumed: raw.totalConsumed, grantSequence: raw.grantSequence, lastConversion: raw.lastConversion };
  }
  const get = state => state.core.runtime.compensation;
  function withFactor(factor, work) {
    if (factor !== 1 && factor !== 2) throw Error('在线补偿倍率无效');
    const previous = productionFactor;
    productionFactor = factor;
    try { return work(); } finally { productionFactor = previous; }
  }
  function consume(state, seconds) {
    const old = get(state);
    if (!Number.isFinite(seconds) || seconds < 0 || seconds > old.balance + 1e-10)
      throw Error('在线补偿额度不足，结算未提交');
    const spent = Math.min(seconds, old.balance);
    const balance = old.balance - spent;
    state.core.runtime.compensation = { ...old, balance, totalConsumed: old.totalConsumed + spent };
    return spent;
  }
  function grant(state, seconds) {
    const old = get(state), sequence = old.grantSequence + 1;
    if (!Number.isFinite(seconds) || !(seconds > 0) || !Number.isSafeInteger(sequence) ||
        !Number.isFinite(old.balance + seconds) || !Number.isFinite(old.totalGranted + seconds))
      throw Error('在线补偿转换时长无效');
    const next = { ...old, balance: old.balance + seconds, totalGranted: old.totalGranted + seconds,
      grantSequence: sequence, lastConversion: 'conversion-' + sequence };
    state.core.runtime.compensation = next;
    return next;
  }
  WIS.Simulation.Compensation = Object.freeze({ fresh, normalize, get, grant, consume, withFactor,
    factor: () => productionFactor,
    eligibleAtEnqueue: state => get(state).balance > 0,
    whitelist: Object.freeze(['automatic-joules', 'automatic-power', 'automatic-base-mana',
      'automatic-exploration-mana', 'automatic-immortal-power', 'automatic-xian-force', 'automatic-yuan-force']) });
}(window.WIS));
