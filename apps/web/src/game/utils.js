export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const smooth = (current, target, rate, dt) => {
  const t = 1 - Math.exp(-rate * dt);
  return lerp(current, target, t);
};
export const deg = (rad) => rad * 57.29577951308232;
