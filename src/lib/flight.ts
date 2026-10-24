/** Fixed world height keeps flight timing identical across viewport sizes. */
export const FLIGHT_HEIGHT = 600;
export const FLIGHT_STEP = 1 / 60;
export const FLIGHT_GRAVITY = 2.1 * FLIGHT_HEIGHT;
export const FLIGHT_IMPULSE = -.68 * FLIGHT_HEIGHT;
export const FLIGHT_SPEED = 235 * FLIGHT_HEIGHT / 620;
export const flightAward = (columns: number) => columns >= 100 ? 100 : columns >= 50 ? 50 : columns >= 20 ? 20 : 0;
export function flightSize(width: number, height: number) {
  const h = Math.max(1, height);
  return { w: FLIGHT_HEIGHT * Math.max(1, width) / h, h: FLIGHT_HEIGHT };
}
/** Fractional DPR affects only simple scenery; the character and HUD are separate DOM layers. */
export function flightResolution(width: number, height: number, deviceRatio: number) {
  return Math.max(.75, Math.min(deviceRatio || 1, 1.5, Math.sqrt(700_000 / Math.max(1, width * height))));
}
