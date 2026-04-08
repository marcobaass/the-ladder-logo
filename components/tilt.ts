import * as THREE from "three";

/** Normalized pointer in canvas space: -1..1 from left→right and top→bottom. */
export type TiltState = { nx: number; ny: number };

export function initTilt(canvas: HTMLCanvasElement) {
  const state: TiltState = { nx: 0, ny: 0 };

  const onMove = (e: PointerEvent) => {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (w <= 0 || h <= 0) return;
    // offsetX/offsetY are in canvas layout space (avoids client vs getBoundingClientRect drift).
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
  /** ny > 0 (lower half) — slightly higher; downward tilt often reads weaker than upward */
  maxPitchPosNy = 0.38
) {
  const pitchBlend = THREE.MathUtils.smoothstep(progress, 0.82, 0.98);
  const pitchMax = ny < 0 ? maxPitchNegNy : maxPitchPosNy;
  return {
    targetRotationY: nx * maxYaw,
    targetPitchDelta: ny * pitchMax * pitchBlend,
  };
}
