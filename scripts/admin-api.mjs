// Local-only admin API used by /admin/ during `npm run dev` (it edits data/menu.json and images/menu/ on this computer).
// On a PHP server the same admin UI talks to admin/api.php instead. Routes: ?route=session|menu|image
import { mkdir, readFile, rename, rm, writeFile, copyFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { ID, menuProblems } from "./lib/validate.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const menuFile = join(root, "data", "menu.json");
const imageDir = join(root, "images", "menu");
const MAX_BYTES = 8 * 1024 * 1024;
const IMAGE_TYPES = { "image/webp": "webp", "image/jpeg": "jpg", "image/png": "png" };

/** Admin is available only from this computer: loopback client AND a localhost Host header. */
export function isLocalRequest(req) {
  const client = req.socket.remoteAddress;
  const host = (req.headers.host ?? "").replace(/:\d+$/, "");
  return ["127.0.0.1", "::1", "::ffff:127.0.0.1"].includes(client) && ["localhost", "127.0.0.1", "[::1]"].includes(host);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > MAX_BYTES) { reject(Object.assign(new Error("Body too large"), { status: 413 })); req.destroy(); return; }
      chunks.push(chunk);
    });
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

function validateMenu(menu) {
  const problems = menuProblems(menu);
  if (problems.length) throw Object.assign(new Error(problems[0]), { status: 400 });
}

async function writeMenu(menu) {
  validateMenu(menu);
  if (existsSync(menuFile)) await copyFile(menuFile, `${menuFile}.bak`);
  const temp = `${menuFile}.tmp`;
  await writeFile(temp, JSON.stringify(menu, null, 2) + "\n");
  await rename(temp, menuFile);
}

function json(res, status, body) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" }).end(JSON.stringify(body));
}

/** Returns true when the request was handled. */
export async function handleAdminApi(req, res, url) {
  if (url.pathname !== "/admin/api" && url.pathname !== "/admin/api/") return false;
  try {
    if (!isLocalRequest(req)) return json(res, 403, { error: "Admin is only available on this computer." }), true;
    // Block cross-site writes from other web pages.
    const origin = req.headers.origin;
    if (req.method !== "GET" && origin && new URL(origin).host !== req.headers.host) return json(res, 403, { error: "Bad origin" }), true;

    const route = url.searchParams.get("route") ?? "";

    if (route === "session" && req.method === "GET") {
      json(res, 200, { authenticated: true, configured: true, login: false, csrf: "" });
    } else if (route === "menu" && req.method === "GET") {
      json(res, 200, JSON.parse(await readFile(menuFile, "utf8")));
    } else if (route === "menu" && req.method === "PUT") {
      await writeMenu(JSON.parse((await readBody(req)).toString("utf8")));
      json(res, 200, { ok: true });
    } else if (route === "image" && req.method === "PUT") {
      const id = url.searchParams.get("id") ?? "";
      const extension = IMAGE_TYPES[(req.headers["content-type"] ?? "").split(";")[0]];
      if (!ID.test(id) || !extension) return json(res, 400, { error: "Invalid id or image type" }), true;
      const body = await readBody(req);
      if (!body.length) return json(res, 400, { error: "Empty image" }), true;
      await mkdir(imageDir, { recursive: true });
      // Remove other formats of the same item so only one file exists per id.
      for (const other of Object.values(IMAGE_TYPES)) if (other !== extension) await rm(join(imageDir, `${id}.${other}`), { force: true });
      await writeFile(join(imageDir, `${id}.${extension}`), body);
      json(res, 200, { image: `images/menu/${id}.${extension}?v=${Date.now()}` });
    } else if (route === "image" && req.method === "DELETE") {
      const id = url.searchParams.get("id") ?? "";
      if (!ID.test(id)) return json(res, 400, { error: "Invalid id" }), true;
      for (const extension of Object.values(IMAGE_TYPES)) await rm(join(imageDir, `${id}.${extension}`), { force: true });
      json(res, 200, { ok: true });
    } else {
      json(res, 404, { error: "Not found" });
    }
  } catch (error) {
    json(res, error.status ?? 500, { error: error.status ? error.message : "Server error" });
  }
  return true;
}
