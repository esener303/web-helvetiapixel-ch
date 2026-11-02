# helvetiapixel.ch

Static one-page website for Helvetia Pixel (web design, hosting, migrations, automations, AI), in EN / DE / FR / IT. Hosted on GitHub Pages. No dependencies; one small Node script generates the language versions.

## Structure

```
src/index.html           homepage template (edit here)
src/impressum.html       legal notice template
src/privacy.html         privacy policy template (nDSG / GDPR)
scripts/build.mjs        generates the static pages below from src/ + translations
index.html, impressum.html, privacy.html   German pages (generated, default + x-default)
en/, fr/, it/            English, French, Italian pages (generated)
de/index.html            redirect stub: /de/ -> /
sitemap.xml              generated, with hreflang alternates
robots.txt
assets/css/styles.css    styles
assets/js/i18n.js        homepage translations (en, de, fr, it)
assets/js/i18n-legal.js  translations for the legal pages and footer links
assets/js/main.js        consent banner, mobile menu, contact form
assets/img/
CNAME                    custom domain for GitHub Pages
```

## Local preview

```sh
python3 -m http.server 8000   # then open http://localhost:8000
```

## Languages

Every language is a real static page with its own URL, so search engines see translated content without running JavaScript:

| Language | URL |
|---|---|
| German (default, x-default) | `https://helvetiapixel.ch/` |
| English | `https://helvetiapixel.ch/en/` |
| French | `https://helvetiapixel.ch/fr/` |
| Italian | `https://helvetiapixel.ch/it/` |

Each page has a self-referencing canonical, hreflang links to all versions plus `x-default`, and translated `<title>`, description and Open Graph tags.

**Editing text:** change `assets/js/i18n.js` (or `i18n-legal.js`), or the markup in `src/`, then run:

```sh
node scripts/build.mjs           # regenerate all pages and sitemap.xml
node scripts/build.mjs --check   # verify generated files are current (also runs in CI)
```

Never edit the generated HTML directly. The build fails if a key is missing in any language. German uses Swiss spelling (ss instead of ß).

The default language is `DEFAULT_LANG` in `scripts/build.mjs`. The text in `src/` is only a placeholder; every page's text comes from the dictionaries.

**Template conventions:** `data-i18n="key"` replaces an element's text (`\n` becomes `<br>`), `data-i18n-content="key"` replaces a meta tag's `content`, and `<body data-title-key>` picks the `<title>` key. `<!-- i18n:alternates -->` and `<!-- i18n:switch -->` are where the SEO head tags and the language switcher go.

**Routing:** the language switcher uses plain links. On the German (root) pages only, a small script in `<head>` sends visitors to another language based on (1) a legacy `?lang=xx` URL, (2) a language they previously picked in the switcher, or (3) a French or Italian browser language. English is never chosen automatically, because Google renders pages with an English browser locale and must see `/` as served. GitHub Pages can't send server-side 301s, so old `?lang=` links use this JavaScript redirect instead.

## Contact form

GitHub Pages can't process forms, so submissions go through [Formspree](https://formspree.io) (endpoint `FORM_ENDPOINT` in `assets/js/main.js`), which delivers them to info@helvetiapixel.ch. Success and error messages are translated, and a honeypot field (`_gotcha`) filters basic spam. If `FORM_ENDPOINT` is emptied, the form falls back to opening the visitor's e-mail app.

## Deploy to GitHub Pages

1. Push to `main` on GitHub.
2. Repo → Settings → Pages → Source: *Deploy from a branch* → `main` / `root`.
3. Custom domain: `helvetiapixel.ch` (already in `CNAME`). Tick **Enforce HTTPS** once the certificate is issued.
4. DNS at your registrar:
   - `A` records for `@`: `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`
   - `CNAME` for `www` → `<your-github-username>.github.io`
   - Keep your existing `MX` records so info@helvetiapixel.ch keeps working.

## Before going live

- If Helvetia Pixel gets entered in the commercial register, add the UID (CHE-xxx.xxx.xxx) to the address block in `impressum.html`.
- If you add analytics or any other external service, update the privacy policy (`assets/js/i18n-legal.js`).
- Have the legal texts checked by a professional if in doubt. They are a sensible starting template, not legal advice.
- Replace the example projects in "Selected Work" with real case studies when you have them.
