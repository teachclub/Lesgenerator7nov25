import re, csv, sys, json, pathlib, urllib.parse

def read_text(p: str) -> str:
    return pathlib.Path(p).read_text(encoding="utf-8", errors="ignore")

def squash_ws(s: str) -> str:
    return re.sub(r"\s+", " ", (s or "")).strip()

def norm(s: str) -> str:
    return squash_ws(s).lower()

def load_ka_trefwoorden(repo_root: pathlib.Path):
    ka_path = repo_root / "data" / "ka-trefwoorden.cjs"
    if not ka_path.exists():
        return {}

    txt = ka_path.read_text(encoding="utf-8", errors="ignore")
    m = re.search(r"module\.exports\s*=\s*({[\s\S]*});?\s*$", txt)
    if not m:
        return {}

    js_obj = m.group(1)
    js_obj = re.sub(r"//.*", "", js_obj)
    js_obj = re.sub(r"/\*[\s\S]*?\*/", "", js_obj)
    js_obj = re.sub(r"(\w+)\s*:", r'"\1":', js_obj)
    js_obj = js_obj.replace("'", '"')
    js_obj = re.sub(r",\s*([}\]])", r"\1", js_obj)

    try:
        data = json.loads(js_obj)
    except Exception:
        return {}

    out = {}
    for ka, arr in (data or {}).items():
        if isinstance(arr, list):
            out[str(ka).upper()] = [squash_ws(str(x)) for x in arr if squash_ws(str(x))]
    return out

def url_slug_tokens(url: str):
    try:
        u = urllib.parse.urlparse(url)
        path = u.path or ""
    except Exception:
        path = url or ""
    parts = [p for p in path.split("/") if p]
    if not parts:
        return []
    # neem slug (laatste niet-nummer segment)
    slug = ""
    for p in reversed(parts):
        if re.fullmatch(r"\d+", p):
            continue
        slug = p
        break
    if not slug:
        slug = parts[-1]
    slug = urllib.parse.unquote(slug)
    slug = slug.replace("-", " ")
    slug = re.sub(r"[^a-zA-Z0-9\s]", " ", slug)
    toks = [t for t in re.split(r"\s+", slug) if t]
    # drop super korte/ruis tokens
    toks = [t for t in toks if len(t) >= 3]
    return toks[:20]

def guess_ka(title: str, url: str, ka_tref: dict):
    base = norm(title)
    slug = " ".join(url_slug_tokens(url)).lower()
    text = (base + " " + slug).strip()
    if not text:
        return ("", "", 0.0, "")

    scored = []
    matched_terms = {}

    for ka, terms in ka_tref.items():
        score = 0
        hits = []
        for term in terms:
            tt = norm(term)
            if not tt:
                continue
            if tt in text:
                # zwaarder als het een phrase is
                w = 4 if " " in tt else 2
                # extra gewicht als match in slug (vaak kernachtig)
                if tt in slug:
                    w += 1
                score += w
                hits.append(term)
        if score > 0:
            scored.append((ka, score))
            matched_terms[ka] = hits

    if not scored:
        return ("", "", 0.0, "")

    scored.sort(key=lambda x: x[1], reverse=True)
    best_ka, best_score = scored[0]
    top3 = [k for (k, _) in scored[:3]]

    denom = sum(s for (_, s) in scored[:5]) or best_score
    conf = best_score / denom
    hits = matched_terms.get(best_ka, [])
    hits_str = "; ".join(hits[:20])

    return (best_ka, ",".join(top3), round(conf, 4), hits_str)

def extract_links_basic(html: str):
    html = re.sub(r"<script[\s\S]*?</script>", " ", html, flags=re.I)
    html = re.sub(r"<style[\s\S]*?</style>", " ", html, flags=re.I)

    links = []
    for m in re.finditer(r'<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)</a>', html, flags=re.I):
        href = squash_ws(m.group(1))
        label = re.sub(r"<[^>]+>", " ", m.group(2))
        label = squash_ws(label)
        if not href or not label:
            continue
        links.append((label, href))
    return links

def filter_historiek_links(links):
    out = []
    seen = set()
    for label, href in links:
        if "historiek.net" not in href:
            continue
        # skip index anchors zoals .../historische-personen-bios/#a
        if "#" in href:
            continue
        if "/wp-" in href or "?" in href:
            continue
        if href.endswith("/feed/") or href.endswith("/feed"):
            continue
        k = (norm(label), href)
        if k in seen:
            continue
        seen.add(k)
        out.append((label, href))
    return out

def write_csv(rows, out_path):
    cols = [
        "type",
        "title",
        "url",
        "ka_best",
        "ka_top3",
        "confidence",
        "matched_terms_bestka",
    ]
    with open(out_path, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=cols)
        w.writeheader()
        for r in rows:
            w.writerow({c: r.get(c, "") for c in cols})

def build_table(html_path: str, row_type: str, repo_root: pathlib.Path):
    html = read_text(html_path)
    links = filter_historiek_links(extract_links_basic(html))

    ka_tref = load_ka_trefwoorden(repo_root)

    rows = []
    for title, url in links:
        ka_best, ka_top3, conf, hits = guess_ka(title, url, ka_tref)
        rows.append({
            "type": row_type,
            "title": title,
            "url": url,
            "ka_best": ka_best,
            "ka_top3": ka_top3,
            "confidence": conf,
            "matched_terms_bestka": hits,
        })

    rows.sort(key=lambda r: (r["ka_best"] == "", r["ka_best"], norm(r["title"])))
    return rows

def main():
    if len(sys.argv) != 3:
        print("Usage: python3 scripts/build_historiek_omzet.py /path/personen.html /path/begrippen.html")
        sys.exit(2)

    repo_root = pathlib.Path(__file__).resolve().parents[1]

    personen_html = sys.argv[1]
    begrippen_html = sys.argv[2]

    personen_rows = build_table(personen_html, "persoon", repo_root)
    begrippen_rows = build_table(begrippen_html, "begrip", repo_root)

    out1 = repo_root / "data" / "historiek_personen_omzet.csv"
    out2 = repo_root / "data" / "historiek_begrippen_omzet.csv"

    write_csv(personen_rows, str(out1))
    write_csv(begrippen_rows, str(out2))

    print(str(out1))
    print(str(out2))
    print("personen", len(personen_rows), "begrippen", len(begrippen_rows))

if __name__ == "__main__":
    main()

