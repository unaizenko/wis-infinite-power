(function defineProbabilityEngine(WIS) {
  "use strict";

  const {
    BN, ZERO, ONE, add, sub, mul, div, pow, sqrt, log10,
    max: maxBN, min: minBN, gt, gte, lt, lte,
    isDecimal, isFiniteBN, isNaNBN, toNumber
  } = WIS.Core.BigNum;
  const MAX_SAFE_INTEGER_BN = BN(Number.MAX_SAFE_INTEGER);
  const BATCH_EXPECTATION_THRESHOLD = BN(64);
  const GEOMETRIC_BIG_NUMBER_THRESHOLD = BN("1e-12");
  const MAX_SEQUENTIAL_SUCCESSES = 4096;
  const EXACT_SUCCESS_THRESHOLD = BN(MAX_SEQUENTIAL_SUCCESSES);
  const EXPONENTIAL_PREFIX_RELATIVE_TOLERANCE = 1e-12;
  const MOMENT_QUADRATURE = [
    [0.09501250983763744, 0.1894506104550685],
    [0.2816035507792589, 0.1826034150449236],
    [0.4580167776572274, 0.16915651939500254],
    [0.6178762444026438, 0.14959598881657673],
    [0.755404408355003, 0.12462897125553388],
    [0.8656312023878318, 0.09515851168249279],
    [0.9445750230732326, 0.06225352393864789],
    [0.9894009349916499, 0.027152459411754096]
  ];

  function isPositiveInfinity(value) {
    if (isDecimal(value)) return !isFiniteBN(value) && !isNaNBN(value) && gt(value, ZERO);
    if (typeof value === "number") return value === Infinity;
    if (typeof value === "string") return value.trim().toLowerCase() === "infinity";
    return false;
  }

  function clampProbability(value) {
    if (isPositiveInfinity(value)) return ONE;
    const probability = BN(value);
    if (isNaNBN(probability) || !isFiniteBN(probability) || !gt(probability, ZERO)) return ZERO;
    return minBN(ONE, probability);
  }

  function multipliedChance(factors = []) {
    let total = ONE;
    let hasPositiveInfinity = false;
    for (const factor of factors) {
      if (isPositiveInfinity(factor)) {
        hasPositiveInfinity = true;
        continue;
      }
      const decimalFactor = BN(factor);
      if (isNaNBN(factor) || !isFiniteBN(decimalFactor) || !gt(decimalFactor, ZERO)) return ZERO;
      total = mul(total, decimalFactor);
    }
    return hasPositiveInfinity ? ONE : clampProbability(total);
  }

  function decayingChance(baseChance, decayRatio, count, multiplier = ONE) {
    const safeCount = maxBN(ZERO, BN(count));
    return multipliedChance([baseChance, pow(decayRatio, safeCount), multiplier]);
  }

  function formatPercent(probability) {
    const percent = mul(clampProbability(probability), 100);
    if (!gt(percent, ZERO)) return "0%";
    if (gte(percent, "0.01")) return `${toNumber(percent, 0).toFixed(2)}%`;
    if (gte(percent, "0.0001")) return `${toNumber(percent, 0).toFixed(4)}%`;
    return `${percent.toExponential(2)}%`;
  }

  function randomUnit(random) {
    const sampled = Number(random());
    if (!Number.isFinite(sampled)) return 0.5;
    return Math.max(0, Math.min(1 - Number.EPSILON, sampled));
  }

  // For very small probabilities, converting p to Number loses substantial
  // relative precision before it actually underflows. In that range,
  // -log(1-p) = p + O(p^2), so keeping p as Decimal is both more accurate and
  // preserves geometric waits below Number's representable range.
  function geometricAttemptsUntilSuccess(probability, random = () => WIS.Core.Runtime.random()) {
    const chance = clampProbability(probability);
    if (!gt(chance, ZERO)) return null;
    if (gte(chance, ONE)) return ONE;
    const numerator = -Math.log1p(-randomUnit(random));
    if (lt(chance, GEOMETRIC_BIG_NUMBER_THRESHOLD)) {
      return maxBN(ONE, add(div(numerator, chance).floor(), ONE));
    }
    const numericChance = toNumber(chance, 0);
    // Decimal probabilities can be distinct from 1 while rounding to 1 as a
    // native Number.  With a Number-backed RNG, that tail is unobservable and
    // the next attempt is therefore the only representable outcome.
    if (numericChance >= 1) return ONE;
    const denominator = BN(-Math.log1p(-numericChance));
    if (!gt(denominator, ZERO)) return null;
    return maxBN(ONE, add(div(numerator, denominator).floor(), ONE));
  }

  function decimalSuccessCount(value) {
    return maxBN(ZERO, BN(value)).floor();
  }

  function compatibleSuccessCount(value) {
    const count = decimalSuccessCount(value);
    return lte(count, MAX_SAFE_INTEGER_BN)
      ? Math.max(0, Math.floor(toNumber(count, 0)))
      : count;
  }

  function expectedAttemptsForSamples(successes, probabilityAtOffset) {
    const decimalCount = decimalSuccessCount(successes);
    if (!gt(decimalCount, ZERO)) return ZERO;
    const safeCount = lte(decimalCount, MAX_SAFE_INTEGER_BN)
      ? Math.max(0, Math.floor(toNumber(decimalCount, 0)))
      : null;
    const reciprocalProbability = (offset) => {
      const probability = clampProbability(probabilityAtOffset(offset));
      return gt(probability, ZERO) ? div(ONE, probability) : null;
    };
    const first = reciprocalProbability(0);
    const midpointOffset = safeCount === null
      ? mul(sub(decimalCount, ONE), 0.5).floor()
      : Math.floor((safeCount - 1) * 0.5);
    const lastOffset = safeCount === null
      ? sub(decimalCount, ONE)
      : safeCount - 1;
    const midpoint = reciprocalProbability(midpointOffset);
    const last = reciprocalProbability(lastOffset);
    if (first === null || midpoint === null || last === null) return null;
    const sampleWeight = safeCount === null ? div(decimalCount, 6) : safeCount / 6;
    return mul(sampleWeight, add(add(first, mul(4, midpoint)), last));
  }

  function logarithmicMidpoint(lower, upper) {
    const safeLower = maxBN(ONE, decimalSuccessCount(lower));
    const safeUpper = maxBN(safeLower, decimalSuccessCount(upper));
    return pow(10, div(add(log10(safeLower), log10(safeUpper)), 2)).floor();
  }

  function firstUncappedSuccessOffset(probabilityAtOffset, maximumAttempts) {
    if (lt(clampProbability(probabilityAtOffset(0)), ONE)) return 0;
    const maximum = decimalSuccessCount(maximumAttempts);
    if (lte(maximum, ONE) || gte(clampProbability(probabilityAtOffset(
      compatibleSuccessCount(sub(maximum, ONE))
    )), ONE)) return compatibleSuccessCount(maximum);
    let lower = 0;
    let upper = 1;
    while (upper < Number.MAX_SAFE_INTEGER && gte(clampProbability(probabilityAtOffset(upper)), ONE)) {
      lower = upper;
      upper = Math.min(Number.MAX_SAFE_INTEGER, upper * 2);
      if (upper === lower) break;
    }
    if (upper === Number.MAX_SAFE_INTEGER && gte(clampProbability(probabilityAtOffset(upper)), ONE)) {
      if (lte(maximum, MAX_SAFE_INTEGER_BN)) return compatibleSuccessCount(maximum);
      const finalOffset = sub(maximum, ONE);
      if (gte(clampProbability(probabilityAtOffset(finalOffset)), ONE)) {
        return compatibleSuccessCount(maximum);
      }
      let decimalLower = MAX_SAFE_INTEGER_BN;
      let decimalUpper = finalOffset;
      for (let iteration = 0; iteration < 96 && gt(sub(decimalUpper, decimalLower), ONE); iteration += 1) {
        const middle = logarithmicMidpoint(decimalLower, decimalUpper);
        if (!gt(middle, decimalLower) || !lt(middle, decimalUpper)) break;
        if (gte(clampProbability(probabilityAtOffset(middle)), ONE)) decimalLower = middle;
        else decimalUpper = middle;
      }
      return compatibleSuccessCount(decimalUpper);
    }
    while (upper - lower > 1) {
      const middle = Math.floor((lower + upper) * 0.5);
      if (gte(clampProbability(probabilityAtOffset(middle)), ONE)) lower = middle;
      else upper = middle;
    }
    return upper;
  }

  function exponentialBatchSuccessEstimate(attempts, probabilityAtOffset, decayRatio, inventoryStep) {
    const attemptCount = decimalSuccessCount(attempts);
    const certainSuccesses = firstUncappedSuccessOffset(probabilityAtOffset, attemptCount);
    const decimalCertainSuccesses = decimalSuccessCount(certainSuccesses);
    if (gt(decimalCertainSuccesses, ZERO) && lte(attemptCount, decimalCertainSuccesses)) {
      return compatibleSuccessCount(attemptCount);
    }

    const remainingAttempts = gt(decimalCertainSuccesses, ZERO)
      ? sub(attemptCount, decimalCertainSuccesses)
      : attemptCount;
    const initialProbability = clampProbability(probabilityAtOffset(certainSuccesses));
    if (!gt(initialProbability, ZERO)) return certainSuccesses;
    const effectiveDecay = pow(decayRatio, inventoryStep);
    if (!gt(effectiveDecay, ZERO) || !lt(effectiveDecay, ONE)) return certainSuccesses;
    const inverseDecay = div(ONE, effectiveDecay);
    const capacity = add(ONE, mul(remainingAttempts, mul(initialProbability, sub(inverseDecay, ONE))));
    const decimalCapacityMagnitude = log10(capacity);
    const decimalInverseMagnitude = log10(inverseDecay);
    const capacityMagnitude = toNumber(decimalCapacityMagnitude, Infinity);
    const inverseMagnitude = toNumber(decimalInverseMagnitude, 0);
    if (!(inverseMagnitude > 0)) return certainSuccesses;

    // Preserve the historical Number calculation whenever its result remains
    // a safe integer. Only the formerly-clamped extreme tail switches to Decimal.
    if (typeof certainSuccesses === "number" && Number.isFinite(capacityMagnitude)) {
      const numericAdditional = Math.floor(capacityMagnitude / inverseMagnitude);
      const numericTotal = certainSuccesses + numericAdditional;
      if (Number.isSafeInteger(numericTotal)) return Math.max(0, numericTotal);
    }
    const additionalSuccesses = div(decimalCapacityMagnitude, decimalInverseMagnitude).floor();
    return compatibleSuccessCount(minBN(
      attemptCount,
      add(decimalCertainSuccesses, additionalSuccesses)
    ));
  }

  function sampledBatchSuccessEstimate(attempts, probabilityAtOffset) {
    let lower = 0;
    let upper = 1;
    while (upper < Number.MAX_SAFE_INTEGER) {
      const expected = expectedAttemptsForSamples(upper, probabilityAtOffset);
      if (expected === null || gt(expected, attempts)) break;
      lower = upper;
      upper = Math.min(Number.MAX_SAFE_INTEGER, upper * 2);
      if (upper === lower) break;
    }
    const safeUpperExpected = expectedAttemptsForSamples(upper, probabilityAtOffset);
    const attemptCount = decimalSuccessCount(attempts);
    if (upper === Number.MAX_SAFE_INTEGER && safeUpperExpected !== null &&
        lte(safeUpperExpected, attemptCount) && gt(attemptCount, MAX_SAFE_INTEGER_BN)) {
      const maximumExpected = expectedAttemptsForSamples(attemptCount, probabilityAtOffset);
      if (maximumExpected !== null && lte(maximumExpected, attemptCount)) {
        return compatibleSuccessCount(attemptCount);
      }
      let decimalLower = MAX_SAFE_INTEGER_BN;
      let decimalUpper = attemptCount;
      for (let iteration = 0; iteration < 96; iteration += 1) {
        const middle = logarithmicMidpoint(decimalLower, decimalUpper);
        if (!gt(middle, decimalLower) || !lt(middle, decimalUpper)) break;
        const expected = expectedAttemptsForSamples(middle, probabilityAtOffset);
        if (expected !== null && lte(expected, attemptCount)) decimalLower = middle;
        else decimalUpper = middle;
      }
      return compatibleSuccessCount(decimalLower);
    }
    for (let iteration = 0; iteration < 48 && upper - lower > 1; iteration += 1) {
      const middle = Math.floor((lower + upper) * 0.5);
      const expected = expectedAttemptsForSamples(middle, probabilityAtOffset);
      if (expected !== null && lte(expected, attempts)) lower = middle;
      else upper = middle;
    }
    return lower;
  }

  function batchSuccessEstimate(attempts, probabilityAtOffset, options = {}) {
    const inventoryStep = Math.max(1, Math.floor(Number(options.inventoryStep) || 1));
    return options.decayRatio > 0 && options.decayRatio < 1
      ? exponentialBatchSuccessEstimate(attempts, probabilityAtOffset, options.decayRatio, inventoryStep)
      : sampledBatchSuccessEstimate(attempts, probabilityAtOffset);
  }

  function normalRandom(random) {
    const first = 1 - randomUnit(random);
    return Math.sqrt(-2 * Math.log(first)) * Math.cos(2 * Math.PI * randomUnit(random));
  }

  function geometricSuccesses(attempts, probabilityAtOffset, random, initialSuccesses = 0) {
    let remaining = decimalSuccessCount(attempts);
    let successes = initialSuccesses;
    while (gt(remaining, ZERO)) {
      const waiting = geometricAttemptsUntilSuccess(probabilityAtOffset(successes), random);
      if (waiting === null || gt(waiting, remaining)) break;
      remaining = sub(remaining, waiting);
      successes += 1;
    }
    return successes;
  }

  function exponentialSample(attempts, probabilityAtOffset, estimate, decayRatio, inventoryStep, random) {
    const estimatedCount = decimalSuccessCount(estimate);
    // At this magnitude a one-item fluctuation is below the inventory number's
    // own precision. Preserve that magnitude instead of walking an unbounded
    // sequence of individually unrepresentable +1 awards.
    if (gt(estimatedCount, MAX_SAFE_INTEGER_BN)) return estimatedCount;

    const effectiveDecay = Math.pow(decayRatio, inventoryStep);
    const exactTail = Math.ceil(Math.log(EXPONENTIAL_PREFIX_RELATIVE_TOLERANCE) / Math.log(effectiveDecay));
    if (!Number.isFinite(exactTail) || exactTail > MAX_SEQUENTIAL_SUCCESSES) return null;
    const prefix = Math.max(0, toNumber(estimatedCount, 0) - exactTail);
    if (prefix === 0) return BN(geometricSuccesses(attempts, probabilityAtOffset, random));

    // Earlier waiting times have at most 1e-12 of the total expected duration.
    // Account for their duration at its mean, then sample the entire stochastic
    // tail exactly. In particular, a strongly decaying probability must not be
    // given Gaussian count noise: its final geometric waits dominate variance.
    const inverseDecay = div(ONE, pow(decayRatio, inventoryStep));
    const prefixMean = div(
      sub(pow(inverseDecay, prefix), ONE),
      mul(probabilityAtOffset(0), sub(inverseDecay, ONE))
    );
    const tailAttempts = maxBN(ZERO, sub(attempts, prefixMean));
    return BN(geometricSuccesses(tailAttempts, probabilityAtOffset, random, prefix));
  }

  function waitingTimeMoments(successes, probabilityAtOffset) {
    const count = decimalSuccessCount(successes);
    if (!gt(count, ZERO)) return { mean: ZERO, variance: ZERO };
    const last = sub(count, ONE);
    let meanIntegral = ZERO;
    let varianceIntegral = ZERO;
    const at = (offset) => {
      const chance = probabilityAtOffset(offset);
      if (!gt(chance, ZERO)) return null;
      const mean = div(ONE, chance);
      return { mean, variance: mul(sub(ONE, chance), mul(mean, mean)) };
    };
    const firstMoments = at(0);
    const lastMoments = at(compatibleSuccessCount(last));
    if (firstMoments === null || lastMoments === null) return null;
    for (const [node, weight] of MOMENT_QUADRATURE) {
      for (const sign of [-1, 1]) {
        const t = (1 + sign * node) * 0.5;
        const moments = at(compatibleSuccessCount(mul(last, t ** 4)));
        if (moments === null) return null;
        const transformedWeight = weight * 2 * t ** 3;
        meanIntegral = add(meanIntegral, mul(transformedWeight, moments.mean));
        varianceIntegral = add(varianceIntegral, mul(transformedWeight, moments.variance));
      }
    }
    // Integrate in x=(count-1)*t^4 so square-root inventory decays remain
    // resolved near zero even for enormous counts. The endpoint correction
    // converts the integral to a sum of independent geometric waiting moments.
    return {
      mean: add(mul(meanIntegral, last), mul(add(firstMoments.mean, lastMoments.mean), 0.5)),
      variance: add(mul(varianceIntegral, last), mul(add(firstMoments.variance, lastMoments.variance), 0.5))
    };
  }

  function smoothDenseSample(attempts, probabilityAtOffset, estimate, random) {
    const initialChance = probabilityAtOffset(0);
    if (initialChance.eq(probabilityAtOffset(compatibleSuccessCount(estimate))) &&
        initialChance.eq(probabilityAtOffset(compatibleSuccessCount(attempts)))) {
      const expectedFailures = mul(attempts, sub(ONE, initialChance));
      if (lte(expectedFailures, EXACT_SUCCESS_THRESHOLD)) {
        const failures = geometricSuccesses(attempts, () => sub(ONE, initialChance), random);
        return sub(attempts, failures);
      }
      // A constant chance is binomial: use its actual mean and variance, not
      // an arbitrary perturbation of a rounded reward estimate. Sparse tails
      // (including almost-certain rewards) remain exact geometric samples.
      const mean = mul(attempts, initialChance);
      const variance = mul(mean, sub(ONE, initialChance));
      return minBN(attempts, decimalSuccessCount(add(add(mean, mul(normalRandom(random), sqrt(variance))), 0.5)));
    }
    const sampledQuantile = normalRandom(random);
    const threshold = add(attempts, 0.5);
    const fits = (count) => {
      const moments = waitingTimeMoments(count, probabilityAtOffset);
      return moments !== null && lte(
        add(moments.mean, mul(sampledQuantile, sqrt(moments.variance))), threshold
      );
    };
    let lower = ZERO;
    let upper = minBN(attempts, maxBN(ONE, mul(estimate, 2)));
    while (lt(upper, attempts) && fits(upper)) {
      lower = upper;
      upper = minBN(attempts, mul(upper, 2));
    }
    if (fits(upper)) return decimalSuccessCount(upper);
    for (let iteration = 0; iteration < 96 && gt(sub(upper, lower), ONE); iteration += 1) {
      const middle = mul(add(lower, upper), 0.5).floor();
      if (!gt(middle, lower) || !lt(middle, upper)) break;
      if (fits(middle)) lower = middle;
      else upper = middle;
    }
    return decimalSuccessCount(lower);
  }

  function rollDynamicAttempts(attempts, available, probability, award, options = {}) {
    let remainingAttempts = maxBN(ZERO, BN(attempts)).floor();
    if (!gt(remainingAttempts, ZERO) || !available()) return 0;
    const random = options.random || (() => WIS.Core.Runtime.random());
    const inventoryStep = Math.max(1, Math.floor(Number(options.awardMultiplier) || 1));
    const probabilityAtSuccessOffset = (offset) => clampProbability(
      typeof options.probabilityAtOffset === "function"
        ? options.probabilityAtOffset(compatibleSuccessCount(mul(decimalSuccessCount(offset), inventoryStep)))
        : probability()
    );
    const canBatch = typeof options.awardMany === "function" &&
      typeof options.probabilityAtOffset === "function";

    const awardBatch = (attemptBudget) => {
      const decimalAttemptBudget = decimalSuccessCount(attemptBudget);
      const certainSuccesses = minBN(decimalAttemptBudget, decimalSuccessCount(
        firstUncappedSuccessOffset(probabilityAtSuccessOffset, decimalAttemptBudget)
      ));
      let awardedSuccesses = ZERO;

      if (gt(certainSuccesses, ZERO)) {
        const compatibleCertainSuccesses = compatibleSuccessCount(certainSuccesses);
        options.awardMany(compatibleCertainSuccesses);
        awardedSuccesses = certainSuccesses;
      }

      const residualAttempts = sub(decimalAttemptBudget, certainSuccesses);
      let uncertainGained = ZERO;

      // The prefix whose probability is exactly 1 is deterministic. Only the
      // remaining probabilistic tail is sampled. Awarding the
      // prefix first also advances inventory-backed probability functions to
      // the correct state before estimating that tail.
      if (gt(residualAttempts, ZERO) && available()) {
        const residualProbabilityAtOffset = (offset) => probabilityAtSuccessOffset(offset);
        const initialResidualProbability = residualProbabilityAtOffset(0);
        if (gt(initialResidualProbability, ZERO)) {
          const estimate = decimalSuccessCount(batchSuccessEstimate(
            residualAttempts,
            residualProbabilityAtOffset,
            { decayRatio: options.decayRatio, inventoryStep }
          ));
          if (lte(estimate, EXACT_SUCCESS_THRESHOLD)) {
            uncertainGained = BN(geometricSuccesses(residualAttempts, residualProbabilityAtOffset, random));
          } else {
            const exponential = options.decayRatio > 0 && options.decayRatio < 1
              ? exponentialSample(residualAttempts, residualProbabilityAtOffset, estimate,
                options.decayRatio, inventoryStep, random)
              : null;
            uncertainGained = exponential === null
              ? smoothDenseSample(residualAttempts, residualProbabilityAtOffset, estimate, random)
              : exponential;
          }
          uncertainGained = minBN(uncertainGained, residualAttempts);
        }
      }

      if (gt(uncertainGained, ZERO)) {
        options.awardMany(compatibleSuccessCount(uncertainGained));
        awardedSuccesses = add(awardedSuccesses, uncertainGained);
      }

      const gained = compatibleSuccessCount(minBN(
        decimalAttemptBudget,
        awardedSuccesses
      ));
      return compatibleSuccessCount(mul(gained, inventoryStep));
    };

    const initialProbability = probabilityAtSuccessOffset(0);
    if (!gt(initialProbability, ZERO)) return 0;
    if (canBatch && options.deferInitialBatch !== true &&
        (gte(initialProbability, ONE) ||
          gt(mul(remainingAttempts, initialProbability), BATCH_EXPECTATION_THRESHOLD))) {
      return awardBatch(remainingAttempts);
    }

    let awarded = 0;
    let sequentialSuccesses = 0;
    while (gt(remainingAttempts, ZERO) && available()) {
      if (canBatch && sequentialSuccesses >= MAX_SEQUENTIAL_SUCCESSES) {
        awarded = compatibleSuccessCount(add(awarded, awardBatch(remainingAttempts)));
        break;
      }
      const attemptsUntilSuccess = geometricAttemptsUntilSuccess(probability(), random);
      if (attemptsUntilSuccess === null || lt(remainingAttempts, attemptsUntilSuccess)) break;
      remainingAttempts = sub(remainingAttempts, attemptsUntilSuccess);
      award();
      awarded = compatibleSuccessCount(add(awarded, inventoryStep));
      sequentialSuccesses += 1;
    }
    return awarded;
  }

  WIS.Core.Probability = Object.freeze({
    clamp: clampProbability,
    multipliedChance,
    decayingChance,
    formatPercent,
    geometricAttemptsUntilSuccess,
    expectedAttemptsForSamples,
    batchSuccessEstimate,
    rollDynamicAttempts
  });
}(window.WIS));
