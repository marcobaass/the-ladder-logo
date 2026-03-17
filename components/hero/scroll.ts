import * as THREE from "three";

export const SCROLL_MULTIPLIER = 1.2;

export function initScroll(material: THREE.ShaderMaterial) {
  const handler = () => {
    const max = window.innerHeight * SCROLL_MULTIPLIER;
    const progress = THREE.MathUtils.clamp(window.scrollY / max, 0, 1);
    material.uniforms.uProgress.value = progress;
  };

  window.addEventListener("scroll", handler);
  return () => window.removeEventListener("scroll", handler);
}
