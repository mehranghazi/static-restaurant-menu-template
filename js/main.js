import { fillTemplate, loadJson, loadSite, mapLinks } from "./config.js";
import { createPriceFormatter } from "./price.js";
import { itemMatches, normalizeText } from "./search.js";
import { configureLightbox, openLightbox } from "./lightbox.js";

const $ = (id) => document.getElementById(id);

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

const site = await loadSite();
const labels = site.labels;
const counts = new Intl.NumberFormat(site.currency.locale);
const price = createPriceFormatter(site.currency);

/* ---------- Page-wide settings: language, direction, colours, head tags ---------- */
function applySiteSettings() {
  const root = document.documentElement;
  root.lang = site.language;
  root.dir = site.direction;

  const { theme } = site;
  const cssVars = { bg: "--bg", surface: "--surface", text: "--text", muted: "--muted", accent: "--accent", accentDark: "--accent-dark", accentSoft: "--accent-soft", border: "--border" };
  for (const [key, cssVar] of Object.entries(cssVars)) if (theme[key]) root.style.setProperty(cssVar, theme[key]);

  const title = [site.name, labels.menuTitle].filter(Boolean).join(" | ");
  document.title = title;
  const setMeta = (selector, attribute, value) => {
    const node = document.querySelector(selector);
    if (node && value) node.setAttribute(attribute, value);
  };
  setMeta('meta[name="description"]', "content", site.description);
  setMeta('meta[name="theme-color"]', "content", theme.themeColor);
  setMeta('meta[property="og:title"]', "content", title);
  setMeta('meta[property="og:description"]', "content", site.description);
  setMeta('meta[property="og:site_name"]', "content", site.name);
  setMeta('meta[property="og:image"]', "content", site.brand.socialImage);
  setMeta('link[rel="icon"][sizes="any"]', "href", site.brand.faviconIco);
  setMeta('link[rel="icon"][type="image/png"]', "href", site.brand.favicon);
  setMeta('link[rel="apple-touch-icon"]', "href", site.brand.appleTouchIcon);
}

/* ---------- Text labels ---------- */
function applyLabels() {
  for (const node of document.querySelectorAll("[data-label]")) {
    const text = labels[node.dataset.label];
    if (text !== undefined) node.textContent = text;
  }
  for (const node of document.querySelectorAll("[data-label-aria]")) node.setAttribute("aria-label", labels[node.dataset.labelAria] ?? "");
  $("menu-search").placeholder = labels.searchPlaceholder;
  $("empty-message").textContent = labels.emptyMessage;
  document.querySelectorAll("[data-site-name]").forEach((node) => { node.textContent = site.name; });
  $("hero-title").textContent = site.hero.title || site.name;
  const eyebrow = $("hero-eyebrow");
  eyebrow.textContent = site.hero.eyebrow || "";
  eyebrow.hidden = !site.hero.eyebrow;
  const text = $("hero-text");
  text.textContent = site.hero.text || site.tagline || "";
  text.hidden = !text.textContent;
}

function applyBranding() {
  for (const logo of document.querySelectorAll("[data-logo]")) {
    if (site.brand.logo) { logo.src = site.brand.logo; logo.hidden = false; } else logo.hidden = true;
  }
  $("hero-logo").alt = site.name;
}

applySiteSettings();
applyLabels();
applyBranding();
configureLightbox({
  label: labels.lightboxLabel, close: labels.lightboxClose, prev: labels.lightboxPrev, next: labels.lightboxNext,
  counter: labels.lightboxCounter, locale: site.currency.locale,
});

/* ---------- Menu ---------- */
const navList = $("category-nav");
const content = $("menu-content");
const searchInput = $("menu-search");
const searchStatus = $("search-status");
const emptyMessage = $("empty-message");

async function loadCategories() {
  try {
    return (await loadJson("data/menu.json")).categories;
  } catch {
    emptyMessage.textContent = labels.loadError;
    emptyMessage.hidden = false;
    return [];
  }
}

const categories = await loadCategories();

function createPlaceholder() {
  const placeholder = el("div", "placeholder", site.name);
  placeholder.setAttribute("aria-hidden", "true");
  return placeholder;
}

