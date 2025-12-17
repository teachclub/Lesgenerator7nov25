import argparse
import csv
import json
import re
import sys
import time
import urllib.parse
import urllib.request
from pathlib import Path
from subprocess import run, PIPE

def squash_ws(s: str) -> str:
    return re.sub(r"\s+", " ", (s or "")).strip()

def norm(s: str) -> str:
    return squash_ws(s).lower()

def http_get_json(url: str, timeout=12):
    req = urllib.request.Request(
        url,
        headers={
            "User-Agent": "Lessie2000/1.0 (contact: ceeskoole@gmail.com)",
            "Accept": "application/json",
        },
    )
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return json.loads(r.read().decode("utf-8", errors="ignore"))

def wiki_opensearch_nl(query: str):
    q = urllib.parse.quote(query)
    url = f"https://nl.wikipedia.org/w/api.php?action=opensearch&search={q}&limit=1&namespace=0&format=json"
    try:
        data = http_get_json(url)
        if isinstance(data, list) and len(data) >= 4:
            titles = data[1] or []
            urls = data[3] or []
            if titles and urls:
                return str(titles[0]), str(urls[0])
    except Exception:
        return None, None
    return None, None

def wiki_summary_nl(title: str):
    t = urllib.parse.quote(title.replace(" ", "_"))
    url = f"https://nl.wikipedia.org/api/rest_v1/page/summary/{t}"
    try:
        data = http_get_json(url)
        extract = squash_ws(data.get("extract") or "")
        page_url = ""
        content_urls = data.get("content_urls") or {}
        desktop = content_urls.get("desktop") or {}
        page_url = desktop.get("page") or ""
        return extract, page_url
    except Exception:
        return "", ""

def load_ka_trefwoorden(repo_root: Path):
    ka_path = repo_root / "data" / "ka-trefwoorden.cjs"
    if not ka_path.exists():
        return {}

    # Robuust: laat Node het .cjs bestand require'n en JSON printen
    js = (
        "const p=process.argv[1];"
        "const o=require(p);"
        "process.stdout.write(JSON.stringify(o));"
    )
    try:
        r = run(["node", "-e", js, str(ka_path)], stdout=PIPE, stderr=PIPE, text=True)
        if r.returncode != 0:
            return {}
        data = json.loads(r.stdout)
    except Exception:
        return {}

    out = {}
    for ka, arr in (data or {}).items():
        if isinstance(arr, list):
            out[str(ka).upper()] = [squash_ws(str(x)) for x in arr if squash_ws(str(x))]
    return out

def guess_ka_from_text(text: str, ka_tref: dict):
    t = norm(text)
    if not t:
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
            if tt in t:
                w = 5 if " " in tt else 2
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
    hits_str = "; ".join(hits[:25])

    return (best_ka, ",".join(top3), round(conf, 4), hits_str)

def read_cache_jsonl(cache_path: Path):
    cache = {}
    if not cache_path.exists():
        return cache
    with cache_path.open("r", encoding="utf-8", errors="ignore") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                obj = json.loads(line)
                key = obj.get("historiek_url") or ""
                if key:
                    cache[key] = obj
            except Exception:
                continue
    return cache

def append_cache_jsonl(cache_path: Path, obj: dict):
    cache_path.parent.mkdir(parents=True, exist_ok=True)
    with cache_path.open("a", encoding="utf-8", newline="") as f:
        f.write(json.dumps(obj, ensure_ascii=False) + "\n")

