/** Import existing browser preferences without clearing the original storage. */
const aliases: Record<string, string> = {
  mindlab: "mindora", queens: "thrones", tango: "eclipse", zip: "dash",
};
const rename = (text: string) => text.replace(
  /(^|[/:._-])(mindlab|queens|tango|zip)(?=$|[/:._-])/g,
  (_match, prefix: string, word: string) => prefix + aliases[word],
);
function convert(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(convert);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [rename(key), convert(item)]));
  }
  return typeof value === "string" ? rename(value) : value;
}

export function migrateBrandStorage(storage: Storage): void {
  for (const key of Object.keys(storage)) {
    const next = rename(key);
    if (key === next || storage.getItem(next) !== null) continue;
    const raw = storage.getItem(key);
    if (raw === null) continue;
    let migrated = raw;
    // Tokens/guest identity strings are opaque. Only cosmetic/config JSON is mapped.
    if (/skin|config|setting/.test(key)) {
      try { migrated = JSON.stringify(convert(JSON.parse(raw))); } catch { /* Keep old bytes. */ }
    }
    storage.setItem(next, migrated);
  }
}

try { migrateBrandStorage(window.localStorage); } catch { /* Storage may be disabled. */ }