function createMedia(item, onOpen) {
  const media = el("div", "card__media");
  if (item.image) {
    const zoom = el("button", "card__zoom");
    zoom.type = "button";
    zoom.setAttribute("aria-label", fillTemplate(labels.viewPhoto, { name: item.name }));
    const img = document.createElement("img");
    img.src = item.image;
    img.alt = item.imageAlt ?? item.name;
    img.width = 800;
    img.height = 600;
    img.loading = "lazy";
    img.decoding = "async";
    img.addEventListener("error", () => {
      item.image = null; // a missing file falls back to the placeholder
      zoom.remove();
      media.append(createPlaceholder());
    });
    zoom.append(img);
    zoom.addEventListener("click", () => onOpen(zoom));
    media.append(zoom);
  } else {
    media.append(createPlaceholder());
  }
  return media;
}

function createCard(item, onOpen) {
  const card = el("li", "card");
  card.append(createMedia(item, onOpen));

  const body = el("div", "card__body");
  body.append(el("h4", "card__name", item.name));
  if (item.nameAlt) body.append(el("p", "card__alt", item.nameAlt));
  if (item.description) body.append(el("p", "card__desc", item.description));
  const amount = price.amount(item.price);
  if (amount !== null) {
    const row = el("p", "card__price");
    const value = el("span", "card__amount", amount);
    const currency = price.label ? el("span", "card__currency", price.label) : null;
    if (currency && price.position === "before") {
      row.append(currency, value);
      if (!/^[A-Za-z]/.test(price.label)) row.classList.add("card__price--symbol"); // "$4.50": no gap after a symbol
    }
    else row.append(value, ...(currency ? [currency] : []));
    body.append(row);
  }
  card.append(body);
  return card;
}

/** The photo viewer steps through the items currently shown (respecting the search filter). */
function openItemPhoto(item, trigger) {
  const shown = [];
  for (const category of categories) {
    for (const { item: other, node } of sections.get(category.id).cards) {
      if (!node.hidden && other.image) shown.push(other);
    }
  }
  const list = shown.map((other) => {
    const formatted = price.format(other.price);
    return { src: other.image, alt: other.imageAlt ?? other.name, caption: formatted === null ? other.name : `${other.name} — ${formatted}` };
  });
  openLightbox(list, Math.max(0, shown.indexOf(item)), trigger);
}

const sections = new Map();
const chips = new Map();

for (const category of categories) {
  const section = el("section", "category");
  section.id = `cat-${category.id}`;
  section.setAttribute("aria-labelledby", `cat-title-${category.id}`);

  const heading = el("div", "category__heading");
  const title = el("h3", "category__title", category.name);
  title.id = `cat-title-${category.id}`;
  heading.append(title);
  if (category.nameAlt) heading.append(el("span", "category__alt", category.nameAlt));

  const list = el("ul", "grid");
  const cards = category.items.map((item) => ({ item, node: createCard(item, (trigger) => openItemPhoto(item, trigger)) }));
  cards.forEach(({ node }) => list.append(node));

  section.append(heading, list);
  content.append(section);
  sections.set(category.id, { section, cards });

  const li = el("li");
  const link = el("a", "chip", category.name);
  link.href = `#cat-${category.id}`;
  li.append(link);
  navList.append(li);
  chips.set(category.id, { li, link });
}

/* ---------- Search ---------- */
function applySearch() {
  const query = normalizeText(searchInput.value);
  let totalMatches = 0;

  for (const category of categories) {
    const { section, cards } = sections.get(category.id);
    let matches = 0;
    for (const { item, node } of cards) {
      const visible = itemMatches(item, query);
      node.hidden = !visible;
      if (visible) matches += 1;
    }
    section.hidden = matches === 0;
    chips.get(category.id).li.hidden = matches === 0;
    totalMatches += matches;
  }

  emptyMessage.hidden = totalMatches !== 0;
  searchStatus.textContent = query
    ? totalMatches ? fillTemplate(labels.searchFound, { count: counts.format(totalMatches) }) : labels.searchNone
    : "";
  observeSections();
}

$("search-block").hidden = !site.features.search;
if (site.features.search) searchInput.addEventListener("input", applySearch);

/* ---------- Highlight the chip of the category currently in view ---------- */
let activeId = null;
const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function setActive(id) {
  if (id === activeId) return;
  activeId = id;
  for (const [categoryId, { link }] of chips) {
    if (categoryId === id) {
      link.setAttribute("aria-current", "true");
      link.scrollIntoView({ inline: "center", block: "nearest", behavior: reducedMotion() ? "auto" : "smooth" });
    } else {
      link.removeAttribute("aria-current");
    }
  }
}

