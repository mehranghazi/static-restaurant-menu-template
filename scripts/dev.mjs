// Tiny local development server: serves the project folder as-is (no build step needed).
//   npm run dev                         http://localhost:5173
//   PORT=3000 npm run dev               another port
//   HOST=0.0.0.0 npm run dev            also reachable from other devices on your network
// The optional admin panel is served at /admin/ for this computer only.
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { networkInterfaces } from "node:os";
import { dirname, extname, join, normalize, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { handleAdminApi, isLocalRequest } from "./admin-api.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const port = Number(process.env.PORT) || 5173;
const host = process.env.HOST || "127.0.0.1";
const publicEntries = ["index.html", "styles.css", "js", "data", "images", "admin"];
const types = {
  ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml", ".webp": "image/webp", ".avif": "image/avif", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".ico": "image/x-icon",
};

const server = createServer(async (req, res) => {
  const url = new URL(req.url, "http://x");
  if (await handleAdminApi(req, res, url)) return;

  let path = decodeURIComponent(url.pathname);
  if (path.endsWith("/")) path += "index.html";
  const entry = path.split("/")[1];
  if (!publicEntries.includes(entry) || path.includes("config.php")) { res.writeHead(404).end("Not found"); return; }
  if (entry === "admin" && !isLocalRequest(req)) { res.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" }).end("The admin panel is only available on the computer running the server."); return; }

  const file = normalize(join(root, path));
  if (!file.startsWith(root + sep)) { res.writeHead(403).end(); return; }
  try {
    if ((await stat(file)).isDirectory()) { res.writeHead(301, { Location: `${path}/` }).end(); return; }
    res.writeHead(200, { "Content-Type": types[extname(file)] ?? "application/octet-stream", "Cache-Control": "no-cache" }).end(await readFile(file));
  } catch {
    res.writeHead(404).end("Not found");
  }
});

server.on("error", (error) => {
  console.error(error.code === "EADDRINUSE" ? `Port ${port} is already in use. Try: PORT=3000 npm run dev` : error.message);
  process.exit(1);
});

server.listen(port, host, () => {
  console.log(`Menu website:\n  Local:  http://localhost:${port}/\n  Admin:  http://localhost:${port}/admin/  (this computer only)`);
  if (host === "0.0.0.0") {
    for (const nets of Object.values(networkInterfaces()))
      for (const net of nets ?? []) if (net.family === "IPv4" && !net.internal) console.log(`  Network: http://${net.address}:${port}/`);
  }
});
