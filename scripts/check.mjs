// `npm run check`: validates the data files, every local file reference, price formatting, search and the build output.
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { build, renderIndex, root } from "./build.mjs";
import { DEFAULTS, fillTemplate, mapLinks } from "../js/config.js";
import { createPriceFormatter } from "../js/price.js";
import { itemMatches, normalizeText } from "../js/search.js";
import { galleryProblems, menuProblems, siteProblems } from "./lib/validate.mjs";

const problems = [];
const problem = (message) => problems.push(message);
const read = (path) => readFileSync(join(root, path), "utf8");
const exists = (path) => existsSync(join(root, path.split("?")[0]));

function readJson(path) {
  try { return JSON.parse(read(path)); } catch (error) { problem(`${path}: not valid JSON (${error.message})`); return null; }
}

/* ---------- 1. Data sets: the live data/ folder and every example ---------- */
const dataSets = [["data", "data"], ...readdirSync(join(root, "examples")).map((name) => [`examples/${name}`, `examples/${name}`])];
let itemCount = 0;
for (const [label, dir] of dataSets) {
  const site = readJson(`${dir}/site.json`);
  const menu = readJson(`${dir}/menu.json`);
  const gallery = readJson(`${dir}/gallery.json`);
  if (site) for (const text of siteProblems(site, DEFAULTS)) problem(`${label}/site.json: ${text}`);
  if (menu) for (const text of menuProblems(menu)) problem(`${label}/menu.json: ${text}`);
  if (gallery) for (const text of galleryProblems(gallery)) problem(`${label}/gallery.json: ${text}`);
  if (label === "data" && menu) itemCount = menu.categories.reduce((sum, category) => sum + category.items.length, 0);

  // Every image and icon the data points at must exist (examples share the images/ folder).
  const files = [];
  for (const category of menu?.categories ?? []) for (const item of category.items ?? []) if (item.image) files.push(item.image);
  for (const image of gallery?.images ?? []) files.push(image.thumb, image.full);
  for (const value of Object.values(site?.brand ?? {})) if (value) files.push(value);
  for (const file of files) if (!exists(file)) problem(`${label}: missing file ${file}`);
  for (const key of site?.maps?.providers ?? []) if (!mapLinks({ ...site.maps, custom: [] }).length) problem(`${label}: maps provider "${key}" unknown or lat/lng missing`);
}