function updateActiveCategory() {
  const offset = $("category-nav-wrap").getBoundingClientRect().bottom + 16;
  let current = null;
  for (const category of categories) {
    const { section } = sections.get(category.id);
    if (section.hidden) continue;
    if (section.getBoundingClientRect().top <= offset) current = category.id;
  }
  setActive(current);
}

let ticking = false;
function observeSections() {
  if (ticking) return;
  ticking = true;
  requestAnimationFrame(() => {
    ticking = false;
    updateActiveCategory();
  });
}
window.addEventListener("scroll", observeSections, { passive: true });
window.addEventListener("resize", observeSections);

/* ---------- Gallery (data/gallery.json) ---------- */
async function renderGallery() {
  const section = $("gallery");
  if (!site.features.gallery) return;
  try {
    const { images } = await loadJson("data/gallery.json");
    if (!images.length) return;
    const list = images.map((image) => ({ src: image.full, alt: image.alt }));
    images.forEach((image, i) => {
      const li = el("li", "gallery__item");
      const open = el("button", "gallery__open");
      open.type = "button";
      open.setAttribute("aria-label", fillTemplate(labels.viewGalleryPhoto, { number: counts.format(i + 1) }));
      const img = document.createElement("img");
      img.src = image.thumb;
      img.alt = image.alt;
      img.width = 320;
      img.height = 320;
      img.loading = "lazy";
      img.decoding = "async";
      open.append(img);
      open.addEventListener("click", () => openLightbox(list, i, open));
      li.append(open);
      $("gallery-grid").append(li);
    });
    section.hidden = false;
  } catch {
    section.hidden = true; // no gallery file: the section simply stays hidden
  }
}

/* ---------- Contact, maps, footer ---------- */
function linkList(container, links) {
  for (const link of links) {
    const li = el("li");
    const a = el("a", "contact__link", link.name);
    a.href = link.url;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    li.append(a);
    container.append(li);
  }
}

function renderContact() {
  const { contact } = site;
  const section = $("contact");
  const maps = mapLinks(site.maps);
  const hasContent = contact.phone || contact.address || contact.hours.length || maps.length || contact.messaging.length || contact.social.length;
  const nav = document.querySelector('a[href="#contact"]');
  if (!site.features.contact || !hasContent) {
    section.hidden = true;
    if (nav) nav.hidden = true;
    return;
  }

  const showRow = (id, visible) => { $(id).hidden = !visible; };
  showRow("row-phone", Boolean(contact.phone));
  if (contact.phone) {
    const phone = $("contact-phone");
    phone.textContent = contact.phone.display;
    phone.href = `tel:${contact.phone.href}`;
    const call = $("call-button");
    call.href = `tel:${contact.phone.href}`;
    call.hidden = false;
    const footerPhone = $("footer-phone");
    footerPhone.textContent = contact.phone.display;
    footerPhone.href = `tel:${contact.phone.href}`;
    footerPhone.hidden = false;
  }
  showRow("row-address", Boolean(contact.address));
  $("contact-address").textContent = contact.address;
  showRow("row-hours", contact.hours.length > 0);
  $("contact-hours").replaceChildren(...contact.hours.map((line) => el("li", "", line)));

  for (const [id, links] of [["maps-list", maps.map((m) => ({ ...m }))], ["messaging-list", contact.messaging], ["social-list", contact.social]]) {
    $(`${id}-block`).hidden = links.length === 0;
  }
  const mapList = $("maps-list");
  for (const link of maps) {
    const li = el("li");
    const a = el("a", "maps__link");
    a.href = link.url;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    if (link.icon) {
      const img = document.createElement("img");
      img.src = link.icon;
      img.alt = "";
      img.width = 32;
      img.height = 32;
      a.append(img);
    }
    a.append(el("span", "", link.name));
    li.append(a);
    mapList.append(li);
  }
  linkList($("messaging-list"), contact.messaging);
  linkList($("social-list"), contact.social);
}

function renderFooter() {
  const year = new Intl.DateTimeFormat(site.language, { year: "numeric" }).format(new Date());
  $("footer-text").textContent = fillTemplate(site.footer, { year, name: site.name });
}

renderGallery();
renderContact();
renderFooter();
for (const link of document.querySelectorAll('a[href="#gallery"]')) link.hidden = !site.features.gallery;
observeSections();
