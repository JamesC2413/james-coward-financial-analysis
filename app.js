"use strict";

const state = { rows: [] };

const panels = [...document.querySelectorAll("[data-panel]")];
const navLinks = [...document.querySelectorAll("[data-route]")];
const statusBox = document.querySelector("#data-status");
const calculateButton = document.querySelector("#calculate-button");
const csvInput = document.querySelector("#csv-file");

function showPanel(route) {
  const selected = panels.some((panel) => panel.dataset.panel === route) ? route : "home";
  panels.forEach((panel) => panel.toggleAttribute("hidden", panel.dataset.panel !== selected));
  navLinks.forEach((link) => {
    const active = link.dataset.route === selected;
    link.classList.toggle("active", active);
    link.setAttribute("aria-current", active ? "page" : "false");
  });
}

function routeFromHash() {
  return window.location.hash.replace(/^#\/?/, "") || "home";
}

function parseCsv(text) {
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length < 4) throw new Error("The CSV needs a header and at least three data rows.");
  const headers = lines[0].split(",").map((header) => header.trim().toLowerCase());
  const dateIndex = headers.indexOf("date");
  const beIndex = headers.indexOf("be");
  const spyIndex = headers.indexOf("spy");
  if ([dateIndex, beIndex, spyIndex].includes(-1)) {
    throw new Error("CSV columns must be named Date, BE, and SPY.");
  }

  const rows = lines.slice(1).map((line, index) => {
    const fields = line.split(",").map((field) => field.trim());
    const date = new Date(`${fields[dateIndex]}T00:00:00Z`);
    const be = Number(fields[beIndex]);
    const spy = Number(fields[spyIndex]);
    if (Number.isNaN(date.getTime()) || !Number.isFinite(be) || !Number.isFinite(spy) || be <= 0 || spy <= 0) {
      throw new Error(`Invalid value on CSV data row ${index + 2}.`);
    }
    return { date, be, spy };
  });

  rows.sort((a, b) => a.date - b.date);
  return rows.filter((row, index) => index === 0 || row.date.getTime() !== rows[index - 1].date.getTime());
}

function setStatus(message, type = "info") {
  statusBox.textContent = message;
  statusBox.dataset.type = type;
}

async function loadDefaultData() {
  try {
    const response = await fetch("market-data.csv", { cache: "no-store" });
    if (!response.ok) throw new Error(`Data request failed (${response.status}).`);
    state.rows = parseCsv(await response.text());
    const first = state.rows[0].date.toISOString().slice(0, 10);
    const last = state.rows.at(-1).date.toISOString().slice(0, 10);
    document.querySelector("#start-date").value = first;
    document.querySelector("#end-date").value = last;
    setStatus(`Loaded ${state.rows.length} aligned daily observations for BE and SPY.`, "success");
    calculate();
  } catch (error) {
    setStatus(`Default data could not be loaded: ${error.message} Upload a CSV to continue.`, "error");
  }
}

function percent(value) {
  return new Intl.NumberFormat("en-US", {
    style: "percent",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function plainNumber(value) {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  }).format(value);
}

function interpretation(result) {
  const marketComparison = result.excessReturn >= 0 ? "outperformed" : "underperformed";
  const sensitivity = result.beta > 1 ? "more sensitive" : result.beta < 1 ? "less sensitive" : "similarly sensitive";
  return `During this period, BE ${marketComparison} SPY by ${percent(Math.abs(result.excessReturn))}. ` +
    `Its beta of ${plainNumber(result.beta)} indicates that its daily returns were ${sensitivity} to market movements than SPY.`;
}

function renderResults(result) {
  const values = {
    "hpr-value": percent(result.beHpr),
    "annual-value": percent(result.annualizedReturn),
    "volatility-value": percent(result.annualizedVolatility),
    "beta-value": plainNumber(result.beta),
    "excess-value": percent(result.excessReturn),
    "benchmark-value": percent(result.spyHpr),
  };
  Object.entries(values).forEach(([id, value]) => {
    document.getElementById(id).textContent = value;
  });
  document.querySelector("#analysis-summary").textContent = interpretation(result);
  document.querySelector("#calculation-note").textContent =
    `Calculated from ${result.observations} aligned prices between ` +
    `${result.startDate.toISOString().slice(0, 10)} and ${result.endDate.toISOString().slice(0, 10)}.`;
  document.querySelector("#results").hidden = false;
}

function calculate() {
  try {
    if (!state.rows.length) throw new Error("Load data before calculating.");
    const startValue = document.querySelector("#start-date").value;
    const endValue = document.querySelector("#end-date").value;
    if (!startValue || !endValue || startValue > endValue) throw new Error("Choose a valid date range.");
    const start = new Date(`${startValue}T00:00:00Z`);
    const end = new Date(`${endValue}T23:59:59Z`);
    const selectedRows = state.rows.filter((row) => row.date >= start && row.date <= end);
    renderResults(window.FinanceMath.analyze(selectedRows));
    setStatus(`Analysis complete using ${selectedRows.length} aligned observations.`, "success");
  } catch (error) {
    document.querySelector("#results").hidden = true;
    setStatus(error.message, "error");
  }
}

window.addEventListener("hashchange", () => showPanel(routeFromHash()));
calculateButton.addEventListener("click", calculate);
csvInput.addEventListener("change", async (event) => {
  try {
    const file = event.target.files[0];
    if (!file) return;
    state.rows = parseCsv(await file.text());
    document.querySelector("#start-date").value = state.rows[0].date.toISOString().slice(0, 10);
    document.querySelector("#end-date").value = state.rows.at(-1).date.toISOString().slice(0, 10);
    setStatus(`Loaded ${state.rows.length} observations from ${file.name}.`, "success");
    calculate();
  } catch (error) {
    setStatus(error.message, "error");
  }
});

showPanel(routeFromHash());
loadDefaultData();
