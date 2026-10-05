# James Coward Financial Analysis

A static financial-analysis website for an Entrepreneurial Finance course project. It analyzes Bloom Energy Corporation (`BE`) relative to the SPDR S&P 500 ETF Trust (`SPY`).

## Run locally

Because the site loads a CSV with `fetch`, serve the directory instead of opening `index.html` directly:

```bash
python -m http.server 8000
```

Then visit `http://localhost:8000`.

## Refresh the historical dataset

```bash
python scripts/fetch_market_data.py
```

The generated CSV contains aligned daily adjusted closing prices from 2023-01-03 through 2025-12-31.

## Verify calculations

```bash
node tests/calculations.test.js
```

## Publish with GitHub Pages

Upload the files to a GitHub repository, open **Settings → Pages**, select **Deploy from a branch**, and publish from the root of the `main` branch.
