"use strict";

const assert = require("node:assert/strict");
const finance = require("../calculations.js");

function nearlyEqual(actual, expected, tolerance = 1e-12) {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} was not within ${tolerance} of ${expected}`);
}

nearlyEqual(finance.holdingPeriodReturn(100, 125), 0.25);
nearlyEqual(finance.annualizedReturn(100, 121, 2 * 365.2425), 0.1);
const twoReturns = finance.dailyReturns([100, 110, 99]);
nearlyEqual(twoReturns[0], 0.1);
nearlyEqual(twoReturns[1], -0.1);
nearlyEqual(finance.mean([1, 2, 3]), 2);
nearlyEqual(finance.sampleVariance([1, 2, 3]), 1);
nearlyEqual(finance.sampleStandardDeviation([1, 2, 3]), 1);
nearlyEqual(finance.annualizedVolatility([0.01, -0.01], 252), Math.sqrt(0.0002) * Math.sqrt(252));
nearlyEqual(finance.sampleCovariance([1, 2, 3], [2, 4, 6]), 2);
nearlyEqual(finance.beta([0.02, 0.04, 0.06], [0.01, 0.02, 0.03]), 2);

const rows = [
  { date: new Date("2025-01-01T00:00:00Z"), be: 100, spy: 200 },
  { date: new Date("2025-01-02T00:00:00Z"), be: 110, spy: 210 },
  { date: new Date("2026-01-01T00:00:00Z"), be: 121, spy: 220 },
];
const result = finance.analyze(rows);
nearlyEqual(result.beHpr, 0.21);
nearlyEqual(result.spyHpr, 0.1);
nearlyEqual(result.excessReturn, 0.11);
assert.equal(result.observations, 3);

console.log("All financial calculation tests passed.");
