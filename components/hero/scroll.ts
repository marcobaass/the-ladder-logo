import * as THREE from "three";

export const SCROLL_MULTIPLIER = 1.2;

export function initScroll(material: THREE.ShaderMaterial) {
  let target = 0
  let current = 0
  const damping = 0.04
  
  const handler = () => {
    const max = window.innerHeight * SCROLL_MULTIPLIER;
    target = THREE.MathUtils.clamp(window.scrollY / max, 0, 1);
  };

  window.addEventListener("scroll", handler);

  let rafId: number;
  const update = () => {
    // simple exponential smoothing toward target
    current = current + (target - current) * damping;
    material.uniforms.uProgress.value = current;
    rafId = requestAnimationFrame(update);
  }
  update()

  return () => {
    window.removeEventListener("scroll", handler)
    cancelAnimationFrame(rafId);
  }
}
