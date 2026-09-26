/**
 * Load EDUARDOOS_* from .eoschool/.env (or parent .env) and upsert published pack to Mongo.
 */
import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function loadEnv(rel) {
  const p = path.join(root, rel);
  if (!fs.existsSync(p)) return;
  for (const line of fs.readFileSync(p, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 1) continue;
    const k = t.slice(0, i).trim();
    let v = t.slice(i + 1).trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    process.env[k] = v;
  }
}

loadEnv(".eoschool/.env");
if (!process.env.EDUARDOOS_API_KEY) loadEnv("../.env");
if (!process.env.EDUARDOOS_BASE_URL) {
  process.env.EDUARDOOS_BASE_URL = "https://eduardoos.com";
}

const hasKey = Boolean((process.env.EDUARDOOS_API_KEY || "").trim());
const base = (process.env.EDUARDOOS_BASE_URL || "").replace(/\/$/, "");
console.log(`mongo sync: key=${hasKey ? "set" : "MISSING"} base=${base}`);
if (!hasKey || !base) process.exit(1);

const child = spawn(process.execPath, ["scripts/build-homescool-curriculum.mjs"], {
  stdio: "inherit",
  env: process.env,
  cwd: root,
});
child.on("exit", (code) => process.exit(code ?? 1));
