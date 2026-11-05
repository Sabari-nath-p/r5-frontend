/*
 * The phone's tilt as a steady -1..1 on each axis. Whatever angle it's being held
 * at counts as neutral, and that neutral slowly follows the hand, so a visitor
 * lying on a sofa gets the same effect as one sitting up.
 */

type PermissionedOrientationEvent = typeof DeviceOrientationEvent & {
  requestPermission?: () => Promise<"granted" | "denied">;
};

/** Degrees of tilt that count as all the way over. */
const FULL_TILT = 22;
/** Ignored around neutral, so sensor noise and hand tremor don't show. */
const DEAD_ZONE = 1.2;
/** Seconds for the sensor reading to settle, and for neutral to catch up. */
const SMOOTHING = 0.12;
const RECENTRE = 8;
/** A jump this large means the phone flipped over, not that it was tilted. */
const FLIP = 60;

/** True on iPhones and iPads, where motion access needs a tap to ask for it. */
export function tiltNeedsPermission(): boolean {
  const events = (window as Window & { DeviceOrientationEvent?: PermissionedOrientationEvent })
    .DeviceOrientationEvent;
  return typeof events?.requestPermission === "function";
}

/** Must run inside a tap the first time. Resolves whether tilt may be used. */
export async function requestTiltPermission(): Promise<boolean> {
  const events = DeviceOrientationEvent as PermissionedOrientationEvent;
  if (!events.requestPermission) return true;
  return (await events.requestPermission()) === "granted";
}

export function watchDeviceTilt(onTilt: (x: number, y: number) => void): () => void {
  let baseX: number | null = null;
  let baseY = 0;
  let smoothX = 0;
  let smoothY = 0;
  let last = 0;

  const shaped = (delta: number) => {
    const magnitude = Math.max(Math.abs(delta) - DEAD_ZONE, 0) / FULL_TILT;
    return Math.sign(delta) * Math.min(magnitude, 1);
  };

  const onOrientation = (event: DeviceOrientationEvent) => {
    // Desktop browsers can fire this once with nothing in it.
    if (event.beta === null || event.gamma === null) return;

    // gamma and beta belong to the device, so match them to how it's being held.
    const angle = window.screen.orientation?.angle ?? 0;
    let across = event.gamma;
    let along = event.beta;
    if (angle === 90) [across, along] = [event.beta, -event.gamma];
    else if (angle === 270) [across, along] = [-event.beta, event.gamma];
    else if (angle === 180) [across, along] = [-event.gamma, -event.beta];

    const now = performance.now();
    const dt = last ? Math.min((now - last) / 1000, 0.25) : 0;
    last = now;

    if (baseX === null || Math.abs(across - baseX) > FLIP || Math.abs(along - baseY) > FLIP) {
      baseX = across;
      baseY = along;
      smoothX = 0;
      smoothY = 0;
    }

    const settle = 1 - Math.exp(-dt / SMOOTHING);
    smoothX += (shaped(across - baseX) - smoothX) * settle;
    smoothY += (shaped(along - baseY) - smoothY) * settle;
    const follow = 1 - Math.exp(-dt / RECENTRE);
    baseX += (across - baseX) * follow;
    baseY += (along - baseY) * follow;

    onTilt(smoothX, smoothY);
  };

  window.addEventListener("deviceorientation", onOrientation);
  return () => window.removeEventListener("deviceorientation", onOrientation);
}
