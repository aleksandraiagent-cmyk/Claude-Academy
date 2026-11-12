/*
 * Standalone runtime for Cloud Academy.
 *
 * The app was built as a claude.ai artifact and talks to `window.claude.use(...)`.
 * Outside claude.ai this file provides the same interface:
 *   - "sample"    → Anthropic Messages API, called from the browser with the visitor's own key
 *   - "downloads" → ordinary browser file download
 *   - "artifact"  → not available, so the app keeps its data in localStorage
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

    var res;
    try {
      res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": key,
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true"
        },
        body: JSON.stringify({ model: model, max_tokens: 32000, stream: true, messages: messages })
      });
    } catch (e) { throw { code: "network", message: "нет связи с api.anthropic.com" }; }

    if (!res.ok) {
      var detail = "";
      try { var j = await res.json(); detail = j && j.error && j.error.message; } catch (e) {}
      if (res.status === 401 || res.status === 403) { openSettings(); throw { code: "not_granted", message: detail }; }
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
    use: function (name) {
      if (name === "sample") return Promise.resolve(sample);
      if (name === "downloads") return Promise.resolve(downloads);
      return Promise.reject({ code: "unsupported" });
    }
  };

  /* ---------- settings dialog ---------- */
  var dlg;
  function build() {
    var css = document.createElement("style");
    css.textContent =
      "#api-dlg{border:1px solid var(--line);border-radius:14px;background:var(--surface);color:var(--ink);padding:16px;width:min(440px,calc(100vw - 32px));font:14px/1.5 var(--body)}" +
      "#api-dlg::backdrop{background:rgba(10,14,25,.5)}" +
      "#api-dlg h2{font:700 17px var(--display);margin:0 0 6px}" +
      "#api-dlg p{margin:0 0 10px;font-size:13px;color:var(--muted)}" +
      "#api-dlg label{display:block;margin:10px 0 0}" +
      "#api-dlg .acts{display:flex;gap:8px;justify-content:flex-end;margin-top:14px;flex-wrap:wrap}" +
      "#api-btn[data-on='1']{border-color:var(--good);color:var(--good)}";
    document.head.appendChild(css);
    dlg = document.createElement("dialog");
    dlg.id = "api-dlg";
    dlg.innerHTML =
      '<form method="dialog">' +
      '<h2>Ключ Anthropic API</h2>' +
      '<p>Создание навыков и тесты работают через Claude. Ключ хранится только в этом браузере (localStorage) и отправляется напрямую на api.anthropic.com. Получить ключ: console.anthropic.com.</p>' +
      '<label class="lbl" for="api-key">API-ключ</label><input type="password" id="api-key" autocomplete="off" placeholder="sk-ant-…" style="width:100%">' +
      '<label class="lbl" for="api-model">Основная модель</label><input type="text" id="api-model" style="width:100%">' +
      '<label class="lbl" for="api-quick">Быстрая модель</label><input type="text" id="api-quick" style="width:100%">' +
      '<div class="acts"><button type="button" class="btn danger" id="api-clear">Удалить ключ</button>' +
      '<button value="cancel" class="btn">Отмена</button><button value="ok" class="btn primary" id="api-save">Сохранить</button></div>' +
      '</form>';
    document.body.appendChild(dlg);
    dlg.querySelector("#api-clear").onclick = function () { set(KEY, ""); dlg.querySelector("#api-key").value = ""; mark(); };
    dlg.addEventListener("close", function () {
      if (dlg.returnValue !== "ok") return;
      set(KEY, dlg.querySelector("#api-key").value.trim());
      set(MODEL, dlg.querySelector("#api-model").value.trim() || DEFAULT_MODEL);
      set(QUICK, dlg.querySelector("#api-quick").value.trim() || DEFAULT_QUICK);
      mark();
    });
  }
  function openSettings() {
    if (!dlg) build();
    dlg.querySelector("#api-key").value = get(KEY, "");
    dlg.querySelector("#api-model").value = get(MODEL, DEFAULT_MODEL);
    dlg.querySelector("#api-quick").value = get(QUICK, DEFAULT_QUICK);
    if (!dlg.open) { dlg.returnValue = ""; dlg.showModal(); }
  }
  function mark() {
    var b = document.getElementById("api-btn");
    if (b) { var on = !!get(KEY, ""); b.dataset.on = on ? "1" : "0"; b.textContent = on ? "Claude API ✓" : "Ключ API"; }
  }
  document.addEventListener("DOMContentLoaded", function () {
    var info = document.getElementById("info-btn");
    if (!info) return;
    var b = document.createElement("button");
    b.type = "button"; b.id = "api-btn"; b.className = "infobtn"; b.style.marginLeft = "0";
    b.onclick = openSettings;
    info.after(b); mark();
  });
})();
