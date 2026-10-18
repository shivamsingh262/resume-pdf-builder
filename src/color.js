'use strict';
// Small color utilities for accent-color handling. Colors are always
// normalized to lowercase "#rrggbb" before they reach any CSS.

const HEX_RE = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

// Returns "#rrggbb" for "#rgb" / "#rrggbb" input, or null for anything else.
function parseHexColor(value) {
  if (typeof value !== 'string') return null;
  const s = value.trim();
  if (!HEX_RE.test(s)) return null;
  const hex = s.slice(1).toLowerCase();
  return hex.length === 3 ? `#${[...hex].map((c) => c + c).join('')}` : `#${hex}`;
}

function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgbToHex([r, g, b]) {
  const clamp = (v) => Math.max(0, Math.min(255, Math.round(v)));
  return `#${[r, g, b].map((v) => clamp(v).toString(16).padStart(2, '0')).join('')}`;
}

function rgbToHsl([r, g, b]) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h;
  if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  return [h * 60, s, l];
}

function hslToRgb([h, s, l]) {
  h = ((h % 360) + 360) % 360;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  const [r, g, b] =
    h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return [(r + m) * 255, (g + m) * 255, (b + m) * 255];
}

// WCAG 2.x relative luminance and contrast ratio.
function luminance(hex) {
  const [r, g, b] = hexToRgb(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastRatio(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

// Re-tints `color` (designed against `baseAccent`) for a different accent:
// the hue offset and relative saturation follow the new accent, while the
// original lightness is kept so the visual hierarchy stays the same.
function retint(color, baseAccent, newAccent) {
  const [ch, cs, cl] = rgbToHsl(hexToRgb(color));
  const [bh, bs] = rgbToHsl(hexToRgb(baseAccent));
  const [nh, ns] = rgbToHsl(hexToRgb(newAccent));
  const s = bs === 0 ? cs : Math.min(1, (cs * ns) / bs);
  return rgbToHex(hslToRgb([ch + (nh - bh), s, cl]));
}

// Mixes two colors; t = 0 gives `a`, t = 1 gives `b`.
function mix(a, b, t) {
  const ra = hexToRgb(a);
  const rb = hexToRgb(b);
  return rgbToHex(ra.map((v, i) => v + (rb[i] - v) * t));
}

// Moves `color`'s lightness away from `background` until the contrast ratio
// reaches `min` (or the lightness limit is hit).
function ensureContrast(color, background, min) {
  let current = color;
  if (contrastRatio(current, background) >= min) return current;
  const [h, s, l0] = rgbToHsl(hexToRgb(color));
  const step = luminance(background) > 0.5 ? -0.01 : 0.01;
  for (let l = l0; l >= 0 && l <= 1; l += step) {
    current = rgbToHex(hslToRgb([h, s, l]));
    if (contrastRatio(current, background) >= min) return current;
  }
  return step < 0 ? '#000000' : '#ffffff';
}

module.exports = { parseHexColor, contrastRatio, luminance, retint, mix, ensureContrast };