def main():
    repo_root = Path(__file__).resolve().parents[1]
    default_in = repo_root / "data" / "historiek_personen_omzet.csv"
    default_out = repo_root / "data" / "historiek_personen_omzet_wiki.csv"
    default_cache = repo_root / "data" / "historiek_wiki_cache.jsonl"

    ap = argparse.ArgumentParser()
    ap.add_argument("--in", dest="in_path", default=str(default_in))
    ap.add_argument("--out", dest="out_path", default=str(default_out))
    ap.add_argument("--cache", dest="cache_path", default=str(default_cache))
    ap.add_argument("--limit", dest="limit", type=int, default=0, help="0 = no limit")
    ap.add_argument("--offset", dest="offset", type=int, default=0)
    ap.add_argument("--resume", dest="resume", action="store_true", help="start at first cache-miss")
    ap.add_argument("--sleep-every", dest="sleep_every", type=int, default=50)
    ap.add_argument("--sleep-seconds", dest="sleep_seconds", type=float, default=0.5)
    args = ap.parse_args()

    in_csv = Path(args.in_path)
    out_csv = Path(args.out_path)
    cache_path = Path(args.cache_path)

    if not in_csv.exists():
        print(f"Missing: {in_csv}")
        sys.exit(2)

    ka_tref = load_ka_trefwoorden(repo_root)
    cache = read_cache_jsonl(cache_path)

    rows = []
    with in_csv.open("r", encoding="utf-8", newline="") as f:
        for r in csv.DictReader(f):
            if (r.get("type") or "").strip().lower() != "persoon":
                continue
            title = squash_ws(r.get("title", ""))
            url = squash_ws(r.get("url", ""))
            if not title or not url:
                continue
            rows.append({"title": title, "url": url})

    start = max(0, args.offset or 0)

    if args.resume:
        start = 0
        for idx, r in enumerate(rows):
            if r["url"] not in cache:
                start = idx
                break
        else:
            start = len(rows)

    end = len(rows)
    if args.limit and args.limit > 0:
        end = min(end, start + args.limit)

    target = rows[start:end]

    out_rows = []
    fetched = 0
    skipped = 0

    for i, r in enumerate(target, start=1):
        title = r["title"]
        url = r["url"]

        c = cache.get(url)
        if c:
            wiki_title = c.get("wiki_title", "") or ""
            wiki_url = c.get("wiki_url", "") or ""
            extract = c.get("wiki_extract", "") or ""
            skipped += 1
        else:
            wiki_title, wiki_url_guess = wiki_opensearch_nl(title)
            extract = ""
            wiki_url = wiki_url_guess or ""
            if wiki_title:
                extract, wiki_url2 = wiki_summary_nl(wiki_title)
                if wiki_url2:
                    wiki_url = wiki_url2

            c = {
                "historiek_url": url,
                "historiek_title": title,
                "wiki_title": wiki_title or "",
                "wiki_url": wiki_url or "",
                "wiki_extract": extract or "",
            }
            append_cache_jsonl(cache_path, c)
            cache[url] = c
            fetched += 1

        enriched_text = squash_ws(" ".join([title, extract]))
        ka_best, ka_top3, conf, hits = guess_ka_from_text(enriched_text, ka_tref)

        out_rows.append({
            "type": "persoon",
            "title": title,
            "url": url,
            "wiki_title": wiki_title,
            "wiki_url": wiki_url,
            "wiki_extract": extract,
            "ka_best": ka_best,
            "ka_top3": ka_top3,
            "confidence": str(conf),
            "matched_terms_bestka": hits,
        })

        if args.sleep_every and (i % args.sleep_every == 0):
            time.sleep(args.sleep_seconds)

    cols = [
        "type","title","url","wiki_title","wiki_url","wiki_extract",
        "ka_best","ka_top3","confidence","matched_terms_bestka"
    ]

    out_csv.parent.mkdir(parents=True, exist_ok=True)
    with out_csv.open("w", encoding="utf-8", newline="") as f:
        w = csv.DictWriter(f, fieldnames=cols)
        w.writeheader()
        for r in out_rows:
            w.writerow(r)

    print(str(out_csv))
    print("range", f"{start}:{end}", "rows", len(out_rows), "fetched", fetched, "skipped(cache)", skipped)
    print("cache", str(cache_path))

if __name__ == "__main__":
    main()

