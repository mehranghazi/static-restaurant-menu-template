// Zero-dependency build: copies the public website into dist/ and bakes data/site.json into the <head> of index.html.
//   npm run build               static site only (works on any static host)
//   npm run build:admin         also copies the optional PHP admin panel (never admin/config.php)
import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const escapeHtml = (text) => String(text ?? "").replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Social-sharing tags need absolute URLs, so they are only absolute when `siteUrl` is set in site.json. */
function absolute(path, siteUrl) {
  if (!path || !siteUrl) return path ?? "";
  return new URL(path, siteUrl.endsWith("/") ? siteUrl : `${siteUrl}/`).href;
}

export function renderSeo(site) {
  const title = [site.name, site.labels?.menuTitle].filter(Boolean).join(" | ");
  const brand = site.brand ?? {};
  const lines = [
    `<title>${escapeHtml(title)}</title>`,
    `<meta name="description" content="${escapeHtml(site.description)}">`,
    `<meta name="theme-color" content="${escapeHtml(site.theme?.themeColor ?? "#ffffff")}">`,
    `<meta property="og:type" content="website">`,
    `<meta property="og:site_name" content="${escapeHtml(site.name)}">`,
    `<meta property="og:title" content="${escapeHtml(title)}">`,
    `<meta property="og:description" content="${escapeHtml(site.description)}">`,
  ];
  if (brand.socialImage) lines.push(`<meta property="og:image" content="${escapeHtml(absolute(brand.socialImage, site.siteUrl))}">`);
  if (site.siteUrl) lines.push(`<meta property="og:url" content="${escapeHtml(site.siteUrl)}">`, `<link rel="canonical" href="${escapeHtml(site.siteUrl)}">`);
  if (brand.faviconIco) lines.push(`<link rel="icon" href="${escapeHtml(brand.faviconIco)}" sizes="any">`);
  if (brand.favicon) lines.push(`<link rel="icon" href="${escapeHtml(brand.favicon)}" type="image/png" sizes="32x32">`);
  if (brand.appleTouchIcon) lines.push(`<link rel="apple-touch-icon" href="${escapeHtml(brand.appleTouchIcon)}">`);
  return lines.map((line) => `  ${line}`).join("\n");
}

export function renderIndex(html, site) {
  return html
    .replace(/<html[^>]*>/, `<html lang="${escapeHtml(site.language)}" dir="${escapeHtml(site.direction)}">`)
    .replace(/(<!-- seo:start[^>]*-->\n)[\s\S]*?(\n\s*<!-- seo:end -->)/, (_, start, end) => `${start}${renderSeo(site)}${end}`);
}

const skip = (source) => !/(^|\/)(\.DS_Store|config\.php|config\.php\.bak|config\.example\.php|\.gitkeep)$/.test(source);

export async function build({ withAdmin = false, dist = join(root, "dist") } = {}) {
  await rm(dist, { recursive: true, force: true });
  await mkdir(dist, { recursive: true });

  const site = JSON.parse(await readFile(join(root, "data", "site.json"), "utf8"));
  await writeFile(join(dist, "index.html"), renderIndex(await readFile(join(root, "index.html"), "utf8"), site));
  await cp(join(root, "styles.css"), join(dist, "styles.css"));
  for (const dir of ["js", "data", "images"]) await cp(join(root, dir), join(dist, dir), { recursive: true, filter: skip });
  if (withAdmin) await cp(join(root, "admin"), join(dist, "admin"), { recursive: true, filter: skip });
  await writeFile(join(dist, ".nojekyll"), ""); // stops GitHub Pages from running Jekyll on the files
  return { dist, withAdmin };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const withAdmin = process.argv.includes("--with-admin");
  const { dist } = await build({ withAdmin });
  console.log(`Built ${dist}${withAdmin ? " (including the optional PHP admin panel)" : ""}`);
}
