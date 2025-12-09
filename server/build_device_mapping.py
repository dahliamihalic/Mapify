"""
Build a device mapping CSV by scraping authoritative pages.

Usage:
  python scripts/build_device_mapping.py

This script fetches a small set of pages (The iPhone Wiki + Wikipedia series pages)
and attempts to extract device identifiers (Apple identifiers like `iPhone14,2`,
and Samsung model codes like `SM-G991B` / `GT-P3113`) and friendly names. It writes
`inyourhead/src/components/data/device_mapping.csv`.

Notes:
- Scraping HTML tables is heuristic. Run the script locally and inspect the output
  for correctness. If you want, I can run it here, but it's better run on your machine
  to avoid long network jobs from this environment.
"""
import re
import csv
import sys
from urllib.parse import urljoin

try:
    import requests
    from bs4 import BeautifulSoup
except ImportError:
    print("Missing dependencies. Install with: pip install -r requirements.txt")
    sys.exit(1)

OUT_CSV = "inyourhead/src/components/data/device_mapping.csv"

SOURCES = {
    "apple_models": "https://www.theiphonewiki.com/w/index.php?title=Models&printable=yes",
    "iphone_wikipedia": "https://en.wikipedia.org/wiki/List_of_iPhone_models",
    "galaxy_s": "https://en.wikipedia.org/wiki/Galaxy_S_series",
    "galaxy_note": "https://en.wikipedia.org/wiki/Galaxy_Note",
    "galaxy_a": "https://en.wikipedia.org/wiki/Samsung_Galaxy_A_series",
    "galaxy_tab": "https://en.wikipedia.org/wiki/Samsung_Galaxy_Tab",
    "apple_tv": "https://en.wikipedia.org/wiki/Apple_TV_(device)",
    "ps4": "https://en.wikipedia.org/wiki/PlayStation_4",
    "ps5": "https://en.wikipedia.org/wiki/PlayStation_5",
    "xbox_one": "https://en.wikipedia.org/wiki/Xbox_One",
    "xbox_series": "https://en.wikipedia.org/wiki/Xbox_Series_X_and_S",
    "nintendo_switch": "https://en.wikipedia.org/wiki/Nintendo_Switch",
}

RE_APPLE_ID = re.compile(r"\b([A-Za-z]+\d+,\d+)\b")
RE_SAMSUNG_SM = re.compile(r"\b(SM-[A-Z0-9-]+)\b", re.IGNORECASE)
RE_SAMSUNG_GT = re.compile(r"\b(GT-[A-Z0-9-]+)\b", re.IGNORECASE)
RE_SAMSUNG_SAMSUNG = re.compile(r"\b(SAMSUNG-[A-Z0-9-]+)\b", re.IGNORECASE)


def fetch(url):
    print(f"Fetching {url}")
    r = requests.get(url, timeout=30)
    r.raise_for_status()
    return r.text


def extract_from_soup(soup, source_name):
    text = soup.get_text(separator=" \n ")
    results = []

    # Apple identifiers
    for m in RE_APPLE_ID.finditer(text):
        ident = m.group(1).strip()
        # try to find a friendly name nearby (take 200 chars around match)
        span_start = max(0, m.start() - 200)
        span_end = min(len(text), m.end() + 200)
        context = text[span_start:span_end]
        # heuristic: look for previous capitalized token sequence
        name_candidates = re.findall(r"([A-Z][A-Za-z0-9\s\-]{2,60})", context)
        friendly = name_candidates[0].strip() if name_candidates else ""
        results.append((ident, "Apple", friendly, "ios device", "scraped from %s" % source_name))

    # Samsung identifiers (SM- and GT- and SAMSUNG- prefixed)
    for m in RE_SAMSUNG_SM.finditer(text):
        ident = m.group(1).strip()
        # get nearby context
        span_start = max(0, m.start() - 200)
        span_end = min(len(text), m.end() + 200)
        context = text[span_start:span_end]
        # use source title as family fallback
        family = "Samsung"
        friendly_candidates = re.findall(r"([Gg]alaxy\s+[A-Za-z0-9\+\s]+|Galaxy\s+[A-Za-z0-9\+\s]+)", context)
        friendly = friendly_candidates[0].strip() if friendly_candidates else ""
        results.append((ident, family, friendly or "Samsung device", "android device", "scraped from %s" % source_name))

    for m in RE_SAMSUNG_GT.finditer(text):
        ident = m.group(1).strip()
        results.append((ident, "Samsung", "Samsung device", "android device", "scraped from %s" % source_name))

    for m in RE_SAMSUNG_SAMSUNG.finditer(text):
        ident = m.group(1).strip()
        results.append((ident, "Samsung", "Samsung device", "android device", "scraped from %s" % source_name))

    return results


def main():
    seen = {}
    for key, url in SOURCES.items():
        try:
            html = fetch(url)
        except Exception as e:
            print(f"Failed to fetch {url}: {e}")
            continue
        soup = BeautifulSoup(html, "html.parser")
        items = extract_from_soup(soup, key)
        for ident, man, friendly, family, note in items:
            k = ident.upper()
            if k not in seen:
                seen[k] = {
                    "identifier": ident,
                    "manufacturer": man,
                    "friendly_name": friendly,
                    "device_family": family,
                    "note": note,
                }

    # Add fallback generic entries
    seen.setdefault("IOS_DEVICE", {"identifier": "ios device", "manufacturer": "Apple", "friendly_name": "iOS device (generic)", "device_family": "ios device", "note": "fallback"})
    seen.setdefault("ANDROID_DEVICE", {"identifier": "android device", "manufacturer": "Generic Android", "friendly_name": "Android device (generic)", "device_family": "android device", "note": "fallback"})

    # Write CSV
    fieldnames = ["identifier","manufacturer","friendly_name","device_family","note"]
    out_path = OUT_CSV
    print(f"Writing {out_path} with {len(seen)} rows")
    with open(out_path, "w", newline='', encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=fieldnames)
        w.writeheader()
        for k in sorted(seen.keys()):
            row = seen[k]
            w.writerow(row)

    print("Done. Review the CSV and run the script again if you want additional sources or stricter parsing.")


if __name__ == "__main__":
    main()
