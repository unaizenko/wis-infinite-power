(function defineSimulationAccuracy(WIS) {
  "use strict";
  WIS.Simulation = WIS.Simulation || {};
  // Error budgets carry a scale and a small dimensionless weight separately.
  // At layer 2, gain * 0.05 can round straight back to gain; it is NOT a
  // five-percent allowance. Nor does equality of two rounded fits prove that
  // their original-resource gains agree. Keep these two concerns explicit.
  WIS.Simulation.Accuracy = (() => {
    const B = WIS.Core.BigNum;
    const ulp = (value) => value === 0 ? Number.MIN_VALUE :
      Math.max(Number.MIN_VALUE, Math.pow(2, Math.floor(Math.log2(Math.abs(value))) - 52));

    function precision(value, options = {}) {
      const tolerance = Math.max(Number.EPSILON, Number(options.relativeTolerance) || 0.05);
      if (!B.isFiniteBN(value)) return { resolvable: false, reason: "invalid-value" };
      const number = B.abs(value);
      const layer = number.layer;
      const magnitude = number.mag;
      const targetLog10 = Math.log1p(tolerance) / Math.LN10;
      let log10Resolution = 0;
      let requiredDecimalPlaces = 0;
      let requiredSignificantDigits = 16;
      if (layer === 0 && magnitude > 0) {
        log10Resolution = ulp(magnitude) / magnitude / Math.LN10;
      } else if (layer === 1) {
        log10Resolution = ulp(magnitude);
        requiredDecimalPlaces = Math.max(0, Math.ceil(-Math.log10(targetLog10)));
        requiredSignificantDigits = Math.max(1, Math.floor(Math.log10(Math.max(1, Math.abs(magnitude)))) + 1) +
          requiredDecimalPlaces;
      } else if (layer === 2) {
        // d log10(resource) / d mag = ln(10) * 10^abs(mag).
        const logarithmicResolution = Math.log10(Math.LN10 * ulp(magnitude)) + Math.abs(magnitude);
        log10Resolution = logarithmicResolution > 308 ? Infinity : Math.pow(10, logarithmicResolution);
        requiredDecimalPlaces = Math.ceil(Math.abs(magnitude) + Math.log10(Math.LN10 / targetLog10));
        requiredSignificantDigits = Math.max(1, Math.floor(Math.log10(Math.max(1, Math.abs(magnitude)))) + 1) +
          requiredDecimalPlaces;
      } else if (layer > 2) {
        log10Resolution = Infinity;
        requiredDecimalPlaces = Infinity;
        requiredSignificantDigits = Infinity;
      }
      return { resolvable: log10Resolution * 8 < targetLog10, layer, magnitude,
        log10Resolution, requiredDecimalPlaces, requiredSignificantDigits };
    }

    function normalizeTerms(terms) {
      const normalized = [];
      for (const term of terms || []) {
        const weight = Number(term?.weight ?? 1);
        if (term?.scale === null || term?.scale === undefined || !B.isFiniteBN(term.scale) ||
            !Number.isFinite(weight) || weight < 0 || B.lt(term.scale, B.ZERO)) {
          return null;
        }
        if (weight > 0 && !B.eq(term.scale, B.ZERO)) normalized.push({ scale: B.BN(term.scale), weight });
      }
      return normalized;
    }

    function scaledBudget(options = {}) {
      const errors = normalizeTerms(options.errorTerms);
      const gains = normalizeTerms(options.gainTerms);
      const tolerance = Number(options.relativeTolerance ?? 0.05);
      const absoluteWeight = Number(options.absoluteWeight ?? 1);
      const absoluteTolerance = options.absoluteTolerance ?? "1e-8";
      const invalid = !errors || !gains || !Number.isFinite(tolerance) || tolerance < 0 ||
        !Number.isFinite(absoluteWeight) || absoluteWeight < 0 ||
        !B.isFiniteBN(absoluteTolerance) || B.lt(absoluteTolerance, B.ZERO);
      if (invalid) return { pass: false, verified: false, status: "unverified", reason: "invalid-budget", ratio: Infinity };
      const allowances = gains.map((term) => ({ scale: term.scale, weight: term.weight * tolerance }));
      if (absoluteWeight > 0 && !B.eq(absoluteTolerance, B.ZERO)) {
        allowances.push({ scale: B.BN(absoluteTolerance), weight: absoluteWeight });
      }
      const all = [...errors, ...allowances];
      const scale = all.reduce((current, term) => B.max(current, term.scale), B.ZERO);
      let uncertain = false;
      function sumTerms(terms) {
        let sum = 0;
        let compensation = 0;
        let uncertainty = 0;
        for (const term of terms) {
          const sameScale = B.eq(term.scale, scale);
          const decimalRatio = sameScale ? B.ONE : B.div(term.scale, scale);
          let ratio = B.toNumber(decimalRatio, NaN);
          if (!Number.isFinite(ratio) || ratio < 0 || ratio > 1) { uncertain = true; ratio = 0; }
          // Unequal layer-2 scales can falsely divide to one. Their relative
          // ordering is known, but a close original-resource ratio is not.
          if (ratio > 0 && !sameScale) {
            const leftPrecision = precision(term.scale, { relativeTolerance: tolerance });
            const rightPrecision = precision(scale, { relativeTolerance: tolerance });
            if (!leftPrecision.resolvable || !rightPrecision.resolvable) uncertain = true;
            else uncertainty += ratio * term.weight * Math.expm1(Math.LN10 *
              (leftPrecision.log10Resolution + rightPrecision.log10Resolution));
          }
          // Normalize first, then apply the dimensionless weight while the
          // tiny ratio is still a Decimal. Number(ratio) * weight could lose a
          // subnormal ratio before a large finite weight brings it into range.
          const contribution = sameScale ? term.weight : B.toNumber(B.mul(decimalRatio, term.weight), NaN);
          if (!Number.isFinite(contribution)) uncertain = true;
          const adjusted = contribution - compensation;
          const next = sum + adjusted;
          compensation = (next - sum) - adjusted;
          sum = next;
        }
        return { sum, uncertainty };
      }
      const errorTotal = sumTerms(errors);
      const allowanceTotal = sumTerms(allowances);
      const normalizedError = errorTotal.sum;
      const normalizedAllowance = allowanceTotal.sum;
      const ratio = normalizedAllowance > 0 ? normalizedError / normalizedAllowance : normalizedError === 0 ? 0 : Infinity;
      if (Math.abs(normalizedError - normalizedAllowance) < errorTotal.uncertainty + allowanceTotal.uncertainty) uncertain = true;
      const pass = !uncertain && normalizedError <= normalizedAllowance;
      return { pass, verified: !uncertain, status: uncertain ? "unverified" : pass ? "verified" : "failed",
        ratio, normalizedError, normalizedAllowance, scale,
        normalizedUncertainty: errorTotal.uncertainty + allowanceTotal.uncertainty,
        reason: uncertain ? "unresolved-scale-ratio" : null };
    }

    function compare(actual, expected, options = {}) {
      const tolerance = Math.max(0, Number(options.relativeTolerance ?? 0.05));
      const absoluteTolerance = options.absoluteTolerance ?? "1e-8";
      if (!B.isFiniteBN(actual) || !B.isFiniteBN(expected) || !B.isFiniteBN(absoluteTolerance) ||
          !Number.isFinite(tolerance) || B.lt(absoluteTolerance, B.ZERO)) {
        return { pass: false, verified: false, status: "unverified", relativeError: null, reason: "invalid-comparison" };
      }
      const equal = B.eq(actual, expected);
      const exactReplay = options.exactReplay === true && equal;
      const measuredPrecision = [precision(actual, { relativeTolerance: tolerance }),
        precision(expected, { relativeTolerance: tolerance })];
      // A small absolute bound is safe even when a relative ratio is not.
      const absolutelySmall = B.lte(B.add(B.abs(actual), B.abs(expected)), absoluteTolerance);
      if (exactReplay || absolutelySmall) {
        return { pass: true, verified: true, status: "verified", relativeError: equal ? 0 :
          B.eq(expected, B.ZERO) ? null : B.toNumber(B.div(B.abs(B.sub(actual, expected)), B.abs(expected)), null),
        reason: exactReplay ? "identical-discrete-replay" : "absolute-bound", precision: measuredPrecision };
      }
      if (!measuredPrecision.every((entry) => entry.resolvable)) {
        return { pass: false, verified: false, status: "unverified", relativeError: null,
          reason: "original-resource-precision", precision: measuredPrecision };
      }
      const error = B.abs(B.sub(actual, expected));
      const relativeError = B.eq(expected, B.ZERO) ? equal ? 0 : Infinity :
        B.toNumber(B.div(error, B.abs(expected)), Infinity);
      const budget = scaledBudget({ errorTerms: [{ scale: error, weight: 1 }],
        gainTerms: [{ scale: B.abs(expected), weight: 1 }], relativeTolerance: tolerance, absoluteTolerance });
      // Reject a boundary whose rounding uncertainty is material. This is a
      // measurement check, not a claim that the sampled fit bounds all frames.
      const uncertainty = Math.expm1(Math.LN10 * measuredPrecision.reduce((sum, entry) => sum + entry.log10Resolution, 0));
      const nearBoundary = !equal && Number.isFinite(relativeError) &&
        Math.abs(relativeError - tolerance) <= uncertainty * 4 && B.gt(error, absoluteTolerance);
      if (nearBoundary) return { ...budget, pass: false, verified: false, status: "unverified", relativeError,
        reason: "comparison-at-resolution-limit", precision: measuredPrecision };
      return { ...budget, relativeError, precision: measuredPrecision };
    }

    return Object.freeze({ compare, precision, scaledBudget });
  })();
}(window.WIS));
