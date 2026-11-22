/** Full-screen photo viewer: click a photo to open it large, then step through with buttons, arrow keys or a swipe. */
import { fillTemplate } from "./config.js";

let labels = { label: "Photo viewer", close: "Close", prev: "Previous photo", next: "Next photo", counter: "{current} of {total}", locale: "en" };

let dialog;
let figureImg;
let captionEl;
let counterEl;
let closeBtn;
let prevBtn;
let nextBtn;
let items = [];
let index = 0;
let opener = null;

/** Texts come from `labels` in data/site.json; call once before the first open. */
export function configureLightbox(options) {
  labels = { ...labels, ...options };
  if (dialog) applyLabels();
}

const isRtl = () => getComputedStyle(document.documentElement).direction === "rtl";

function button(className) {
  const node = document.createElement("button");
  node.type = "button";
  node.className = className;
  return node;
}

function applyLabels() {
  dialog.setAttribute("aria-label", labels.label);
  closeBtn.setAttribute("aria-label", labels.close);
  prevBtn.setAttribute("aria-label", labels.prev);
  nextBtn.setAttribute("aria-label", labels.next);
  // Arrows point the way the page reads: "previous" is on the start side of the screen.
  prevBtn.textContent = isRtl() ? "›" : "‹";
  nextBtn.textContent = isRtl() ? "‹" : "›";
}

function build() {
  dialog = document.createElement("dialog");
  dialog.className = "lightbox";

  closeBtn = button("lightbox__btn lightbox__close");
  closeBtn.textContent = "×";
  prevBtn = button("lightbox__btn lightbox__prev");
  nextBtn = button("lightbox__btn lightbox__next");

  const figure = document.createElement("figure");
  figure.className = "lightbox__figure";
  figureImg = document.createElement("img");
  figureImg.className = "lightbox__img";
  const figcaption = document.createElement("figcaption");
  figcaption.className = "lightbox__caption";
  captionEl = document.createElement("span");
  captionEl.className = "lightbox__title";
  counterEl = document.createElement("span");
  counterEl.className = "lightbox__counter";
  figcaption.append(captionEl, counterEl);
  figure.append(figureImg, figcaption);

  dialog.append(figure, closeBtn, prevBtn, nextBtn);
  document.body.append(dialog);
  applyLabels();

  closeBtn.addEventListener("click", () => dialog.close());
  prevBtn.addEventListener("click", () => step(-1));
  nextBtn.addEventListener("click", () => step(1));
  // Clicking the dark area (not the photo or the buttons) closes the viewer.
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog || event.target === figure) dialog.close();
  });
  dialog.addEventListener("close", () => {
    document.documentElement.classList.remove("lightbox-open");
    figureImg.removeAttribute("src");
    if (opener && document.contains(opener)) opener.focus({ preventScroll: true });
    opener = null;
  });
  dialog.addEventListener("keydown", (event) => {
    const forward = isRtl() ? "ArrowLeft" : "ArrowRight";
    const backward = isRtl() ? "ArrowRight" : "ArrowLeft";
    if (event.key === forward) step(1);
    else if (event.key === backward) step(-1);
  });

  let startX = null;
  dialog.addEventListener("touchstart", (event) => { startX = event.touches[0].clientX; }, { passive: true });
  dialog.addEventListener("touchend", (event) => {
    if (startX === null) return;
    const dx = event.changedTouches[0].clientX - startX;
    startX = null;
    if (Math.abs(dx) > 50) step(dx < 0 ? 1 : -1);
  }, { passive: true });
}

function step(direction) {
  if (items.length < 2) return;
  show((index + direction + items.length) % items.length);
}

function show(i) {
  index = i;
  const item = items[i];
  const numbers = new Intl.NumberFormat(labels.locale);
  figureImg.src = item.src;
  figureImg.alt = item.alt || "";
  captionEl.textContent = item.caption || "";
  counterEl.textContent = items.length > 1 ? fillTemplate(labels.counter, { current: numbers.format(i + 1), total: numbers.format(items.length) }) : "";
  const single = items.length < 2;
  prevBtn.hidden = single;
  nextBtn.hidden = single;
  if (!single) for (const offset of [1, -1]) new Image().src = items[(i + offset + items.length) % items.length].src; // preload neighbours
}

/** @param {{src: string, alt?: string, caption?: string}[]} list @param {number} start @param {HTMLElement} trigger */
export function openLightbox(list, start, trigger) {
  if (!list.length) return;
  if (!dialog) build();
  else applyLabels();
  items = list;
  opener = trigger;
  show(start);
  document.documentElement.classList.add("lightbox-open");
  dialog.showModal();
  closeBtn.focus({ preventScroll: true });
}
