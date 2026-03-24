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
    
    const bloomStrength = 0.55; // try 1.5 .. 2.0
    const bloomRadius = 0.1;
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

      // window.addEventListener('mousemove', onMouseMove)
      // cleanupMouse = () => window.removeEventListener('mousemove', onMouseMove)
      
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

        const t = time * 0.001;
        const omega = 1.2;
        // pulse the logo
        const rawPulse = (Math.sin(omega * t) + 1) * 0.5;
        const easing = rawPulse * rawPulse * (3 -2 * rawPulse)
        p.material.uniforms.uLogoPulse.value = easing;

        // animate the light position
        const angle = 145 * Math.PI / 180;
        const dirX = Math.cos(angle);
        const dirY = Math.sin(angle);
        
        const range = 1.0;
        // same angular speed as shader breath: sin(uTime * 1.2)
        const TAU = Math.PI * 2;
        // phase where 0 means "noise just starts rising from minimum"
        const barDelay = 0.5; // delay before light moves
        let noisePhase = (omega * (t - barDelay) + Math.PI / 2) % TAU;
        if (noisePhase < 0) noisePhase += TAU;
        const cycle01 = ((noisePhase / TAU) * 0.5) % 1; // 0..1 over one noise cycle
        // choose what fraction of the cycle the bar moves
        const moveFrac = 0.45; // 45% movement, rest is pause
        let phase = 1; // hold position during pause
        if (cycle01 < moveFrac) {
          const u = cycle01 / moveFrac; // 0..1 during active move
          const raw = (Math.sin(u * Math.PI * 2.0 - Math.PI / 2) + 1) * 0.5;
          const eased = raw * raw * (3 - 2 * raw);
          phase = eased * 2 - 1;
        }
        const pos = -phase * range;
        p.material.uniforms.uLightPosition.value.set(dirX * pos, dirY * pos);
        
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
