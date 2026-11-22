// Admin UI for data/menu.json and images/menu/.
// It talks to scripts/admin-api.mjs during `npm run dev` (this computer only) and to api.php on a PHP server.
import { createPriceFormatter } from "../js/price.js";

const TEXT = {
  en: {
    title: "Menu admin", viewSite: "View site", logout: "Log out", save: "Save changes", loginTitle: "Log in", password: "Password", login: "Log in",
    name: "Name", nameAlt: "Second name (optional)", description: "Description (optional)", add: "Add", items: "Items",
    addTo: "Add an item to “{category}”", uploadImage: "Upload photo", removeImage: "Remove photo", deleteItem: "Delete item",
    confirmDelete: "Delete “{name}” and its photo?", unsaved: "Unsaved changes", saving: "Saving…", saved: "Saved ✓", itemAdded: "Item added ✓",
    uploading: "Uploading photo…", imageSaved: "Photo saved ✓", imageRemoved: "Photo removed ✓", noPrice: "No price",
    priceLabel: "Price", priceLabelOptional: "Price (optional)", invalidPrice: "Invalid price.",
    priceNoteUnit: "Prices are numbers in units of {unit} {label}: {example} is shown on the site as {shown}.",
    priceNotePlain: "Prices are plain numbers: {example} is shown on the site as {shown}.",
    imageNote: "Photo rules: JPG, PNG or WebP, at most 15 MB, at least 800×600 pixels. The photo is cropped to 4:3 around the centre and resized to 1000×750, so keep the subject in the middle.",
    errTypes: "Only JPG, PNG or WebP files are allowed.", errSize: "The photo is larger than 15 MB.", errInvalid: "This file is not a valid image.",
    errSmall: "The photo is too small: at least {w}×{h} pixels are needed.",
    sessionExpired: "Your session expired. Please log in again.", errorStatus: "Error ({status})", badPassword: "Wrong password.",
    locked: "Too many failed attempts. Try again in 15 minutes.",
    serverDown: "The admin server did not answer. On a host, api.php must sit next to this page and PHP must be enabled; locally, use `npm run dev`.",
    notConfigured: "No admin password is set yet. Create admin/config.php as described in the README and upload it next to api.php.",
  },
  fa: {
    title: "مدیریت منو", viewSite: "مشاهده سایت", logout: "خروج", save: "ذخیره تغییرات", loginTitle: "ورود", password: "رمز عبور", login: "ورود",
    name: "نام", nameAlt: "نام دوم (اختیاری)", description: "توضیحات (اختیاری)", add: "افزودن", items: "آیتم‌ها",
    addTo: "افزودن آیتم به «{category}»", uploadImage: "آپلود تصویر", removeImage: "حذف تصویر", deleteItem: "حذف آیتم",
    confirmDelete: "آیتم «{name}» و تصویر آن حذف شود؟", unsaved: "تغییرات ذخیره نشده", saving: "در حال ذخیره…", saved: "ذخیره شد ✓", itemAdded: "آیتم اضافه شد ✓",
    uploading: "در حال آپلود تصویر…", imageSaved: "تصویر ذخیره شد ✓", imageRemoved: "تصویر حذف شد ✓", noPrice: "بدون قیمت",
    priceLabel: "قیمت", priceLabelOptional: "قیمت (اختیاری)", invalidPrice: "قیمت نامعتبر است.",
    priceNoteUnit: "قیمت‌ها به واحد {unit} {label} وارد می‌شوند: عدد {example} در سایت به‌صورت {shown} نمایش داده می‌شود.",
    priceNotePlain: "قیمت‌ها عدد ساده‌اند: عدد {example} در سایت به‌صورت {shown} نمایش داده می‌شود.",
    imageNote: "قوانین تصویر: فرمت JPG، PNG یا WebP؛ حداکثر ۱۵ مگابایت؛ حداقل ۸۰۰×۶۰۰ پیکسل. تصویر از وسط به نسبت ۴:۳ بریده و به ۱۰۰۰×۷۵۰ کوچک می‌شود، پس سوژه را وسط کادر بگیرید.",
    errTypes: "فقط فایل JPG، PNG یا WebP مجاز است.", errSize: "حجم تصویر بیشتر از ۱۵ مگابایت است.", errInvalid: "این فایل تصویر معتبر نیست.",
    errSmall: "تصویر خیلی کوچک است؛ حداقل {w}×{h} پیکسل لازم است.",
    sessionExpired: "نشست شما منقضی شده است. دوباره وارد شوید.", errorStatus: "خطا ({status})", badPassword: "رمز عبور نادرست است.",
    locked: "تلاش‌های ناموفق زیاد بود. ۱۵ دقیقه بعد دوباره امتحان کنید.",
    serverDown: "سرور مدیریت پاسخ نمی‌دهد. روی هاست، فایل api.php باید کنار این صفحه باشد و PHP فعال باشد؛ روی کامپیوتر خودتان از `npm run dev` استفاده کنید.",
    notConfigured: "رمز عبور هنوز تنظیم نشده است. فایل admin/config.php را مطابق README بسازید و کنار api.php آپلود کنید.",
  },
};