/* ---------- 2. index.html: ids used by main.js, local references, no root-relative URLs ---------- */
const html = read("index.html");
const main = read("js/main.js");
for (const [, id] of main.matchAll(/\$\("([\w-]+)"\)/g)) if (!html.includes(`id="${id}"`)) problem(`index.html: main.js uses #${id} but the page has no such element`);
for (const [, value] of html.matchAll(/(?:href|src)="([^"#][^"]*)"/g)) {
  if (/^(https?:|mailto:|tel:|data:)/.test(value)) continue;
  if (value.startsWith("/")) problem(`index.html: root-relative URL "${value}" breaks on GitHub Pages project sites; use a relative path`);
  else if (!exists(value)) problem(`index.html: missing file ${value}`);
}
for (const file of ["styles.css", ...readdirSync(join(root, "js")).map((name) => `js/${name}`), "admin/admin.js", "admin/index.html", "admin/admin.css"]) {
  const text = read(file);
  if (/\burl\(\s*["']?\//.test(text)) problem(`${file}: root-relative url()`);
  if (/(?:fetch|import)\(\s*["'`]\//.test(text) && file !== "admin/admin.js") problem(`${file}: root-relative fetch/import`);
  for (const [, value] of text.matchAll(/url\(\s*["']?([^)"']+)["']?\s*\)/g)) if (!/^(data:|https?:|#)/.test(value) && !exists(join(dirname(file), value))) problem(`${file}: missing file ${value}`);
}

/* ---------- 3. Price formatting, text templates, search ---------- */
try {
  const en = createPriceFormatter({ locale: "en-US", label: "$", labelPosition: "before", unit: 1, minimumFractionDigits: 2, maximumFractionDigits: 2 });
  assert.equal(en.format(4.5), "$4.50");
  assert.equal(en.format(null), null, "a missing price must not be shown as 0");
  assert.equal(en.amount(1234.5), "1,234.50");
  const fa = createPriceFormatter({ locale: "fa-IR", label: "تومان", labelPosition: "after", unit: 1000, minimumFractionDigits: 0, maximumFractionDigits: 0 });
  assert.equal(fa.format(850), "۸۵۰٬۰۰۰ تومان");
  assert.equal(createPriceFormatter({ locale: "de-DE", label: "€", labelPosition: "after", unit: 1, minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(3.5), "3,50 €");
  assert.equal(fillTemplate("{current} of {total}", { current: 1, total: 8 }), "1 of 8");
  assert.equal(normalizeText("  Café  LATTE "), "café latte");
  assert.equal(normalizeText("كباب ۱۲"), "کباب 12");
  assert.ok(itemMatches({ name: "Cheeseburger", description: "with cheddar" }, normalizeText("CHEDDAR")), "search should also look in descriptions");
  assert.ok(!itemMatches({ name: "Espresso" }, normalizeText("pizza")));
} catch (error) {
  problem(`unit test failed: ${error.message}`);
}

/* ---------- 4. Build output ---------- */
const temp = await mkdtemp(join(tmpdir(), "menu-check-"));
try {
  const site = JSON.parse(read("data/site.json"));
  const plain = join(temp, "plain");
  await build({ dist: plain });
  const required = ["index.html", "styles.css", "js/main.js", "js/config.js", "js/price.js", "js/search.js", "js/lightbox.js", "data/site.json", "data/menu.json", "data/gallery.json", "images/brand/logo.png"];
  for (const file of required) if (!existsSync(join(plain, file))) problem(`build: dist is missing ${file}`);
  if (existsSync(join(plain, "admin"))) problem("build: the plain static build must not contain admin/");
  const out = readFileSync(join(plain, "index.html"), "utf8");
  if (!out.includes(`<html lang="${site.language}" dir="${site.direction}">`)) problem("build: <html> lang/dir were not set from site.json");
  if (!out.includes(site.name)) problem("build: site name missing from the built <head>");
  assert.ok(renderIndex(html, site).includes("<title>"), "renderIndex produced no <title>");
  const walk = (dir) => readdirSync(dir).flatMap((name) => (statSync(join(dir, name)).isDirectory() ? walk(join(dir, name)) : [join(dir, name)]));
  for (const file of walk(plain)) if (/\.php$|\.env|\.htaccess/.test(file)) problem(`build: unexpected file in the static build: ${file}`);
  const withAdmin = join(temp, "admin");
  await build({ dist: withAdmin, withAdmin: true });
  for (const file of ["admin/index.html", "admin/admin.js", "admin/api.php"]) if (!existsSync(join(withAdmin, file))) problem(`build:admin is missing ${file}`);
  if (existsSync(join(withAdmin, "admin/config.php"))) problem("build:admin must never copy admin/config.php");
} catch (error) {
  problem(`build failed: ${error.message}`);
} finally {
  await rm(temp, { recursive: true, force: true });
}

/* ---------- 5. Nothing private in the repository ---------- */
const ignored = existsSync(join(root, ".gitignore")) ? read(".gitignore").split("\n").map((line) => line.trim()) : [];
for (const pattern of ["node_modules/", "dist/", ".env", "private/", "admin/config.php"]) if (!ignored.includes(pattern)) problem(`.gitignore should list "${pattern}"`);

if (problems.length) {
  console.error(`✗ ${problems.length} problem(s):\n${problems.map((text) => `  - ${text}`).join("\n")}`);
  process.exit(1);
}
console.log(`OK: ${dataSets.length} data sets valid, ${itemCount} menu items, all file references exist, build verified.`);
