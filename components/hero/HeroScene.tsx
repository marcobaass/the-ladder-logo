"use client";

import { useEffect, useRef } from "react";
import { initScene } from "./scene";
import { initParticles } from "./particles";
import { initScroll } from "./scroll";
import { SCROLL_MULTIPLIER } from "./scroll";

export default function HeroScene() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let frameId: number;
    let cleanupScroll: (() => void) | undefined;
    let particles: Awaited<ReturnType<typeof initParticles>> | undefined;
    let cancelled = false;
    const { scene, camera, renderer } = initScene(canvas);
    initParticles(scene).then((p) => {
      if (cancelled) return;
      particles = p;
      cleanupScroll = initScroll(particles.material);
      function animate(time: number = 0) {
        particles!.material.uniforms.uTime.value = time * 0.001;
        renderer.render(scene, camera);
        frameId = requestAnimationFrame(animate);
      }
      animate();
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(frameId);
      cleanupScroll?.();
      particles?.geometry.dispose();
      particles?.material.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <div style={{ height: `${100 + SCROLL_MULTIPLIER * 100}vh` }}>
      <section className="sticky top-0 h-screen w-full">
        <canvas ref={canvasRef} className="block absolute inset-0 h-full w-full" />
      </section>
    </div>
  );
}
