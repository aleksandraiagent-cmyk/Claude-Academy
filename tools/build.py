"""Build the standalone Academy Skills site from the claude.ai artifact HTML.

Usage: python3 tools/build.py <artifact.html> [index.html]

The artifact is fetched from claude.ai (Artifact → read). This script swaps the
claude.ai-only parts for the standalone runtime in standalone.js and rewrites the
texts that told visitors to open the page in claude.ai.
"""
import sys

SA = "(window.claude&&window.claude.standalone)"

PATCHES = [
    # --- head: runtime, PWA, description ---
    ('<title>Academy Skills</title>',
     '<title>Academy Skills</title>\n'
     '<meta name="description" content="Academy Skills — самообучающаяся академия навыков для Claude: создание, оценка и тестирование Skills.">\n'
     '<meta name="theme-color" content="#2F5BEA">\n'
     '<link rel="manifest" href="manifest.webmanifest">\n'
     '<link rel="icon" href="icon.svg" type="image/svg+xml">\n'
     '<link rel="apple-touch-icon" href="icon-192.png">\n'
     '<script src="standalone.js"></script>', 1),

    # --- access: everything open, no admin, no claude.ai account ---
    ('if (!(window.claude && window.claude.use)) { ACCESS.owner = true;',
     'if (!(window.claude && window.claude.use) || ' + SA + ') { ACCESS.owner = true;', 1),
    ('if (ACCESS.owner) return ["Владелец", "good"];',
     'if (' + SA + ') return ["Полный доступ", "good"]; if (ACCESS.owner) return ["Владелец", "good"];', 1),
    ('if (!ACCESS.uid) m.append(el("p", "note", "Вы не вошли.',
     'if (' + SA + ') m.append(el("p", "note", "Все разделы открыты. Навыки и настройки хранятся в этом браузере.")); else if (!ACCESS.uid) m.append(el("p", "note", "Вы не вошли.', 1),
    ('  item("📂 Мои навыки" + ', '  if (!' + SA + ') item("📂 Мои навыки" + ', 1),
    ('if (ACCESS.owner) item("⚙ Кабинет администратора"',
     'if (' + SA + ') item("🔑 Ключ Claude API", () => window.claude.settings());\n  if (ACCESS.owner && !' + SA + ') item("⚙ Кабинет администратора"', 1),
    ('if (k === "admin") { if (!ACCESS.owner)', 'if (k === "admin") { if (!ACCESS.owner || ' + SA + ')', 1),
    ('if (ACCESS.owner) { const go = el("button", "linkbtn", "Запустить обновление сейчас',
     'if (ACCESS.owner && !' + SA + ') { const go = el("button", "linkbtn", "Запустить обновление сейчас', 1),
    ('if (!u || !db) { MYS.err = "Хранилище недоступно: открой сайт в claude.ai под своим аккаунтом.";',
     'if (!u || !db) { MYS.err = ' + SA + ' ? "В этой версии сайта созданные навыки сохраняются в разделах «Навыки» и «Premium» в этом браузере." : "Хранилище недоступно: открой сайт в claude.ai под своим аккаунтом.";', 1),

    ('it("О сайте", "Как создаются навыки, разделы, подписка"', 'it("О сайте", "Как создаются навыки и что где находится"', 1),
    # --- site menu: API key item ---
    ('  it("⬇ Приложение", "Ярлык на рабочий стол и на телефон", () => selectTab("app"));',
     '  it("⬇ Приложение", "Ярлык на рабочий стол и на телефон", () => selectTab("app"));\n'
     '  if (' + SA + ') it("🔑 Ключ Claude API", window.claude.hasKey() ? "Ключ сохранён в этом браузере" : "Нужен для создания навыков и тестов", () => window.claude.settings());', 1),

    # --- errors ---
    ('const FATAL = ["not_granted", "rate_limited", "unavailable"];',
     'const FATAL = ["not_granted", "rate_limited", "unavailable", "bad_key"];', 1),
    ('if (c === "unavailable") return "Генерация работает, когда страница открыта в Claude.";',
     'if (c === "unavailable") return ' + SA + ' ? "Добавь ключ Claude API: меню ☰ → «Ключ Claude API»." : "Генерация работает, когда страница открыта в Claude.";\n'
     '  if (c === "bad_key") return "Ключ Claude API не принят" + (e.message ? " (" + e.message + ")" : "") + ". Проверь ключ: меню ☰ → «Ключ Claude API».";\n'
     '  if (c === "network") return "Нет связи с api.anthropic.com. Проверь интернет и нажми «Продолжить».";', 1),

    # --- knowledge auto-update belongs to the claude.ai version ---
    ('function cdText(t){\n  if (!t) return "";', 'function cdText(t){\n  if (!t || ' + SA + ') return "";', 1),

    # --- shortcuts point at this site ---
    ('const SITE_URL = "https://claude.ai/artifact/RQfvUomLRL18QCDzgyMmZa";',
     'const SITE_URL = ' + SA + ' ? location.href.split("#")[0].split("?")[0] : "https://claude.ai/artifact/RQfvUomLRL18QCDzgyMmZa";', 1),
    ('IconFile=https://claude.ai/favicon.ico', 'IconFile=" + new URL("favicon.ico", SITE_URL).href + "', 1),
    ('box.append(el("p", "note", "Ярлык открывает Academy Skills в claude.ai, поэтому нужен вход в аккаунт claude.ai. Это ссылка на сайт, а не',
     'box.append(el("p", "note", ' + SA + ' ? "Ярлык открывает этот сайт в браузере. На телефоне и в Chrome на компьютере сайт можно установить как приложение: он откроется в своём окне." : "Ярлык открывает Academy Skills в claude.ai, поэтому нужен вход в аккаунт claude.ai. Это ссылка на сайт, а не', 1),

    # --- info / security pages ---
    ('<li><b>Профиль</b> (кнопка справа вверху) — статус, подписка, тема оформления; у владельца — кабинет администратора.</li>',
     '<li><b>Профиль</b> (кнопка справа вверху) — тема оформления и ключ Claude API.</li>', 1),
    ('Оплата проходит на сайте PayPal, доступ привязывается к аккаунту claude.ai.</p>',
     'В этой версии сайта все разделы открыты бесплатно: нужен только свой ключ Claude API.</p>', 1),
    ('<li>Навыки, уроки и эталоны хранятся внутри этого артефакта в claude.ai.</li>\n        <li>Генерация работает, когда страница открыта в Claude. Сама страница не выходит в интернет.</li>',
     '<li>Встроенные навыки видны всем. Новые навыки, уроки и эталоны сохраняются в этом браузере (localStorage): скачивай важные навыки архивом.</li>\n'
     '        <li>Генерация работает через твой ключ Claude API (меню ☰ → «Ключ Claude API»). Ключ хранится только в этом браузере и отправляется только на api.anthropic.com.</li>', 1),
    ('<li>Навыки, уроки и эталоны хранятся внутри артефакта в claude.ai. Подписки и настройки — в хранилище артефакта: список подписчиков видит только владелец, каждый посетитель видит только свою подписку.</li>\n'
     '        <li>Вход — через аккаунт claude.ai, без отдельных паролей. Сайт хранит только внутренний ID посетителя.</li>\n'
     '        <li>Оплата проходит на сайте PayPal: данные карты и пароли сюда не попадают. Ссылки на оплату принимаются только на paypal.com и paypal.me.</li>\n'
     '        <li>Страница сама не выходит в интернет. Внешние знания обновляет Claude раз в неделю.</li>',
     '<li>Сайт не собирает данные: нет аккаунтов, оплаты и сервера. Навыки, уроки и настройки хранятся только в твоём браузере.</li>\n'
     '        <li>Ключ Claude API хранится в этом браузере и отправляется только на api.anthropic.com.</li>\n'
     '        <li>Голосовой помощник использует распознавание и озвучку речи самого браузера.</li>', 1),
]


def build(src_path, out_path):
    s = open(src_path, encoding="utf-8").read()
    for old, new, n in PATCHES:
        found = s.count(old)
        if found != n:
            sys.exit(f"patch expected {n} match(es), found {found}: {old[:90]!r}")
        s = s.replace(old, new)
    open(out_path, "w", encoding="utf-8").write(s)
    print(f"{out_path}: {len(s.encode('utf-8')):,} bytes")


if __name__ == "__main__":
    build(sys.argv[1], sys.argv[2] if len(sys.argv) > 2 else "index.html")