let site = { name: "", language: "en", direction: "ltr", currency: { locale: "en-US", label: "", labelPosition: "before", unit: 1, minimumFractionDigits: 2, maximumFractionDigits: 2 } };
let strings = TEXT.en;
let price = createPriceFormatter(site.currency);
let counts = new Intl.NumberFormat("en");

const t = (key, values = {}) => (strings[key] ?? key).replace(/\{(\w+)\}/g, (match, name) => (name in values ? values[name] : match));
const $ = (id) => document.getElementById(id);
const tabsEl = $("tabs"), itemsEl = $("items"), statusEl = $("status"), saveBtn = $("save"), fileInput = $("file");

let menu = { categories: [] };
let activeCategoryId = null;
let dirty = false;
let csrfToken = "";

/** `api.php` exists next to this page on a PHP server; the dev server answers at /admin/api instead. */
let apiBase = "api.php";

function apiUrl(route, query = {}) {
  return `${apiBase}?${new URLSearchParams({ route, ...query })}`;
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function setStatus(message, isError = false) {
  statusEl.textContent = message;
  statusEl.classList.toggle("is-error", isError);
}

function setDirty(value) {
  dirty = value;
  saveBtn.disabled = !value;
  if (value) setStatus(t("unsaved"));
}

async function api(route, options = {}, query = {}) {
  const headers = { ...(options.headers ?? {}) };
  if (options.method && options.method !== "GET" && csrfToken) headers["X-CSRF-Token"] = csrfToken;
  const response = await fetch(apiUrl(route, query), { ...options, headers, credentials: "same-origin" });
  const body = await response.json().catch(() => ({}));
  if (route === "login" && response.status === 401) throw new Error(t("badPassword"));
  if (route === "login" && response.status === 429) throw new Error(t("locked"));
  if (response.status === 401) { showLogin(); throw new Error(t("sessionExpired")); }
  if (!response.ok) throw new Error(body.error || t("errorStatus", { status: response.status }));
  return body;
}

async function saveMenu() {
  setStatus(t("saving"));
  try {
    await api("menu", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(menu) });
    setDirty(false);
    setStatus(t("saved"));
  } catch (error) {
    setStatus(error.message, true);
    throw error;
  }
}

const activeCategory = () => menu.categories.find((c) => c.id === activeCategoryId);
const allItems = () => menu.categories.flatMap((c) => c.items);

