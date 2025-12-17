import csv, sys, re

IN = "data/historiek_personen_omzet_final.csv"
OUT = "/tmp/historiek_personen_omzet_final.clean.csv"

BAD = re.compile(r"(kerk|kathedraal|basiliek|abdij|moskee|synagoge|gebouw|brug|toren|museum)", re.I)

with open(IN, newline="", encoding="utf-8") as f:
    rows = list(csv.DictReader(f))

keep = []
dropped = 0

for r in rows:
    if r.get("type","").strip() != "persoon":
        keep.append(r)
        continue
    wiki_title = (r.get("wiki_title") or r.get("wiki_url") or "").lower()
    years = (r.get("active_year") or r.get("hist_mid") or r.get("wiki_year_median") or "").strip()
    if BAD.search(wiki_title) and not years:
        dropped += 1
        continue
    keep.append(r)

with open(OUT, "w", newline="", encoding="utf-8") as f:
    w = csv.DictWriter(f, fieldnames=keep[0].keys())
    w.writeheader()
    w.writerows(keep)

print("kept", len(keep), "dropped", dropped)
print("output", OUT)

