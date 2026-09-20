/**
 * Copy pdf.js worker into public/ as .js so production Nginx serves a stable
 * application/javascript URL (hashed /_astro/*.mjs often fails module fetch).
 */
import { copyFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = join(root, "node_modules", "pdfjs-dist", "build", "pdf.worker.min.mjs");
const destDir = join(root, "public");
const dest = join(destDir, "pdf.worker.min.js");

mkdirSync(destDir, { recursive: true });
copyFileSync(src, dest);
console.log(`copied pdf.worker → ${dest}`);
