import csv
import re
import sys
from collections import OrderedDict
from pathlib import Path

re_space_ka = re.compile(r"\bKA\s+(\d{1,2})\b", re.I)
re_colon = re.compile(r"\bKA(\d{1,2})\s*:\s*", re.I)
re_dash = re.compile(r"\bKA(\d{1,2})\s*[-–]\s*", re.I)
re_bare = re.compile(r"^KA(\d{1,2})$", re.I)
re_with_title = re.compile(r"^KA(\d{1,2})\s*-\s*(.+)$", re.I)

def canon_piece(s: str):
    t = (s or "").strip()
    if not t:
        return None, "empty"

    t = re_space_ka.sub(lambda m: f"KA{int(m.group(1))}", t)
    t = re_colon.sub(lambda m: f"KA{int(m.group(1))} - ", t)
    t = re_dash.sub(lambda m: f"KA{int(m.group(1))} - ", t)
    t = re.sub(r"\s+", " ", t).strip()

    m = re_with_title.match(t)
    if m:
        n = int(m.group(1))
        title = m.group(2).strip()
        title = re.sub(r"\s+", " ", title)
        return (f"KA{n} - {title}", f"ok:{n}")

    m = re_bare.match(t)
    if m:
        n = int(m.group(1))
        return None, f"bare:{n}"

    return None, "junk"

def canon_ka_field(field: str):
    raw = field or ""
    parts = [p.strip() for p in raw.split(",")]
    kept = OrderedDict()
    dropped_bare = 0
    dropped_junk = 0

    for p in parts:
        canon, status = canon_piece(p)
        if canon is None:
            if status.startswith("bare:"):
                dropped_bare += 1
            elif status not in ("empty",):
                dropped_junk += 1
            continue
        n = int(re.match(r"^KA(\d{1,2})\b", canon, re.I).group(1))
        if n not in kept:
            kept[n] = canon

    out = ", ".join(kept.values())
    return out, dropped_bare, dropped_junk

def main():
    if len(sys.argv) != 3:
        print("Gebruik: python scripts/normalize_cito_ka_csv.py IN.csv OUT.csv")
        raise SystemExit(2)

    inp = Path(sys.argv[1]).expanduser()
    outp = Path(sys.argv[2]).expanduser()

    changed_rows = 0
    total_rows = 0
    total_bare = 0
    total_junk = 0

    with inp.open("r", encoding="utf-8", errors="ignore", newline="") as f:
        r = csv.reader(f)
        rows = list(r)

    new_rows = []
    for row in rows:
        total_rows += 1
        if len(row) >= 3:
            before = row[2]
            after, db, dj = canon_ka_field(before)
            total_bare += db
            total_junk += dj
            if after != before:
                row = row[:]
                row[2] = after
                changed_rows += 1
        new_rows.append(row)

    with outp.open("w", encoding="utf-8", newline="") as f:
        w = csv.writer(f, quoting=csv.QUOTE_MINIMAL)
        w.writerows(new_rows)

    print("Input:", inp)
    print("Output:", outp)
    print("Rijen totaal:", total_rows)
    print("Rijen aangepast:", changed_rows)
    print("Dropped bare KAxx tokens:", total_bare)
    print("Dropped junk tokens:", total_junk)

    bad = 0
    with outp.open("r", encoding="utf-8", errors="ignore") as f:
        for i, line in enumerate(f, 1):
            if re.search(r"\bKA\s+\d{1,2}\b", line):
                bad += 1
                if bad <= 10:
                    print("VIOLATION (spatie) regel", i, ":", line.strip()[:200])
            if re.search(r"\bKA\d{1,2}\s*:", line):
                bad += 1
                if bad <= 10:
                    print("VIOLATION (:) regel", i, ":", line.strip()[:200])

    if bad == 0:
        print("OK: geen 'KA 33' of 'KA33:' meer gevonden.")

if __name__ == "__main__":
    main()

