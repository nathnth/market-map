"""Fetch prices with yfinance.

  python scripts/fetch_prices.py latest us   -> site/data/latest-us.json (current price and % change)
  python scripts/fetch_prices.py history th  -> history/th/<TICKER>.csv (1 year of daily OHLCV)
  python scripts/fetch_prices.py history th --period 3y --out backtest  -> backtest/th/<TICKER>.csv (longer history for backtests)
"""
import argparse
import csv
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

import pandas as pd
import yfinance as yf

ROOT = Path(__file__).resolve().parent.parent
HISTORY_PERIOD = "1y"
# A run that prices fewer than this share of the universe is treated as a failed fetch.
MIN_COVERAGE = 0.8


def load_universe(market):
    with open(ROOT / "universe" / f"{market}.csv", newline="", encoding="utf-8") as f:
        return [row["ticker"] for row in csv.DictReader(f)]


def history_filename(ticker):
    # Windows cannot create files named after devices (e.g. Thai ticker COM7), so those get a "_" suffix.
    # site/app.js applies the same rule when it loads a ticker's history.
    reserved = {"CON", "PRN", "AUX", "NUL"} | {f"{d}{n}" for d in ("COM", "LPT") for n in range(1, 10)}
    return f"{ticker}_.csv" if ticker.upper() in reserved else f"{ticker}.csv"


def yahoo_symbol(market, ticker):
    return f"{ticker}.BK" if market in ("th", "thall") else ticker.replace(".", "-")


def download_once(symbols, period, threads):
    frame = yf.download(
        list(symbols), period=period, interval="1d", group_by="ticker",
        auto_adjust=False, actions=False, threads=threads, progress=False,
    )
    bars = {}
    for symbol, ticker in symbols.items():
        if symbol not in frame.columns.get_level_values(0):
            continue
        rows = frame[symbol].dropna(subset=["Close"])
        if not rows.empty:
            bars[ticker] = rows
    return bars


def download(market, tickers, period):
    symbols = {yahoo_symbol(market, t): t for t in tickers}
    bars = download_once(symbols, period, threads=True)
    # Threaded downloads occasionally fail on yfinance's shared cache, so retry the gaps one at a time.
    retry = {s: t for s, t in symbols.items() if t not in bars}
    if retry:
        bars.update(download_once(retry, period, threads=False))
    return bars


def require_coverage(market, bars, tickers):
    missing = sorted(set(tickers) - set(bars))
    if missing:
        print(f"{market}: no data for {len(missing)} tickers: {' '.join(missing)}", file=sys.stderr)
    if len(bars) < MIN_COVERAGE * len(tickers):
        raise SystemExit(f"{market}: only {len(bars)}/{len(tickers)} tickers priced, not writing output")


def write_latest(market):
    tickers = load_universe(market)
    bars = download(market, tickers, "5d")
    require_coverage(market, bars, tickers)

    quotes = {}
    for ticker, rows in bars.items():
        close = rows["Close"]
        change = (close.iloc[-1] / close.iloc[-2] - 1) * 100 if len(close) > 1 else None
        quotes[ticker] = [
            round(float(close.iloc[-1]), 4),
            None if change is None else round(float(change), 2),
            rows.index[-1].strftime("%Y-%m-%d"),
        ]
    out = ROOT / "site" / "data" / f"latest-{market}.json"
    out.parent.mkdir(parents=True, exist_ok=True)
    payload = {"updated": datetime.now(timezone.utc).isoformat(timespec="seconds"), "quotes": quotes}
    out.write_text(json.dumps(payload, separators=(",", ":")), encoding="utf-8")
    print(f"{market}: wrote {len(quotes)} quotes to {out.relative_to(ROOT)}")


def write_history(market, period=HISTORY_PERIOD, out="history"):
    tickers = load_universe(market)
    bars = download(market, tickers, period)
    require_coverage(market, bars, tickers)

    folder = ROOT / out / market
    folder.mkdir(parents=True, exist_ok=True)
    for ticker, rows in bars.items():
        table = pd.DataFrame({
            "date": rows.index.strftime("%Y-%m-%d"),
            "open": rows["Open"].round(4).values,
            "high": rows["High"].round(4).values,
            "low": rows["Low"].round(4).values,
            "close": rows["Close"].round(4).values,
            "volume": rows["Volume"].fillna(0).astype("int64").values,
        })
        table.to_csv(folder / history_filename(ticker), index=False, lineterminator="\n")
    print(f"{market}: wrote history for {len(bars)} tickers to {folder.relative_to(ROOT)}")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("mode", choices=["latest", "history"])
    parser.add_argument("market", choices=["us", "th", "thall"])  # thall: every SET stock, for backtests only
    parser.add_argument("--period", default=HISTORY_PERIOD, help="history only, e.g. 3y")
    parser.add_argument("--out", default="history", help="history only: top folder to write into")
    args = parser.parse_args()
    if args.mode == "latest":
        write_latest(args.market)
    else:
        write_history(args.market, args.period, args.out)


if __name__ == "__main__":
    main()
