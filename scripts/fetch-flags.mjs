#!/usr/bin/env node
/**
 * Downloads the country flag set into `public/flags/`.
 *
 * Flags are stored locally rather than pulled from a CDN at runtime, matching
 * how every other third-party asset in this repo is handled. Source is
 * `flag-icons` by Panayiotis Lipiridis (MIT). Run once after cloning:
 *
 *   node scripts/fetch-flags.mjs
 */
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(HERE, "../public/flags");
const BASE = "https://raw.githubusercontent.com/lipis/flag-icons/main/flags/4x3";

const { COUNTRIES } = await import("../src/features/profile/countries.ts").catch(() => ({}));
const codes = COUNTRIES
  ? COUNTRIES.map((country) => country.code.toLowerCase())
  : // Fallback for runtimes that cannot import TypeScript directly.
    JSON.parse(process.env.FLAG_CODES ?? "[]");

if (codes.length === 0) {
  console.error(
    "Could not read country codes. Run with a TypeScript-aware node (>=22.6 with\n" +
      "--experimental-strip-types) or pass FLAG_CODES as a JSON array.",
  );
  process.exit(1);
}

await mkdir(OUT, { recursive: true });

let saved = 0;
let missing = 0;
for (const code of codes) {
  const response = await fetch(`${BASE}/${code}.svg`);
  if (!response.ok) {
    missing += 1;
    continue;
  }
  await writeFile(resolve(OUT, `${code}.svg`), await response.text(), "utf8");
  saved += 1;
}

console.log(`Saved ${saved} flags to public/flags (${missing} unavailable).`);
