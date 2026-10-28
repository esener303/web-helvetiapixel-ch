(function () {
  "use strict";

  /* ---------- Config ----------
     GitHub Pages cannot process forms itself. Create a free form at
     https://formspree.io (or similar) and paste the endpoint below,
     e.g. "https://formspree.io/f/abcdwxyz".
     While empty, the form falls back to opening the visitor's e-mail app. */
  var FORM_ENDPOINT = "";
  var CONTACT_EMAIL = "info@helvetiapixel.ch";

  var LANGS = ["en", "de", "fr", "it"];
  var HTML_LANG = { en: "en", de: "de-CH", fr: "fr-CH", it: "it-CH" };
  var FORM_LANG = { en: "English", de: "Deutsch", fr: "Français", it: "Italiano" };
  var dict = window.I18N;
  var current = "en";

  function t(key) {
    return (dict[current] && dict[current][key]) || dict.en[key] || "";
  }

  function setText(el, value) {
    if (value.indexOf("\n") === -1) {
      el.textContent = value;
      return;
    }
    el.textContent = "";
    value.split("\n").forEach(function (part, i) {
      if (i) el.appendChild(document.createElement("br"));
      el.appendChild(document.createTextNode(part));
    });
  }

  function detectLang() {
    var fromUrl = new URLSearchParams(location.search).get("lang");
    if (fromUrl && LANGS.indexOf(fromUrl) !== -1) return fromUrl;
    try {
      var saved = localStorage.getItem("hp-lang");
      if (saved && LANGS.indexOf(saved) !== -1) return saved;
    } catch (e) {}
    var langs = navigator.languages || [navigator.language || "en"];
    for (var i = 0; i < langs.length; i++) {
      var code = String(langs[i]).slice(0, 2).toLowerCase();
      if (LANGS.indexOf(code) !== -1) return code;
    }
    return "en";
  }

  function applyLang(lang) {
    current = lang;
    document.documentElement.lang = HTML_LANG[lang];
    document.title = t(document.body.getAttribute("data-title-key") || "meta.title");
    var desc = document.querySelector('meta[name="description"]');
    if (desc) desc.setAttribute("content", t("meta.description"));

    document.querySelectorAll("[data-i18n]").forEach(function (el) {
      var value = t(el.getAttribute("data-i18n"));
      if (value) setText(el, value);
    });

    document.querySelectorAll("[data-lang]").forEach(function (btn) {
      var active = btn.getAttribute("data-lang") === lang;
      btn.classList.toggle("active", active);
      btn.setAttribute("aria-pressed", active ? "true" : "false");
    });

    var langSelect = document.getElementById("f-lang");
    if (langSelect && !langSelect.dataset.touched) langSelect.value = FORM_LANG[lang];

    try { localStorage.setItem("hp-lang", lang); } catch (e) {}
    var url = new URL(location.href);
    url.searchParams.set("lang", lang);
    history.replaceState(null, "", url);
  }

  document.querySelectorAll("[data-lang]").forEach(function (btn) {
    btn.addEventListener("click", function () { applyLang(btn.getAttribute("data-lang")); });
  });

  applyLang(detectLang());

  /* ---------- Mobile nav ---------- */
  var toggle = document.querySelector(".nav-toggle");
  var nav = document.getElementById("main-nav");
  if (toggle && nav) {
    toggle.addEventListener("click", function () {
      var open = nav.classList.toggle("open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
    nav.addEventListener("click", function (e) {
      if (e.target.tagName === "A") {
        nav.classList.remove("open");
        toggle.setAttribute("aria-expanded", "false");
      }
    });
  }

  /* ---------- Footer year ---------- */
  document.getElementById("year").textContent = new Date().getFullYear();

  /* ---------- Contact form ---------- */
  var form = document.getElementById("contact-form");
  if (!form) return;
  var status = document.getElementById("form-status");
  var submitBtn = form.querySelector('button[type="submit"]');
  var submitLabel = submitBtn.querySelector("[data-i18n]");

  document.getElementById("f-lang").addEventListener("change", function () {
    this.dataset.touched = "1";
  });

  function showStatus(key, type) {
    status.textContent = t(key);
    status.className = "form-status field-full " + (type || "");
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var data = new FormData(form);
    if (data.get("_gotcha")) return; // bot

    var name = String(data.get("name") || "").trim();
    var email = String(data.get("email") || "").trim();
    var message = String(data.get("message") || "").trim();
    if (!name || !message || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      showStatus("form.invalid", "error");
      return;
    }

    data.append("_subject", "Website inquiry: " + data.get("service") + " — " + name);
    data.append("site_language", current);

    if (!FORM_ENDPOINT) {
      var body = [
        "Name: " + name,
        "Email: " + email,
        "Company: " + (data.get("company") || "-"),
        "Service: " + data.get("service"),
        "Language: " + data.get("language"),
        "",
        message
      ].join("\n");
      location.href = "mailto:" + CONTACT_EMAIL +
        "?subject=" + encodeURIComponent(data.get("_subject")) +
        "&body=" + encodeURIComponent(body);
      showStatus("form.mailto", "success");
      return;
    }

    submitBtn.disabled = true;
    submitLabel.textContent = t("form.sending");
    fetch(FORM_ENDPOINT, { method: "POST", body: data, headers: { Accept: "application/json" } })
      .then(function (res) {
        if (!res.ok) throw new Error(res.status);
        form.reset();
        showStatus("form.success", "success");
      })
      .catch(function () { showStatus("form.error", "error"); })
      .then(function () {
        submitBtn.disabled = false;
        submitLabel.textContent = t("form.send");
      });
  });
})();
