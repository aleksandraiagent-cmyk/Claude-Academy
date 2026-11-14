/* ===================== 🔥 Огоньки, офис, сервисный режим, счётчик, карусель идей ===================== */
/* Огоньки — валюта доступа: владелец начисляет их в кабинете, они сгорают по дням (perDay в день),
   пока действует полный доступ. Баланс хранится в subs/<id> (пишет только владелец), поэтому
   его нельзя подделать очисткой браузера. Продажи — admin/ledger, общий счётчик — config/stats. */
CONFIG.fire = Object.assign({ enabled: false, perDay: 1, welcome: 10, currency: "USD", note: "",
  packs: [{ fire: 10, price: 1, link: "" }, { fire: 30, price: 3, link: "" }, { fire: 100, price: 8, link: "" }] }, CONFIG.fire || {});
CONFIG.maint = Object.assign({ on: false, msg: "" }, CONFIG.maint || {});
const FIRE = { ledger: [], ledgerReady: false, live: 0, total: null, gifted: new Set(), wired: false, dlg: null };
const fireOn = () => !!(CONFIG.fire && CONFIG.fire.enabled);
const perDay = () => Math.max(1, Math.round(+CONFIG.fire.perDay || 1));
const isVisitorView = () => !ACCESS.owner || ACCESS.preview;
function fireWord(n){ n = Math.abs(n) % 100; const d = n % 10; if (n > 10 && n < 20) return "огоньков"; if (d === 1) return "огонёк"; if (d >= 2 && d <= 4) return "огонька"; return "огоньков"; }
function buyWord(c){ const n = Math.abs(c) % 100, d = n % 10; return c + " " + (n > 10 && n < 20 ? "покупок" : d === 1 ? "покупка" : d >= 2 && d <= 4 ? "покупки" : "покупок"); }
function dayWord(n){ n = Math.abs(n) % 100; const d = n % 10; if (n > 10 && n < 20) return "дней"; if (d === 1) return "день"; if (d >= 2 && d <= 4) return "дня"; return "дней"; }
const isoDay = t => new Date(t).toISOString().slice(0, 10);
const fmtDay = iso => iso ? iso.split("-").reverse().join(".") : "—";
function daysLeft(s){ if (!subActive(s)) return 0; if (!s.until) return Infinity; return Math.max(0, Math.round((Date.parse(s.until) - Date.parse(todayISO())) / dayMs) + 1); }
function fireLeft(s){ const d = daysLeft(s); return d === Infinity ? Infinity : d * perDay(); }
function snapData(snap){ if (!snap) return null; const ex = typeof snap.exists === "function" ? snap.exists() : snap.exists; if (ex === false) return null; const d = typeof snap.data === "function" ? snap.data() : snap.data; return d ? thaw(d) : null; }
function curSym(){ return CUR[CONFIG.fire.currency] || CONFIG.fire.currency || ""; }
function packLink(p){
  const l = txt(p.link).trim(); if (!PAYPAL_RE.test(l)) return "";
  const m = l.match(/^https:\/\/(www\.)?paypal\.me\/([^/?#]+)\/?$/i);
  if (m && +p.price > 0) return "https://www.paypal.me/" + m[2] + "/" + fmtMoney(+p.price) + (CONFIG.fire.currency || "USD");
  return l;
}

/* ---------- кто платит и что закрыто ---------- */
function fireLocked(){ if (!fireOn()) return false; if (!isVisitorView()) return false; return !subActive(ACCESS.sub); }
premLocked = (f => function(){ if (fireOn()) { if (!isVisitorView()) return false; if (!ACCESS.resolved) return true; return !subActive(ACCESS.sub); } return f(); })(premLocked);
paywall = (f => function(){ return fireOn() ? firePaywall() : f(); })(paywall);
ask = (f => async function(input, tier, onText){ if (fireLocked()) { fireNeed(); throw { code: "no_fire" }; } return f(input, tier, onText); })(ask);
start = (f => function(topic, extra){ if (fireLocked()) { fireNeed(); return; } return f(topic, extra); })(start);
errText = (f => function(e){ if (e && e.code === "no_fire") return "Нужны огоньки 🔥: открой «Купить огоньки» в профиле."; return f(e); })(errText);

/* ---------- магазин огоньков (вместо блока подписки) ---------- */
function fireBalanceLine(){
  const w = el("div", "fire-bal");
  if (!ACCESS.uid) { w.append(el("span", null, "Войди в claude.ai, чтобы получить и купить огоньки.")); return w; }
  const s = ACCESS.sub, left = fireLeft(s);
  if (left === Infinity) w.append(el("b", null, "🔥 ∞"), el("span", null, " безлимитный доступ"));
  else if (left > 0) w.append(el("b", null, "🔥 " + left + " " + fireWord(left)), el("span", null, " · доступ до " + fmtDay(s.until)));
  else w.append(el("b", null, "🔥 0"), el("span", null, CONFIG.fire.welcome > 0 && !s ? " · подарок " + CONFIG.fire.welcome + " 🔥 начислится в ближайшее время" : " · огоньки закончились"));
  return w;
}
function firePaywall(){
  const F = CONFIG.fire, w = el("section", "paywall fire-shop"); w.id = "paywall";
  if (premPending()) { w.append(el("div", "pw-eyebrow", "Огоньки"), el("p", "note", "Проверяю баланс…")); return w; }
  w.append(el("div", "pw-eyebrow", "🔥 Огоньки — доступ ко всему сайту"));
  w.append(el("p", "note", perDay() + " " + fireWord(perDay()) + " = 1 день полного доступа: создание навыков, тесты, Premium-навыки, улучшение до 10. Огоньки сгорают по дням, пока действует доступ."));
  w.append(fireBalanceLine());
  const grid = el("div", "fire-packs"), sym = curSym();
  arr(F.packs).filter(p => +p.fire > 0).forEach(p => {
    const c = el("div", "fire-pack"), days = Math.ceil(+p.fire / perDay());
    c.append(el("b", null, "🔥 " + p.fire), el("span", "fp-days", days + " " + dayWord(days) + " доступа"), el("span", "fp-price", (+p.price > 0 ? fmtMoney(+p.price) + " " + sym : "—")));
    const l = packLink(p);
    if (l && ACCESS.uid) { const a = el("a", "btn primary", "Купить"); a.href = l; a.target = "_blank"; a.rel = "noopener noreferrer"; c.append(a); }
    else c.append(el("span", "note", ACCESS.uid ? "ссылка не настроена" : "нужен вход"));
    grid.append(c);
  });
  w.append(grid);
  if (ACCESS.uid) {
    const ol = el("ol", "pw-steps");
    const s2 = el("li"); s2.append(document.createTextNode("В комментарии к платежу PayPal укажи свой ID: ")); const idb = el("code", "pw-id", ACCESS.uid); const cp = el("button", "mini", "Копировать"); cp.type = "button"; cp.onclick = () => copyText(ACCESS.uid, cp); s2.append(idb, " ", cp);
    ol.append(el("li", null, "Выбери пакет и нажми «Купить» — откроется PayPal."), s2, el("li", null, "Огоньки придут на баланс, как только администратор подтвердит платёж."));
    w.append(ol);
  }
  if (F.note) w.append(el("p", "note", F.note));
  w.append(el("p", "note", "Оплата проходит на сайте PayPal: данные карты и пароль сюда не попадают."));
  return w;
}
function fireNeed(){
  if (!FIRE.dlg) { FIRE.dlg = el("dialog", "fire-dlg"); FIRE.dlg.id = "fire-dlg"; document.body.append(FIRE.dlg); FIRE.dlg.addEventListener("click", ev => { if (ev.target === FIRE.dlg) FIRE.dlg.close(); }); }
  const d = FIRE.dlg; d.innerHTML = "";
  const x = el("button", "fire-x", "✕"); x.type = "button"; x.setAttribute("aria-label", "Закрыть"); x.onclick = () => d.close();
  d.append(x, el("h2", null, ACCESS.sub && subActive(ACCESS.sub) ? "Пополнить огоньки" : "Нужны огоньки 🔥"), firePaywall());
  if (!d.open) d.showModal();
}

/* ---------- профиль: баланс и кнопка покупки ---------- */
renderProfileBtn = (f => function(){ f(); const b = $("#prof-btn"); if (!b) return;
  let p = $("#fire-pill");
  const show = fireOn() && ACCESS.uid && isVisitorView();
  if (!show) { if (p) p.remove(); return; }
  if (!p) { p = el("button", "fire-pill"); p.id = "fire-pill"; p.type = "button"; p.onclick = ev => { ev.stopPropagation(); fireNeed(); }; b.parentNode.insertBefore(p, b); }
  const left = fireLeft(ACCESS.sub); p.textContent = "🔥 " + (left === Infinity ? "∞" : left); p.title = "Огоньки: " + (left === Infinity ? "безлимит" : left + " " + fireWord(left)) + ". Нажми, чтобы пополнить.";
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
  opts = opts || {}; amount = Math.round(+amount); if (!ACCESS.db || !ACCESS.owner || !(amount > 0)) throw { message: "нечего начислять" };
  let cur = ADMIN.subs.find(s => s.id === id) || null;
  if (!cur) { try { cur = snapData(await ACCESS.db.doc("subs/" + id).get()); } catch(e) {} }
  const today = todayISO(), days = Math.ceil(amount / perDay());
  const startT = cur && subActive(cur) && cur.until ? Date.parse(cur.until) + dayMs : Date.parse(today);
  const doc = { active: true, until: isoDay(startT + (days - 1) * dayMs), granted: (cur && cur.granted) || today, fire: Math.round(+(cur && cur.fire) || 0) + amount, gift: !!(cur && cur.gift) || opts.type === "gift" };
  if (cur && subActive(cur) && !cur.until) doc.until = null;
  await ACCESS.db.doc("subs/" + id).set(doc);
  if (!FIRE.ledgerReady) { try { const ld = snapData(await ACCESS.db.doc("admin/ledger").get()); FIRE.ledger = arr(ld && ld.items); FIRE.ledgerReady = true; } catch(e) { throw { message: "не загрузился журнал продаж, попробуй ещё раз" }; } }
  const item = { id, fire: amount, amount: Math.round((+opts.money || 0) * 100) / 100, cur: CONFIG.fire.currency || "USD", type: opts.type || "buy", note: txt(opts.note).slice(0, 120), at: new Date().toISOString() };
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
function firePanel(){
  const F = CONFIG.fire, p = el("section", "panel adm fire-adm"); p.id = "adm-fire";
  p.append(el("h2", null, "🔥 Огоньки"));
  const en = el("label", "check"); const cb = el("input"); cb.type = "checkbox"; cb.checked = !!F.enabled; en.append(cb, document.createTextNode(" Сайт платный: создание навыков, тесты и Premium — за огоньки"));
  p.append(en);
  const pd = inp("adm-fire-pd", String(perDay()), "1"), wl = inp("adm-fire-wl", String(F.welcome), "10");
  const cur = el("select"); Object.keys(CUR).forEach(c => { const o = el("option", null, c + " " + CUR[c]); o.value = c; cur.append(o); }); cur.value = F.currency || "USD";
  const r1 = el("div", "adm-row"); r1.append(field("🔥 за 1 день доступа", pd), field("Подарок при регистрации, 🔥", wl), field("Валюта", cur)); p.append(r1);
  p.append(el("div", "lbl", "Пакеты огоньков (цена и ссылка PayPal)"));
  const packs = el("div", "fire-edit");
  const rowFor = (pk) => { const r = el("div", "fe-row"); const f1 = inp("", String(pk.fire || ""), "🔥"), f2 = inp("", String(pk.price || ""), "цена"), f3 = inp("", pk.link || "", "https://paypal.me/имя или ссылка на оплату");
    f1.className = "fe-n"; f2.className = "fe-p"; f3.className = "fe-l"; const x = el("button", "mini", "✕"); x.type = "button"; x.setAttribute("aria-label", "Убрать пакет"); x.onclick = () => r.remove();
    r.append(f1, f2, f3, x); return r; };
  arr(F.packs).forEach(pk => packs.append(rowFor(pk)));
  const addp = el("button", "mini", "+ Пакет"); addp.type = "button"; addp.onclick = () => packs.append(rowFor({}));
  p.append(packs, addp, el("p", "note", "Для ссылки paypal.me сумма пакета подставится сама. Покупатель указывает свой ID в комментарии к платежу."));
  const nt = inp("adm-fire-note", F.note, "Например: огоньки начисляем в течение пары часов");
  p.append(field("Примечание в магазине", nt));
  const err = el("p", "err hidden"), sv = el("button", "btn primary", "Сохранить огоньки"); sv.type = "button";
  sv.onclick = () => {
    const list = [...packs.children].map(r => ({ fire: Math.round(+r.querySelector(".fe-n").value || 0), price: +String(r.querySelector(".fe-p").value).replace(",", ".") || 0, link: r.querySelector(".fe-l").value.trim() })).filter(x => x.fire > 0);
    const bad = list.find(x => x.link && !PAYPAL_RE.test(x.link));
    if (bad) { err.textContent = "Ссылка пакета 🔥" + bad.fire + " должна начинаться с https://www.paypal.com/ или https://paypal.me/"; err.classList.remove("hidden"); return; }
    err.classList.add("hidden");
    Object.assign(CONFIG.fire, { enabled: cb.checked, perDay: Math.max(1, Math.round(+pd.value || 1)), welcome: Math.max(0, Math.round(+wl.value || 0)), currency: cur.value, packs: list.slice(0, 8), note: nt.value.trim().slice(0, 300) });
    saveConfig(sv); setTimeout(() => { applyConfig(); }, 300);
  };
  p.append(err, sv);
  // начисление
  const cr = el("div", "fire-credit"); cr.append(el("h3", null, "Начислить огоньки"));
  cr.append(el("p", "note", "Найди платёж в PayPal, скопируй ID покупателя из комментария, выбери пакет и нажми «Начислить». Огоньки появятся у него сразу."));
  const sid = inp("adm-fire-id", "", "u_… — ID из комментария к платежу");
  const sel = el("select"); sel.id = "adm-fire-pack";
  arr(F.packs).forEach((pk, i) => { const o = el("option", null, "🔥 " + pk.fire + " — " + fmtMoney(+pk.price || 0) + " " + curSym()); o.value = "p" + i; sel.append(o); });
  const oc = el("option", null, "Своё количество"); oc.value = "custom"; sel.append(oc); const og = el("option", null, "Подарок (без оплаты)"); og.value = "gift"; sel.append(og);
  const amt = inp("adm-fire-amt", "", "🔥"), money = inp("adm-fire-money", "", "сумма платежа"), note = inp("adm-fire-note2", "", "Имя или почта плательщика (видно только тебе)");
  const syncSel = () => { const v = sel.value; if (v.startsWith("p")) { const pk = F.packs[+v.slice(1)]; amt.value = pk.fire; money.value = pk.price; } else if (v === "gift") { money.value = "0"; if (!amt.value) amt.value = F.welcome || 10; } };
  sel.onchange = syncSel; syncSel();
  const r2 = el("div", "adm-row"); r2.append(field("ID покупателя", sid), field("Пакет", sel)); const r3 = el("div", "adm-row"); r3.append(field("Огоньков", amt), field("Получено, " + curSym(), money));
  const cerr = el("p", "err hidden"), cok = el("p", "note hidden"), go = el("button", "btn primary", "🔥 Начислить"); go.type = "button";
  go.onclick = async () => { const id = sid.value.trim(); cok.classList.add("hidden");
    if (!/^u_[A-Za-z0-9_-]{6,60}$/.test(id)) { cerr.textContent = "ID выглядит так: u_ и ещё около 22 символов. Скопируй его из комментария к платежу."; cerr.classList.remove("hidden"); return; }
    const n = Math.round(+amt.value || 0); if (n <= 0) { cerr.textContent = "Укажи, сколько огоньков начислить."; cerr.classList.remove("hidden"); return; }
    cerr.classList.add("hidden"); go.disabled = true; go.textContent = "Начисляю…";
    try { const type = sel.value === "gift" ? "gift" : "buy"; const d = await creditFire(id, n, { money: type === "gift" ? 0 : +String(money.value).replace(",", ".") || 0, note: note.value, type });
      if (note.value.trim()) { ADMIN.notes[id] = note.value.trim(); try { await ACCESS.db.doc("admin/notes").set({ byId: ADMIN.notes }); } catch(e) {} }
      cok.textContent = "Готово: +" + n + " 🔥, доступ до " + fmtDay(d.until) + "."; cok.classList.remove("hidden"); sid.value = ""; note.value = ""; drawOffice(); drawFireUsers(); }
    catch(e) { cerr.textContent = "Не удалось начислить: " + (e && (e.message || e.code) || "ошибка"); cerr.classList.remove("hidden"); }
    go.disabled = false; go.textContent = "🔥 Начислить"; };
  cr.append(r2, r3, field("Заметка", note), cerr, cok, go);
  // подарок новичкам
  const gb = el("button", "btn", "🎁 Подарить " + (F.welcome || 0) + " 🔥 всем новым посетителям без огоньков"); gb.type = "button";
  gb.onclick = async () => { gb.disabled = true; const ids = Object.keys(VIS.log); const n = await giftNewcomers(ids); gb.textContent = n ? "Подарено: " + n + " " + (n === 1 ? "человеку" : "людям") : "Все посетители уже с огоньками"; setTimeout(() => { gb.disabled = false; gb.textContent = "🎁 Подарить " + (CONFIG.fire.welcome || 0) + " 🔥 всем новым посетителям без огоньков"; }, 3500); };
  cr.append(el("p", "note", "Новым посетителям подарок начисляется сам, пока сайт открыт у тебя. Кнопка ниже раздаёт его тем, кто заходил, пока тебя не было."), gb);
  p.append(cr);
  const ul = el("div", "fire-users"); ul.id = "fire-users"; p.append(el("h3", null, "Балансы"), ul);
  setTimeout(drawFireUsers, 0);
  return p;
}
async function drawFireUsers(){
  const box = $("#fire-users"); if (!box) return; box.innerHTML = "";
  if (!ADMIN.subs.length) { box.append(el("p", "note", "Пока ни у кого нет огоньков.")); return; }
  try { const ps = await ACCESS.user.profiles(ADMIN.subs.map(s => s.id)); ADMIN.names = Object.assign(ADMIN.names || {}, ps || {}); } catch(e) {}
  ADMIN.subs.slice().sort((a, b) => fireLeft(b) - fireLeft(a)).forEach(s => {
    const r = el("div", "adm-sub"), m = el("div"), nm = (ADMIN.names[s.id] && ADMIN.names[s.id].name) || ADMIN.notes[s.id] || "Посетитель";
    m.append(el("b", null, nm), el("small", null, s.id));
    const left = fireLeft(s), on = left > 0;
    const st = el("span", "zbadge z-" + (on ? "good" : "bad")); st.append(el("i", "zdot z-" + (on ? "good" : "bad")), document.createTextNode(left === Infinity ? "🔥 ∞" : "🔥 " + left + (on ? " · до " + fmtDay(s.until) : "")));
    const a = el("div", "adm-act"); a.append(st);
    arr(CONFIG.fire.packs).slice(0, 2).forEach(pk => { const b = el("button", "mini", "+" + pk.fire + " 🔥"); b.type = "button"; b.title = "Начислить пакет как оплаченный"; b.onclick = async () => { b.disabled = true; try { await creditFire(s.id, pk.fire, { money: pk.price, type: "buy", note: "пакет 🔥" + pk.fire }); drawOffice(); } catch(e) {} b.disabled = false; drawFireUsers(); }; a.append(b); });
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
  const L = FIRE.ledger, now = Date.now(), sym = curSym();
  const buys = L.filter(x => x.type !== "gift"), sum = a => a.reduce((t, x) => t + (+x.amount || 0), 0);
  const inD = d => buys.filter(x => now - Date.parse(x.at) < d * dayMs);
  const kp = el("div", "kpis adm-kpis");
  kp.append(kpi("Сегодня", fmtMoney(sum(buys.filter(x => x.at.slice(0, 10) === todayISO()))) + " " + sym, null, "выручка"),
    kpi("За 30 дней", fmtMoney(sum(inD(30))) + " " + sym, null, buyWord(inD(30).length)),
    kpi("Всего", fmtMoney(sum(buys)) + " " + sym, null, buyWord(buys.length)),
    kpi("Покупателей", String(new Set(buys.map(x => x.id)).size), null, "платили хотя бы раз"),
    kpi("Продано 🔥", String(buys.reduce((t, x) => t + (+x.fire || 0), 0)), null, "подарено " + L.filter(x => x.type === "gift").reduce((t, x) => t + (+x.fire || 0), 0)),
    kpi("Средний чек", buys.length ? fmtMoney(sum(buys) / buys.length) + " " + sym : "—", null, "за покупку"));
  k.append(kp);
  if (!FIRE.ledgerReady) { l.append(el("p", "note", "Загружаю…")); return; }
  if (!L.length) { l.append(el("p", "note", "Начислений пока нет.")); return; }
  L.slice(0, 30).forEach(x => { const r = el("div", "adm-sub"), m = el("div"); const nm = (ADMIN.names && ADMIN.names[x.id] && ADMIN.names[x.id].name) || ADMIN.notes[x.id] || x.id;
    m.append(el("b", null, (x.type === "gift" ? "🎁 " : "🔥 ") + "+" + x.fire + " · " + nm), el("small", null, new Date(x.at).toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) + (x.note ? " · " + x.note : "")));
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
