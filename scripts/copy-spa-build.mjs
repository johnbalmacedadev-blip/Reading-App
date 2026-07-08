import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const spaDir = path.join(root, "backend", "public", "spa");
const publicDir = path.join(root, "backend", "public");
const spaIndex = path.join(spaDir, "index.html");
const appHtml = path.join(publicDir, "app.html");
const assetsDir = path.join(publicDir, "assets");

if (!existsSync(spaIndex)) {
  console.error("SPA build not found. Run: npm run build:deploy");
  process.exit(1);
}

if (existsSync(assetsDir)) {
  rmSync(assetsDir, { recursive: true, force: true });
}

cpSync(path.join(spaDir, "assets"), assetsDir, { recursive: true });

let html = readFileSync(spaIndex, "utf8");
html = html.replace(/\/spa\/assets\//g, "/assets/");
writeFileSync(appHtml, html);

console.log("Copied SPA build to backend/public/app.html and backend/public/assets/");
