"""Collect recent news headlines for the Thai stocks, for the AI simulation's news check.

  python scripts/fetch_news.py  -> history/news-th.csv

For each ticker in universe/th.csv, reads the Google News RSS search for the ticker (Thai edition) and
keeps up to 6 headlines from the last 30 days. Columns: ticker, published (Bangkok time, YYYY-MM-DD HH:MM),
title, source. The page only uses headlines published before the trading day it decides on.
"""
import csv
import time
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from datetime import datetime, timedelta, timezone
from email.utils import parsedate_to_datetime
from pathlib import Path

from fetch_prices import load_universe

ROOT = Path(__file__).resolve().parent.parent
BKK = timezone(timedelta(hours=7))
PER_TICKER = 6
DAYS = 30


def headlines(ticker):
    q = urllib.parse.quote(f'"{ticker}" หุ้น when:{DAYS}d')
    url = f"https://news.google.com/rss/search?q={q}&hl=th&gl=TH&ceid=TH:th"
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (market-map news check)"})
    with urllib.request.urlopen(req, timeout=20) as r:
        root = ET.fromstring(r.read())
    cutoff = datetime.now(BKK) - timedelta(days=DAYS)
    out = []
    for item in root.iter("item"):
        try:
            when = parsedate_to_datetime(item.findtext("pubDate")).astimezone(BKK)
        except (TypeError, ValueError):
            continue
        if when < cutoff:
            continue
        title = (item.findtext("title") or "").strip()
        source = (item.findtext("source") or "").strip()
        if source and title.endswith(" - " + source):
            title = title[: -len(" - " + source)]
        if ticker.upper() not in title.upper():  # keep only headlines that name the stock
            continue
        out.append([ticker, when.strftime("%Y-%m-%d %H:%M"), " ".join(title.split()), source])
    out.sort(key=lambda r: r[1], reverse=True)
    return out[:PER_TICKER]


def main():
    rows, failed = [], []
    for ticker in load_universe("th"):
        try:
            rows.extend(headlines(ticker))
        except Exception as e:  # one bad feed must not stop the rest
            failed.append(f"{ticker} ({e.__class__.__name__})")
        time.sleep(0.5)
    dest = ROOT / "history" / "news-th.csv"
    with open(dest, "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f, lineterminator="\n")
        w.writerow(["ticker", "published", "title", "source"])
        w.writerows(rows)
    print(f"{dest.relative_to(ROOT)}: {len(rows)} headlines; failed: {', '.join(failed) or 'none'}")


if __name__ == "__main__":
    main()
