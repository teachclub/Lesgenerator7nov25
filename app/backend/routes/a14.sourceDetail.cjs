"use strict";

const express = require("express");
const cheerio = require("cheerio");

const router = express.Router();

function norm(s) {
  return String(s || "")
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isKleioUrl(u) {
  try {
    const url = new URL(String(u));
    return (
      (url.protocol === "https:" || url.protocol === "http:") &&
      (url.hostname === "www.vgnkleio.nl" || url.hostname.endsWith(".vgnkleio.nl")) &&
      url.pathname.startsWith("/bronnen/")
    );
  } catch {
    return false;
  }
}

function textWithBreaks($, $el) {
  let out = "";
  $el.contents().each((_, node) => {
    if (!node) return;
    if (node.type === "text") out += node.data || "";
    else if (node.name === "br") out += "\n";
    else out += $(node).text();
  });
  return out;
}

function extractKleioMarkdown(html, sourceUrl) {
  const $ = cheerio.load(html);

  $("script, style, noscript, iframe, svg").remove();
  $(
    "header, nav, footer, aside, form, .cmplz, #cmplz-document, [id*='cmplz'], .cookie, .cookie-banner, .cookie-notice"
  ).remove();

  const title = norm($("h1").first().text());

  let root =
    $(".elementor-widget-theme-post-content").first() ||
    $(".entry-content").first() ||
    $("article").first() ||
    $("main").first();

  if (!root || !root.length) root = $("body").first();

  const blocks = [];
  const seen = new Set();

  function push(line) {
    const t = String(line || "").trim();
    if (!t) return;
    if (seen.has(t)) return;
    seen.add(t);
    blocks.push(t);
  }

  function shouldDropLine(t) {
    const x = norm(t);
    if (!x) return true;

    const dropExact = new Set([
      "Advertentie",
      "Menu",
      "Main Menu",
      "Ga naar de inhoud",
      "Terug naar overzicht",
      "Beheer toestemming",
      "Accepteren",
      "Weigeren",
      "Bekijk voorkeuren",
      "Voorkeuren opslaan",
    ]);
    if (dropExact.has(x)) return true;

    if (/^Gepubliceerd op\b/i.test(x)) return true;
    if (/^Deze bron is ingediend door\b/i.test(x)) return true;
    if (/^Bron:\s*/i.test(x)) return true;
    if (/^Wij gebruiken functionele en analytische cookies\b/i.test(x)) return true;

    return false;
  }

  const elems = root.find("h1,h2,h3,h4,p,li,blockquote").toArray();

  if (title) push(`# ${title}`);

  for (const el of elems) {
    const $el = $(el);
    const tag = (el.name || "").toLowerCase();

    if (tag === "h1" || tag === "h2" || tag === "h3" || tag === "h4") {
      const text = norm($el.text());
      if (!text || text === title || shouldDropLine(text)) continue;
      if (tag === "h2") push(`## ${text}`);
      if (tag === "h3") push(`### ${text}`);
      if (tag === "h4") push(`#### ${text}`);
      continue;
    }

    if (tag === "li") {
      const t = norm($el.text());
      if (!t || shouldDropLine(t)) continue;
      push(`- ${t}`);
      continue;
    }

    if (tag === "blockquote") {
      const t = norm($el.text());
      if (!t || shouldDropLine(t)) continue;
      push(`> ${t}`);
      continue;
    }

    if (tag === "p") {
      const strongFirst = $el.children("strong,b").first();
      if (strongFirst && strongFirst.length) {
        const label = norm(strongFirst.text());
        const isFragmentLabel = /^fragment\s+[a-z0-9]+$/i.test(label);

        const $clone = $el.clone();
        $clone.children("strong,b").first().remove();
        const restRaw = textWithBreaks($, $clone)
          .replace(/\u00a0/g, " ")
          .replace(/[ \t]+\n/g, "\n")
          .replace(/\n[ \t]+/g, "\n")
          .trim();

        if (label && label !== title && !shouldDropLine(label)) {
          if (isFragmentLabel) push(`### ${label}`);
          else if (label.length <= 60) push(`## ${label}`);
          else push(label);
        }

        if (restRaw) {
          const parts = restRaw
            .split("\n")
            .map((x) => norm(x))
            .filter((x) => x && !shouldDropLine(x));
          for (const p of parts) push(p);
        }
        continue;
      }

      const raw = textWithBreaks($, $el)
        .replace(/\u00a0/g, " ")
        .replace(/[ \t]+\n/g, "\n")
        .replace(/\n[ \t]+/g, "\n")
        .trim();

      if (!raw) continue;

      const lines = raw.split("\n").map((x) => norm(x)).filter(Boolean);

      for (const line of lines) {
        if (!line) continue;
        if (line === title) continue;
        if (shouldDropLine(line)) continue;

        if (/^Fragment\s+\d+\b/i.test(line)) {
          push(`### ${line}`);
        } else {
          push(line);
        }
      }
      continue;
    }

    const t = norm($el.text());
    if (!t || t === title || shouldDropLine(t)) continue;
    push(t);
  }

  const md = blocks.join("\n\n").trim();
  const withSource = md ? `${md}\n\nBron: ${sourceUrl}` : `Bron: ${sourceUrl}`;

  return { title: title || null, markdown: withSource };
}

router.post("/source-detail", async (req, res) => {
  try {
    const url = req.body && req.body.url ? String(req.body.url).trim() : "";

    if (!url) return res.status(400).json({ ok: false, error: "url ontbreekt" });
    if (!isKleioUrl(url)) {
      return res.status(400).json({ ok: false, error: "Alleen vgnkleio.nl/bronnen URLs toegestaan" });
    }

    const resp = await fetch(url, {
      method: "GET",
      redirect: "follow",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36",
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "nl,en;q=0.8",
      },
    });

    if (!resp.ok) {
      return res.status(502).json({ ok: false, error: `Kleio fetch fout: ${resp.status}` });
    }

    const html = await resp.text();
    const { title, markdown } = extractKleioMarkdown(html, url);

    return res.json({
      ok: true,
      title,
      fullText: markdown,
      url,
    });
  } catch (e) {
    console.error("[a14.sourceDetail] crash", e);
    return res.status(500).json({ ok: false, error: "source-detail crash" });
  }
});

module.exports = router;

