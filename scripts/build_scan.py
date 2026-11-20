"""Summarise each ticker's price history into one file, for Google Sheets.

  python scripts/build_scan.py th  -> history/scan-th.csv

One row per ticker with the indicators the trade-journal and AI-simulation pages use:
moving averages, recent lows/highs and average daily range, both as of the latest close
and as of the close before it (the "p" columns), plus the latest day's open/high/low.
A single file lets a sheet load the whole market with one IMPORTDATA call instead of
one call per ticker, which Google throttles.
"""
import csv
import sys
from pathlib import Path

from fetch_prices import history_filename, load_universe

ROOT = Path(__file__).resolve().parent.parent

HEADER = [
    "ticker", "close", "sma20", "sma50", "low10", "low20", "low60", "high20", "high60", "atr14", "close22ago",
    "eps", "pe", "asof", "prevdate", "prevclose", "psma20", "psma50", "plow10", "plow20", "plow60",
    "phigh20", "phigh60", "patr14", "open", "high", "low",
]


def stats(rows):
    close = [r["close"] for r in rows]
    high = [r["high"] for r in rows]
    low = [r["low"] for r in rows]
    return [
        close[-1],
        sum(close[-20:]) / 20,
        sum(close[-50:]) / 50,
        min(low[-10:]),
        min(low[-20:]),
        min(low[-60:]),
        max(high[-20:]),
        max(high[-60:]),
        sum(h - l for h, l in zip(high[-14:], low[-14:])) / 14,  # average high-low range, as the sheets used
        close[-22],
    ]


def read_history(path):
    with open(path, newline="", encoding="utf-8") as f:
        rows = []
        for r in csv.DictReader(f):
            try:
                rows.append({"date": r["date"], "open": float(r["open"]), "high": float(r["high"]),
                             "low": float(r["low"]), "close": float(r["close"])})
            except (KeyError, ValueError):
                continue
    return rows


def main(market):
    out = []
    for ticker in load_universe(market):
        path = ROOT / "history" / market / history_filename(ticker)
        if not path.exists():
            continue
        rows = read_history(path)
        if len(rows) < 61:  # needs 60 bars for the latest stats and one more for the previous day's
            continue
        r4 = lambda v: round(v, 4)
        now, prev, last = stats(rows), stats(rows[:-1]), rows[-1]
        out.append([ticker] + [r4(v) for v in now] + ["", "", last["date"], rows[-2]["date"]]
                   + [r4(v) for v in prev[:9]] + [r4(last["open"]), r4(last["high"]), r4(last["low"])])
    dest = ROOT / "history" / f"scan-{market}.csv"
    with open(dest, "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f, lineterminator="\n")
        w.writerow(HEADER)
        w.writerows(out)
    print(f"{dest.relative_to(ROOT)}: {len(out)} tickers")


if __name__ == "__main__":
    if len(sys.argv) != 2 or sys.argv[1] not in ("th", "us"):
        sys.exit("usage: build_scan.py th|us")
    main(sys.argv[1])
