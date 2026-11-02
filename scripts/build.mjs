#!/usr/bin/env node
/*
  Static multilingual build for helvetiapixel.ch. No dependencies.

  Reads the page templates in src/ and the dictionaries in assets/js/i18n.js and
  assets/js/i18n-legal.js, and writes fully translated static HTML:

    /index.html, /impressum.html, /privacy.html          German (default, x-default)
    /en/…, /fr/…, /it/…                                   English, French, Italian
    /de/index.html                                        redirect stub to /
    /sitemap.xml                                          with hreflang alternates

  Usage:
    node scripts/build.mjs           write the files
    node scripts/build.mjs --check   exit 1 if any generated file is out of date

  Template conventions (src/*.html):
    data-i18n="key"           element text is replaced ("\n" in a value becomes <br>)
    data-i18n-content="key"   the content="" attribute is replaced (meta tags)
    <body data-title-key=…>   key used for <title> (default: meta.title)
    <!-- i18n:alternates -->  canonical, hreflang, og:url, og:locale
    <!-- i18n:switch -->      language switcher links
    <!-- i18n:routing --> … <!-- /i18n:routing -->
                              kept on default-language pages only
*/
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SITE = "https://helvetiapixel.ch";
const PAGES = ["index.html", "impressum.html", "privacy.html"];
const LANGS = ["de", "en", "fr", "it"];
const DEFAULT_LANG = "de";
const HTML_LANG = { en: "en", de: "de-CH", fr: "fr-CH", it: "it-CH" };
const OG_LOCALE = { en: "en_GB", de: "de_CH", fr: "fr_CH", it: "it_CH" };
const LABEL = { en: "English", de: "Deutsch", fr: "Français", it: "Italiano" };

/* ---------- Dictionaries ---------- */
function loadDict() {
  const ctx = { window: {} };
  vm.createContext(ctx);
  for (const f of ["assets/js/i18n.js", "assets/js/i18n-legal.js"]) {
    vm.runInContext(fs.readFileSync(path.join(ROOT, f), "utf8"), ctx, { filename: f });
  }
  const dict = ctx.window.I18N;
  const missing = [];
  for (const key of Object.keys(dict.en)) {
    for (const lang of LANGS) if (!dict[lang] || !dict[lang][key]) missing.push(`${lang}: ${key}`);
  }
  if (missing.length) throw new Error("Missing translations:\n  " + missing.join("\n  "));
  return dict;
}

/* ---------- Helpers ---------- */
const escText = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const escAttr = (s) => escText(s).replace(/"/g, "&quot;");

// Public path of a page in a language, e.g. ("index.html","de") -> "/de/"
function pagePath(page, lang) {
  const prefix = lang === DEFAULT_LANG ? "/" : `/${lang}/`;
  return prefix + (page === "index.html" ? "" : page);
}

function render(template, page, lang, dict) {
  const t = (key) => {
    const v = dict[lang][key];
    if (!v) throw new Error(`${page}: unknown key "${key}"`);
    return v;
  };
  let html = template;
  const expected = (html.match(/\sdata-i18n="/g) || []).length;
  let replaced = 0;

  // Routing script only belongs on the default-language pages
  html = html.replace(/[ \t]*<!-- i18n:routing -->\n([\s\S]*?)[ \t]*<!-- \/i18n:routing -->\n/,
    (m, block) => (lang === DEFAULT_LANG ? block : ""));

  // Element text
  html = html.replace(
    /<([a-z][a-z0-9]*)\b([^>]*?\sdata-i18n="([^"]+)"[^>]*)>([\s\S]*?)<\/\1>/g,
    (m, tag, attrs, key, inner) => {
      if (/<(?!br\s*\/?>)/i.test(inner)) throw new Error(`${page}: data-i18n="${key}" contains markup other than <br>`);
      replaced++;
      return `<${tag}${attrs}>${t(key).split("\n").map(escText).join("<br>")}</${tag}>`;
    }
  );
  if (replaced !== expected) throw new Error(`${page}: replaced ${replaced} of ${expected} data-i18n elements`);

  // Meta content attributes
  html = html.replace(/<meta data-i18n-content="([^"]+)"([^>]*?)content="[^"]*"/g,
    (m, key, mid) => `<meta data-i18n-content="${key}"${mid}content="${escAttr(t(key))}"`);

  // <html lang>, <title>
  html = html.replace(/<html lang="[^"]*">/, `<html lang="${HTML_LANG[lang]}">`);
  const titleKey = (html.match(/<body data-title-key="([^"]+)"/) || [])[1] || "meta.title";
  html = html.replace(/<title>[\s\S]*?<\/title>/, `<title>${escText(t(titleKey))}</title>`);

  // Canonical, hreflang, Open Graph URL/locale
  const indexable = !/<meta name="robots" content="[^"]*noindex/.test(html);
  const head = [`<link rel="canonical" href="${SITE}${pagePath(page, lang)}">`];
  if (indexable) {
    for (const l of LANGS) head.push(`<link rel="alternate" hreflang="${l}" href="${SITE}${pagePath(page, l)}">`);
    head.push(`<link rel="alternate" hreflang="x-default" href="${SITE}${pagePath(page, DEFAULT_LANG)}">`);
  }
  head.push(`<meta property="og:url" content="${SITE}${pagePath(page, lang)}">`);
  head.push(`<meta property="og:locale" content="${OG_LOCALE[lang]}">`);
  for (const l of LANGS) if (l !== lang) head.push(`<meta property="og:locale:alternate" content="${OG_LOCALE[l]}">`);
  html = html.replace(/^([ \t]*)<!-- i18n:alternates -->/m, (m, indent) => head.map((h) => indent + h).join("\n"));

  // Language switcher: real links to the same page in each language
  const links = LANGS.map((l) => {
    const current = l === lang ? ' class="active" aria-current="true"' : "";
    return `<a href="${pagePath(page, l)}" hreflang="${l}" lang="${HTML_LANG[l]}" title="${LABEL[l]}" data-lang="${l}"${current}>${l.toUpperCase()}</a>`;
  });
  html = html.replace(/<!-- i18n:switch -->/g, links.join(""));

  if (/<!-- i18n:/.test(html)) throw new Error(`${page}: unresolved i18n placeholder`);
  const note = `<!-- Generated by scripts/build.mjs from src/${page} (${lang}). Do not edit: change src/ or assets/js/i18n*.js and run "node scripts/build.mjs". -->`;
  return html.replace(/^<!DOCTYPE html>\n/i, (m) => m + note + "\n");
}

