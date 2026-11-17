/* ===================== 🔥 Огоньки, офис, сервисный режим, счётчик, карусель идей ===================== */
/* Огоньки — валюта доступа: владелец начисляет их в кабинете, они сгорают по дням (perDay в день),
   пока действует полный доступ. Баланс хранится в subs/<id> (пишет только владелец), поэтому
   его нельзя подделать очисткой браузера. Продажи — admin/ledger, общий счётчик — config/stats. */
CONFIG.fire = Object.assign({ enabled: false, perDay: 1, pPerDay: 1, unit: 0.1, punit: 0.3, welcome: 10, currency: "USD", note: "",
  packs: [{ fire: 10, price: 1, link: "" }, { fire: 30, price: 3, link: "" }, { fire: 100, price: 8, link: "" }],
  ppacks: [{ fire: 10, price: 3, link: "" }, { fire: 30, price: 8, link: "" }, { fire: 100, price: 20, link: "" }] }, CONFIG.fire || {});
CONFIG.maint = Object.assign({ on: false, msg: "" }, CONFIG.maint || {});
const FIRE = { free: 0, ledger: [], ledgerReady: false, live: 0, total: null, gifted: new Set(), wired: false, dlg: null };
const fireOn = () => !!(CONFIG.fire && CONFIG.fire.enabled);
const perDay = () => Math.max(1, Math.round(+CONFIG.fire.perDay || 1));
const pPerDay = () => Math.max(1, Math.round(+CONFIG.fire.pPerDay || 1));
const KIND = { std: { ic: "🔥", name: "Обычные огоньки", short: "обычных" }, prem: { ic: "⭐🔥", name: "Премиум-огоньки", short: "премиум" } };
const kindPacks = k => arr(k === "prem" ? CONFIG.fire.ppacks : CONFIG.fire.packs);
const kindPerDay = k => k === "prem" ? pPerDay() : perDay();
const isVisitorView = () => !ACCESS.owner || ACCESS.preview;
function fireWord(n){ n = Math.abs(n) % 100; const d = n % 10; if (n > 10 && n < 20) return "огоньков"; if (d === 1) return "огонёк"; if (d >= 2 && d <= 4) return "огонька"; return "огоньков"; }
function buyWord(c){ const n = Math.abs(c) % 100, d = n % 10; return c + " " + (n > 10 && n < 20 ? "покупок" : d === 1 ? "покупка" : d >= 2 && d <= 4 ? "покупки" : "покупок"); }
function dayWord(n){ n = Math.abs(n) % 100; const d = n % 10; if (n > 10 && n < 20) return "дней"; if (d === 1) return "день"; if (d >= 2 && d <= 4) return "дня"; return "дней"; }
const isoDay = t => new Date(t).toISOString().slice(0, 10);
const fmtDay = iso => iso ? iso.split("-").reverse().join(".") : "—";
function daysLeft(s){ if (!subActive(s)) return 0; if (!s.until) return Infinity; return Math.max(0, Math.round((Date.parse(s.until) - Date.parse(todayISO())) / dayMs) + 1); }
function fireLeft(s){ const d = daysLeft(s); return d === Infinity ? Infinity : d * perDay(); }
const premActive = s => !!(s && s.active && s.puntil && s.puntil >= todayISO());
function pDaysLeft(s){ if (!premActive(s)) return 0; return Math.max(0, Math.round((Date.parse(s.puntil) - Date.parse(todayISO())) / dayMs) + 1); }
function pFireLeft(s){ return pDaysLeft(s) * pPerDay(); }
function snapData(snap){ if (!snap) return null; const ex = typeof snap.exists === "function" ? snap.exists() : snap.exists; if (ex === false) return null; const d = typeof snap.data === "function" ? snap.data() : snap.data; return d ? thaw(d) : null; }
function curSym(){ return CUR[CONFIG.fire.currency] || CONFIG.fire.currency || ""; }
function packLink(p){
  const l = txt(p.link).trim(); if (!PAYPAL_RE.test(l)) return "";
  const m = l.match(/^https:\/\/(www\.)?paypal\.me\/([^/?#]+)\/?$/i);
  if (m && +p.price > 0) return "https://www.paypal.me/" + m[2] + "/" + fmtMoney(+p.price) + (CONFIG.fire.currency || "USD");
  return l;
}

/* ---------- кто платит и что закрыто ---------- */
function fireLocked(){ if (!fireOn()) return false; if (!isVisitorView()) return false; return !(subActive(ACCESS.sub) || premActive(ACCESS.sub)); }
premLocked = (f => function(){ if (fireOn()) { if (!isVisitorView()) return false; if (!ACCESS.resolved) return true; return !premActive(ACCESS.sub); } return f(); })(premLocked);
paywall = (f => function(){ return fireOn() ? firePaywall("prem") : f(); })(paywall);
ask = (f => async function(input, tier, onText){ if (!FIRE.free && fireLocked()) { fireNeed(); throw { code: "no_fire" }; } return f(input, tier, onText); })(ask);
/* робот-гид отвечает бесплатно */
askJSON = (f => async function(prompt, tier, label){ if (label !== "Гид") return f(prompt, tier, label); FIRE.free++; try { return await f(prompt, tier, label); } finally { FIRE.free--; } })(askJSON);
/* Джарвис отвечает за огоньки; простые команды (открыть раздел, тема, назад) остаются бесплатными */
jvClaude = (f => async function(q){ if (fireLocked()) return "Чтобы я отвечал на вопросы, нужны огоньки: " + perDay() + " 🔥 = 1 день. Купить их можно в профиле. А бесплатные подсказки по сайту даёт робот-гид справа внизу."; return f(q); })(jvClaude);
start = (f => function(topic, extra){ if (fireLocked()) { fireNeed(); return; } return f(topic, extra); })(start);
errText = (f => function(e){ if (e && e.code === "no_fire") return "Нужны огоньки 🔥: открой «Купить огоньки» в профиле."; return f(e); })(errText);

/* ---------- магазин огоньков (вместо блока подписки) ---------- */
function fireBalanceLine(){
  const w = el("div", "fire-bal");
  if (!ACCESS.uid) { w.append(el("span", null, "Войди в claude.ai, чтобы получить и купить огоньки.")); return w; }
  const s = ACCESS.sub, left = fireLeft(s), pl = pFireLeft(s);
  const r1 = el("div", "fb-row");
  if (left === Infinity) r1.append(el("b", null, "🔥 ∞"), el("span", null, " обычный доступ без срока"));
  else if (left > 0) r1.append(el("b", null, "🔥 " + left), el("span", null, " обычных · до " + fmtDay(s.until)));
  else r1.append(el("b", null, "🔥 0"), el("span", null, CONFIG.fire.welcome > 0 && !s ? " · подарок " + CONFIG.fire.welcome + " 🔥 начислится в ближайшее время" : " обычных"));
  const r2 = el("div", "fb-row prem"); r2.append(el("b", null, "⭐🔥 " + pl), el("span", null, pl > 0 ? " премиум · до " + fmtDay(s.puntil) : " премиум"));
  w.append(r1, r2); return w;
}
function firePackGrid(k){
  const grid = el("div", "fire-packs" + (k === "prem" ? " prem" : "")), sym = curSym(), pd = kindPerDay(k);
  kindPacks(k).filter(p => +p.fire > 0).forEach(p => {
    const c = el("div", "fire-pack"), days = Math.ceil(+p.fire / pd);
    c.append(el("b", null, KIND[k].ic + " " + p.fire), el("span", "fp-days", days + " " + dayWord(days) + (k === "prem" ? " премиум-доступа" : " доступа")), el("span", "fp-price", (+p.price > 0 ? fmtMoney(+p.price) + " " + sym : "—")));
    const l = packLink(p);
    if (l && ACCESS.uid) { const a = el("a", "btn " + (k === "prem" ? "gold" : "primary"), "Купить"); a.href = l; a.target = "_blank"; a.rel = "noopener noreferrer"; c.append(a); }
    else c.append(el("span", "note", ACCESS.uid ? "ссылка не настроена" : "нужен вход"));
    grid.append(c);
  });
  return grid;
}
function firePaywall(focus){
  const F = CONFIG.fire, w = el("section", "paywall fire-shop"); w.id = "paywall";
  if (premPending()) { w.append(el("div", "pw-eyebrow", "Огоньки"), el("p", "note", "Проверяю баланс…")); return w; }
  w.append(el("div", "pw-eyebrow", "Огоньки — доступ к сайту"));
  w.append(fireBalanceLine());
  const sec = k => { const b = el("div", "fire-kind " + k); b.append(el("h3", null, KIND[k].ic + " " + KIND[k].name));
    b.append(el("p", "note", k === "prem"
      ? kindPerDay(k) + " ⭐🔥 = 1 день премиум-доступа: всё, что дают обычные, плюс Premium-навыки с оценкой " + PREMIUM_AT + "–10, экспертный уровень, формат «Фреймворк решений», автоулучшение и улучшение до 10."
      : kindPerDay(k) + " 🔥 = 1 день доступа: создание навыков, тесты, голосовой помощник Джарвис и навыки с оценкой до " + PREMIUM_AT + "."));
    const u = +(k === "prem" ? CONFIG.fire.punit : CONFIG.fire.unit) || 0; if (u) b.append(el("p", "fire-day-sum", "1 день " + (k === "prem" ? "премиум-доступа" : "доступа") + " ≈ " + fmtMoney(u * kindPerDay(k)) + " " + curSym()));
    b.append(firePackGrid(k)); return b; };
  if (focus === "prem") w.append(sec("prem"), sec("std")); else w.append(sec("std"), sec("prem"));
  if (ACCESS.uid) {
    const ol = el("ol", "pw-steps");
    const s2 = el("li"); s2.append(document.createTextNode("В комментарии к платежу PayPal укажи свой ID: ")); const idb = el("code", "pw-id", ACCESS.uid); const cp = el("button", "mini", "Копировать"); cp.type = "button"; cp.onclick = () => copyText(ACCESS.uid, cp); s2.append(idb, " ", cp);
    ol.append(el("li", null, "Выбери пакет и нажми «Купить» — откроется PayPal."), s2, el("li", null, "Огоньки придут на баланс, как только администратор подтвердит платёж. Огоньки сгорают по дням, пока действует доступ."));
    w.append(ol);
  }
  if (F.note) w.append(el("p", "note", F.note));
  w.append(el("p", "note", "Оплата проходит на сайте PayPal: данные карты и пароль сюда не попадают."));
  return w;
}
function fireNeed(focus){
  if (!FIRE.dlg) { FIRE.dlg = el("dialog", "fire-dlg"); FIRE.dlg.id = "fire-dlg"; document.body.append(FIRE.dlg); FIRE.dlg.addEventListener("click", ev => { if (ev.target === FIRE.dlg) FIRE.dlg.close(); }); }
  const d = FIRE.dlg; d.innerHTML = "";
  const x = el("button", "fire-x", "✕"); x.type = "button"; x.setAttribute("aria-label", "Закрыть"); x.onclick = () => d.close();
  const has = ACCESS.sub && (subActive(ACCESS.sub) || premActive(ACCESS.sub));
  d.append(x, el("h2", null, focus === "prem" ? "Нужны премиум-огоньки ⭐🔥" : has ? "Пополнить огоньки" : "Нужны огоньки 🔥"), firePaywall(focus));
  if (!d.open) d.showModal();
}

/* ---------- профиль: баланс и кнопка покупки ---------- */
renderProfileBtn = (f => function(){ f(); const b = $("#prof-btn"); if (!b) return;
  let p = $("#fire-pill");
  const show = fireOn() && ACCESS.uid && isVisitorView();
  if (!show) { if (p) p.remove(); return; }
  if (!p) { p = el("button", "fire-pill"); p.id = "fire-pill"; p.type = "button"; p.onclick = ev => { ev.stopPropagation(); fireNeed(); }; b.parentNode.insertBefore(p, b.parentNode.firstChild); }
  const left = fireLeft(ACCESS.sub), pl = pFireLeft(ACCESS.sub); p.textContent = "🔥 " + (left === Infinity ? "∞" : left) + "  ⭐ " + pl; p.title = "Обычные огоньки: " + (left === Infinity ? "без срока" : left) + ", премиум: " + pl + ". Нажми, чтобы пополнить.";
})(renderProfileBtn);
toggleProfile = (f => function(open){ f(open); const m = $("#prof-menu"); if (!m || m.hidden || !fireOn() || !isVisitorView()) return;
  const hd = m.querySelector(".pm-h"); const box = el("div", "pm-fire"); box.append(fireBalanceLine());
  const b = el("button", "btn primary block", "🔥 Купить огоньки"); b.type = "button"; b.onclick = () => { toggleProfile(false); fireNeed(); }; box.append(b);
  if (hd) hd.after(box); else m.prepend(box);
})(toggleProfile);

/* ---------- сервисный режим ---------- */
function applyMaint(){
  const on = !!CONFIG.maint.on, ov = $("#maint-ov"), bar = $("#maint-bar");
  if (on && ACCESS.ready && isVisitorView()) {
    if (!ov) { const o = el("div", "maint-ov"); o.id = "maint-ov"; o.setAttribute("role", "alert");
      const c = el("div", "maint-card"); c.append(el("div", "maint-ic", "🔧"), el("h2", null, "Сайт на сервисных работах"), el("p", "maint-msg"), el("p", "note", "Загляни чуть позже: мы скоро вернёмся."));
      o.append(c); document.body.append(o); }
    $("#maint-ov .maint-msg").textContent = CONFIG.maint.msg || "Мы обновляем Academy Skills, чтобы стало ещё лучше.";
    document.body.classList.add("maint-lock");
  } else { if (ov) ov.remove(); document.body.classList.remove("maint-lock"); }
  if (on && ACCESS.owner && !ACCESS.preview) {
    if (!bar) { const b = el("div", "maint-bar"); b.id = "maint-bar"; b.append(el("span", null, "🔧 Сайт закрыт на сервисные работы: посетители видят заглушку.")); const x = el("button", "btn", "Открыть сайт"); x.type = "button"; x.onclick = () => setMaint(false, x); b.append(x); const w = document.querySelector(".wrap"); w.insertBefore(b, w.firstChild); }
  } else if (bar) bar.remove();
}
async function setMaint(on, btn){
  if (!ACCESS.db || !ACCESS.owner) return;
  const prev = CONFIG.maint.on; CONFIG.maint.on = !!on; if (btn) btn.disabled = true;
  try { await ACCESS.db.doc("config/site").set(JSON.parse(JSON.stringify(CONFIG))); }
  catch(e) { CONFIG.maint.on = prev; alert("Не удалось сохранить: " + (e && (e.message || e.code) || "ошибка")); }
  if (btn) btn.disabled = false; applyMaint(); if (!$("#view-admin").classList.contains("hidden")) renderAdmin();
}

/* ---------- счётчик людей на сайте ---------- */
function drawCounter(){
  let c = $("#site-count");
  if (!c) { c = el("div", "site-count"); c.id = "site-count"; c.setAttribute("aria-live", "polite"); const tabs = document.querySelector(".tabs"); tabs.parentNode.insertBefore(c, tabs.nextSibling); }
  c.innerHTML = "";
  const live = el("span", "sc-live"); live.append(el("i", "sc-dot"), document.createTextNode("Сейчас на сайте: "), el("b", null, String(Math.max(1, FIRE.live))));
  c.append(live);
  if (FIRE.total != null) { const t = el("span", "sc-total"); t.append(document.createTextNode("Всего посетителей: "), el("b", null, String(FIRE.total))); c.append(t); }
}
async function initCounter(){
  drawCounter();
  if (!(window.claude && window.claude.use)) return;
  const room = await window.claude.use("room"); if (!room) return;
  try { room.onPeers(ch => { const ppl = arr(ch && ch.peers).filter(p => p.kind === "viewer"); FIRE.live = new Set(ppl.map((p, i) => p.by || p.id || "p" + i)).size; drawCounter(); }, () => {}); } catch(e) {}
}
visSave = (f => async function(){ await f(); if (!ACCESS.db || !ACCESS.owner || !VIS.ready) return; const n = Object.keys(VIS.log).length; if (n === FIRE.total) return; FIRE.total = n; drawCounter(); try { await ACCESS.db.doc("config/stats").set({ total: n, at: new Date().toISOString() }); } catch(e) {} })(visSave);

/* ---------- начисление огоньков ---------- */
async function creditFire(id, amount, opts){
  opts = opts || {}; amount = Math.round(+amount); const k = opts.kind === "prem" ? "prem" : "std";
  if (!ACCESS.db || !ACCESS.owner || !(amount > 0)) throw { message: "нечего начислять" };
  let cur = ADMIN.subs.find(s => s.id === id) || null;
  if (!cur) { try { cur = snapData(await ACCESS.db.doc("subs/" + id).get()); } catch(e) {} }
  if (!FIRE.ledgerReady) { try { const ld = snapData(await ACCESS.db.doc("admin/ledger").get()); FIRE.ledger = arr(ld && ld.items); FIRE.ledgerReady = true; } catch(e) { throw { message: "не загрузился журнал продаж, попробуй ещё раз" }; } }
  const today = todayISO(), days = Math.ceil(amount / kindPerDay(k));
  const doc = Object.assign({ active: true, until: null, granted: today, fire: 0, pfire: 0 }, cur ? JSON.parse(JSON.stringify(cur)) : {});
  delete doc.id; doc.active = true; doc.granted = (cur && cur.granted) || today;
  if (k === "prem") {
    const startT = premActive(cur) ? Date.parse(cur.puntil) + dayMs : Date.parse(today);
    doc.puntil = isoDay(startT + (days - 1) * dayMs); doc.pfire = Math.round(+doc.pfire || 0) + amount;
    if (!cur) doc.until = isoDay(Date.parse(today) - dayMs); // только премиум: обычный срок не задан
  } else {
    if (cur && subActive(cur) && !cur.until) doc.until = null;
    else { const startT = cur && subActive(cur) && cur.until ? Date.parse(cur.until) + dayMs : Date.parse(today); doc.until = isoDay(startT + (days - 1) * dayMs); }
    doc.fire = Math.round(+doc.fire || 0) + amount;
  }
  if (opts.type === "gift") doc.gift = true;
  await ACCESS.db.doc("subs/" + id).set(doc);
  const item = { id, kind: k, fire: amount, amount: Math.round((+opts.money || 0) * 100) / 100, cur: CONFIG.fire.currency || "USD", type: opts.type || "buy", note: txt(opts.note).slice(0, 120), at: new Date().toISOString() };
  FIRE.ledger = [item].concat(FIRE.ledger).slice(0, 1500);
  await ACCESS.db.doc("admin/ledger").set({ items: FIRE.ledger });
  return doc;
}
async function giftNewcomers(ids){
  if (!fireOn() || !ACCESS.owner || !ACCESS.db) return 0;
  const w = Math.round(+CONFIG.fire.welcome || 0); if (w <= 0) return 0;
  let n = 0;
  for (const id of ids) {
    if (FIRE.gifted.has(id) || ADMIN.subs.some(s => s.id === id)) continue;
    FIRE.gifted.add(id);
    try { const ex = snapData(await ACCESS.db.doc("subs/" + id).get()); if (ex) continue; await creditFire(id, w, { type: "gift", note: "подарок за регистрацию" }); n++; } catch(e) { FIRE.gifted.delete(id); }
  }
  return n;
}
visRecord = (f => function(ids){ f(ids); giftNewcomers(arr(ids)).catch(() => {}); })(visRecord);

/* ---------- кабинет: сервис, огоньки, офис ---------- */
function maintPanel(){
  const on = !!CONFIG.maint.on, p = el("section", "panel adm maint-panel" + (on ? " on" : ""));
  p.append(el("h2", null, "🔧 Сервисные работы"));
  const st = el("span", "zbadge z-" + (on ? "bad" : "good")); st.append(el("i", "zdot z-" + (on ? "bad" : "good")), document.createTextNode(on ? "Сайт закрыт для посетителей" : "Сайт открыт для всех")); p.append(st);
  const msg = inp("adm-maint-msg", CONFIG.maint.msg, "Например: обновляем каталог, вернёмся к 18:00");
  p.append(field("Сообщение для посетителей", msg, "Ты как владелец видишь сайт как обычно и можешь вносить изменения."));
  const b = el("button", "btn " + (on ? "primary" : "danger-solid"), on ? "Открыть сайт" : "Закрыть сайт на сервисные работы"); b.type = "button";
  b.onclick = () => { CONFIG.maint.msg = msg.value.trim().slice(0, 300); setMaint(!on, b); };
  p.append(b); return p;
}
function packEditor(list){
  const box = el("div", "fire-edit");
  const rowFor = (pk) => { const r = el("div", "fe-row"); const f1 = inp("", String(pk.fire || ""), "🔥"), f2 = inp("", String(pk.price || ""), "цена"), f3 = inp("", pk.link || "", "https://paypal.me/имя или ссылка на оплату");
    f1.className = "fe-n"; f2.className = "fe-p"; f3.className = "fe-l"; const x = el("button", "mini", "✕"); x.type = "button"; x.setAttribute("aria-label", "Убрать пакет"); x.onclick = () => r.remove();
    r.append(f1, f2, f3, x); return r; };
  arr(list).forEach(pk => box.append(rowFor(pk)));
  const add = el("button", "mini", "+ Пакет"); add.type = "button"; add.onclick = () => box.insertBefore(rowFor({}), add);
  box.append(add);
  box.read = () => [...box.querySelectorAll(".fe-row")].map(r => ({ fire: Math.round(+r.querySelector(".fe-n").value || 0), price: +String(r.querySelector(".fe-p").value).replace(",", ".") || 0, link: r.querySelector(".fe-l").value.trim() })).filter(x => x.fire > 0).slice(0, 8);
  return box;
}
function firePanel(){
  const F = CONFIG.fire, p = el("section", "panel adm fire-adm"); p.id = "adm-fire";
  p.append(el("h2", null, "🔥 Огоньки"));
  const en = el("label", "check"); const cb = el("input"); cb.type = "checkbox"; cb.checked = !!F.enabled; en.append(cb, document.createTextNode(" Сайт платный: создание навыков, тесты и Premium — за огоньки"));
  p.append(en, el("p", "note", "🔥 Обычные огоньки открывают создание навыков, тесты и навыки с оценкой до " + PREMIUM_AT + ". ⭐🔥 Премиум-огоньки открывают всё это плюс Premium-навыки " + PREMIUM_AT + "–10, экспертный уровень и улучшение до 10. И те и другие сгорают по дням."));
  const pd = inp("adm-fire-pd", String(perDay()), "1"), ppd = inp("adm-fire-ppd", String(pPerDay()), "1"), wl = inp("adm-fire-wl", String(F.welcome), "10");
  const un = inp("adm-fire-unit", String(F.unit != null ? F.unit : ""), "0.1"), pun = inp("adm-fire-punit", String(F.punit != null ? F.punit : ""), "0.3");
  const cur = el("select"); Object.keys(CUR).forEach(c => { const o = el("option", null, c + " " + CUR[c]); o.value = c; cur.append(o); }); cur.value = F.currency || "USD";
  const day = el("div", "fire-day"); day.append(el("h3", null, "💲 Стоимость одного дня"));
  const r1 = el("div", "adm-row"); r1.append(field("🔥 огоньков за 1 день обычного доступа", pd), field("⭐🔥 огоньков за 1 день премиум-доступа", ppd));
  const r1c = el("div", "adm-row"); r1c.append(field("Цена 1 🔥", un), field("Цена 1 ⭐🔥", pun));
  const sumLine = el("p", "fire-day-sum");
  const num = v => +String(v).replace(",", ".") || 0;
  const updDay = () => { const sym = CUR[cur.value] || cur.value, d1 = Math.max(1, Math.round(num(pd.value) || 1)), d2 = Math.max(1, Math.round(num(ppd.value) || 1));
    sumLine.textContent = "1 день обычного доступа = " + d1 + " 🔥" + (num(un.value) ? " = " + fmtMoney(d1 * num(un.value)) + " " + sym : "") + " · 1 день премиум = " + d2 + " ⭐🔥" + (num(pun.value) ? " = " + fmtMoney(d2 * num(pun.value)) + " " + sym : ""); };
  [pd, ppd, un, pun].forEach(x => x.oninput = updDay); cur.onchange = updDay; updDay();
  const recalc = el("button", "mini", "Пересчитать цены пакетов по цене огонька"); recalc.type = "button";
  day.append(r1, r1c, sumLine, recalc);
  p.append(day);
  const r1b = el("div", "adm-row"); r1b.append(field("Подарок при регистрации, 🔥", wl), field("Валюта", cur)); p.append(r1b);
  const ed1 = packEditor(F.packs), ed2 = packEditor(F.ppacks);
  recalc.onclick = () => { [[ed1, num(un.value)], [ed2, num(pun.value)]].forEach(([ed, u]) => { if (!u) return; ed.querySelectorAll(".fe-row").forEach(r => { const n = num(r.querySelector(".fe-n").value); if (n > 0) r.querySelector(".fe-p").value = fmtMoney(n * u); }); }); recalc.textContent = "Цены пакетов пересчитаны — не забудь сохранить"; };
  const g1 = el("div", "fire-group"); g1.append(el("div", "lbl", "🔥 Пакеты обычных огоньков: количество, цена, ссылка PayPal"), ed1);
  const g2 = el("div", "fire-group prem"); g2.append(el("div", "lbl", "⭐🔥 Пакеты премиум-огоньков (навыки " + PREMIUM_AT + "–10): количество, цена, ссылка PayPal"), ed2);
  p.append(g1, g2, el("p", "note", "Для ссылки paypal.me сумма пакета подставится сама. Покупатель указывает свой ID в комментарии к платежу."));
  const nt = inp("adm-fire-note", F.note, "Например: огоньки начисляем в течение пары часов");
  p.append(field("Примечание в магазине", nt));
  const err = el("p", "err hidden"), sv = el("button", "btn primary", "Сохранить огоньки"); sv.type = "button";
  sv.onclick = () => {
    const l1 = ed1.read(), l2 = ed2.read(); const bad = l1.concat(l2).find(x => x.link && !PAYPAL_RE.test(x.link));
    if (bad) { err.textContent = "Ссылка пакета на " + bad.fire + " должна начинаться с https://www.paypal.com/ или https://paypal.me/"; err.classList.remove("hidden"); return; }
    err.classList.add("hidden");
    Object.assign(CONFIG.fire, { enabled: cb.checked, unit: num(un.value), punit: num(pun.value), perDay: Math.max(1, Math.round(+pd.value || 1)), pPerDay: Math.max(1, Math.round(+ppd.value || 1)), welcome: Math.max(0, Math.round(+wl.value || 0)), currency: cur.value, packs: l1, ppacks: l2, note: nt.value.trim().slice(0, 300) });
    saveConfig(sv); setTimeout(() => { applyConfig(); }, 300);
  };
  p.append(err, sv);
  // начисление
  const cr = el("div", "fire-credit"); cr.append(el("h3", null, "Начислить огоньки"));
  cr.append(el("p", "note", "Найди платёж в PayPal, скопируй ID покупателя из комментария, выбери пакет и нажми «Начислить». Огоньки появятся у него сразу."));
  const sid = inp("adm-fire-id", "", "u_… — ID из комментария к платежу");
  const sel = el("select"); sel.id = "adm-fire-pack";
  ["std", "prem"].forEach(k => { const og = el("optgroup"); og.label = KIND[k].ic + " " + KIND[k].name;
    kindPacks(k).forEach((pk, i) => { const o = el("option", null, KIND[k].ic + " " + pk.fire + " — " + fmtMoney(+pk.price || 0) + " " + curSym()); o.value = k + ":" + i; og.append(o); });
    const oc = el("option", null, KIND[k].ic + " своё количество"); oc.value = k + ":custom"; og.append(oc);
    const gf = el("option", null, KIND[k].ic + " подарок (без оплаты)"); gf.value = k + ":gift"; og.append(gf); sel.append(og); });
  const amt = inp("adm-fire-amt", "", "количество"), money = inp("adm-fire-money", "", "сумма платежа"), note = inp("adm-fire-note2", "", "Имя или почта плательщика (видно только тебе)");
  const syncSel = () => { const [k, v] = sel.value.split(":"); if (/^\d+$/.test(v)) { const pk = kindPacks(k)[+v]; amt.value = pk.fire; money.value = pk.price; } else if (v === "gift") { money.value = "0"; if (!amt.value) amt.value = F.welcome || 10; } };
  sel.onchange = syncSel; syncSel();
  const r2 = el("div", "adm-row"); r2.append(field("ID покупателя", sid), field("Пакет", sel)); const r3 = el("div", "adm-row"); r3.append(field("Количество огоньков", amt), field("Получено, " + curSym(), money));
  const cerr = el("p", "err hidden"), cok = el("p", "note ok-note hidden"), go = el("button", "btn primary", "🔥 Начислить"); go.type = "button";
  go.onclick = async () => { const id = sid.value.trim(); cok.classList.add("hidden");
    if (!/^u_[A-Za-z0-9_-]{6,60}$/.test(id)) { cerr.textContent = "ID выглядит так: u_ и ещё около 22 символов. Скопируй его из комментария к платежу."; cerr.classList.remove("hidden"); return; }
    const n = Math.round(+amt.value || 0); if (n <= 0) { cerr.textContent = "Укажи, сколько огоньков начислить."; cerr.classList.remove("hidden"); return; }
    cerr.classList.add("hidden"); go.disabled = true; go.textContent = "Начисляю…";
    const [k, v] = sel.value.split(":");
    try { const type = v === "gift" ? "gift" : "buy"; const d = await creditFire(id, n, { kind: k, money: type === "gift" ? 0 : +String(money.value).replace(",", ".") || 0, note: note.value, type });
      if (note.value.trim()) { ADMIN.notes[id] = note.value.trim(); try { await ACCESS.db.doc("admin/notes").set({ byId: ADMIN.notes }); } catch(e) {} }
      cok.textContent = "Готово: +" + n + " " + KIND[k].ic + ", " + (k === "prem" ? "премиум-доступ до " + fmtDay(d.puntil) : "доступ до " + fmtDay(d.until)) + "."; cok.classList.remove("hidden"); sid.value = ""; note.value = ""; drawOffice(); drawFireUsers(); }
    catch(e) { cerr.textContent = "Не удалось начислить: " + (e && (e.message || e.code) || "ошибка"); cerr.classList.remove("hidden"); }
    go.disabled = false; go.textContent = "🔥 Начислить"; };
  cr.append(r2, r3, field("Заметка", note), cerr, cok, go);
  const gb = el("button", "btn", "🎁 Подарить " + (F.welcome || 0) + " 🔥 всем новым посетителям без огоньков"); gb.type = "button";
  gb.onclick = async () => { gb.disabled = true; const ids = Object.keys(VIS.log); const n = await giftNewcomers(ids); gb.textContent = n ? "Подарено: " + n + " " + (n === 1 ? "человеку" : "людям") : "Все посетители уже с огоньками"; setTimeout(() => { gb.disabled = false; gb.textContent = "🎁 Подарить " + (CONFIG.fire.welcome || 0) + " 🔥 всем новым посетителям без огоньков"; }, 3500); };
  cr.append(el("p", "note", "Новым посетителям подарок (обычные огоньки) начисляется сам, пока сайт открыт у тебя. Кнопка ниже раздаёт его тем, кто заходил, пока тебя не было."), gb);
  p.append(cr);
  const ul = el("div", "fire-users"); ul.id = "fire-users"; p.append(el("h3", null, "Балансы"), ul);
  setTimeout(drawFireUsers, 0);
  return p;
}
async function drawFireUsers(){
  const box = $("#fire-users"); if (!box) return; box.innerHTML = "";
  if (!ADMIN.subs.length) { box.append(el("p", "note", "Пока ни у кого нет огоньков.")); return; }
  try { const ps = await ACCESS.user.profiles(ADMIN.subs.map(s => s.id)); ADMIN.names = Object.assign(ADMIN.names || {}, ps || {}); } catch(e) {}
  const score = s => (fireLeft(s) === Infinity ? 1e9 : fireLeft(s)) + pFireLeft(s) * 1000;
  ADMIN.subs.slice().sort((a, b) => score(b) - score(a)).forEach(s => {
    const r = el("div", "adm-sub"), m = el("div"), nm = (ADMIN.names[s.id] && ADMIN.names[s.id].name) || ADMIN.notes[s.id] || "Посетитель";
    m.append(el("b", null, nm), el("small", null, s.id));
    const left = fireLeft(s), pl = pFireLeft(s), a = el("div", "adm-act");
    const b1 = el("span", "zbadge z-" + (left > 0 ? "good" : "bad")); b1.append(el("i", "zdot z-" + (left > 0 ? "good" : "bad")), document.createTextNode(left === Infinity ? "🔥 ∞" : "🔥 " + left + (left > 0 ? " · до " + fmtDay(s.until) : "")));
    const b2 = el("span", "zbadge z-" + (pl > 0 ? "good" : "warn")); b2.append(el("i", "zdot z-" + (pl > 0 ? "good" : "warn")), document.createTextNode("⭐🔥 " + pl + (pl > 0 ? " · до " + fmtDay(s.puntil) : "")));
    a.append(b1, b2);
    ["std", "prem"].forEach(k => { const pk = kindPacks(k)[0]; if (!pk) return; const b = el("button", "mini", "+" + pk.fire + " " + KIND[k].ic); b.type = "button"; b.title = "Начислить пакет как оплаченный";
      b.onclick = async () => { b.disabled = true; try { await creditFire(s.id, pk.fire, { kind: k, money: pk.price, type: "buy", note: "пакет " + KIND[k].ic + pk.fire }); drawOffice(); } catch(e) {} b.disabled = false; drawFireUsers(); }; a.append(b); });
    r.append(m, a); box.append(r);
  });
}
function officePanel(){
  const p = el("section", "panel adm office"); p.append(el("h2", null, "💼 Офис"));
  p.append(el("p", "note", "Продажи огоньков по подтверждённым платежам. Деньги лежат на твоём счёте PayPal: выводить, возвращать и смотреть баланс — в самом PayPal."));
  const k = el("div"); k.id = "office-kpis"; p.append(k);
  const links = el("div", "office-links");
  [["💰 Баланс PayPal", "https://www.paypal.com/myaccount/money"], ["📄 Все операции", "https://www.paypal.com/myaccount/activities"], ["🏦 Вывести деньги", "https://www.paypal.com/myaccount/money"], ["📊 Отчёты", "https://www.paypal.com/reports"]]
    .forEach(([t, u]) => { const a = el("a", "btn", t); a.href = u; a.target = "_blank"; a.rel = "noopener noreferrer"; links.append(a); });
  p.append(links);
  const h = el("h3", null, "Последние начисления"), l = el("div", "office-list"); l.id = "office-list"; p.append(h, l);
  setTimeout(drawOffice, 0);
  return p;
}
function drawOffice(){
  const k = $("#office-kpis"), l = $("#office-list"); if (!k || !l) return; k.innerHTML = ""; l.innerHTML = "";
  const L = FIRE.ledger, now = Date.now(), sym = curSym(), kindOf = x => x.kind === "prem" ? "prem" : "std";
  const buys = L.filter(x => x.type !== "gift"), sum = a => a.reduce((t, x) => t + (+x.amount || 0), 0), cnt = a => a.reduce((t, x) => t + (+x.fire || 0), 0);
  const inD = d => buys.filter(x => now - Date.parse(x.at) < d * dayMs);
  const bStd = buys.filter(x => kindOf(x) === "std"), bPrem = buys.filter(x => kindOf(x) === "prem");
  const kp = el("div", "kpis adm-kpis");
  kp.append(kpi("Сегодня", fmtMoney(sum(buys.filter(x => x.at.slice(0, 10) === todayISO()))) + " " + sym, null, "выручка"),
    kpi("За 30 дней", fmtMoney(sum(inD(30))) + " " + sym, null, buyWord(inD(30).length)),
    kpi("Всего", fmtMoney(sum(buys)) + " " + sym, null, buyWord(buys.length)),
    kpi("🔥 Обычные", fmtMoney(sum(bStd)) + " " + sym, null, "продано " + cnt(bStd) + " 🔥"),
    kpi("⭐🔥 Премиум", fmtMoney(sum(bPrem)) + " " + sym, null, "продано " + cnt(bPrem) + " ⭐🔥"),
    kpi("Покупателей", String(new Set(buys.map(x => x.id)).size), null, "подарено " + cnt(L.filter(x => x.type === "gift")) + " 🔥"),
    kpi("Средний чек", buys.length ? fmtMoney(sum(buys) / buys.length) + " " + sym : "—", null, "за покупку"));
  k.append(kp);
  if (!FIRE.ledgerReady) { l.append(el("p", "note", "Загружаю…")); return; }
  if (!L.length) { l.append(el("p", "note", "Начислений пока нет.")); return; }
  L.slice(0, 30).forEach(x => { const r = el("div", "adm-sub"), m = el("div"); const nm = (ADMIN.names && ADMIN.names[x.id] && ADMIN.names[x.id].name) || ADMIN.notes[x.id] || x.id;
    m.append(el("b", null, (x.type === "gift" ? "🎁 " : "") + "+" + x.fire + " " + KIND[kindOf(x)].ic + " · " + nm), el("small", null, new Date(x.at).toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) + (x.note ? " · " + x.note : "")));
    r.append(m, el("span", "office-amt", x.type === "gift" ? "подарок" : fmtMoney(+x.amount || 0) + " " + (CUR[x.cur] || x.cur || ""))); l.append(r); });
}
renderAdmin = (f => function(){ f(); const box = $("#admin"); if (!box || !ACCESS.owner || !ACCESS.db) return;
  const t = box.querySelector(".adm-title"); const frag = [maintPanel(), firePanel(), officePanel()];
  let at = t; frag.forEach(x => { if (at) { at.after(x); at = x; } else box.prepend(x); });
})(renderAdmin);

/* ---------- данные: config/site, config/stats, admin/ledger ---------- */
applyConfig = (f => function(){ f(); try { applyMaint(); } catch(e) {} try { renderProfileBtn(); } catch(e) {} })(applyConfig);
function fireWire(){
  if (FIRE.wired || !ACCESS.ready) return; FIRE.wired = true;
  const db = ACCESS.db; applyMaint();
  if (!db) return;
  db.doc("config/site").onSnapshot(snap => { const d = snapData(snap); if (d) { if (d.fire) CONFIG.fire = Object.assign(CONFIG.fire, d.fire); if (d.maint) CONFIG.maint = Object.assign(CONFIG.maint, d.maint); } applyConfig(); }, () => {});
  db.doc("config/stats").onSnapshot(snap => { const d = snapData(snap); if (d && d.total != null) { FIRE.total = +d.total; drawCounter(); } }, () => {});
  if (ACCESS.owner) db.doc("admin/ledger").onSnapshot(snap => { const d = snapData(snap); FIRE.ledger = arr(d && d.items); FIRE.ledgerReady = true; drawOffice(); }, () => { FIRE.ledgerReady = true; drawOffice(); });
}
const fireT = setInterval(() => { if (ACCESS.ready) { clearInterval(fireT); fireWire(); } }, 250);
setTimeout(() => clearInterval(fireT), 20000);
initCounter().catch(() => {});

/* ---------- голос Джарвиса: Claude → голос браузера/системы → беззвучно ---------- */
const JVV = { web: null, claudeOff: false, active: "" };
function jvVoiceWeb(){
  const S = window.speechSynthesis; if (!S || !window.SpeechSynthesisUtterance) return null;
  const cb = [], emit = v => cb.forEach(f => { try { f(v); } catch(e) {} });
  let voices = [], ready = false, run = 0, keep = 0;
  const load = () => { voices = S.getVoices() || []; ready = voices.length > 0; };
  load(); try { S.addEventListener("voiceschanged", load); } catch(e) { S.onvoiceschanged = load; }
  const waitVoices = () => ready ? Promise.resolve() : new Promise(r => { let n = 0; const t = setInterval(() => { load(); if (ready || ++n > 20) { clearInterval(t); r(); } }, 100); });
  const pick = () => voices.find(v => /^ru/i.test(v.lang) && /Milena|Yuri|Google|Premium|Enhanced|Natural|Online/i.test(v.name)) || voices.find(v => /^ru/i.test(v.lang)) || null;
  const chunks = t => { const out = []; txt(t).replace(/\s+/g, " ").trim().split(/(?<=[.!?…])\s+/).forEach(s => { while (s.length > 220) { const i = s.lastIndexOf(" ", 220); out.push(s.slice(0, i > 60 ? i : 220)); s = s.slice(i > 60 ? i + 1 : 220); } if (s) out.push(s); }); return out; };
  const stopKeep = () => { clearInterval(keep); keep = 0; };
  const api = { web: true,
    hasRu(){ return !!pick(); },
    unlock(){ try { const u = new SpeechSynthesisUtterance(" "); u.volume = 0; S.speak(u); } catch(e) {} },
    async speak(text){
      const my = ++run; await waitVoices(); if (my !== run) throw { code: "stopped" };
      try { S.cancel(); } catch(e) {}
      await new Promise(r => setTimeout(r, 60));
      const parts = chunks(text); if (!parts.length) return;
      const v = pick(); emit({ state: "speaking" });
      stopKeep(); keep = setInterval(() => { try { if (S.speaking && !S.paused) { S.pause(); S.resume(); } } catch(e) {} }, 10000);
      try {
        for (const part of parts) {
          if (my !== run) throw { code: "stopped" };
          await new Promise((res, rej) => {
            const u = new SpeechSynthesisUtterance(part); u.lang = v ? v.lang : "ru-RU"; if (v) u.voice = v; u.rate = 1.02; u.pitch = 0.92; u.volume = 1;
            let started = false; const guard = setTimeout(() => { if (!started && !S.speaking) rej({ code: "error", message: "голос не запустился" }); }, 4000);
            u.onstart = () => { started = true; };
            u.onend = () => { clearTimeout(guard); res(); };
            u.onerror = e => { clearTimeout(guard); rej({ code: /interrupted|canceled/.test(e.error) ? "stopped" : "error", message: e.error }); };
            S.speak(u);
          });
        }
      } finally { stopKeep(); if (my === run) emit({ state: "idle", reason: "completed" }); }
    },
    stop(){ run++; stopKeep(); try { S.cancel(); } catch(e) {} emit({ state: "idle", reason: "viewer_stopped" }); },
    onState(f){ cb.push(f); } };
  return api;
}
JVV.web = jvVoiceWeb();
if (JVV.web) JVV.web.onState(({ state }) => { if (JVV.active !== "web") return; JV.speaking = state === "speaking"; try { jvDraw(); } catch(e) {} });
if (!JV.tts && JVV.web) { JV.tts = JVV.web; try { jvDraw(); } catch(e) {} }
jvSpeak = async function(text){
  if (!text) return;
  if (!JV.voice) { jvFakeSpeak(text); return; }
  const claudeT = JV.tts && !JV.tts.web && !JVV.claudeOff ? JV.tts : null;
  if (claudeT) {
    try { JVV.active = "claude"; await claudeT.speak(text.slice(0, 1900), { language: "ru" }); return; }
    catch(e) { const c = e && e.code; if (c === "stopped") return; if (c === "not_granted" || c === "unavailable") JVV.claudeOff = true; }
  }
  if (JVV.web) {
    try { JVV.active = "web"; await JVV.web.speak(text); return; }
    catch(e) { if (e && e.code === "stopped") return; }
  }
  jvFakeSpeak(text);
};
jvStopSpeak = (f => function(){ try { JVV.web && JVV.web.stop(); } catch(e) {} f(); })(jvStopSpeak);
/* браузеры дают говорить только после нажатия: разблокируем голос при открытии Джарвиса и нажатии на микрофон */
document.addEventListener("click", ev => { if (JVV.web && ev.target && ev.target.closest && ev.target.closest(".jv-btn, #jv-mic, #jv-form button, #jv-voice")) JVV.web.unlock(); }, true);

/* ---------- карусель идей тем: крутится по кругу, прозрачная, листается рукой ---------- */
const CAR = { raf: 0, paused: false, hold: 0, drag: null, sel: "" };
renderTopics = (f => function(g){
  $("#topic-groups").value = g;
  const box = $("#examples"); box.innerHTML = ""; box.className = "idea-car"; box.setAttribute("role", "listbox"); box.setAttribute("aria-label", "Идеи тем: листай и выбирай");
  const track = el("div", "car-track"), items = TOPIC_GROUPS[g] || [];
  const mk = (t, clone) => { const b = el("button", "chip car-chip", t); b.type = "button"; b.setAttribute("role", "option"); b.setAttribute("aria-selected", String(CAR.sel === t)); if (clone) { b.tabIndex = -1; b.setAttribute("aria-hidden", "true"); }
    b.onclick = ev => { if (CAR.drag && CAR.drag.moved) { ev.preventDefault(); return; } CAR.sel = t; $("#topic").value = t; suggestForTopic(t, g); box.querySelectorAll(".car-chip").forEach(c => c.setAttribute("aria-selected", String(c.textContent === t))); CAR.hold = Date.now() + 4000; };
    return b; };
  items.forEach(t => track.append(mk(t, false)));
  if (items.length > 2) items.forEach(t => track.append(mk(t, true)));
  const prev = el("button", "car-nav car-prev", "‹"), next = el("button", "car-nav car-next", "›");
  prev.type = next.type = "button"; prev.setAttribute("aria-label", "Назад"); next.setAttribute("aria-label", "Вперёд");
  const step = d => { CAR.hold = Date.now() + 3500; track.scrollBy({ left: d * Math.max(160, track.clientWidth * 0.6), behavior: "smooth" }); };
  prev.onclick = () => step(-1); next.onclick = () => step(1);
  box.append(prev, track, next);
  // перетаскивание мышью и пальцем
  track.addEventListener("pointerdown", ev => { CAR.drag = { x: ev.clientX, s: track.scrollLeft, moved: false, id: ev.pointerId }; CAR.hold = Date.now() + 4000; });
  track.addEventListener("pointermove", ev => { const d = CAR.drag; if (!d || d.id !== ev.pointerId) return; const dx = ev.clientX - d.x; if (Math.abs(dx) > 5) { d.moved = true; if (ev.pointerType === "mouse") { track.scrollLeft = d.s - dx; } } });
  const end = () => { setTimeout(() => { CAR.drag = null; }, 0); CAR.hold = Date.now() + 3000; };
  track.addEventListener("pointerup", end); track.addEventListener("pointercancel", end);
  track.addEventListener("wheel", () => { CAR.hold = Date.now() + 3000; }, { passive: true });
  box.addEventListener("mouseenter", () => { CAR.paused = true; }); box.addEventListener("mouseleave", () => { CAR.paused = false; });
  box.addEventListener("focusin", () => { CAR.paused = true; }); box.addEventListener("focusout", () => { CAR.paused = false; });
  if (g !== "Популярное") suggestForTopic("", g); else setRefSuggest([], [], "");
  carStart(track, items.length > 2);
})(renderTopics);
function carStart(track, loop){
  cancelAnimationFrame(CAR.raf);
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  let last = performance.now(), acc = 0;
  const tick = now => { const dt = Math.min(64, now - last); last = now;
    if (!track.isConnected) return;
    const half = track.scrollWidth / 2;
    if (loop && half > 0) { if (track.scrollLeft >= half) track.scrollLeft -= half; else if (track.scrollLeft <= 0 && CAR.drag) track.scrollLeft += half; }
    if (!reduce && loop && !CAR.paused && !CAR.drag && Date.now() > CAR.hold && document.visibilityState === "visible") { acc += dt * 0.03; if (acc >= 1) { const n = Math.floor(acc); track.scrollLeft += n; acc -= n; } }
    CAR.raf = requestAnimationFrame(tick); };
  CAR.raf = requestAnimationFrame(tick);
}
renderTopics($("#topic-groups").value || "Популярное");
/* ===================== конец модуля огоньков ===================== */
