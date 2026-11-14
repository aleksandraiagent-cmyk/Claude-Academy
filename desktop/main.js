// Academy Skills desktop app: a window around the site, external links open in the default browser.
const { app, BrowserWindow, shell, session, Menu } = require("electron");
const path = require("path");

if (!app.requestSingleInstanceLock()) app.quit();

let win;
const isExternal = url => /^https?:\/\//i.test(url) || /^mailto:/i.test(url);

function createWindow() {
  win = new BrowserWindow({
    width: 1100,
    height: 860,
    minWidth: 380,
    minHeight: 560,
    title: "Academy Skills",
    icon: path.join(__dirname, "app", "icon-512.png"),
    backgroundColor: "#F5F5F4",
    autoHideMenuBar: true,
    webPreferences: { contextIsolation: true, sandbox: true, nodeIntegration: false, spellcheck: false }
  });

  // Links to claude.ai and other sites open in the user's browser, not inside the app.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (isExternal(url)) shell.openExternal(url);
    return { action: "deny" };
  });
  win.webContents.on("will-navigate", (e, url) => {
    if (isExternal(url)) { e.preventDefault(); shell.openExternal(url); }
  });

  win.loadFile(path.join(__dirname, "app", "index.html"));
}

app.on("second-instance", () => { if (win) { if (win.isMinimized()) win.restore(); win.focus(); } });

app.whenReady().then(() => {
  // Microphone for the voice assistant and clipboard for copying the topic.
  session.defaultSession.setPermissionRequestHandler((wc, permission, cb) => {
    cb(["media", "clipboard-sanitized-write", "clipboard-read"].includes(permission));
  });
  if (process.platform !== "darwin") Menu.setApplicationMenu(null);
  createWindow();
  app.on("activate", () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});

app.on("window-all-closed", () => { if (process.platform !== "darwin") app.quit(); });
