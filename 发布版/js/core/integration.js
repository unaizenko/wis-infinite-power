(function defineIntegration(WIS) {
  "use strict";

  const { ZERO, ONE, add, mul, div, sqrt, max, gt, lt, lte } = WIS.Core.BigNum;
  const MAX_GOOGOL_SUBDIVISION_DEPTH = 3;
  const GOOGOL_PENALTY_RATIO_FLOOR = 0.9;

  function integrateGoogolPenalizedRate(
    resource,
    currentAmount,
    baseRate,
    elapsedSeconds,
    currentState,
    options = {}
  ) {
    const seconds = Math.max(0, Number(elapsedSeconds) || 0);
    const rate = max(ZERO, baseRate);
    const start = max(ZERO, currentAmount);
    if (!(seconds > 0) || !gt(rate, ZERO)) {
      return { gain: ZERO, averagePenalty: ONE, segments: 0 };
    }
    const maximumDepth = Math.max(0, Math.min(
      MAX_GOOGOL_SUBDIVISION_DEPTH,
      Math.floor(Number(options.maxDepth ?? MAX_GOOGOL_SUBDIVISION_DEPTH) || 0)
    ));
    const ratioFloor = Math.max(0, Math.min(1,
      Number(options.penaltyRatioFloor ?? GOOGOL_PENALTY_RATIO_FLOOR) || GOOGOL_PENALTY_RATIO_FLOOR
    ));
    const threshold = WIS.Core.Config.googolPenalty.threshold;

    const integrateSegment = (segmentStart, segmentSeconds, depth) => {
      const unpenalizedGain = mul(rate, segmentSeconds);
      if (lte(add(segmentStart, unpenalizedGain), threshold)) {
        return { gain: unpenalizedGain, segments: 1 };
      }
      const startPenalty = WIS.Core.Penalties.googolPenaltyMultiplier(
        resource, segmentStart, currentState
      );
      const predictedEnd = add(segmentStart, mul(unpenalizedGain, startPenalty));
      const endPenalty = WIS.Core.Penalties.googolPenaltyMultiplier(
        resource, predictedEnd, currentState
      );
      const penaltyRatio = gt(startPenalty, ZERO) ? div(endPenalty, startPenalty) : ONE;
      if (depth < maximumDepth && lt(penaltyRatio, ratioFloor)) {
        const firstSeconds = segmentSeconds * 0.5;
        const first = integrateSegment(segmentStart, firstSeconds, depth + 1);
        const second = integrateSegment(
          add(segmentStart, first.gain),
          segmentSeconds - firstSeconds,
          depth + 1
        );
        return { gain: add(first.gain, second.gain), segments: first.segments + second.segments };
      }
      const averagePenalty = sqrt(mul(startPenalty, endPenalty));
      return { gain: mul(unpenalizedGain, averagePenalty), segments: 1 };
    };

    const result = integrateSegment(start, seconds, 0);
    return {
      gain: result.gain,
      averagePenalty: div(result.gain, mul(rate, seconds)),
      segments: result.segments
    };
  }

  WIS.Core.Integration = Object.freeze({
    MAX_GOOGOL_SUBDIVISION_DEPTH,
    GOOGOL_PENALTY_RATIO_FLOOR,
    integrateGoogolPenalizedRate
  });
}(window.WIS));
