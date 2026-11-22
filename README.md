# Static Restaurant Menu Template

A responsive, customizable **static** restaurant and café menu website with food photos, categories, search, prices, a photo gallery with a lightbox, and a contact section with map links. Edit three JSON files and you have a menu website for your own business.

The public website needs **no PHP, no database, no backend and no Node.js at runtime**: it is plain HTML, CSS, JavaScript, JSON and images. Node.js is only used for the optional development server, the checks and the build. An *optional* PHP admin panel is included for editing the menu in a browser (see [Admin panel](#admin-panel-optional-needs-php)).

> The sample business is called **Sample Cafe**. Every name, phone number, address and link in `data/site.json` is placeholder content. Replace it with your own.

## Features

- Responsive layout for phones, tablets and desktops, right-to-left or left-to-right (`language` and `direction` in `data/site.json`).
- Categories with a sticky chip bar that highlights the category you are reading.
- **Search** by name, second name or description (also normalises Persian/Arabic letter variants). Can be switched off.
- Item cards with photo, name, optional second name, description and price.
- Price formatting from your currency settings (symbol before or after, decimals, local digits, a "multiply by 1000" unit). A missing price is hidden, never shown as 0.
- Missing or broken photos fall back to a neutral placeholder.
- **Photo lightbox** for menu photos and the gallery: arrow keys, swipe, close with Esc or a click outside.
- Photo **gallery** from `data/gallery.json`.
- Contact section: phone (tap to call), address, opening hours, direction buttons for Google Maps, Waze, Balad and Neshan, messaging and social links.
- Colours, texts, logo and favicon come from `data/site.json`; no code changes needed.
- English (default) and Persian examples included.
- Accessible markup: skip link, labelled controls, keyboard-friendly lightbox, reduced-motion support.

## Screenshots

Screenshots are not committed yet. To add yours:

1. Run `npm run dev` and open <http://localhost:5173/>.
2. Take screenshots (desktop and phone) and save them as `docs/screenshots/desktop.png` and `docs/screenshots/mobile.png`.
3. Add this to the top of this section:

   ```md
   ![Desktop screenshot](docs/screenshots/desktop.png)
   ![Mobile screenshot](docs/screenshots/mobile.png)
   ```

## Technology

HTML, CSS (no framework), JavaScript ES modules (no libraries), JSON data, Node.js scripts for development, checks and the build, and an optional PHP 7.4+ admin API. There are **no npm dependencies**; `npm install` is not required.

## Project structure

```text
index.html            page skeleton (texts are filled in from data/site.json)
styles.css            all styling; colours are CSS variables that site.json can override
js/
  main.js             renders menu, search, gallery, contact and footer
  config.js           loads site.json, fills in defaults, builds map links
  price.js            price formatting from the currency settings
  search.js           text normalisation and matching
  lightbox.js         photo viewer
data/
  site.json           name, branding, currency, contact, hours, maps, social links, UI texts
  menu.json           categories and items
  gallery.json        gallery photos
images/
  brand/              logo, favicons, social-sharing image
  menu/               one photo per menu item
  gallery/            gallery photos and thumbnails
  maps/               small icons for the map buttons
examples/
  english/            copy of the default data
  persian/            right-to-left Persian sample with Toman prices
admin/                OPTIONAL PHP admin panel (index.html, admin.js, api.php)
scripts/              dev server, build, check, admin password setup, example switcher
tools/                make_sample_images.py (regenerates the sample illustrations)
.github/workflows/    GitHub Pages deployment
```

## Prerequisites

- To **just use the files**: nothing. Upload them to any static host.
- For `npm run dev`, `check` and `build`: **Node.js 18 or newer** (developed on Node 26). No `npm install` needed.
- For the optional admin panel on a server: PHP 7.4+.
- To regenerate sample illustrations (optional): Python 3 with `pip install pillow`.

## Run it locally

```bash
git clone https://github.com/YOUR-USER/static-restaurant-menu-template.git
cd static-restaurant-menu-template
npm run dev
```

Open <http://localhost:5173/>. The dev server serves the project folder directly, so edits to the JSON files, CSS and JS show up after a reload. Other ports and network access:

```bash
PORT=3000 npm run dev            # another port
HOST=0.0.0.0 npm run dev         # also reachable from phones on your Wi-Fi
```

The page must be opened through an HTTP server (not by double-clicking `index.html`) because browsers block `fetch()` on `file://` URLs. Any static server works, for example `python3 -m http.server 8000`.

## Check and build

```bash
npm run check          # validates JSON, image references, prices, search and the build output
npm run build          # writes the deployable static site to dist/
npm run build:admin    # same, plus the optional PHP admin panel (never includes config.php)
```

`npm run check` fails with a list of problems such as malformed JSON, duplicate ids, a menu photo that does not exist, a root-relative URL, or a build that is missing files.

`dist/` is **generated and not committed** (it is in `.gitignore`); the GitHub Pages workflow builds it for you. The build copies `index.html`, `styles.css`, `js/`, `data/` and `images/`, and writes your name, description, language, direction and icons from `site.json` into the `<head>` of `index.html` (useful for search engines and link previews that do not run JavaScript).

## Customize it

### Branding and texts: `data/site.json`

| Key | What it does |
| --- | --- |
| `name`, `tagline`, `description` | Shown in the header, hero, footer, page title and link previews |
| `language`, `direction` | `"en"` / `"ltr"`, or `"fa"` / `"rtl"`, etc. |
| `siteUrl` | Optional full address of your site (for example `https://example.com/`). When set, the build adds absolute social-image and canonical URLs |
| `theme` | Colours: `bg`, `surface`, `text`, `muted`, `accent`, `accentDark`, `accentSoft`, `border`, `themeColor` |
| `brand` | Paths of `logo`, `favicon`, `faviconIco`, `appleTouchIcon`, `socialImage` |
| `features` | `search`, `gallery`, `contact`: set one to `false` to hide that part |
| `hero` | `eyebrow` (small line above the title), `title` (defaults to `name`), `text` (defaults to `tagline`) |
| `labels` | Every text on the page (buttons, headings, search messages, lightbox). Translate these for another language |
| `footer` | Footer text; `{year}` and `{name}` are replaced |

To replace the logo and favicons, overwrite the files in `images/brand/` (keep the names, or change the paths in `brand`). Suggested sizes: `logo.png` 256×256, `favicon-32.png` 32×32, `apple-touch-icon.png` 180×180, `og-image.jpg` 1200×630.

### Currency and prices

Prices live in `menu.json` as plain numbers. How they are shown is set by `currency` in `site.json`:

```jsonc
"currency": {
  "locale": "en-US",        // number format: en-US, de-DE, fa-IR, ar-EG, ...
  "label": "$",             // "$", "€", "USD", "Toman", ...
  "labelPosition": "before",// "before" -> $4.50   "after" -> 4,50 €
  "unit": 1,                // multiplier: 1000 turns the number 850 into 850,000
  "minimumFractionDigits": 2,
  "maximumFractionDigits": 2
}
```

Examples: `en-US` with `$` shows `$4.50`; `fa-IR` with `تومان`, `unit` 1000 and `labelPosition` `"after"` shows `۸۵۰٬۰۰۰ تومان` for the number `850`. Use `"price": null` for an item without a price (nothing is shown).

### Contact details, hours, social links and maps

```json
"contact": {
  "phone": { "display": "+1 555 010 0100", "href": "+15550100100" },
  "address": "123 Example Street, Sample City",
  "hours": ["Monday – Friday: 8:00 – 22:00", "Saturday – Sunday: 9:00 – 23:00"],
  "messaging": [{ "name": "WhatsApp", "url": "https://wa.me/15550100100" }],
  "social": [{ "name": "Instagram", "url": "https://instagram.com/yourname" }]
},
"maps": {
  "lat": 40.748817,
  "lng": -73.985428,
  "providers": ["google", "waze"],
  "custom": [{ "name": "Apple Maps", "url": "https://maps.apple.com/?ll=40.748817,-73.985428" }]
}
```

- `phone.href` is the dialable number (international format, no spaces).
- Remove any part you do not need (an empty `hours` list, no `messaging`, …) and its row disappears. If the whole contact section is empty it is hidden together with its menu link.
- `maps.providers` can contain `google`, `waze`, `balad` and `neshan`. Buttons are built from `lat` and `lng` (find yours by right-clicking your place in Google Maps and copying the coordinates). `custom` adds any other app or link; `icon` is optional. To rename a provider, add `"names": { "balad": "..." }` to `maps`.

### Menu: `data/menu.json`

```json
{
  "categories": [
    {
      "id": "pizza",
      "name": "Pizza",
      "nameAlt": null,
      "items": [
        {
          "id": "margherita-pizza",
          "name": "Margherita",
          "nameAlt": null,
          "description": "Tomato sauce, mozzarella and fresh basil.",
          "price": 9,
          "image": "images/menu/margherita-pizza.jpg",
          "imageAlt": "A margherita pizza"
        }
      ]
    }
  ]
}
```

| Field | Rules |
| --- | --- |
| `id` | Lowercase letters, digits and dashes (`margherita-pizza`). Unique across the whole menu |
| `name` | Required |
| `nameAlt` | Optional second name (another language or script), or `null` |
| `description` | Optional, up to 600 characters |
| `price` | A number above 0, or `null` for no price |
| `image` | `images/menu/<file>` with `.jpg`, `.jpeg`, `.png`, `.webp` or `.avif`, or `null` for the placeholder |
| `imageAlt` | Short text for screen readers; defaults to the name |

**Add an item:** copy an existing item inside the right category's `items` list, give it a new unique `id`, and set its fields. Categories appear in file order.

**Edit an item or a price:** change the field and reload.

**Remove an item or category:** delete its object (and its photo file if you like). Run `npm run check`: it reports leftover mistakes such as duplicate ids and missing photos.

**Add a category:** add an object with `id`, `name`, `nameAlt` and `items` to `categories`.

### Item photos

1. Put the photo in `images/menu/`. Landscape 4:3 photos at about 1000×750 pixels (JPEG or WebP, under 300 KB) look best; cards crop to 4:3.
2. Set the item's `image` to that path.
3. Run `npm run check` to confirm the file exists.

Photos open in the lightbox at their full size, so avoid files larger than about 1 MB.

### Gallery: `data/gallery.json`

```json
{
  "images": [
    { "thumb": "images/gallery/photo-1-thumb.jpg", "full": "images/gallery/photo-1.jpg", "alt": "Our dining room" }
  ]
}
```

Make a small square-ish `thumb` (about 480×360) and a larger `full` (about 1200×900) for each photo. Set `"gallery": false` under `features` (or use an empty `images` list) to hide the section.

### Another language

```bash
npm run example:persian    # copies examples/persian/* into data/ (right-to-left, Toman prices, Persian labels)
npm run example:english    # restores the default English data
```

These commands **overwrite** `data/site.json`, `menu.json` and `gallery.json`. To translate to a new language, copy `examples/english` to `examples/<your-language>`, edit the three files (`language`, `direction` and every entry of `labels`), then run `node scripts/use-example.mjs <your-language>`. `npm run check` validates every folder in `examples/` too.

## Deploy the static site

The website uses only relative URLs, so it works at a domain root (`https://example.com/`) **and** in a sub-folder such as a GitHub Pages project site (`https://user.github.io/repo/`) without a base path setting. Open the site with a trailing slash (`/repo/`); GitHub Pages redirects `/repo` for you. It does not depend on a particular domain. Deployment to the hosts below has **not been tested by the author of this template**; the steps follow each platform's documentation.

### GitHub Pages (recommended: automatic)

1. Push the repository to GitHub (see below).
2. In the repository open **Settings → Pages → Build and deployment → Source** and choose **GitHub Actions**.
3. Push to `main` (or run the workflow from the **Actions** tab). `.github/workflows/pages.yml` runs `npm run check`, `npm run build` and publishes `dist/`.
4. Your site appears at `https://YOUR-USER.github.io/YOUR-REPO/`.

Without Actions you can also publish a build manually: run `npm run build` and upload the *contents* of `dist/` to a branch or folder that Pages serves.

### Netlify

Import the repository. `netlify.toml` already sets the build command `npm run build` and the publish directory `dist`. You can also drag the `dist/` folder onto Netlify's manual deploy page.

### Cloudflare Pages

Create a project from the repository with **Build command** `npm run build` and **Build output directory** `dist`. Set `NODE_VERSION` to `18` or higher if the default is older.

### Any other static host or a shared host

Run `npm run build` and upload the contents of `dist/` to your web root (for example `public_html`).

## Admin panel (optional, needs PHP)

The `admin/` folder is a small browser editor for `data/menu.json` and the item photos. It is **not part of the static website** and is not included in `npm run build`. It needs a real server-side language, so describe it honestly:

- **On your computer:** `npm run dev` serves it at <http://localhost:5173/admin/>. It is available only from the same computer (loopback address check) and edits your local `data/menu.json` and `images/menu/`. No password, no PHP needed. You then commit and deploy the changed files.
- **On a PHP server (7.4+):** run `npm run build:admin`, upload `dist/` (it includes `admin/`), and create a password file:

  ```bash
  npm run admin:setup
  ```

  This asks for a password (at least 10 characters) and writes `private/config.php`, which holds only a salted PBKDF2 hash. Upload it as `admin/config.php` on the server (next to `api.php`). Then open `https://your-site/admin/` and log in. The file `private/config.php` is git-ignored: never commit it.
- **What it does:** add, edit and delete items, edit names, descriptions and prices, upload and remove item photos (checked against the photo rules shown on the page: JPG/PNG/WebP, at most 15 MB, at least 800×600, cropped to 4:3 and resized to 1000×750 in your browser).
- **Requirements and limits:** PHP 7.4+ with write permission on `data/` and `images/menu/`; HTTPS is strongly recommended. Login is rate-limited (5 failures, 15 minutes), uses an HttpOnly same-site session cookie and a CSRF token. It edits **menu items only**: `site.json` and the gallery are edited by hand. It cannot work on GitHub Pages, Netlify (without a PHP runtime) or any purely static host. Changes made through the live admin exist only on that server; they do not update your repository, and re-uploading a fresh build overwrites them.
- The admin UI is available in English and Persian (chosen from `language` in `site.json`). Its price hints follow your currency settings.
- It has not been security-audited. Treat it as a convenience for a small site, use a strong unique password, and remove `admin/` from the server if you do not need it.

## Troubleshooting

| Problem | Fix |
| --- | --- |
| Blank page, "menu could not be loaded" | You opened the file directly. Use `npm run dev` or any HTTP server |
| `Port 5173 is already in use` | `PORT=3000 npm run dev` |
| Photo shows the grey placeholder | The path in `image` is wrong or the file is missing; run `npm run check` |
| Changes do not appear | Hard-reload (Ctrl/Cmd + Shift + R); the browser may have cached JSON or images |
| Prices look 1000× too small or large | Check `currency.unit` in `site.json` |
| Page works at `/` but not on GitHub Pages | Make sure you pushed the whole repository and the Pages source is "GitHub Actions"; open the URL with a trailing slash |
| Map buttons missing | Set `maps.lat`, `maps.lng` and at least one provider |
| Admin: "No admin password is set yet" | Create `admin/config.php` with `npm run admin:setup` and upload it |
| Admin: "server did not answer" | `api.php` must be next to `admin/index.html` and PHP must be enabled; locally use `npm run dev` |
| `npm run check` fails | Read the listed problems; each names the file and the item |

## License and attribution

The code is released under the [MIT License](LICENSE). Replace the copyright line in `LICENSE` with your own name before you publish.

All sample images (menu illustrations, gallery images, logo, favicons, map-button icons) were drawn for this template by `tools/make_sample_images.py` and the SVG files in `images/maps/`; they are original and covered by the same license. The map icons are simple stand-ins, not the official logos of Google Maps, Waze, Balad or Neshan, which are trademarks of their owners. **Do not copy photographs, logos or text from other websites** (for example food-delivery apps) into your menu unless you have the right to use them.
