/** Normalizes text so that different keyboards and scripts match (also handles Persian/Arabic variants). */
export function normalizeText(value) {
  return String(value ?? "")
    .normalize("NFKC")
    .replace(/[يى]/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/[‌‍]/g, "")
    .replace(/[ً-ٟـ]/g, "")
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

/** An item matches when the query appears in its name, alternative name or description. */
export function itemMatches(item, normalizedQuery) {
  if (!normalizedQuery) return true;
  return [item.name, item.nameAlt, item.description].some((text) => normalizeText(text).includes(normalizedQuery));
}
