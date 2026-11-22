// Copies an example (data/site.json, menu.json and gallery.json) from examples/<name>/ into data/.
//   npm run example:persian     right-to-left Persian sample with Toman prices
//   npm run example:english     restores the default English sample
import { cp, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const name = process.argv[2];
const source = join(root, "examples", name ?? "");
if (!name || !existsSync(source)) {
  console.error(`Usage: node scripts/use-example.mjs <name>\nAvailable: ${(await readdir(join(root, "examples"))).join(", ")}`);
  process.exit(1);
}
for (const file of await readdir(source)) await cp(join(source, file), join(root, "data", file));
console.log(`Copied examples/${name}/* into data/. Reload the page to see it.`);
