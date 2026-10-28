# helvetiapixel.ch

Static one-page website for Helvetia Pixel (web design, hosting, migrations, automations, AI), in EN / DE / FR / IT. Hosted on GitHub Pages. No build step, no dependencies.

## Structure

```
index.html            page markup (English default text)
impressum.html        legal notice
privacy.html          privacy policy (nDSG / GDPR)
assets/css/styles.css styles
assets/js/i18n.js     homepage translations (en, de, fr, it)
assets/js/i18n-legal.js  translations for the legal pages and footer links
assets/js/main.js     language switching, mobile menu, contact form
assets/img/favicon.svg
CNAME                 custom domain for GitHub Pages
```

## Local preview

```sh
python3 -m http.server 8000   # then open http://localhost:8000
```

## Languages

- Language is picked from `?lang=xx`, then the visitor's saved choice, then the browser language, falling back to English.
- To edit text, change `assets/js/i18n.js`. Every key must exist in all four languages.
- German uses Swiss spelling (ss instead of ß).

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
