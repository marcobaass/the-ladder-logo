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
    let cleanupMouse: (() => void) | undefined;
    let particles: Awaited<ReturnType<typeof initParticles>> | undefined;
    let cancelled = false;
    const { scene, camera, renderer } = initScene(canvas);
    initParticles(scene).then((p) => {
      if (cancelled) return;
      particles = p;
      cleanupScroll = initScroll(particles.material);

      const onMouseMove = (e: MouseEvent) => {
        const nx = (e.clientX / window.innerWidth) * 2 - 1
        const ny = -(e.clientY / window.innerHeight) * 2 + 1
        
        const dampFactor = 0.75
        const lightX = nx * dampFactor
        const lightY = ny * dampFactor
        p.material.uniforms.uLightPosition.value.set(lightX, lightY)

        const lightDist = Math.sqrt(nx * nx + ny * ny)
        p.material.uniforms.uLightIntensity.value = Math.max(0, 1 - lightDist)
      }

      window.addEventListener('mousemove', onMouseMove)
      cleanupMouse = () => window.removeEventListener('mousemove', onMouseMove)
      
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
      cleanupMouse?.();
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
