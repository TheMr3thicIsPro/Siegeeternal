// ============================================================
// SIEGE ETERNAL — Math & Noise Utilities
// ============================================================

/** Pseudo-random value in [0,1] from integer coords + seed */
export function valueNoise(x, y, seed = 42) {
  let n = ((x * 1619 + y * 31337 + seed * 1013) & 0x7fffffff) >>> 0;
  n = (n ^ (n >> 8)) >>> 0;
  return (n & 0xffff) / 0xffff;
}

/** Smooth (bilinearly interpolated) noise */
export function smoothNoise(x, y, seed) {
  const ix = Math.floor(x), iy = Math.floor(y);
  const fx = x - ix,        fy = y - iy;
  const ux = fx * fx * (3 - 2 * fx);
  const uy = fy * fy * (3 - 2 * fy);
  const a = valueNoise(ix,     iy,     seed);
  const b = valueNoise(ix + 1, iy,     seed);
  const c = valueNoise(ix,     iy + 1, seed);
  const d = valueNoise(ix + 1, iy + 1, seed);
  return a + (b - a) * ux + (c - a) * uy + (d - a) * ux * uy;
}

/** Fractal Brownian Motion — layered octaves of smooth noise */
export function fbmNoise(x, y, seed, octaves = 4) {
  let val = 0, amp = 1, freq = 1, max = 0;
  for (let i = 0; i < octaves; i++) {
    val += smoothNoise(x * freq, y * freq, seed + i * 100) * amp;
    max += amp;
    amp  *= 0.5;
    freq *= 2;
  }
  return val / max;
}

/** Euclidean distance between two {x,y} objects */
export function pdist(a, b) {
  const dx = a.x - b.x, dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/** Linear interpolation */
export function lerp(a, b, t) {
  return a + (b - a) * t;
}

/** Clamp a value between min and max */
export function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}
