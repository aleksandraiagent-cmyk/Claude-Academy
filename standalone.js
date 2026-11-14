/*
 * Standalone runtime for Academy Skills.
 *
 * The public site is a showcase: library, Premium, memory, catalog and downloads work here.
 * Everything that needs Claude (creating skills, tests, assistant answers) runs in the
 * claude.ai artifact, under the visitor's own Claude account and plan limits.
 *
 * Outside claude.ai this file provides `window.claude.use(...)`:
 *   - "downloads" → ordinary browser file download
 *   - everything else → null, so the app falls back to localStorage and browser speech
 */
(function () {
  "use strict";
  if (window.claude && typeof window.claude.use === "function") return; // running inside claude.ai

  var APP_URL = "https://claude.ai/artifact/RQfvUomLRL18QCDzgyMmZa";

  var downloads = {
    save: async function (o) {
      var blob = o.data instanceof Blob ? o.data : new Blob([o.data], { type: "text/plain;charset=utf-8" });
      var url = URL.createObjectURL(blob), a = document.createElement("a");
      a.href = url; a.download = o.filename || "download";
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
    }
  };

  window.claude = {
    standalone: true,
    appUrl: APP_URL,
    openClaude: function (text) { openDialog(text); },
    use: function (name) {
      if (name === "downloads") return Promise.resolve(downloads);
      return Promise.resolve(null);
    }
  };

  /* ---------- "continue in Claude" dialog ---------- */
  var dlg;
  function build() {
    var css = document.createElement("style");
    css.textContent =
      "#cl-dlg{border:1px solid var(--line-strong,#ccc);border-radius:14px;background:var(--surface,#fff);color:var(--ink,#111);padding:22px;width:min(460px,calc(100vw - 32px));font:15px/1.55 var(--body,system-ui)}" +
      "#cl-dlg::backdrop{background:rgba(10,10,10,.5)}" +
      "#cl-dlg h2{font:600 18px var(--display,system-ui);margin:0 0 8px}" +
      "#cl-dlg p{margin:0 0 10px;font-size:14px;color:var(--muted,#666)}" +
      "#cl-dlg ol{margin:0 0 12px;padding-left:20px;font-size:14px;display:grid;gap:4px}" +
      "#cl-dlg .cl-copied{font-size:13px;color:var(--good,#15803D);margin:0 0 10px}" +
      "#cl-dlg .acts{display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap;margin-top:6px}" +
      "#cl-dlg a.btn{text-decoration:none;display:inline-block}" +
      ".cl-cta{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;border:1px solid var(--line,#e5e5e5);border-left:3px solid var(--accent,#2F5BEA);border-radius:var(--r-sm,8px);background:var(--surface,#fff);padding:10px 14px;font-size:14px}" +
      ".cl-cta a{text-decoration:none;white-space:nowrap}";
    document.head.appendChild(css);
    dlg = document.createElement("dialog");
    dlg.id = "cl-dlg";
    dlg.innerHTML =
      '<h2>Создание навыков — в Claude</h2>' +
      '<p>Навыки создаются и тестируются в Academy Skills на claude.ai, под вашим аккаунтом Claude. Расходуются лимиты вашей подписки, ключ API и оплата не нужны.</p>' +
      '<ol><li>Нажмите «Открыть в Claude» и войдите в свой аккаунт (подойдёт и бесплатный).</li>' +
      '<li>Вставьте тему в поле «Какой навык изучаем?» и нажмите «Создать навык».</li></ol>' +
      '<p class="cl-copied" id="cl-copied" hidden>Тема скопирована: вставьте её в Claude.</p>' +
      '<div class="acts"><button type="button" class="btn" id="cl-close">Закрыть</button>' +
      '<a class="btn primary" id="cl-open" target="_blank" rel="noopener">Открыть в Claude</a></div>';
    document.body.appendChild(dlg);
    dlg.querySelector("#cl-open").href = APP_URL;
    dlg.querySelector("#cl-close").onclick = function () { dlg.close(); };
    dlg.querySelector("#cl-open").addEventListener("click", function () { setTimeout(function () { dlg.close(); }, 300); });
  }
  function openDialog(text) {
    if (!dlg) build();
    var note = dlg.querySelector("#cl-copied");
    note.hidden = true;
    text = (text || "").trim();
    if (text && navigator.clipboard) {
      navigator.clipboard.writeText(text).then(function () { note.hidden = false; }, function () {});
    }
    if (!dlg.open) dlg.showModal();
  }

  /* Intercept the actions that need Claude before the app starts them. */
  function val(sel) { var e = document.querySelector(sel); return e ? e.value : ""; }
  window.addEventListener("submit", function (ev) {
    if (ev.target && ev.target.id === "intake") {
      ev.preventDefault(); ev.stopImmediatePropagation();
      openDialog(val("#topic"));
    }
  }, true);
  window.addEventListener("click", function (ev) {
    var b = ev.target && ev.target.closest && ev.target.closest("#go,#t-run,#b-run,#a-run");
    if (!b) return;
    ev.preventDefault(); ev.stopImmediatePropagation();
    openDialog(b.id === "go" ? val("#topic") : b.id === "t-run" ? val("#t-task") : "");
  }, true);

  /* Call to action above the create form. */
  document.addEventListener("DOMContentLoaded", function () {
    if (!dlg) build();
    var form = document.getElementById("intake");
    if (!form) return;
    var cta = document.createElement("div");
    cta.className = "cl-cta";
    cta.innerHTML = '<span>Навыки создаются в Claude под вашим аккаунтом — без ключей и оплаты.</span>' +
      '<a class="btn primary" target="_blank" rel="noopener">Открыть в Claude</a>';
    cta.querySelector("a").href = APP_URL;
    form.parentNode.insertBefore(cta, form);
  });

  /* ---------- installable app (PWA) ---------- */
  if ("serviceWorker" in navigator && location.protocol !== "file:") {
    window.addEventListener("load", function () { navigator.serviceWorker.register("sw.js").catch(function () {}); });
  }
})();
