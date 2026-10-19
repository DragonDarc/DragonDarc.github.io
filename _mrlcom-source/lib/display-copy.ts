// Remove decorative sentence stops from Thai copy while keeping dates, URLs,
// decimal numbers and short abbreviations such as ม.4, สสวท. and ต.ค.
export function cleanDisplayCopy(value: string): string {
  return value
    .replace(/(^|\s)\.+(?=\s|$)/g, '$1')
    .replace(/([\u0E00-\u0E7F]{6,})\.(?=\s|$)/g, '$1')
    .replace(/\s{2,}/g, ' ')
    .trim();
}
