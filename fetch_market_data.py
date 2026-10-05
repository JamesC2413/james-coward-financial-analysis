#!/usr/bin/env python3
"""Download aligned adjusted-close data for BE and SPY from Yahoo Finance."""

from __future__ import annotations

import csv
import datetime as dt
import json
import pathlib
import urllib.parse
import urllib.request


START = dt.datetime(2023, 1, 3, tzinfo=dt.timezone.utc)
END_EXCLUSIVE = dt.datetime(2026, 1, 1, tzinfo=dt.timezone.utc)
TICKERS = ("BE", "SPY")
OUTPUT = pathlib.Path(__file__).resolve().parents[1] / "data" / "market-data.csv"


def fetch_adjusted_close(ticker: str) -> dict[str, float]:
    params = urllib.parse.urlencode(
        {
            "period1": int(START.timestamp()),
            "period2": int(END_EXCLUSIVE.timestamp()),
            "interval": "1d",
            "events": "history",
            "includeAdjustedClose": "true",
        }
    )
    url = f"https://query2.finance.yahoo.com/v8/finance/chart/{ticker}?{params}"
    request = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(request, timeout=30) as response:
        payload = json.load(response)

    result = payload["chart"]["result"][0]
    timestamps = result["timestamp"]
    adjusted = result["indicators"]["adjclose"][0]["adjclose"]

    prices: dict[str, float] = {}
    for timestamp, price in zip(timestamps, adjusted):
        if price is None:
            continue
        date = dt.datetime.fromtimestamp(timestamp, tz=dt.timezone.utc).date().isoformat()
        prices[date] = float(price)
    return prices


def main() -> None:
    series = {ticker: fetch_adjusted_close(ticker) for ticker in TICKERS}
    aligned_dates = sorted(set.intersection(*(set(values) for values in series.values())))

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    with OUTPUT.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.writer(handle)
        writer.writerow(("Date", *TICKERS))
        for date in aligned_dates:
            writer.writerow((date, *(f"{series[ticker][date]:.6f}" for ticker in TICKERS)))

    print(f"Wrote {len(aligned_dates)} aligned observations to {OUTPUT}")
    print(f"Range: {aligned_dates[0]} through {aligned_dates[-1]}")


if __name__ == "__main__":
    main()
