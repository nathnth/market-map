"""Copy the stock lists, Claude-written content and price history into site/data for deployment."""
import csv
import json
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "site" / "data"


def main():
    DATA.mkdir(parents=True, exist_ok=True)
    for market in ("us", "th"):
        with open(ROOT / "universe" / f"{market}.csv", newline="", encoding="utf-8") as f:
            # base_price is blank for stocks that had no price when the base values were taken.
            universe = [
                {**row, "base_mcap_b": float(row["base_mcap_b"]),
                 "base_price": float(row["base_price"]) if row["base_price"] else None}
                for row in csv.DictReader(f)
            ]
        (DATA / f"universe-{market}.json").write_text(
            json.dumps(universe, ensure_ascii=False, separators=(",", ":")), encoding="utf-8"
        )
        content = json.loads((ROOT / "content" / f"{market}.json").read_text(encoding="utf-8"))
        (DATA / f"content-{market}.json").write_text(
            json.dumps(content, ensure_ascii=False, separators=(",", ":")), encoding="utf-8"
        )
        target = DATA / "history" / market
        if target.exists():
            shutil.rmtree(target)
        shutil.copytree(ROOT / "history" / market, target)
    print(f"built {DATA.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
