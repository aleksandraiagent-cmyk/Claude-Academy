/*
 * Standalone runtime for Academy Skills.
 *
 * The app was built as a claude.ai artifact and talks to `window.claude.use(...)`.
 * Outside claude.ai this file provides the same interface:
 *   - "sample"    → Anthropic Messages API, called from the browser with the visitor's own key
 *   - "downloads" → ordinary browser file download
 *   - everything else (artifact, db, user, room, mcp, dictation, tts) → null, so the app
 *     falls back to localStorage and the browser's own speech recognition / synthesis.
 */
(function () {
  "use strict";
  if (window.claude && typeof window.claude.use === "function") return; // running inside claude.ai

  var KEY = "ca-api-key", MODEL = "ca-api-model", QUICK = "ca-api-quick";
  var DEFAULT_MODEL = "claude-sonnet-5-5", DEFAULT_QUICK = "claude-haiku-5-5";

  function get(k, d) { try { return localStorage.getItem(k) || d; } catch (e) { return d; } }
  function set(k, v) { try { v ? localStorage.setItem(k, v) : localStorage.removeItem(k); } catch (e) {} }

  async function sample(input, opts) {
    opts = opts || {};
    var key = get(KEY, "");
    if (!key) { openSettings(); throw { code: "unavailable" }; }
    var model = opts.modelTier === "quick" ? get(QUICK, DEFAULT_QUICK) : get(MODEL, DEFAULT_MODEL);
    var messages = typeof input === "string" ? [{ role: "user", content: input }]
      : Array.isArray(input) ? input : (input && input.messages) || [{ role: "user", content: String(input) }];
    var body = { model: model, max_tokens: 32000, stream: true, messages: messages };
    if (input && typeof input === "object" && !Array.isArray(input) && input.system) body.system = input.system;

    var res;
    try {
      res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        signal: opts.signal,
        headers: {
          "content-type": "application/json",
          "x-api-key": key,
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true"
        },
        body: JSON.stringify(body)
      });
    } catch (e) {
      if (e && e.name === "AbortError") throw e;
      throw { code: "network", message: "нет связи с api.anthropic.com" };
    }

    if (!res.ok) {
      var detail = "";
      try { var j = await res.json(); detail = j && j.error && j.error.message; } catch (e) {}
      if (res.status === 401 || res.status === 403) { openSettings(); throw { code: "bad_key", message: detail || "ключ API не принят" }; }
      if (res.status === 429) throw { code: "rate_limited", message: detail };
      throw { code: "http_" + res.status, message: detail || res.statusText };
    }

    var reader = res.body.getReader(), dec = new TextDecoder(), buf = "", text = "";
    for (;;) {
      var r = await reader.read();
      if (r.done) break;
      buf += dec.decode(r.value, { stream: true });
      var lines = buf.split("\n"); buf = lines.pop();
      for (var i = 0; i < lines.length; i++) {
        var line = lines[i];
        if (line.indexOf("data:") !== 0) continue;
        var ev; try { ev = JSON.parse(line.slice(5)); } catch (e) { continue; }
        if (ev.type === "content_block_delta" && ev.delta && ev.delta.type === "text_delta") {
          text += ev.delta.text;
          if (opts.onText) { try { opts.onText({ text: text }); } catch (e) {} }
        } else if (ev.type === "error") {
          throw { code: ev.error && ev.error.type === "overloaded_error" ? "overloaded" : "stream", message: ev.error && ev.error.message };
        }
      }
    }
    return { text: text };
  }

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
    hasKey: function () { return !!get(KEY, ""); },
    settings: function () { openSettings(); },
    use: function (name) {
      if (name === "sample") return Promise.resolve(sample);
      if (name === "downloads") return Promise.resolve(downloads);
      return Promise.resolve(null);
    }
  };

  /* ---------- API key dialog ---------- */
  var dlg;
  function build() {
    var css = document.createElement("style");
    css.textContent =
      "#api-dlg{border:1px solid var(--line-strong,#ccc);border-radius:14px;background:var(--surface,#fff);color:var(--ink,#111);padding:20px;width:min(460px,calc(100vw - 32px));font:15px/1.55 var(--body,system-ui)}" +
      "#api-dlg::backdrop{background:rgba(10,10,10,.5)}" +
      "#api-dlg h2{font:600 18px var(--display,system-ui);margin:0 0 6px}" +
      "#api-dlg p{margin:0 0 10px;font-size:13.5px;color:var(--muted,#666)}" +
      "#api-dlg label{display:block;margin:12px 0 0}" +
      "#api-dlg input{width:100%;background:var(--surface,#fff);border:1px solid var(--line-strong,#ccc);border-radius:8px;padding:10px 12px;font:inherit;color:inherit}" +
      "#api-dlg .acts{display:flex;gap:8px;justify-content:flex-end;margin-top:16px;flex-wrap:wrap}" +
      "#api-dlg .st{font-size:13px;margin-top:8px}";
    document.head.appendChild(css);
    dlg = document.createElement("dialog");
    dlg.id = "api-dlg";
    dlg.innerHTML =
      '<form method="dialog">' +
      '<h2>Ключ Claude API</h2>' +
      '<p>Создание навыков, тесты и ответы помощника работают через Claude. Ключ хранится только в этом браузере и отправляется напрямую на api.anthropic.com. Получить ключ: <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noopener">console.anthropic.com</a>.</p>' +
      '<label class="lbl" for="api-key">API-ключ</label><input type="password" id="api-key" autocomplete="off" placeholder="sk-ant-…">' +
      '<label class="lbl" for="api-model">Основная модель</label><input type="text" id="api-model">' +
      '<label class="lbl" for="api-quick">Быстрая модель</label><input type="text" id="api-quick">' +
      '<div class="st note" id="api-st"></div>' +
      '<div class="acts"><button type="button" class="btn danger" id="api-clear">Удалить ключ</button>' +
      '<button value="cancel" class="btn">Отмена</button><button value="ok" class="btn primary">Сохранить</button></div>' +
      '</form>';
    document.body.appendChild(dlg);
    dlg.querySelector("#api-clear").onclick = function () { set(KEY, ""); dlg.querySelector("#api-key").value = ""; status(); };
    dlg.addEventListener("close", function () {
      if (dlg.returnValue !== "ok") return;
      set(KEY, dlg.querySelector("#api-key").value.trim());
      set(MODEL, dlg.querySelector("#api-model").value.trim() || DEFAULT_MODEL);
      set(QUICK, dlg.querySelector("#api-quick").value.trim() || DEFAULT_QUICK);
    });
  }
  function status() {
    var s = dlg.querySelector("#api-st");
    s.textContent = get(KEY, "") ? "Ключ сохранён в этом браузере." : "Ключ не задан: создание навыков и тесты недоступны.";
  }
  function openSettings() {
    if (!dlg) build();
    dlg.querySelector("#api-key").value = get(KEY, "");
    dlg.querySelector("#api-model").value = get(MODEL, DEFAULT_MODEL);
    dlg.querySelector("#api-quick").value = get(QUICK, DEFAULT_QUICK);
    status();
    if (!dlg.open) { dlg.returnValue = ""; dlg.showModal(); }
  }

  /* ---------- installable app (PWA) ---------- */
  if ("serviceWorker" in navigator && location.protocol !== "file:") {
    window.addEventListener("load", function () { navigator.serviceWorker.register("sw.js").catch(function () {}); });
  }
})();