function slugify(text) {
  return text.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

/** Item ids become image file names, so they are limited to lowercase letters, digits and dashes. */
function uniqueId(...names) {
  const taken = new Set(allItems().map((i) => i.id));
  const base = names.map(slugify).find(Boolean) || `item-${Date.now().toString(36)}`;
  let id = base, n = 2;
  while (taken.has(id)) id = `${base}-${n++}`;
  return id;
}

function renderTabs() {
  tabsEl.replaceChildren();
  for (const category of menu.categories) {
    const li = el("li");
    const button = el("button", "", category.name);
    button.type = "button";
    button.setAttribute("aria-pressed", String(category.id === activeCategoryId));
    button.append(el("span", "n", counts.format(category.items.length)));
    button.addEventListener("click", () => { activeCategoryId = category.id; render(); });
    li.append(button);
    tabsEl.append(li);
  }
}

function placeholder() {
  const p = el("div", "placeholder", site.name);
  p.setAttribute("aria-hidden", "true");
  return p;
}

function thumb(item) {
  const box = el("div", "row__thumb");
  if (!item.image) { box.append(placeholder()); return box; }
  const img = document.createElement("img");
  img.alt = item.imageAlt ?? item.name;
  img.src = `../${item.image}`;
  img.addEventListener("error", () => box.replaceChildren(placeholder()));
  box.append(img);
  return box;
}

function field(labelText, input) {
  const label = el("label");
  label.append(el("span", "", labelText), input);
  return label;
}

function renderRow(item, category) {
  const li = el("li", "row");
  let thumbEl = thumb(item);
  li.append(thumbEl);
  const refreshThumb = () => { const fresh = thumb(item); thumbEl.replaceWith(fresh); thumbEl = fresh; };

  const name = el("input"); name.value = item.name; name.required = true;
  const nameAlt = el("input"); nameAlt.value = item.nameAlt ?? "";
  const priceInput = el("input"); priceInput.type = "number"; priceInput.min = "0"; priceInput.step = "any"; priceInput.dir = "ltr"; priceInput.inputMode = "decimal";
  priceInput.value = item.price ?? "";
  const hint = el("p", "hint");
  const updateHint = () => { hint.textContent = price.format(item.price) ?? t("noPrice"); };
  updateHint();

  name.addEventListener("input", () => {
    if (item.imageAlt === item.name) item.imageAlt = name.value.trim();
    item.name = name.value.trim();
    setDirty(true);
  });
  nameAlt.addEventListener("input", () => { item.nameAlt = nameAlt.value.trim() || null; setDirty(true); });
  priceInput.addEventListener("input", () => {
    const value = priceInput.value.trim() === "" ? null : Number(priceInput.value);
    item.price = Number.isFinite(value) && value > 0 ? value : null;
    updateHint();
    setDirty(true);
  });

  const description = el("textarea"); description.rows = 2; description.maxLength = 600; description.value = item.description ?? "";
  description.addEventListener("input", () => {
    const text = description.value.trim();
    if (text) item.description = text; else delete item.description;
    setDirty(true);
  });

  const priceWrap = el("div");
  priceWrap.append(field(t("priceLabel"), priceInput), hint);
  const fields = el("div", "row__fields");
  fields.append(field(t("name"), name), field(t("nameAlt"), nameAlt), priceWrap);
  const descriptionField = field(t("description"), description);
  descriptionField.classList.add("row__wide");
  fields.append(descriptionField);
  li.append(fields);

  const actions = el("div", "row__actions");
  const upload = el("button", "btn btn--small", t("uploadImage"));
  upload.type = "button";
  upload.addEventListener("click", () => pickImage(item, refreshThumb));

  const removeImage = el("button", "btn btn--small", t("removeImage"));
  removeImage.type = "button";
  removeImage.addEventListener("click", async () => {
    try {
      await api("image", { method: "DELETE" }, { id: item.id });
      item.image = null;
      await saveMenu();
      refreshThumb();
      setStatus(t("imageRemoved"));
    } catch (error) { setStatus(error.message, true); }
  });

  const del = el("button", "btn btn--small btn--danger", t("deleteItem"));
  del.type = "button";
  del.addEventListener("click", async () => {
    if (!confirm(t("confirmDelete", { name: item.name }))) return;
    try {
      await api("image", { method: "DELETE" }, { id: item.id });
      category.items = category.items.filter((i) => i !== item);
      await saveMenu();
      render();
    } catch (error) { setStatus(error.message, true); }
  });

  actions.append(upload, removeImage, del, el("span", "row__id", item.id));
  li.append(actions);
  return li;
}

function render() {
  const category = activeCategory();
  renderTabs();
  $("add-title").textContent = t("addTo", { category: category.name });
  $("count").textContent = `(${counts.format(category.items.length)})`;
  itemsEl.replaceChildren(...category.items.map((item) => renderRow(item, category)));
}

/* Photo rules: JPG/PNG/WebP, up to 15 MB, at least 800x600. The photo is cropped to 4:3 and resized to 1000x750 (WebP, JPEG fallback). */
const IMAGE_RULES = { types: ["image/jpeg", "image/png", "image/webp"], maxBytes: 15 * 1024 * 1024, minWidth: 800, minHeight: 600 };

async function processImage(file) {
  if (!IMAGE_RULES.types.includes(file.type)) throw new Error(t("errTypes"));
  if (file.size > IMAGE_RULES.maxBytes) throw new Error(t("errSize"));
  let bitmap;
  try { bitmap = await createImageBitmap(file); } catch { throw new Error(t("errInvalid")); }
  if (bitmap.width < IMAGE_RULES.minWidth || bitmap.height < IMAGE_RULES.minHeight) throw new Error(t("errSmall", { w: IMAGE_RULES.minWidth, h: IMAGE_RULES.minHeight }));
  const W = 1000, H = 750;
  const scale = Math.max(W / bitmap.width, H / bitmap.height);
  const sw = W / scale, sh = H / scale;
  const canvas = document.createElement("canvas");
  canvas.width = W; canvas.height = H;
  canvas.getContext("2d").drawImage(bitmap, (bitmap.width - sw) / 2, (bitmap.height - sh) / 2, sw, sh, 0, 0, W, H);
  let blob = await new Promise((r) => canvas.toBlob(r, "image/webp", 0.85));
  if (!blob || blob.type !== "image/webp") blob = await new Promise((r) => canvas.toBlob(r, "image/jpeg", 0.88));
  return blob;
}

function pickImage(item, onDone) {
  fileInput.value = "";
  fileInput.onchange = async () => {
    const file = fileInput.files[0];
    if (!file) return;
    setStatus(t("uploading"));
    try {
      const blob = await processImage(file);
      const { image } = await api("image", { method: "PUT", headers: { "Content-Type": blob.type }, body: blob }, { id: item.id });
      item.image = image;
      await saveMenu();
      onDone();
      setStatus(t("imageSaved"));
    } catch (error) { setStatus(error.message, true); }
  };
  fileInput.click();
}

$("add-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const name = form.elements.name.value.trim();
  const nameAlt = form.elements.nameAlt.value.trim();
  const priceValue = form.elements.price.value.trim();
  if (!name) return;
  const value = priceValue === "" ? null : Number(priceValue);
  if (value !== null && !(value > 0)) { setStatus(t("invalidPrice"), true); return; }
  activeCategory().items.push({ id: uniqueId(name, nameAlt), name, nameAlt: nameAlt || null, price: value, image: null, imageAlt: name });
  try {
    await saveMenu();
    form.reset();
    render();
    itemsEl.lastElementChild?.scrollIntoView({ block: "center", behavior: "smooth" });
    setStatus(t("itemAdded"));
  } catch { /* status already shown */ }
});

