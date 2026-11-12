export const TILE_W = 128;
export const TILE_H = 64;
export const ORIGIN = { x: 700, y: 70 };

/** tile coordinates → screen coordinates of the tile's top corner */
export function iso(x: number, y: number) {
  return { x: (x - y) * (TILE_W / 2) + ORIGIN.x, y: (x + y) * (TILE_H / 2) + ORIGIN.y };
}

export function diamond(x: number, y: number, w: number, d: number) {
  const a = iso(x, y);
  const b = iso(x + w, y);
  const c = iso(x + w, y + d);
  const e = iso(x, y + d);
  return `${a.x},${a.y} ${b.x},${b.y} ${c.x},${c.y} ${e.x},${e.y}`;
}

function hexToRgb(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function rgbToHex(r: number, g: number, b: number) {
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
  return `#${c(r)}${c(g)}${c(b)}`;
}
export function shade(hex: string, amount: number) {
  // amount in -1..1 ; negative darkens, positive lightens toward white
  const [r, g, b] = hexToRgb(hex);
  if (amount >= 0) return rgbToHex(r + (255 - r) * amount, g + (255 - g) * amount, b + (255 - b) * amount);
  return rgbToHex(r * (1 + amount), g * (1 + amount), b * (1 + amount));
}
