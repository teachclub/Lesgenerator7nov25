import csv
import re
from pathlib import Path
from statistics import median

THRESHOLD = 0.25

repo_root = Path(__file__).resolve().parents[1]
inp = repo_root / "data" / "historiek_personen_omzet_wiki.csv"
outp = repo_root / "data" / "historiek_personen_omzet_final.csv"

re_url_years = re.compile(r"-(\d{3,4})-(\d{3,4})(?:/|$)")
re_year = re.compile(r"(?:1[0-9]{3}|20[0-2][0-9])")

def clamp_year(y: int) -> int | None:
    if 800 <= y <= 2000:
        return y
    return None

def extract_hist_birth_death(url: str, title: str) -> tuple[int | None, int | None]:
    u = (url or "").strip()
    t = (title or "").strip()

    m = re_url_years.search(u)
    if not m:
        # fallback: soms zit het in de titel
        m = re_url_years.search(t.replace("–", "-").replace("—", "-"))
    if not m:
        return None, None

    try:
        a = int(m.group(1))
        b = int(m.group(2))
    except Exception:
        return None, None

    a = clamp_year(a)
    b = clamp_year(b)
    if not a or not b:
        return None, None
    if b < a:
        a, b = b, a
    return a, b

def midpoint(a: int | None, b: int | None) -> int | None:
    if not a or not b:
        return None
    return int(round((a + b) / 2))

def extract_years_from_text(text: str) -> list[int]:
    if not text:
        return []
    ys = []
    for m in re_year.findall(text):
        try:
            y = int(m)
        except Exception:
            continue
        y = clamp_year(y)
        if y:
            ys.append(y)
    # unique, keep order
    out = []
    seen = set()
    for y in ys:
        if y in seen:
            continue
        seen.add(y)
        out.append(y)
    return out

def median_year(years: list[int]) -> int | None:
    if not years:
        return None
    try:
        return int(median(sorted(years)))
    except Exception:
        return None

rows = []
with inp.open("r", encoding="utf-8", newline="") as f:
    r = csv.DictReader(f)
    for row in r:
        title = (row.get("title") or "").strip()
        url = (row.get("url") or "").strip()
        wiki_extract = (row.get("wiki_extract") or "").strip()

        # 1) jaren uit Historiek slug/titel (vaak 1792-1857)
        hist_birth, hist_death = extract_hist_birth_death(url, title)
        hist_mid = midpoint(hist_birth, hist_death)

        # 2) jaren uit wiki_extract (als die er zijn) => mediaan = “actieve periode”
        wiki_years = extract_years_from_text(wiki_extract)
        wiki_med = median_year(wiki_years)

        # 3) activeYear: voorkeur wiki-mediaan, anders hist_mid
        active_year = wiki_med if wiki_med else hist_mid

        row["hist_birth"] = str(hist_birth) if hist_birth else ""
        row["hist_death"] = str(hist_death) if hist_death else ""
        row["hist_mid"] = str(hist_mid) if hist_mid else ""
        row["wiki_years"] = " ".join(str(y) for y in wiki_years) if wiki_years else ""
        row["wiki_year_median"] = str(wiki_med) if wiki_med else ""
        row["active_year"] = str(active_year) if active_year else ""

        # Status: confirmed/uncertain op basis van bestaande confidence
        conf = float(row.get("confidence") or 0.0)
        row["ka_status"] = "confirmed" if conf >= THRESHOLD else "uncertain"
        # NB: ka_best laten we staan, ook als uncertain (handig voor KA-zoek + later UI)

        rows.append(row)

fieldnames = list(rows[0].keys()) if rows else []
for col in ["ka_status","hist_birth","hist_death","hist_mid","wiki_years","wiki_year_median","active_year"]:
    if col not in fieldnames:
        fieldnames.append(col)

with outp.open("w", encoding="utf-8", newline="") as f:
    w = csv.DictWriter(f, fieldnames=fieldnames)
    w.writeheader()
    for row in rows:
        w.writerow(row)

print(outp)
print("threshold", THRESHOLD, "rows", len(rows))

