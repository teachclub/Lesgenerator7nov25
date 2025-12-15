from pathlib import Path
import re
import sys

try:
    import pdfplumber
except Exception:
    print("pdfplumber ontbreekt. Activeer je venv en installeer: python -m pip install pdfplumber")
    raise

def norm(s: str) -> str:
    s = (s or "").strip().lower()
    s = s.replace("’", "'").replace("‘", "'").replace("“", '"').replace("”", '"')
    s = re.sub(r"\s+", " ", s)
    s = s.replace("-", " ").replace("–", " ").replace("—", " ")
    s = re.sub(r"[;:,.\"]", "", s)
    s = re.sub(r"\s+", " ", s).strip()
    return s

def extract_slo_from_pdf(pdf_path: Path):
    num_to_title = {}
    with pdfplumber.open(str(pdf_path)) as pdf:
        buf_n = None
        buf_txt = ""

        def flush():
            nonlocal buf_n, buf_txt
            if buf_n is not None:
                t = norm(buf_txt)
                if 1 <= buf_n <= 49 and len(t) >= 8:
                    num_to_title[buf_n] = t
            buf_n = None
            buf_txt = ""

        for page in pdf.pages:
            text = page.extract_text() or ""
            for raw in text.splitlines():
                line = raw.strip()
                if not line:
                    continue

                m = re.match(r"^(\d{1,2})\.\s+(.*)$", line)
                if m:
                    flush()
                    buf_n = int(m.group(1))
                    buf_txt = m.group(2).strip()
                    continue

                if buf_n is not None:
                    buf_txt += " " + line

        flush()

    title_to_num = {t: n for n, t in num_to_title.items()}
    return num_to_title, title_to_num

def extract_csv_ka_hits(csv_path: Path):
    hits = []
    bare = []

    ka_field_pat = re.compile(r"\bKA\s*\d{1,2}\b", re.I)
    ka_chunk_pat = re.compile(
        r"KA\s*(\d{1,2})\s*[-–:]\s*(.*?)(?=,\s*KA\s*\d{1,2}\s*[-–:]|\"|$)",
        re.I,
    )

    lines = csv_path.read_text(encoding="utf-8", errors="ignore").splitlines()
    for row_i, line in enumerate(lines, 1):
        if "KA" not in line:
            continue
        if not ka_field_pat.search(line):
            continue

        for m in ka_chunk_pat.finditer(line):
            n = int(m.group(1))
            rest = m.group(2).strip()
            if rest:
                hits.append((row_i, n, norm(rest), line[:240]))
            else:
                bare.append((row_i, n, line[:240]))

    return hits, bare

def main():
    pdf = Path(sys.argv[1]) if len(sys.argv) >= 2 else Path("tijdvakken_en_kenmerkende_asoecten_vwo_bb (14).pdf")
    csv = Path(sys.argv[2]) if len(sys.argv) >= 3 else Path("app/backend/data/cito_bronnen.csv")

    if not pdf.exists():
        print("PDF niet gevonden:", pdf)
        sys.exit(2)
    if not csv.exists():
        print("CSV niet gevonden:", csv)
        sys.exit(2)

    slo_num_to_title, slo_title_to_num = extract_slo_from_pdf(pdf)
    csv_hits, bare_hits = extract_csv_ka_hits(csv)

    mism = []
    ok = 0
    for row_i, n_csv, t_norm, sample in csv_hits:
        n_slo = slo_title_to_num.get(t_norm)
        if n_slo is None:
            continue
        if n_slo != n_csv:
            mism.append((row_i, n_csv, n_slo, t_norm, sample))
        else:
            ok += 1

    mism.sort(key=lambda x: (x[2], x[1], x[0]))

    print("SLO KA’s gevonden in PDF:", len(slo_num_to_title))
    print("CSV KA’s met titel (uit regels met 'KA xx - ...'):", len(csv_hits))
    print("CSV KA’s zonder titel (alleen 'KA 36' etc):", len(bare_hits))
    print("Matches (titel + nummer klopt):", ok)
    print("MISMATCHES (zelfde titel, ander nummer):", len(mism))
    print()

    for row_i, n_csv, n_slo, t, sample in mism[:120]:
        print(f"{row_i}: CSV=KA{n_csv} SLO=KA{n_slo} | {t}")

    out = Path("/tmp/ka_check_slo_report.txt")
    with out.open("w", encoding="utf-8") as w:
        w.write(f"PDF: {pdf}\nCSV: {csv}\n\n")
        w.write(f"SLO KA’s: {len(slo_num_to_title)}\n")
        w.write(f"CSV hits met titel: {len(csv_hits)}\n")
        w.write(f"CSV hits zonder titel: {len(bare_hits)}\n")
        w.write(f"MATCHES: {ok}\n")
        w.write(f"MISMATCHES: {len(mism)}\n\n")
        w.write("MISMATCHES (row\tcsv\tslo\ttitel_norm)\n")
        for row_i, n_csv, n_slo, t, sample in mism:
            w.write(f"{row_i}\tKA{n_csv}\tKA{n_slo}\t{t}\n")

    print("Rapport:", out)

if __name__ == "__main__":
    main()