saveBtn.addEventListener("click", () => saveMenu().catch(() => {}));
window.addEventListener("beforeunload", (event) => { if (dirty) event.preventDefault(); });

/* Login (PHP server only) */
function showLogin(notice) {
  $("app").hidden = true;
  $("login-view").hidden = false;
  saveBtn.hidden = true;
  $("logout").hidden = true;
  const noticeEl = $("login-notice");
  noticeEl.hidden = !notice;
  noticeEl.textContent = notice ?? "";
}

async function showApp() {
  menu = await api("menu");
  activeCategoryId = menu.categories[0]?.id ?? null;
  $("login-view").hidden = true;
  $("app").hidden = false;
  saveBtn.hidden = false;
  render();
}

$("login-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  try {
    const result = await api("login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password: form.password.value }) });
    form.reset();
    csrfToken = result.csrf;
    $("logout").hidden = false;
    setStatus("");
    await showApp();
  } catch (error) {
    showLogin(error.message);
  }
});

$("logout").addEventListener("click", async () => {
  try { await api("logout", { method: "POST" }); } catch { /* already logged out */ }
  csrfToken = "";
  showLogin();
});

/** Texts, direction and price hints come from data/site.json so the admin matches the website. */
async function loadSiteSettings() {
  try {
    const response = await fetch("../data/site.json", { cache: "no-cache" });
    if (response.ok) site = { ...site, ...(await response.json()) };
  } catch { /* keep the defaults */ }
  strings = site.language?.startsWith("fa") ? TEXT.fa : TEXT.en;
  document.documentElement.lang = site.language;
  document.documentElement.dir = site.direction;
  document.title = `${t("title")} | ${site.name}`;
  $("site-name").textContent = site.name;
  price = createPriceFormatter(site.currency);
  counts = new Intl.NumberFormat(site.currency.locale);
  for (const node of document.querySelectorAll("[data-t]")) node.textContent = t(node.dataset.t);
  const example = site.currency.unit === 1 ? 4.5 : 850;
  $("price-note").textContent = site.currency.unit === 1
    ? t("priceNotePlain", { example: counts.format(example), shown: price.format(example) })
    : t("priceNoteUnit", { unit: counts.format(site.currency.unit), label: site.currency.label, example: counts.format(example), shown: price.format(example) });
  $("image-note").textContent = t("imageNote");
  $("add-price-label").textContent = t("priceLabelOptional");
}

async function start() {
  await loadSiteSettings();
  // The dev server serves /admin/api (no .php); a PHP server serves api.php.
  let session;
  for (const base of ["api.php", "/admin/api"]) {
    apiBase = base;
    try {
      const response = await fetch(apiUrl("session"), { credentials: "same-origin" });
      const type = response.headers.get("content-type") ?? "";
      if (response.ok && type.includes("application/json")) { session = await response.json(); break; }
    } catch { /* try the next one */ }
  }
  if (!session) { showLogin(t("serverDown")); $("login-form").hidden = true; return; }
  if (!session.configured) { showLogin(t("notConfigured")); $("login-form").hidden = true; return; }
  if (!session.authenticated) { showLogin(); return; }
  csrfToken = session.csrf ?? "";
  $("logout").hidden = !session.login;
  await showApp();
}

start().catch((error) => setStatus(error.message, true));
