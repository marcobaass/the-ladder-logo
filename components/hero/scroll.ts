import * as THREE from "three";

export const SCROLL_MULTIPLIER = 1.2;

export function initScroll(material: THREE.ShaderMaterial) {
  const handler = () => {
    const max = window.innerHeight * SCROLL_MULTIPLIER;

    // reducing progress of scroll to 70% of the max
    const raw = THREE.MathUtils.clamp(window.scrollY / max, 0, 1);
    const progress = raw * 0.7;

    material.uniforms.uProgress.value = progress;
  };

  window.addEventListener("scroll", handler);
  return () => window.removeEventListener("scroll", handler);
}
