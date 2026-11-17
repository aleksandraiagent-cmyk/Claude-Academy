/* ===================== 🌿 Древо навыков: главная страница ===================== */
/* Первый экран — радиальное меню: в центре Academy Skills, по кругу разделы, у каждого раздела
   ветка подменю. На узких экранах то же меню раскладывается вертикальным деревом. */
const HUB = { open: null, mode: "", ro: null };
const HUB_IC = {
  spark: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6.3 6.3l2.8 2.8M14.9 14.9l2.8 2.8M6.3 17.7l2.8-2.8M14.9 9.1l2.8-2.8"/>',
  stack: '<path d="M12 3 3 8l9 5 9-5-9-5Z"/><path d="m3 13 9 5 9-5"/>',
  star: '<path d="m12 3 2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 16.6 6.6 19.5l1.2-6L3.3 9.3l6.1-.7L12 3Z"/>',
  check: '<circle cx="12" cy="12" r="8.5"/><path d="m8.5 12.2 2.4 2.4 4.8-5"/>',
  brain: '<path d="M9 4.5a3 3 0 0 0-3 3v.3A3 3 0 0 0 4.5 13 3 3 0 0 0 7 18a3 3 0 0 0 5 1.5V6a2.5 2.5 0 0 0-3-1.5Z"/><path d="M15 4.5a3 3 0 0 1 3 3v.3A3 3 0 0 1 19.5 13 3 3 0 0 1 17 18a3 3 0 0 1-5 1.5"/>',
  term: '<rect x="3.5" y="5" width="17" height="14" rx="2.5"/><path d="m7.5 10 2.5 2-2.5 2M12.5 15h4"/>',
  chart: '<path d="M4 19h16"/><path d="M7 16v-4M12 16V8M17 16v-6"/>',
  info: '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5M12 8h.01"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M12 3.5v2.2M12 18.3v2.2M3.5 12h2.2M18.3 12h2.2M6 6l1.6 1.6M16.4 16.4 18 18M6 18l1.6-1.6M16.4 7.6 18 6"/>'
};
const hubSA = () => !!(window.claude && window.claude.standalone);
function hubGo(tab, sel){
  selectTab(tab);
  if (tab === "admin") { try { renderAdmin(); } catch(e) {} }
  if (sel) setTimeout(() => { const t = document.querySelector(sel); if (!t) return; t.scrollIntoView({ block: "center", behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" }); if (/^(TEXTAREA|INPUT|SELECT)$/.test(t.tagName)) t.focus({ preventScroll: true }); }, 120);
}
function hubTest(mode){ selectTab("test"); setTimeout(() => { const b = document.querySelector('#t-mode [data-mode="' + mode + '"]'); if (b) b.click(); }, 60); }
function hubJarvis(){ const b = $("#jv-btn"); if (b) b.click(); }
function hubTree(){
  const T = [
    { id: "new", t: "Создать", ic: "spark", d: "Новый навык по любой теме", sub: [["Новый навык", () => hubGo("new", "#topic")], ["Идеи тем", () => hubGo("new", "#examples")], ["Уровень и формат", () => hubGo("new", "#fmt-seg")]] },
    { id: "lib", t: "Навыки", ic: "stack", d: "Библиотека готовых навыков", sub: [["Библиотека", () => hubGo("lib")]].concat(hubSA() ? [] : [["Мои навыки", () => hubGo("mine")]]) },
    { id: "prem", t: "Premium", ic: "star", d: "Навыки на " + PREMIUM_AT + "–10 баллов", sub: [["Premium-навыки", () => hubGo("prem")]].concat(typeof fireOn === "function" && fireOn() && !hubSA() ? [["Огоньки 🔥", () => fireNeed()]] : []) },
    { id: "test", t: "Тест", ic: "check", d: "Проверка навыка на задачах", sub: [["Одна задача", () => hubTest("one")], ["Тест из файла", () => hubTest("batch")], ["Анализ ответа", () => hubTest("answer")]] },
    { id: "mem", t: "Память", ic: "brain", d: "Мозг и уроки академии", sub: [["Мозг академии", () => hubGo("mem")], ["Журнал уроков", () => hubGo("mem", ".lessons")]] },
    { id: "prompt", t: "Промпты", ic: "term", d: "Терминал промптов", sub: [["Терминал промптов", () => hubGo("prompt")]] },
    { id: "dash", t: "Обзор", ic: "chart", d: "Статистика библиотеки", sub: [["Статистика", () => hubGo("dash")]] },
    { id: "info", t: "О сайте", ic: "info", d: "Справка, безопасность, приложение", sub: [["Как это работает", () => hubGo("info")], ["Безопасность", () => hubGo("security")], ["Приложение", () => hubGo("app")], ["Голосовой помощник", hubJarvis]] }
  ];
  if (ACCESS.owner && !ACCESS.preview && !hubSA()) T.push({ id: "admin", t: "Кабинет", ic: "gear", d: "Огоньки, офис, сервис", sub: [["Огоньки", () => hubGo("admin", "#adm-fire")], ["Офис", () => hubGo("admin", ".office")], ["Сервисные работы", () => hubGo("admin", ".maint-panel")], ["Весь кабинет", () => hubGo("admin")]] });
  return T;
}
const hubSvg = (k, cls) => '<svg class="' + (cls || "hub-ic") + '" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">' + (HUB_IC[k] || "") + '</svg>';
function hubCount(id){ try { if (id === "lib") return LIB.filter(x => !isPrem(x)).length; if (id === "prem") return LIB.filter(isPrem).length; if (id === "mem") return arr(MEM.lessons).length; } catch(e) {} return null; }

function renderHub(){
  const host = $("#hub"); if (!host) return;
  const W = host.clientWidth || 360, mode = W >= 620 ? "radial" : "tree";
  HUB.mode = mode; host.innerHTML = ""; host.className = "hub hub-" + mode;
  const T = hubTree();
  if (mode === "tree") return renderHubTree(host, T);
  const S = Math.min(W, 700), H = S, cx = S / 2, cy = H / 2, R = S * 0.33, nd = Math.max(70, Math.min(88, S * 0.125));
  const stage = el("div", "hub-stage"); stage.style.width = S + "px"; stage.style.height = H + "px";
  const NS = "http://www.w3.org/2000/svg", svg = document.createElementNS(NS, "svg");
  svg.setAttribute("viewBox", "0 0 " + S + " " + H); svg.setAttribute("class", "hub-svg"); svg.setAttribute("aria-hidden", "true");
  const mk = (tag, at) => { const e = document.createElementNS(NS, tag); Object.entries(at).forEach(([k, v]) => e.setAttribute(k, v)); return e; };
  svg.append(mk("circle", { cx, cy, r: R, class: "hub-orbit" }), mk("circle", { cx, cy, r: S * 0.155, class: "hub-ring hub-spin" }), mk("circle", { cx, cy, r: S * 0.19, class: "hub-ring2 hub-spin-r" }));
  const pts = T.map((n, i) => { const a = -Math.PI / 2 + i * 2 * Math.PI / T.length; return { n, a, x: cx + R * Math.cos(a), y: cy + R * Math.sin(a) }; });
  pts.forEach((p, i) => {
    const r0 = S * 0.125, x0 = cx + r0 * Math.cos(p.a), y0 = cy + r0 * Math.sin(p.a), x1 = cx + (R - nd / 2) * Math.cos(p.a), y1 = cy + (R - nd / 2) * Math.sin(p.a);
    const ln = mk("line", { x1: x0, y1: y0, x2: x1, y2: y1, class: "hub-spoke", "data-id": p.n.id }); svg.append(ln);
    svg.append(mk("circle", { cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, r: 3, class: "hub-joint" }));
    const dot = mk("circle", { r: 2.6, class: "hub-pulse" });
    const am = mk("animateMotion", { dur: (3.2 + (i % 3) * 0.7) + "s", repeatCount: "indefinite", path: "M" + x0 + "," + y0 + " L" + x1 + "," + y1, begin: (i * 0.35) + "s" });
    dot.append(am); svg.append(dot);
  });
  stage.append(svg);
  const branch = document.createElementNS(NS, "g"); branch.setAttribute("class", "hub-branch"); svg.append(branch);
  // центр
  const c = el("div", "hub-core"); c.style.width = c.style.height = (S * 0.25) + "px"; c.style.left = (cx - S * 0.125) + "px"; c.style.top = (cy - S * 0.125) + "px";
  c.append(el("span", "hub-core-k", "Academy"), el("b", null, "SKILLS"), el("span", "hub-core-s", "выбери раздел"));
  stage.append(c);
  // узлы
  const leaves = el("div", "hub-leaves"); stage.append(leaves);
  pts.forEach((p, i) => {
    const b = el("button", "hub-node"); b.type = "button"; b.dataset.id = p.n.id; b.style.left = (p.x - nd / 2) + "px"; b.style.top = (p.y - nd / 2) + "px"; b.style.width = b.style.height = nd + "px";
    b.style.animationDelay = (i * -0.7) + "s"; b.setAttribute("aria-expanded", "false"); b.setAttribute("aria-label", p.n.t + ": " + p.n.d);
    b.innerHTML = hubSvg(p.n.ic); const cnt = hubCount(p.n.id); if (cnt != null) b.append(el("i", "hub-cnt", String(cnt)));
    const lb = el("span", "hub-lbl", p.n.t); lb.dataset.id = p.n.id; lb.style.left = p.x + "px"; lb.style.top = (p.y + nd / 2 + 6) + "px";
    const open = () => hubOpen(p, stage, branch, leaves, { S, cx, cy, R, nd });
    b.onclick = ev => { ev.stopPropagation(); if (HUB.open === p.n.id) { p.n.sub[0][1](); return; } open(); };
    b.onmouseenter = () => { if (matchMedia("(hover: hover)").matches) open(); };
    b.onfocus = open;
    stage.append(b, lb);
  });
  stage.addEventListener("mouseleave", () => { if (matchMedia("(hover: hover)").matches) hubClose(stage, branch, leaves); });
  host.append(stage);
  host.append(el("p", "hub-hint", "Наведи или нажми на раздел — откроется ветка. Второе нажатие открывает раздел."));
  if (HUB.open) { const p = pts.find(x => x.n.id === HUB.open); if (p) hubOpen(p, stage, branch, leaves, { S, cx, cy, R, nd }); }
}
function hubClose(stage, branch, leaves){
  HUB.open = null; branch.innerHTML = ""; leaves.innerHTML = "";
  stage.querySelectorAll(".hub-node").forEach(n => { n.classList.remove("on"); n.setAttribute("aria-expanded", "false"); });
  stage.querySelectorAll(".hub-spoke").forEach(l => l.classList.remove("on"));
  stage.querySelectorAll(".hub-lbl").forEach(l => l.classList.remove("off"));
  const core = stage.querySelector(".hub-core"); if (core) { core.querySelector(".hub-core-s").textContent = "выбери раздел"; }
}
function hubOpen(p, stage, branch, leaves, g){
  if (HUB.open === p.n.id && leaves.childElementCount) return;
  hubClose(stage, branch, leaves); HUB.open = p.n.id;
  const node = stage.querySelector('.hub-node[data-id="' + p.n.id + '"]'); if (node) { node.classList.add("on"); node.setAttribute("aria-expanded", "true"); }
  stage.querySelectorAll('.hub-spoke[data-id="' + p.n.id + '"]').forEach(l => l.classList.add("on"));
  stage.querySelector(".hub-core-s").textContent = p.n.d;
  const lbl = stage.querySelector('.hub-lbl[data-id="' + p.n.id + '"]'); if (lbl) lbl.classList.add("off");
  const NS = "http://www.w3.org/2000/svg", items = p.n.sub, k = items.length, LR = g.R + g.nd * 0.5 + 74, spread = 0.34;
  items.forEach(([label, fn], j) => {
    const a = p.a + (j - (k - 1) / 2) * spread, lx = g.cx + LR * Math.cos(a), ly = g.cy + LR * Math.sin(a);
    const bx = p.x + (g.nd / 2) * Math.cos(a), by = p.y + (g.nd / 2) * Math.sin(a);
    const path = document.createElementNS(NS, "path");
    const mx = (bx + lx) / 2 + 10 * Math.cos(p.a + Math.PI / 2) * (j - (k - 1) / 2), my = (by + ly) / 2 + 10 * Math.sin(p.a + Math.PI / 2) * (j - (k - 1) / 2);
    path.setAttribute("d", "M" + bx + "," + by + " Q" + mx + "," + my + " " + lx + "," + ly); path.setAttribute("class", "hub-twig"); path.style.animationDelay = (j * 60) + "ms";
    branch.append(path);
    const b = el("button", "hub-leaf", label); b.type = "button"; b.style.animationDelay = (80 + j * 60) + "ms";
    b.onclick = ev => { ev.stopPropagation(); fn(); };
    leaves.append(b);
    const w = b.offsetWidth || 120, h = b.offsetHeight || 32;
    let left = lx - w / 2, top = ly - h / 2;
    const sr = stage.getBoundingClientRect(), vw = document.documentElement.clientWidth;
    left = Math.max(8 - sr.left, Math.min(vw - sr.left - w - 8, left)); top = Math.max(4, Math.min(g.S - h - 4, top));
    b.style.left = left + "px"; b.style.top = top + "px";
  });
}
function renderHubTree(host, T){
  const top = el("div", "hubt-root"); top.append(el("span", "hub-core-k", "Academy"), el("b", null, "SKILLS"));
  const list = el("ul", "hubt");
  T.forEach((n, i) => {
    const li = el("li", "hubt-n" + (HUB.open === n.id ? " open" : "")); li.style.animationDelay = (i * 50) + "ms";
    const b = el("button", "hubt-b"); b.type = "button"; b.setAttribute("aria-expanded", String(HUB.open === n.id));
    const ic = el("span", "hubt-ic"); ic.innerHTML = hubSvg(n.ic);
    const tx = el("span", "hubt-tx"); tx.append(el("b", null, n.t), el("small", null, n.d));
    b.append(ic, tx); const cnt = hubCount(n.id); if (cnt != null) b.append(el("i", "hub-cnt", String(cnt)));
    b.onclick = () => { HUB.open = HUB.open === n.id ? null : n.id; renderHub(); };
    const sub = el("ul", "hubt-sub");
    n.sub.forEach(([label, fn], j) => { const s = el("li"); s.style.animationDelay = (j * 50) + "ms"; const sb = el("button", "hub-leaf", label); sb.type = "button"; sb.onclick = fn; s.append(sb); sub.append(s); });
    li.append(b, sub); list.append(li);
  });
  host.append(top, list);
}

/* ---------- главная как отдельный «раздел» ---------- */
NAV_NAMES.home = "Главная";
selectTab = (f => function(n, fromBack){
  if (n === "home") {
    if (!fromBack && NAV.cur !== "home") { NAV.stack.push({ tab: NAV.cur, y: window.scrollY }); if (NAV.stack.length > 30) NAV.stack.shift(); }
    f("__none__", true); NAV.cur = "home";
  } else f(n, fromBack);
  const home = n === "home"; $("#view-home").classList.toggle("hidden", !home); document.body.classList.toggle("on-home", home);
  if (home) { window.scrollTo(0, 0); renderHub(); }
  navSync();
})(selectTab);
navBack = function(){ const p = NAV.stack.pop(); selectTab(p ? p.tab : "home", true); const y = p ? p.y : 0; requestAnimationFrame(() => requestAnimationFrame(() => window.scrollTo(0, y))); };
navSync = function(){
  document.querySelectorAll(".view").forEach(v => { let bar = v.querySelector(":scope > .backbar");
    if (!bar) { bar = el("div", "backbar"); const b = el("button", "back-btn"); b.type = "button"; bar.append(b); v.prepend(bar); }
    bar.firstChild.onclick = () => navBack();
    const prev = NAV.stack[NAV.stack.length - 1], to = v.id === "view-home" ? null : (prev ? prev.tab : "home");
    bar.hidden = !to; if (to) { const b = bar.firstChild; b.textContent = "←"; b.title = "Назад: " + (NAV_NAMES[to] || "на главную"); b.setAttribute("aria-label", b.title); } });
};
(function hubInit(){
  const v = el("div", "view hidden"); v.id = "view-home";
  const hd = el("section", "hub-hero"); hd.append(el("h1", null, "Древо навыков"), el("p", null, "Самообучающаяся академия: создавай, проверяй и собирай навыки для Claude."));
  const host = el("div", "hub"); host.id = "hub";
  v.append(hd, host);
  const first = document.querySelector(".wrap > .view"); first.parentNode.insertBefore(v, first);
  const toHome = ev => { if (ev) ev.preventDefault(); selectTab("home"); };
  const hl = $("#home-link"); if (hl) hl.onclick = toHome; const ht = document.querySelector(".home-title b"); if (ht) ht.onclick = toHome;
  const tabs = document.querySelector(".tabs");
  if (tabs && !$("#tab-home")) { const t = el("button", "tab tab-home", "⌂ Главная"); t.id = "tab-home"; t.type = "button"; t.setAttribute("role", "tab"); t.onclick = () => selectTab("home"); tabs.prepend(t); }
  let last = 0; HUB.ro = new ResizeObserver(() => { const w = host.clientWidth; if (Math.abs(w - last) < 8 || NAV.cur !== "home") return; last = w; renderHub(); }); HUB.ro.observe(host);
  document.addEventListener("click", ev => { if (NAV.cur !== "home" || HUB.mode !== "radial" || !HUB.open) return; if (ev.target.closest && ev.target.closest(".hub-node,.hub-leaf")) return; HUB.open = null; renderHub(); });
  try { if (!localStorage.getItem("ca-theme")) { THEME.pref = "light"; applyTheme(); } } catch(e) {}
  selectTab("home", true);
})();
/* ---------- шапка по центру, робот-гид наверху справа ---------- */
(function hubHeader(){
  const top = document.querySelector("header.top"); if (!top || top.querySelector(".top-c")) return;
  const L = el("div", "top-l"), C = el("div", "top-c"), R = el("div", "top-r");
  const menu = $("#info-btn"), link = $("#home-link"), title = top.querySelector(".home-title");
  if (menu) L.append(menu);
  if (link) C.append(link); if (title) C.append(title);
  ["#fire-pill", "#jv-btn", "#prof-btn"].forEach(id => { const x = $(id); if (x) R.append(x); });
  top.prepend(L, C, R);
  const placeRobot = () => { const fab = $("#guide-fab"); if (fab && fab.parentNode !== R) R.append(fab); const bub = $("#guide-bubble"); if (bub && bub.parentNode !== R) R.append(bub); };
  placeRobot(); setTimeout(placeRobot, 300); setTimeout(placeRobot, 1500);
  // плашка фонового статуса робота — под шапкой
  const rs = document.querySelector(".rb-status"); if (rs) R.append(rs);
})();
applyConfig = (f => function(){ f(); if (NAV.cur === "home") try { renderHub(); } catch(e) {} })(applyConfig);
/* ===================== конец древа навыков ===================== */
