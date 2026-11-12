"""Check content/<market>.json against the shape site/app.js expects (optional fields may be null).

  python scripts/check_content.py          # both markets
  python scripts/check_content.py th       # one market
"""
import csv
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def is_num(v):
    return isinstance(v, (int, float)) and not isinstance(v, bool)


def check(market):
    errors = []
    path = ROOT / "content" / f"{market}.json"
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, ValueError) as e:
        return [f"{path.name}: {e}"]

    with open(ROOT / "universe" / f"{market}.csv", newline="", encoding="utf-8") as f:
        rows = list(csv.DictReader(f))
    sectors = {r["sector"] for r in rows}
    tickers = {r["ticker"] for r in rows}

    sn = data.get("sectors")
    if not isinstance(sn, dict):
        return [f"{path.name}: sectors must be an object"]
    meta = sn.get("meta") or {}
    if not isinstance(meta.get("week"), str):
        errors.append("sectors.meta.week must be text")
    if not (isinstance(meta.get("summary"), list) and meta["summary"] and all(isinstance(s, str) for s in meta["summary"])):
        errors.append("sectors.meta.summary must be a non-empty list of text")
    for key in sorted(sectors):
        s = sn.get(key)
        if not isinstance(s, dict):
            errors.append(f"sectors.{key} is missing")
            continue
        if s.get("w") is not None and not is_num(s.get("w")):
            errors.append(f"sectors.{key}.w must be a number or null")
        if not (isinstance(s.get("items"), list) and all(isinstance(i, str) for i in s["items"])):
            errors.append(f"sectors.{key}.items must be a list of text")

    companies = data.get("companies")
    if not isinstance(companies, dict):
        return errors + [f"{path.name}: companies must be an object"]
    for t, d in companies.items():
        where = f"companies.{t}"
        if t not in tickers:
            errors.append(f"{where}: ticker is not in universe/{market}.csv")
        if not isinstance(d, dict):
            errors.append(f"{where} must be an object")
            continue
        if not isinstance(d.get("next"), str):
            errors.append(f"{where}.next must be text")
        news = d.get("news")
        if not (isinstance(news, list) and all(isinstance(n, list) and len(n) == 2 and all(isinstance(x, str) for x in n) for n in news)):
            errors.append(f"{where}.news must be a list of [date, text]")
        if d.get("tgt") is not None:
            if not (isinstance(d["tgt"], list) and len(d["tgt"]) == 3 and all(is_num(x) for x in d["tgt"])):
                errors.append(f"{where}.tgt must be [low, average, high]")
            if not is_num(d.get("price")):
                errors.append(f"{where}.price must be a number when tgt is set")
        if d.get("br") is not None and not (isinstance(d["br"], list) and len(d["br"]) == 5 and all(is_num(x) for x in d["br"])):
            errors.append(f"{where}.br must be 5 numbers")
        if d.get("eps") is not None and not (isinstance(d["eps"], list) and d["eps"] and all(
                isinstance(e, list) and len(e) == 3 and isinstance(e[0], str) and (e[1] is None or is_num(e[1])) and is_num(e[2])
                for e in d["eps"])):
            errors.append(f"{where}.eps must be a non-empty list of [quarter, estimate or null, actual]")
        if d.get("rev") is not None and not isinstance(d["rev"], dict):
            errors.append(f"{where}.rev must be an object")
    return [f"{market}: {e}" for e in errors]


def main():
    markets = sys.argv[1:] or ["us", "th"]
    errors = [e for m in markets for e in check(m)]
    for e in errors:
        print(e, file=sys.stderr)
    if errors:
        sys.exit(1)
    print("content OK:", ", ".join(markets))


if __name__ == "__main__":
    main()
