/** Conversão entre sRGB 0-255 e luz linear 0-1. */
export function srgbParaLinear(c255) {
  const c = c255 / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

export function linearParaSrgb255(l) {
  const c = l <= 0 ? 0 : l >= 1 ? 1 : l;
  const s = c <= 0.0031308 ? c * 12.92 : 1.055 * c ** (1 / 2.4) - 0.055;
  return Math.round(s * 255);
}
