// Copies the site files from the repository root into app/ so the desktop app ships the same build.
const fs = require("fs"), path = require("path");
const root = path.join(__dirname, ".."), out = path.join(__dirname, "app");
const files = ["index.html", "standalone.js", "manifest.webmanifest", "icon.svg", "icon-192.png", "icon-512.png", "favicon.ico"];
fs.rmSync(out, { recursive: true, force: true }); fs.mkdirSync(out);
for (const f of files) fs.copyFileSync(path.join(root, f), path.join(out, f));
console.log("site copied to app/:", files.length, "files");
