/**
 * Price formatting driven by `currency` in data/site.json.
 *
 *   locale                 number format, e.g. "en-US" ($1,234.50) or "fa-IR" (Persian digits)
 *   label                  "$", "€", "USD", "تومان", …
 *   labelPosition          "before" ($4.50) or "after" (850,000 تومان)
 *   unit                   multiplier applied to the number in menu.json. With unit 1000, a price of 850 shows as 850,000.
 *   minimum/maximumFractionDigits   decimals shown
 *
 * A missing price (null) is never shown as 0: the formatter returns null.
 */
export function createPriceFormatter(currency) {
  const numberFormat = new Intl.NumberFormat(currency.locale, {
    useGrouping: true,
    minimumFractionDigits: currency.minimumFractionDigits ?? 0,
    maximumFractionDigits: currency.maximumFractionDigits ?? 0,
  });
  const unit = Number.isFinite(currency.unit) ? currency.unit : 1;
  const label = currency.label ?? "";
  const position = currency.labelPosition === "after" ? "after" : "before";

  /** Just the number, e.g. "4.50", or null when the price is missing. */
  function amount(price) {
    if (typeof price !== "number" || !Number.isFinite(price)) return null;
    return numberFormat.format(Number((price * unit).toFixed(6)));
  }

  /** Number plus currency label as one string, or null when the price is missing. */
  function format(price) {
    const value = amount(price);
    if (value === null) return null;
    if (!label) return value;
    return position === "after" ? `${value} ${label}` : `${label}${/^[A-Za-z]/.test(label) ? " " : ""}${value}`;
  }

  return { amount, format, label, position };
}
