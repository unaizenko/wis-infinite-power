(function defineDiscreteBatch(WIS) {
  "use strict";

  // This is an optional, fail-closed accelerator for the existing discrete
  // update, not a replacement gain formula. All probes run on caller-owned
  // copies. Random state, event handling and committing remain with the caller.
  WIS.Simulation = WIS.Simulation || {};
  const B = WIS.Core.BigNum;
  const GROUPS = ["resources", "grossGains", "statistics"];
  const PROBE_TICKS = 16;
  const TRAIN_TICKS = 8;
  const MAX_BATCH_TICKS = 32;
  const MAX_CERTIFIED_BATCH_TICKS = 8192;

  function numeric(value) { return B.toNumber(value, NaN); }
  function precision(value, tolerance) {
    if (WIS.Simulation.Accuracy?.precision) {
      return WIS.Simulation.Accuracy.precision(value, { relativeTolerance: tolerance });
    }
    const decimal = B.BN(value);
    const layer = Math.abs(Number(decimal.layer) || 0);
    const resolution = layer === 1 ? Math.abs(Number(decimal.mag)) * Number.EPSILON : 0;
    return { resolvable: layer < 2 && resolution < Math.log10(1 + tolerance), layer,
      reason: layer >= 2 ? "原资源尺度缺少相对误差分辨率" : null };
  }
  function compare(actual, expected, options) {
    if (WIS.Simulation.Accuracy?.compare) {
      return WIS.Simulation.Accuracy.compare(actual, expected, {
        relativeTolerance: options.relativeTolerance,
        absoluteTolerance: options.absoluteTolerance,
        exactReplay: false
      });
    }
    // The common comparator also verifies representability in original
    // resource units. A missing loader dependency must not silently revive a
    // weaker inventory-times-tolerance check.
    return { pass: false, verified: false, reason: "缺少统一原资源误差验证器" };
  }
  function flatten(observation) {
    const fields = [];
    for (const group of GROUPS) {
      const values = observation[group] || {};
      for (const key of Object.keys(values)) fields.push({ group, key, value: B.BN(values[key]) });
    }
    return fields;
  }
  function structure(observation, values, fields) {
    const result = {};
    for (const group of GROUPS) result[group] = Array.isArray(observation[group]) ? [] : {};
    fields.forEach((field, index) => { result[field.group][field.key] = values[index]; });
    return result;
  }
  function sameShape(a, b) {
    return a.length === b.length && a.every((field, i) =>
      field.group === b[i].group && field.key === b[i].key);
  }
  function solve(matrix, target) {
    const n = target.length;
    const rows = matrix.map((row, i) => [...row, target[i]]);
    for (let column = 0; column < n; column += 1) {
      let pivot = column;
      for (let i = column + 1; i < n; i += 1) {
        if (Math.abs(rows[i][column]) > Math.abs(rows[pivot][column])) pivot = i;
      }
      if (!(Math.abs(rows[pivot][column]) > 1e-16)) return null;
      [rows[column], rows[pivot]] = [rows[pivot], rows[column]];
      const divisor = rows[column][column];
      for (let k = column; k <= n; k += 1) rows[column][k] /= divisor;
      for (let i = 0; i < n; i += 1) if (i !== column) {
        const factor = rows[i][column];
        for (let k = column; k <= n; k += 1) rows[i][k] -= factor * rows[column][k];
      }
    }
    return rows.map(row => row[n]);
  }

  function makeTransforms(rows, fields) {
    return fields.map((field, index) => {
      const values = rows.map(row => row[index].value);
      const positive = values.every(value => B.gt(value, B.ZERO));
      const maximum = values.reduce((a, b) => B.max(a, B.abs(b)), B.ZERO);
      const scale = B.gt(maximum, B.ZERO) ? maximum : B.ONE;
      const linear = {
        encode: value => numeric(B.div(value, scale)),
        decode: value => B.mul(value, scale), mode: "scaled-linear"
      };
      if (!positive) return linear;
      const logarithmic = {
        encode: value => numeric(B.log10(value)),
        decode: value => B.pow10(value), mode: "log10"
      };
      // A positive inventory need not grow geometrically: fresh-game J is
      // additive. Choose the locally straighter coordinate per channel, using
      // only the training prefix so ticks 12/16 remain independent holdouts.
      // Normalising by total first differences makes this decision independent
      // of resource units and of the linear coordinate's scale.
      const curvature = transform => {
        const samples = values.slice(0, TRAIN_TICKS + 1).map(transform.encode);
        if (samples.some(value => !Number.isFinite(value))) return Infinity;
        const differences = samples.slice(1).map((value, i) => value - samples[i]);
        const variation = differences.reduce((sum, value) => sum + Math.abs(value), 0);
        const roundoff = Number.EPSILON * Math.max(1, ...samples.map(Math.abs)) * samples.length;
        if (variation <= roundoff) return 0;
        const secondVariation = differences.slice(1).reduce((sum, value, i) =>
          sum + Math.abs(value - differences[i]), 0);
        return secondVariation / variation;
      };
      return curvature(logarithmic) < curvature(linear) ? logarithmic : linear;
    });
  }

  function fit(coordinates, fields, start, end) {
    const sourceIndices = fields.map((field, index) => field.group === "resources" ? index : -1)
      .filter(index => index >= 0);
    const anchor = coordinates[start];
    const scales = sourceIndices.map(index => Math.max(1e-12,
      ...coordinates.slice(start, end + 1).map(row => Math.abs(row[index] - anchor[index]))));
    const feature = (row, tick) => [1, (tick - start) / TRAIN_TICKS,
      ...sourceIndices.map((index, i) => (row[index] - anchor[index]) / scales[i])];
    const samples = [];
    for (let tick = start; tick < end; tick += 1) samples.push(feature(coordinates[tick], tick));
    const dimension = samples[0].length;
    const normal = Array.from({ length: dimension }, (_, i) =>
      Array.from({ length: dimension }, (_, j) => samples.reduce((sum, row) => sum + row[i] * row[j], 0)
        + (i === j && i !== 0 ? 1e-9 : 0)));
    const coefficients = fields.map((_, column) => {
      const target = Array.from({ length: dimension }, (_, i) => samples.reduce((sum, row, sample) =>
        sum + row[i] * (coordinates[start + sample + 1][column] - coordinates[start + sample][column]), 0));
      return solve(normal, target);
    });
    if (coefficients.some(row => !row || row.some(value => !Number.isFinite(value)))) return null;
    return {
      advance(row, tick) {
        const input = feature(row, tick);
        return row.map((value, column) => value + coefficients[column]
          .reduce((sum, coefficient, i) => sum + coefficient * input[i], 0));
      }
    };
  }

  function forecast(model, coordinates, from, to) {
    let result = coordinates[from].slice();
    for (let tick = from; tick < to; tick += 1) {
      result = model.advance(result, tick);
      if (result.some(value => !Number.isFinite(value))) return null;
    }
    return result;
  }

  WIS.Simulation.DiscreteBatch = Object.freeze({
    PROBE_TICKS, MAX_BATCH_TICKS, MAX_CERTIFIED_BATCH_TICKS,
    create(context) {
      const { cloneSnapshot, advanceTick, inspect } = context;
      if (![cloneSnapshot, advanceTick, inspect].every(value => typeof value === "function")) {
        throw new TypeError("离散批量结算需要独立快照、真实 tick 和检查接口");
      }
      const now = context.clockNow || (() => typeof performance !== "undefined" ? performance.now() : Date.now());
      const certifications = new WeakMap();
      const signature = observation => JSON.stringify([
        observation.discreteSignature ?? null, observation.treasureSignature ?? null
      ]);
      const capture = snapshot => {
        const observation = inspect(snapshot);
        const captured = { ...observation };
        for (const group of GROUPS) {
          const values = observation[group] || {};
          for (const [key, value] of Object.entries(values)) if (!B.isFiniteBN(value)) {
            captured.invalidField = `${group}.${key}`;
          }
          captured[group] = Array.isArray(values) ? values.map(value => B.BN(value)) :
            Object.fromEntries(Object.entries(values).map(([key, value]) => [key, B.BN(value)]));
        }
        return captured;
      };
      const reject = (work, reason, diagnostics = {}) => ({
        status: "unverifiable", reason, processedSeconds: 0, candidateSnapshot: null,
        probeTicks: work.probeTicks, diagnostics: { ...work.diagnostics, ...diagnostics }, continuation: null
      });

      function evaluate(snapshot, options = {}) {
        const ticks = Math.max(1, Math.floor(Number(options.ticks) || MAX_BATCH_TICKS));
        const tickSeconds = Number(options.tickSeconds ?? 0.1);
        const comparison = {
          relativeTolerance: Math.min(0.05, Math.max(1e-8, Number(options.relativeTolerance) || 0.05)),
          absoluteTolerance: B.BN(options.absoluteTolerance ?? "1e-8")
        };
        const sourceKey = context.snapshotKey ? context.snapshotKey(snapshot) : snapshot;
        const prior = options.certification && certifications.get(options.certification);
        const allowedTicks = prior && prior.sourceKey === sourceKey
          ? Math.min(MAX_CERTIFIED_BATCH_TICKS, prior.ticks * 2) : MAX_BATCH_TICKS;
        let work = options.continuation;
        if (!work || work.sourceKey !== sourceKey || work.ticks !== ticks || work.tickSeconds !== tickSeconds) {
          const initial = cloneSnapshot(snapshot);
          const first = capture(initial);
          work = { sourceKey, ticks, tickSeconds, allowedTicks, initial, current: cloneSnapshot(initial),
            observations: [first], probeTicks: 0, diagnostics: {} };
        }
        if (!(tickSeconds > 0) || !Number.isFinite(tickSeconds)) return reject(work, "非法 tick 时长");
        if (ticks > work.allowedTicks) return reject(work, "批量跨度超过已验证的局部范围", { allowedTicks: work.allowedTicks });
        if (work.observations.some(observation => observation.invalidField)) return reject(work, "收益字段包含非法数值");
        const deadline = Number(options.deadlineMs);
        const limit = Math.min(PROBE_TICKS, ticks);
        // One real update is the maximum synchronous probing unit. There are
        // no hidden sixteen-tick loops behind the UI scheduler's frame budget.
        if (work.probeTicks < limit) {
          if (Number.isFinite(deadline) && now() >= deadline) {
            return { status: "budget-exhausted", processedSeconds: 0,
              probeTicks: work.probeTicks, continuation: work };
          }
          let result;
          try { result = advanceTick(work.current, tickSeconds); }
          catch (error) { return reject(work, "真实离散探针抛出异常", { error: String(error?.message || error) }); }
          if (!result || result.failed || (result.processedSeconds !== undefined &&
              Math.abs(result.processedSeconds - tickSeconds) > 1e-10)) {
            return reject(work, "真实离散探针未完整推进");
          }
          work.current = result.snapshot || work.current;
          work.observations.push(capture(work.current));
          work.probeTicks += 1;
          if (work.observations[work.probeTicks].invalidField) return reject(work, "收益字段包含非法数值");
          if (work.probeTicks < limit || ticks > PROBE_TICKS) return { status: "budget-exhausted", processedSeconds: 0,
            probeTicks: work.probeTicks, continuation: work };
        }
        if (Number.isFinite(deadline) && now() >= deadline) return { status: "budget-exhausted",
          processedSeconds: 0, probeTicks: work.probeTicks, continuation: work };
        if (ticks <= PROBE_TICKS) {
          // This is an exact copy of genuinely executed discrete updates, not
          // an approximate fit promoted by an equality in logarithmic space.
          return { status: "certified", exactReplay: true, processedSeconds: ticks * tickSeconds,
            probeTicks: work.probeTicks, candidateSnapshot: cloneSnapshot(work.current), continuation: null,
            diagnostics: { method: "exact-probe-copy", acceleratedTicks: 0 } };
        }
        const rows = work.observations.map(flatten);
        const fields = rows[0];
        if (fields.length === 0 || rows.some(row => !sameShape(fields, row))) return reject(work, "收益字段发生变化");
        if (work.observations.some(observation => signature(observation) !== signature(work.observations[0]))) {
          return reject(work, "探针期间发生公式或宝物事件");
        }
        for (const row of rows) for (const field of row) {
          if (!B.isFiniteBN(field.value) || B.lt(field.value, B.ZERO)) return reject(work, "收益字段不可拟合");
          const checked = precision(field.value, comparison.relativeTolerance);
          if (!checked.resolvable) return reject(work, "原资源尺度无法认证批量误差", {
            field: `${field.group}.${field.key}`, precision: checked
          });
        }
        const transforms = makeTransforms(rows, fields);
        const coordinates = rows.map(row => row.map((field, i) => transforms[i].encode(field.value)));
        if (coordinates.some(row => row.some(value => !Number.isFinite(value)))) return reject(work, "对数坐标不可表示");
        const firstModel = fit(coordinates, fields, 0, TRAIN_TICKS);
        const secondModel = fit(coordinates, fields, TRAIN_TICKS, PROBE_TICKS);
        if (!firstModel || !secondModel) return reject(work, "多资源联动拟合退化");
        const checks = [];
        function check(predicted, expected, label) {
          if (!predicted) return false;
          for (let i = 0; i < fields.length; i += 1) {
            const value = transforms[i].decode(predicted[i]);
            const result = compare(value, expected[i], comparison);
            checks.push({ label, field: `${fields[i].group}.${fields[i].key}`,
              pass: result.pass && result.verified, relativeError: String(result.relativeError ?? ""),
              absoluteError: String(B.abs(B.sub(value, expected[i]))),
              reason: result.reason || null });
            if (!result.pass || !result.verified) return false;
          }
          return true;
        }
        for (const tick of [12, 16]) {
          const prediction = forecast(firstModel, coordinates, TRAIN_TICKS, tick);
          if (!check(prediction, rows[tick].map(field => field.value), `holdout-${tick}`)) {
            return reject(work, "真实离散 holdout 超出原资源误差目标", { checks });
          }
        }
        const full = forecast(firstModel, coordinates, TRAIN_TICKS, ticks);
        const segmented = forecast(secondModel, coordinates, PROBE_TICKS, ticks);
        const values = segmented?.map((value, i) => transforms[i].decode(value));
        const invalidIndex = values?.findIndex((value, i) => !B.isFiniteBN(value) || B.lt(value, B.ZERO) ||
          (fields[i].group === "grossGains" && B.lt(value, rows[PROBE_TICKS][i].value)));
        if (invalidIndex >= 0) {
          return reject(work, "外推会减少累计获得量或产生非法收益", {
            field: `${fields[invalidIndex].group}.${fields[invalidIndex].key}`,
            predicted: String(values[invalidIndex]), previous: String(rows[PROBE_TICKS][invalidIndex].value)
          });
        }
        if (!values || !check(full, values, "two-local-batch-lengths")) {
          return reject(work, "不同批量跨度的原资源结果不一致", { checks });
        }
        const candidateVectors = structure(work.observations[0], values, fields);
        const diagnostics = { checks, method: "coupled-local-discrete-fit",
          coordinateModes: transforms.map(transform => transform.mode),
          acceleratedTicks: ticks - PROBE_TICKS };
        if (typeof context.validateHorizon !== "function" || context.validateHorizon(work.initial, {
          ticks, tickSeconds, observations: work.observations, candidateVectors
        }) !== true) return reject(work, "未证明未来区间内的事件与真实宝物可以安全结算", diagnostics);
        if (typeof context.writeCandidate !== "function") return reject(work, "缺少完整状态提交适配", diagnostics);
        const candidateSnapshot = context.writeCandidate(cloneSnapshot(work.initial), candidateVectors, {
          ticks, tickSeconds, trustedSnapshot: cloneSnapshot(work.current)
        });
        if (!candidateSnapshot) return reject(work, "完整状态提交适配拒绝外推", diagnostics);
        const certification = Object.freeze({ ticks });
        certifications.set(certification, { ticks,
          sourceKey: context.snapshotKey ? context.snapshotKey(candidateSnapshot) : candidateSnapshot });
        return { status: "certified", exactReplay: false, processedSeconds: ticks * tickSeconds,
          probeTicks: work.probeTicks, candidateSnapshot, candidateVectors, diagnostics, certification, continuation: null };
      }
      return Object.freeze({ evaluate });
    }
  });
}(window.WIS));
