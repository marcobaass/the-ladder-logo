import * as THREE from "three";

export type TiltState = { nx: number; ny: number };

export function initTilt(canvas: HTMLCanvasElement) {
  const state: TiltState = { nx: 0, ny: 0 };

  const onMove = (e: PointerEvent) => {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (w <= 0 || h <= 0) return;

    state.nx = THREE.MathUtils.clamp((e.offsetX / w) * 2 - 1, -1, 1);
    state.ny = THREE.MathUtils.clamp((e.offsetY / h) * 2 - 1, -1, 1);
  };

  canvas.addEventListener("pointermove", onMove, { passive: true });

  return {
    state,
    cleanup: () => canvas.removeEventListener("pointermove", onMove),
  };
}

export function computeTiltFromMouse(
  nx: number,
  ny: number,
  progress: number,
  maxYaw = 0.18,
  /** ny < 0 (pointer in upper half of canvas) */
  maxPitchNegNy = 0.22,
  /** ny > 0 (pointer in lower half of canvas) */
  maxPitchPosNy = 0.38
) {
    const pitchBlend = THREE.MathUtils.smoothstep(progress, 0.82, 0.98);
  const pitchMax = ny < 0 ? maxPitchNegNy : maxPitchPosNy;
  // Yaw is reduced during early wave, returns to full by logo.
  const earlyYawGain = 0.4; // lower = less wave yaw
  const yawToLogoBlend = THREE.MathUtils.smoothstep(progress, 0.35, 0.85);
  const yawGain = THREE.MathUtils.lerp(earlyYawGain, 1.0, yawToLogoBlend);
  return {
    targetRotationY: nx * maxYaw * yawGain,
    targetPitchDelta: ny * pitchMax * pitchBlend,
  };
}
