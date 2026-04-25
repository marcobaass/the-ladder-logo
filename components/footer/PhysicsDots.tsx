'use client';

import { useEffect, useRef } from 'react';
import Script from 'next/script';

export default function PhysicsDots() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<any>(null);
  const animFrameRef = useRef<number>(0);
  const matterLoadedRef = useRef<boolean>(false);

  const initAnimation = () => {
    const Matter = (window as any).Matter;
    if (!Matter || !canvasRef.current) return;

    const { Engine, World, Bodies, Body, Vector } = Matter;

    // Clean up previous instance
    if (engineRef.current) {
      World.clear(engineRef.current.world);
      Engine.clear(engineRef.current);
    }
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d')!;

    const R = 7;
    const GAP = 120;
    const PHYS_R = R + GAP / 20;
    const GRID_DENSITY = 0.85;
    const CURSOR_RADIUS = 80;
    const FORCE_SCALE = 0.0002;

    const engine = Engine.create({ gravity: { x: 0, y: 1 }, enableSleeping: true });
    engineRef.current = engine;
    const world = engine.world;

    const fitCanvas = () => {
      const rect = (canvas.parentElement ?? canvas).getBoundingClientRect();
      const scale = window.devicePixelRatio || 1;
      canvas.width = rect.width * scale;
      canvas.height = rect.height * scale;
      canvas.style.width = rect.width + 'px';
      canvas.style.height = rect.height + 'px';
      ctx!.setTransform(scale, 0, 0, scale, 0, 0);
      return rect;
    };

    let stageBox = fitCanvas();

    const buildDots = () => {
      const baseCols = Math.floor(stageBox.width / (PHYS_R * 2));
      const baseRows = Math.floor(stageBox.height / (PHYS_R * 2));
      const cols = Math.max(1, Math.floor(baseCols * GRID_DENSITY));
      const rows = Math.max(1, Math.floor(baseRows * GRID_DENSITY));
      const xSpacing = cols > 1 ? (stageBox.width - 2 * PHYS_R) / (cols - 1) : 0;
      const clusterH = stageBox.height * 0.45;
      const ySpacing = rows > 1 ? (clusterH - 2 * PHYS_R) / (rows - 1) : 0;
      const targetOffsetY = stageBox.height - clusterH;
      const dropRange = stageBox.height;

      const newDots = [];
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const waveY = Math.sin((c / cols) * Math.PI * 3) * 20;
          const finalY = targetOffsetY + PHYS_R + r * ySpacing + waveY;
          const initialY = finalY - Math.random() * dropRange;
          const x = cols === 1 ? stageBox.width / 2 : PHYS_R + c * xSpacing;
          newDots.push(
            Bodies.circle(x, initialY, PHYS_R, {
              restitution: 0.2,
              friction: 0.1,
              frictionAir: 0.05,
              sleepThreshold: 30,
            })
          );
        }
      }
      return newDots;
    };

    let dots = buildDots();
    World.add(world, dots);

    const wall = PHYS_R;
    const addWalls = () => {
      World.add(world, [
        Bodies.rectangle(stageBox.width / 2, stageBox.height + wall / 2, stageBox.width, wall, { isStatic: true }),
        Bodies.rectangle(-wall / 2, stageBox.height / 2, wall, stageBox.height, { isStatic: true }),
        Bodies.rectangle(stageBox.width + wall / 2, stageBox.height / 2, wall, stageBox.height, { isStatic: true }),
      ]);
    };
    addWalls();

    const handleMouseMove = (e:any) => {
      const rect = canvas.getBoundingClientRect();
      const mouse = Vector.create(e.clientX - rect.left, e.clientY - rect.top);
      dots.forEach((dot) => {
        if (dot.isSleeping) Body.set(dot, 'isSleeping', false);
        const dir = Vector.sub(dot.position, mouse);
        const dist = Vector.magnitude(dir);
        if (dist < CURSOR_RADIUS && dist > 1) {
          const strength = FORCE_SCALE * (CURSOR_RADIUS - dist);
          Body.applyForce(dot, dot.position, Vector.mult(Vector.normalise(dir), strength));
        }
      });
    };

    window.addEventListener('mousemove', handleMouseMove);

    const handleResize = () => {
      stageBox = fitCanvas();
      World.clear(world);
      Engine.clear(engine);
      dots = buildDots();
      World.add(world, dots);
      addWalls();
    };

    window.addEventListener('resize', handleResize);

    const animate = () => {
      Engine.update(engine, 1000 / 60);
      ctx.clearRect(0, 0, stageBox.width, stageBox.height);
      ctx.fillStyle = '#B22915';
      dots.forEach((b) => {
        const x = Math.round(b.position.x);
        const y = Math.round(b.position.y);
        ctx.beginPath();
        ctx.arc(x, y, R, 0, Math.PI * 2);
        ctx.fill();
      });
      animFrameRef.current = requestAnimationFrame(animate);
    };

    animate();

    // Return cleanup
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animFrameRef.current);
      World.clear(world);
      Engine.clear(engine);
    };
  };

  useEffect(() => {
    // If Matter.js already loaded (e.g. hot-reload), init immediately
    if ((window as any).Matter) {
      const cleanup = initAnimation();
      return cleanup;
    }
  }, []);

  const handleScriptLoad = () => {
    matterLoadedRef.current = true;
    const cleanup = initAnimation();
    // Store cleanup for unmount
    return cleanup;
  };

  return (
    <>
      <Script
        src="https://cdnjs.cloudflare.com/ajax/libs/matter-js/0.19.0/matter.min.js"
        strategy="afterInteractive"
        onLoad={handleScriptLoad}
      />
      <div
        style={{
          width: '100%',
          height: '50vh',
          position: 'relative',
        }}
      >
        <canvas
          ref={canvasRef}
          style={{
            width: '100%',
            height: '100%',
            display: 'block',
          }}
        />
      </div>
    </>
  );
}