function sitemap() {
  const urls = ["index.html"].flatMap((page) =>
    LANGS.map((lang) => {
      const alts = LANGS.map((l) => `    <xhtml:link rel="alternate" hreflang="${l}" href="${SITE}${pagePath(page, l)}"/>`)
        .concat(`    <xhtml:link rel="alternate" hreflang="x-default" href="${SITE}${pagePath(page, DEFAULT_LANG)}"/>`);
      return `  <url>\n    <loc>${SITE}${pagePath(page, lang)}</loc>\n${alts.join("\n")}\n  </url>`;
    })
  );
  return `<?xml version="1.0" encoding="UTF-8"?>
<!-- Generated by scripts/build.mjs. -->
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls.join("\n")}
</urlset>
`;
}

// /de/ would duplicate the root, so it only forwards there (and remembers the choice)
const DEFAULT_STUB = `<!DOCTYPE html>
<!-- Generated by scripts/build.mjs. The default language (${DEFAULT_LANG}) lives at the site root. -->
<html lang="${HTML_LANG[DEFAULT_LANG]}">
<head>
  <meta charset="utf-8">
  <title>Helvetia Pixel</title>
  <meta name="robots" content="noindex, follow">
  <link rel="canonical" href="${SITE}/">
  <meta http-equiv="refresh" content="0; url=/">
  <script>try { localStorage.setItem('hp-lang', '${DEFAULT_LANG}'); } catch (e) {} location.replace('/' + location.hash);</script>
</head>
<body><p><a href="/">helvetiapixel.ch</a></p></body>
</html>
`;

/* ---------- Main ---------- */
const check = process.argv.includes("--check");
const dict = loadDict();
const outputs = new Map();
for (const page of PAGES) {
  const template = fs.readFileSync(path.join(ROOT, "src", page), "utf8");
  for (const lang of LANGS) {
    const dir = lang === DEFAULT_LANG ? "" : lang;
    outputs.set(path.join(dir, page), render(template, page, lang, dict));
  }
}
outputs.set("sitemap.xml", sitemap());
outputs.set(path.join(DEFAULT_LANG, "index.html"), DEFAULT_STUB);

let stale = 0;
for (const [rel, content] of outputs) {
  const file = path.join(ROOT, rel);
  const current = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : null;
  if (current === content) continue;
  if (check) {
    console.error(`out of date: ${rel}`);
    stale++;
  } else {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, content);
    console.log(`wrote ${rel}`);
  }
}
if (check && stale) {
  console.error(`\n${stale} file(s) out of date. Run: node scripts/build.mjs`);
  process.exit(1);
}
if (check) console.log("All generated files are up to date.");
