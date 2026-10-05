(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.FinanceMath = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  function requireFinite(values, label) {
    if (!Array.isArray(values) || values.length === 0) {
      throw new Error(`${label} must contain at least one value.`);
    }
    if (values.some((value) => !Number.isFinite(value))) {
      throw new Error(`${label} contains a non-numeric value.`);
    }
  }

  function holdingPeriodReturn(startPrice, endPrice) {
    if (!Number.isFinite(startPrice) || startPrice <= 0 || !Number.isFinite(endPrice)) {
      throw new Error("Prices must be finite and the beginning price must be positive.");
    }
    return endPrice / startPrice - 1;
  }

  function annualizedReturn(startPrice, endPrice, elapsedDays) {
    if (!Number.isFinite(elapsedDays) || elapsedDays <= 0) {
      throw new Error("Elapsed days must be positive.");
    }
    return Math.pow(endPrice / startPrice, 365.2425 / elapsedDays) - 1;
  }

  function dailyReturns(prices) {
    requireFinite(prices, "Prices");
    if (prices.length < 2 || prices.some((price) => price <= 0)) {
      throw new Error("At least two positive prices are required.");
    }
    const returns = [];
    for (let i = 1; i < prices.length; i += 1) {
      returns.push(prices[i] / prices[i - 1] - 1);
    }
    return returns;
  }

  function mean(values) {
    requireFinite(values, "Values");
    return values.reduce((sum, value) => sum + value, 0) / values.length;
  }

  function sampleVariance(values) {
    requireFinite(values, "Values");
    if (values.length < 2) throw new Error("At least two values are required.");
    const average = mean(values);
    return values.reduce((sum, value) => sum + (value - average) ** 2, 0) / (values.length - 1);
  }

  function sampleStandardDeviation(values) {
    return Math.sqrt(sampleVariance(values));
  }

  function annualizedVolatility(returns, periodsPerYear = 252) {
    if (!Number.isFinite(periodsPerYear) || periodsPerYear <= 0) {
      throw new Error("Periods per year must be positive.");
    }
    return sampleStandardDeviation(returns) * Math.sqrt(periodsPerYear);
  }

  function sampleCovariance(x, y) {
    requireFinite(x, "First series");
    requireFinite(y, "Second series");
    if (x.length !== y.length || x.length < 2) {
      throw new Error("Series must have the same length and at least two values.");
    }
    const meanX = mean(x);
    const meanY = mean(y);
    return x.reduce(
      (sum, value, index) => sum + (value - meanX) * (y[index] - meanY),
      0
    ) / (x.length - 1);
  }

  function beta(assetReturns, marketReturns) {
    const marketVariance = sampleVariance(marketReturns);
    if (marketVariance === 0) throw new Error("Market variance cannot be zero.");
    return sampleCovariance(assetReturns, marketReturns) / marketVariance;
  }

  function analyze(rows) {
    if (!Array.isArray(rows) || rows.length < 3) {
      throw new Error("At least three aligned price observations are required.");
    }
    const bePrices = rows.map((row) => row.be);
    const spyPrices = rows.map((row) => row.spy);
    const beReturns = dailyReturns(bePrices);
    const spyReturns = dailyReturns(spyPrices);
    const elapsedDays = (rows.at(-1).date - rows[0].date) / 86400000;
    const beHpr = holdingPeriodReturn(bePrices[0], bePrices.at(-1));
    const spyHpr = holdingPeriodReturn(spyPrices[0], spyPrices.at(-1));

    return {
      startDate: rows[0].date,
      endDate: rows.at(-1).date,
      observations: rows.length,
      beHpr,
      spyHpr,
      annualizedReturn: annualizedReturn(bePrices[0], bePrices.at(-1), elapsedDays),
      annualizedVolatility: annualizedVolatility(beReturns),
      beta: beta(beReturns, spyReturns),
      excessReturn: beHpr - spyHpr,
    };
  }

  return {
    holdingPeriodReturn,
    annualizedReturn,
    dailyReturns,
    mean,
    sampleVariance,
    sampleStandardDeviation,
    annualizedVolatility,
    sampleCovariance,
    beta,
    analyze,
  };
});
