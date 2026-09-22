(function defineUIFormat(WIS) {
  "use strict";
  const { BN, abs: absBN, div: divBN, gt, gte, isFiniteBN, isNaNBN, toNumber } = WIS.Core.BigNum;
  function formatCompact(value, divisor, suffix) {
    const scaled = toNumber(divBN(value, divisor));
    const rounded = Math.abs(scaled) >= 999.995
      ? Math.sign(scaled) * 999.99
      : Number(scaled.toFixed(2));
    return `${rounded}${suffix}`;
  }

  function trimFixed(value, fractionDigits = 2) {
    return value.toFixed(fractionDigits).replace(/\.?0+$/, "");
  }

  // Display policy only: nine-digit scientific exponents use existing ee notation.
  const SCIENTIFIC_EXPONENT_DISPLAY_LIMIT = 1e8;
  function formatScientificParts(mantissa, exponent, sign = 1, fractionDigits = 2) {
    const scale = Math.pow(10, fractionDigits);
    let roundedMantissa = Math.round((mantissa + 1e-12) * scale) / scale;
    let adjustedExponent = Math.trunc(exponent);
    if (roundedMantissa >= 10) {
      roundedMantissa = 1;
      adjustedExponent += 1;
    }
    if (adjustedExponent >= SCIENTIFIC_EXPONENT_DISPLAY_LIMIT) {
      const magnitude = Math.log10(exponent + Math.log10(mantissa));
      return `${sign < 0 ? "-" : ""}ee${formatLayerMagnitude(magnitude)}`;
    }
    if (adjustedExponent <= -SCIENTIFIC_EXPONENT_DISPLAY_LIMIT) {
      const magnitude = Math.log10(-(exponent + Math.log10(mantissa)));
      return `${sign < 0 ? "-" : ""}e-e${formatLayerMagnitude(magnitude)}`;
    }
    return `${sign < 0 ? "-" : ""}${trimFixed(roundedMantissa, fractionDigits)}e${adjustedExponent}`;
  }

  function formatLayerMagnitude(magnitude) {
    if (!Number.isFinite(magnitude)) return "0";
    const sign = Math.sign(magnitude) || 1;
    const absolute = Math.abs(magnitude);
    if (absolute < 1e9) return `${sign < 0 ? "-" : ""}${trimFixed(absolute)}`;
    const exponent = Math.floor(Math.log10(absolute));
    return formatScientificParts(absolute / Math.pow(10, exponent), exponent, sign);
  }

  function formatLargeDecimal(decimal) {
    const sign = decimal.sign;
    const layer = Math.trunc(decimal.layer);
    const magnitude = decimal.mag;
    if (!Number.isFinite(sign) || !Number.isFinite(layer) || !Number.isFinite(magnitude)) return "0";
    if (layer <= 1) {
      const exponent = layer === 0
        ? Math.floor(Math.log10(magnitude))
        : Math.floor(magnitude);
      const mantissa = layer === 0
        ? magnitude / Math.pow(10, exponent)
        : Math.pow(10, magnitude - exponent);
      return formatScientificParts(mantissa, exponent, sign);
    }
    if (magnitude < 0) {
      const exponentLayer = layer - 1;
      const prefix = exponentLayer <= 5 ? "e".repeat(exponentLayer) : `(e^${exponentLayer})`;
      return `${sign < 0 ? "-" : ""}e-${prefix}${formatLayerMagnitude(-magnitude)}`;
    }
    const layerPrefix = layer <= 5 ? "e".repeat(layer) : `(e^${layer})`;
    return `${sign < 0 ? "-" : ""}${layerPrefix}${formatLayerMagnitude(magnitude)}`;
  }

  function formatNumber(value, maximumFractionDigits = 2) {
    const decimal = BN(value);
    if (!isFiniteBN(decimal) || isNaNBN(decimal)) return "0";
    if (decimal.layer > 0 && decimal.mag < 0) return formatLargeDecimal(decimal);
    if (gte(absBN(decimal), 1e9)) return formatLargeDecimal(decimal);
    const number = decimal.toNumber();
    const absolute = Math.abs(number);
    if (absolute >= 1e6) return formatCompact(number, 1e6, "M");
    if (absolute >= 1e3) return formatCompact(number, 1e3, "k");
    if (maximumFractionDigits === 0 || Number.isInteger(number)) {
      return Math.round(number).toLocaleString("zh-CN");
    }
    return number.toLocaleString("zh-CN", {
      minimumFractionDigits: 0,
      maximumFractionDigits
    });
  }

  function formatSmallMultiplier(value, maximumFractionDigits = 5) {
    const decimal = BN(value);
    if (!isFiniteBN(decimal) || isNaNBN(decimal)) return "0";
    const absolute = absBN(decimal);
    if (!gt(absolute, 0)) return "0";
    return gte(absolute, "1e-4")
      ? formatNumber(decimal, maximumFractionDigits)
      : formatLargeDecimal(decimal);
  }

  // Multiplier-only display; ordinary resources and costs keep k/M.
  function scientificMultiplier(value) {
    const decimal = WIS.Core.BigNum.parseFinite(value);
    if (!decimal || decimal.lt(0)) return "—";
    if (decimal.eq(0) || decimal.eq(1)) return decimal.toString();
    if (decimal.layer >= 2 && decimal.mag < 0) return formatLargeDecimal(decimal);
    if (decimal.layer >= 2) {
      const prefix = decimal.layer <= 5 ? "e".repeat(decimal.layer) : `(e^${decimal.layer})`;
      return prefix + formatLayerMagnitude(decimal.mag);
    }
    let exponent = decimal.layer === 0 ? Math.floor(Math.log10(decimal.mag)) : Math.floor(decimal.mag);
    const mantissa = decimal.layer === 0 ? decimal.mag / Math.pow(10, exponent) : Math.pow(10, decimal.mag - exponent);
    return formatScientificParts(mantissa, exponent, 1, 3);
  }

  function formatGameCalendar(totalRealSeconds) {
    // Statistics display only: one elapsed real second represents one game minute.
    const totalMinutes = Math.max(0, Math.floor(totalRealSeconds));
    let totalHours = Math.floor(totalMinutes / 60);
    const hoursPerDay = 24;
    const hoursPerMonth = hoursPerDay * 30;
    const hoursPerYear = hoursPerMonth * 12;
    const years = Math.floor(totalHours / hoursPerYear);
    totalHours %= hoursPerYear;
    const months = Math.floor(totalHours / hoursPerMonth);
    totalHours %= hoursPerMonth;
    const days = Math.floor(totalHours / hoursPerDay);
    const hours = totalHours % hoursPerDay;
    const parts = [];
    if (years > 0) parts.push(`${formatNumber(years, 0)}年`);
    if (months > 0 || years > 0) parts.push(`${months}月`);
    if (days > 0 || months > 0 || years > 0) parts.push(`${days}日`);
    if (hours > 0 || parts.length > 0) parts.push(`${hours}小时`);
    parts.push(`${totalMinutes % 60}分钟`);
    return parts.join("");
  }

  function formatElapsedTime(totalSeconds) {
    const seconds = Math.max(0, Math.floor(totalSeconds));
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor(seconds % 86400 / 3600);
    const minutes = Math.floor(seconds % 3600 / 60);
    const remainingSeconds = seconds % 60;
    if (days > 0) return `${days}天${hours}小时`;
    if (hours > 0) return `${hours}小时${minutes}分钟`;
    if (minutes > 0) return `${minutes}分钟${remainingSeconds}秒`;
    return `${remainingSeconds}秒`;
  }

  function formatMultiplierGroups(groups, multiplierEffectValue) {
    return Object.entries(groups).map(([groupName, effects]) => `${groupName}：${effects.map((effect, index) => {
      const effectName = typeof effect === "object" && effect !== null ? effect.name : `乘区${index + 1}`;
      return `${effectName} ×${formatNumber(multiplierEffectValue(effect), 2)}`;
    }).join("、")}`).join("；");
  }

  function progressPercentage(n) {
    const percent = n * 100;
    if (percent > 0 && percent < .1) return "小于0.1%";
    if (percent < 100 && Number(percent.toFixed(1)) === 100) return "大于99.9%";
    return percent.toFixed(1) + "%";
  }

  const formatCost = (value) => formatNumber(value, 0);
  WIS.UI.Format = Object.freeze({
    elapsedTime: formatElapsedTime, gameCalendar: formatGameCalendar, multiplierGroups: formatMultiplierGroups, progressPercentage,
    compact: formatCompact,
    number: formatNumber,
    cost: formatCost,
    scientificMultiplier, smallMultiplier: formatSmallMultiplier
  });

}(window.WIS));
