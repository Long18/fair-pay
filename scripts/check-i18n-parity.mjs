#!/usr/bin/env node
/**
 * Checks translation key parity between en.json and vi.json.
 * Exits with code 1 when any key is missing from either side, 0 when clean.
 *
 * Usage: node scripts/check-i18n-parity.mjs
 */

import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, "..");

const EN_PATH = resolve(projectRoot, "src/locales/en.json");
const VI_PATH = resolve(projectRoot, "src/locales/vi.json");

/**
 * Recursively collect dot-notation key paths for all leaf values in an object.
 * Arrays are treated as leaf values (compared structurally by parent key).
 */
function collectKeyPaths(value, prefix = "", paths = new Set()) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    if (prefix) {
      paths.add(prefix);
    }
    return paths;
  }

  const keys = Object.keys(value);
  if (keys.length === 0 && prefix) {
    paths.add(prefix);
    return paths;
  }

  for (const key of keys) {
    const nextPrefix = prefix ? `${prefix}.${key}` : key;
    collectKeyPaths(value[key], nextPrefix, paths);
  }

  return paths;
}

async function loadLocale(path) {
  try {
    const raw = await readFile(path, "utf-8");
    return JSON.parse(raw);
  } catch (error) {
    console.error(`[i18n-parity] Failed to load ${path}: ${error.message}`);
    process.exit(1);
  }
}

function diffSorted(setA, setB) {
  const missing = [];
  for (const key of setA) {
    if (!setB.has(key)) {
      missing.push(key);
    }
  }
  return missing.sort();
}

function printList(label, items) {
  console.log(`\n${label} (${items.length}):`);
  if (items.length === 0) {
    console.log("  (none)");
    return;
  }
  for (const item of items) {
    console.log(`  - ${item}`);
  }
}

async function main() {
  const [enLocale, viLocale] = await Promise.all([
    loadLocale(EN_PATH),
    loadLocale(VI_PATH),
  ]);

  const enKeys = collectKeyPaths(enLocale);
  const viKeys = collectKeyPaths(viLocale);

  const missingFromVi = diffSorted(enKeys, viKeys);
  const missingFromEn = diffSorted(viKeys, enKeys);

  console.log("[i18n-parity] Checking translation key parity");
  console.log(`  en.json keys: ${enKeys.size}`);
  console.log(`  vi.json keys: ${viKeys.size}`);

  printList("Keys present in en.json but missing in vi.json", missingFromVi);
  printList("Keys present in vi.json but missing in en.json", missingFromEn);

  if (missingFromVi.length === 0 && missingFromEn.length === 0) {
    console.log("\n[i18n-parity] Locales are in sync.");
    process.exit(0);
  }

  console.error("\n[i18n-parity] Locale mismatch detected.");
  process.exit(1);
}

main().catch((error) => {
  console.error("[i18n-parity] Unexpected failure:", error);
  process.exit(1);
});
