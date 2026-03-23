"use client";

import { useEffect, useRef } from "react";
import { initScene } from "./scene";
import { initParticles } from "./particles";
import { initScroll } from "./scroll";
import { SCROLL_MULTIPLIER } from "./scroll";
import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";

export default function HeroScene() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let frameId: number;
    let cleanupScroll: (() => void) | undefined;
    let cleanupMouse: (() => void) | undefined;
    let cleanupResize: (() => void) | undefined;

    let particles: Awaited<ReturnType<typeof initParticles>> | undefined;
    let cancelled = false;
    const { scene, camera, renderer } = initScene(canvas);

    
    const composer = new EffectComposer(renderer);
    
    const renderPass = new RenderPass(scene, camera);
    composer.addPass(renderPass);
    
    const bloomStrength = 0.35; // try 1.5 .. 2.0
    const bloomRadius = 0.001;
    const bloomThreshold = 0.8;
    
    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(canvas.clientWidth, canvas.clientHeight),
      bloomStrength,
      bloomRadius,
      bloomThreshold
    )
    
    composer.addPass(bloomPass);

    initParticles(scene).then((p) => {
      if (cancelled) return;
      particles = p;

      // set the light position to the center of the screen if onMouseMove is not used
      p.material.uniforms.uLightPosition.value.set(0, 0);
      p.material.uniforms.uLightIntensity.value = 0.9;
      
      cleanupScroll = initScroll(particles.material);

      const onMouseMove = (e: MouseEvent) => {
        const aspect = window.innerWidth / window.innerHeight

        const nx = (e.clientX / window.innerWidth) * 2 - 1
        const ny = -(e.clientY / window.innerHeight) * 2 + 1
        // how far the light can nudge from the center (0 = never moves, 1 = full follow)
        const dampFactor = 0.6
        const lightX = (nx * dampFactor) / aspect
        const lightY = (ny * dampFactor)
        // only update position
        p.material.uniforms.uLightPosition.value.set(lightX, lightY)
      }

      window.addEventListener('mousemove', onMouseMove)
      cleanupMouse = () => window.removeEventListener('mousemove', onMouseMove)
      
      const onResize = () => {
        const w = canvas.clientWidth
        const h = canvas.clientHeight

        renderer.setSize(w, h, false);
        composer.setSize(w, h)

        bloomPass.setSize(w, h)

        p.material.uniforms.uResolution.value.set(window.innerWidth, window.innerHeight)
      }
      window.addEventListener('resize', onResize)
      cleanupResize = () => window.removeEventListener('resize', onResize)

      function animate(time: number = 0) {
        particles!.material.uniforms.uTime.value = time * 0.001;

        // pulse the logo
        const rawPulse = ((Math.sin(time * 0.0015)) +1) / 2
        const easing = rawPulse * rawPulse * (3 -2 * rawPulse)
        p.material.uniforms.uLogoPulse.value = easing;
        
        composer.render();
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
      cleanupResize?.();
      (bloomPass as any).dispose();
      (composer as any).dispose();
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
