/** Loads data/site.json and fills in defaults so a missing key never breaks the page. */

export const DEFAULTS = {
  name: "My Restaurant",
  tagline: "",
  description: "",
  language: "en",
  direction: "ltr",
  siteUrl: "",
  theme: {},
  brand: { logo: "", favicon: "", faviconIco: "", appleTouchIcon: "", socialImage: "" },
  currency: { locale: "en-US", label: "$", labelPosition: "before", unit: 1, minimumFractionDigits: 2, maximumFractionDigits: 2 },
  features: { search: true, gallery: true, contact: true },
  hero: { eyebrow: "", title: "", text: "" },
  contact: { phone: null, address: "", hours: [], messaging: [], social: [] },
  maps: { lat: null, lng: null, providers: [], custom: [] },
  footer: "© {year} {name}",
  labels: {
    skipLink: "Skip to the menu",
    nav: "Main navigation",
    navMenu: "Menu",
    navGallery: "Gallery",
    navContact: "Contact",
    heroButton: "View the menu",
    menuTitle: "Menu",
    categoriesNav: "Menu categories",
    searchLabel: "Search the menu",
    searchPlaceholder: "Search…",
    searchFound: "{count} items found.",
    searchNone: "No items found.",
    emptyMessage: "Nothing matches your search.",
    loadError: "The menu could not be loaded. Please reload the page.",
    galleryTitle: "Gallery",
    contactTitle: "Contact & location",
    phone: "Phone",
    address: "Address",
    hours: "Opening hours",
    callButton: "Call us",
    directionsTitle: "Directions",
    messagingTitle: "Message us",
    socialTitle: "Follow us",
    viewPhoto: "View a larger photo of {name}",
    viewGalleryPhoto: "View larger photo {number}",
    lightboxLabel: "Photo viewer",
    lightboxClose: "Close",
    lightboxPrev: "Previous photo",
    lightboxNext: "Next photo",
    lightboxCounter: "{current} of {total}",
  },
};

/** Map apps that can be switched on with `maps.providers` in site.json. `{lat}` and `{lng}` are replaced. */
export const MAP_PROVIDERS = {
  google: { name: "Google Maps", icon: "images/maps/google.svg", url: "https://www.google.com/maps/search/?api=1&query={lat},{lng}" },
  waze: { name: "Waze", icon: "images/maps/waze.svg", url: "https://waze.com/ul?ll={lat},{lng}&navigate=yes" },
  balad: { name: "Balad", icon: "images/maps/balad.svg", url: "https://balad.ir/location?latitude={lat}&longitude={lng}#17/{lat}/{lng}" },
  neshan: { name: "Neshan", icon: "images/maps/neshan.svg", url: "https://nshn.ir/?lat={lat}&lng={lng}" },
};

const isPlainObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value);

export function merge(base, extra) {
  const result = { ...base };
  for (const [key, value] of Object.entries(extra ?? {})) {
    result[key] = isPlainObject(value) && isPlainObject(base[key]) ? merge(base[key], value) : value;
  }
  return result;
}

/** Replaces `{name}`-style placeholders. Unknown placeholders are left untouched. */
export function fillTemplate(text, values) {
  return String(text ?? "").replace(/\{(\w+)\}/g, (match, key) => (key in values ? String(values[key]) : match));
}

export async function loadJson(path) {
  const response = await fetch(path, { cache: "no-cache" });
  if (!response.ok) throw new Error(`${path}: ${response.status}`);
  return response.json();
}

export async function loadSite() {
  try {
    return merge(DEFAULTS, await loadJson("data/site.json"));
  } catch {
    return DEFAULTS;
  }
}

/** Build the list of map buttons from site.json (known providers by name, plus any custom ones). */
export function mapLinks(maps) {
  const links = [];
  if (Number.isFinite(maps.lat) && Number.isFinite(maps.lng)) {
    for (const key of maps.providers ?? []) {
      const provider = MAP_PROVIDERS[key];
      if (provider) links.push({ name: maps.names?.[key] ?? provider.name, icon: provider.icon, url: fillTemplate(provider.url, { lat: maps.lat, lng: maps.lng }) });
    }
  }
  for (const custom of maps.custom ?? []) if (custom?.url && custom?.name) links.push({ name: custom.name, icon: custom.icon ?? "", url: custom.url });
  return links;
}
