// Shared data validation used by `npm run check` and the local admin API.
// Every function returns a list of human-readable problems (an empty list means valid).

export const ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const MENU_IMAGE = /^images\/menu\/[a-z0-9-]+\.(webp|jpg|jpeg|png|avif)(\?v=\d+)?$/;

const isObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value);

export function menuProblems(menu) {
  const problems = [];
  if (!isObject(menu) || !Array.isArray(menu.categories)) return ["menu.json must be an object with a `categories` array."];
  const categoryIds = new Set();
  const itemIds = new Set();
  for (const category of menu.categories) {
    const where = `category "${category?.id}"`;
    if (!isObject(category) || !ID.test(category.id ?? "")) { problems.push(`${where}: id must be lowercase letters, digits and dashes.`); continue; }
    if (categoryIds.has(category.id)) problems.push(`${where}: duplicate category id.`);
    categoryIds.add(category.id);
    if (typeof category.name !== "string" || !category.name.trim()) problems.push(`${where}: missing name.`);
    if (category.nameAlt !== undefined && category.nameAlt !== null && typeof category.nameAlt !== "string") problems.push(`${where}: nameAlt must be text or null.`);
    if (!Array.isArray(category.items)) { problems.push(`${where}: items must be an array.`); continue; }
    for (const item of category.items) {
      const label = `item "${item?.id}"`;
      if (!isObject(item) || !ID.test(item.id ?? "")) { problems.push(`${where}: an item has an invalid id.`); continue; }
      if (itemIds.has(item.id)) problems.push(`${label}: duplicate item id.`);
      itemIds.add(item.id);
      if (typeof item.name !== "string" || !item.name.trim()) problems.push(`${label}: missing name.`);
      if (item.nameAlt !== undefined && item.nameAlt !== null && typeof item.nameAlt !== "string") problems.push(`${label}: nameAlt must be text or null.`);
      if (item.price !== null && !(typeof item.price === "number" && Number.isFinite(item.price) && item.price > 0)) problems.push(`${label}: price must be a number above 0, or null when unknown.`);
      if (item.image !== null && !(typeof item.image === "string" && MENU_IMAGE.test(item.image))) problems.push(`${label}: image must be null or a path like images/menu/${item.id}.jpg.`);
      if (item.imageAlt !== undefined && typeof item.imageAlt !== "string") problems.push(`${label}: imageAlt must be text.`);
      if (item.description !== undefined && (typeof item.description !== "string" || item.description.length > 600)) problems.push(`${label}: description must be text up to 600 characters.`);
    }
  }
  return problems;
}

export function galleryProblems(gallery) {
  if (!isObject(gallery) || !Array.isArray(gallery.images)) return ["gallery.json must be an object with an `images` array."];
  const problems = [];
  gallery.images.forEach((image, index) => {
    for (const key of ["thumb", "full", "alt"]) if (typeof image?.[key] !== "string" || !image[key]) problems.push(`gallery image ${index + 1}: missing "${key}".`);
  });
  return problems;
}

export function siteProblems(site, defaults) {
  const problems = [];
  if (!isObject(site)) return ["site.json must be an object."];
  for (const key of ["name", "language", "direction"]) if (typeof site[key] !== "string" || !site[key]) problems.push(`site.${key} is required.`);
  if (!["ltr", "rtl"].includes(site.direction)) problems.push('site.direction must be "ltr" or "rtl".');
  const currency = site.currency;
  if (!isObject(currency)) problems.push("site.currency is required.");
  else {
    if (typeof currency.locale !== "string") problems.push("site.currency.locale is required (e.g. en-US).");
    else { try { new Intl.NumberFormat(currency.locale); } catch { problems.push(`site.currency.locale "${currency.locale}" is not a valid locale.`); } }
    if (!["before", "after"].includes(currency.labelPosition)) problems.push('site.currency.labelPosition must be "before" or "after".');
    if (!(typeof currency.unit === "number" && currency.unit > 0)) problems.push("site.currency.unit must be a number above 0.");
  }
  if (isObject(site.labels) && defaults) {
    for (const key of Object.keys(defaults.labels)) if (!(key in site.labels)) problems.push(`site.labels.${key} is missing.`);
  } else problems.push("site.labels is required.");
  const maps = site.maps ?? {};
  if ((maps.providers ?? []).length && !(Number.isFinite(maps.lat) && Number.isFinite(maps.lng))) problems.push("site.maps.lat and site.maps.lng are required when map providers are listed.");
  return problems;
}
