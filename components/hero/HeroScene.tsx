"use client";

import { useEffect, useRef } from "react";
import { initScene } from "./scene";
import { initParticles, PARTICLES_BASE_ROT_X } from "./particles";
import { initScroll } from "./scroll";
import { SCROLL_MULTIPLIER } from "./scroll";
import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { initTilt, computeTiltFromMouse } from "../tilt";
import { AuroraBackdrop } from "./AuroraBackdrop";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";

const BLOOM_LAYER = 1;
const bloomLayer = new THREE.Layers();
bloomLayer.set(BLOOM_LAYER);

export default function HeroScene() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
    
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let frameId: number = 0;
    let cleanupScroll: (() => void) | undefined;
    let cleanupMouse: (() => void) | undefined;
    let cleanupResize: (() => void) | undefined;

    let particles: Awaited<ReturnType<typeof initParticles>> | undefined;
    let cancelled = false;
    const { scene, camera, renderer } = initScene(canvas);

    const materials: Record<string, THREE.Material | THREE.Material[]> = {};

    const darkMaterial = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    
    function darkenNonBloomed(obj: THREE.Object3D) {
      if (bloomLayer.test(obj.layers)) return;
    
      if (
        obj instanceof THREE.Mesh ||
        obj instanceof THREE.Points ||
        obj instanceof THREE.Line ||
        obj instanceof THREE.LineSegments
      ) {
        const mat = obj.material;
        if (!mat) return;
        if (Array.isArray(mat)) {
          materials[obj.uuid] = mat;
          obj.material = mat.map(() => darkMaterial);
        } else {
          materials[obj.uuid] = mat;
          obj.material = darkMaterial;
        }
      }
    }
    
    function restoreMaterial(obj: THREE.Object3D) {
      const stored = materials[obj.uuid];
      if (!stored) return;
      obj.material = stored;
      delete materials[obj.uuid];
    }
    
    const bloomComposer = new EffectComposer(renderer);
    bloomComposer.renderToScreen = false;
    
    const bloomRenderPass = new RenderPass(scene, camera);
    bloomRenderPass.clear = true;
    bloomRenderPass.clearAlpha = 0;
    bloomComposer.addPass(bloomRenderPass);
    
    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(canvas.clientWidth, canvas.clientHeight),
      0.75, // strength
      1.25, // radius
      0.5 // threshold
    );
    bloomComposer.addPass(bloomPass);
    
    const finalComposer = new EffectComposer(renderer);
    
    const finalRenderPass = new RenderPass(scene, camera);
    finalRenderPass.clear = true;
    finalRenderPass.clearAlpha = 0;
    finalComposer.addPass(finalRenderPass);
    
    const combineMaterial = new THREE.ShaderMaterial({
      uniforms: {
        tDiffuse: { value: null },
        bloomTexture: { value: null },
      },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform sampler2D tDiffuse;
        uniform sampler2D bloomTexture;
        varying vec2 vUv;
        void main() {
          vec4 base = texture2D(tDiffuse, vUv);
          vec4 bloom = texture2D(bloomTexture, vUv);
          gl_FragColor = vec4(base.rgb + bloom.rgb, base.a);
        }
      `,
    });
    
    const combinePass = new ShaderPass(combineMaterial);
    finalComposer.addPass(combinePass);

    initParticles(scene).then((p) => {
      if (cancelled || !canvas) return;
      const canvasEl = canvas;
      particles = p;
      p.points.layers.enable(BLOOM_LAYER);

      let curPitchDelta = 0;
      let curRotY = 0;
      const MAX_TILT_YAW = 0.25;
      const MAX_TILT_PITCH_UPPER = 0.25;
      const MAX_TILT_PITCH_LOWER = 0.40;
      
      const tilt = initTilt(canvasEl);
      cleanupMouse = tilt.cleanup;


      // set the light position to the center of the screen if onMouseMove is not used
      p.material.uniforms.uLightPosition.value.set(0, 0);
      p.material.uniforms.uLightIntensity.value = 0.9;
      
      cleanupScroll = initScroll(particles.material);
      
      const onResize = () => {
        const w = canvasEl.clientWidth;
        const h = canvasEl.clientHeight;
      
        renderer.setSize(w, h, false);
        bloomComposer.setSize(w, h);
        finalComposer.setSize(w, h);
        bloomPass.setSize(w, h);
      
        p.material.uniforms.uResolution.value.set(
          window.innerWidth,
          window.innerHeight
        );
      };

      window.addEventListener('resize', onResize)
      cleanupResize = () => window.removeEventListener('resize', onResize)

      function animate(time: number = 0) {
        particles!.material.uniforms.uTime.value = time * 0.001;
        const progress = particles!.material.uniforms.uProgress.value as number;

        const { targetRotationY, targetPitchDelta } = computeTiltFromMouse(
          tilt.state.nx,
          tilt.state.ny,
          progress,
          MAX_TILT_YAW,
          MAX_TILT_PITCH_UPPER,
          MAX_TILT_PITCH_LOWER
        );

        const SMOOTH_WAVE = 0.03;
        const SMOOTH_LOGO = 0.5;
        const progressBlend = THREE.MathUtils.smoothstep(progress, 0.35, 0.88);
        const rotationSmooth = THREE.MathUtils.lerp(SMOOTH_WAVE, SMOOTH_LOGO, progressBlend);
        curRotY += (targetRotationY - curRotY) * rotationSmooth;
        curPitchDelta += (targetPitchDelta - curPitchDelta) * rotationSmooth;

        p.tiltOrient.rotation.set(curPitchDelta, curRotY, 0, "YXZ");
        p.points.rotation.x = PARTICLES_BASE_ROT_X;
        p.points.rotation.y = 0;

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
        
        scene.traverse(darkenNonBloomed);
        bloomComposer.render();
        scene.traverse(restoreMaterial);

        combineMaterial.uniforms.bloomTexture.value =
          bloomComposer.readBuffer.texture;

        finalComposer.render();

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
      darkMaterial.dispose();
      combineMaterial.dispose();
      bloomPass.dispose();
      bloomComposer.dispose();
      finalComposer.dispose();
    };
  }, []);

  return (
    <div style={{ height: `${100 + SCROLL_MULTIPLIER * 100}vh` }}>
      <section className="sticky top-0 h-screen w-full overflow-hidden">
        <AuroraBackdrop />
        <canvas ref={canvasRef} className="absolute inset-0 z-10 block h-full w-full" />
      </section>
    </div>
  );
}
