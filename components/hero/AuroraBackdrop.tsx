import { useEffect, useRef, useState } from "react";

type Ribbon = {
  baseX: number;
  baseY: number;
  ampX: number;
  ampY: number;
  cyclesA: number;
  cyclesB: number;
  cyclesP: number;
  phase: number;
  w: number;
  h: number;
  rotate: number;
  rotateAmp: number;
  color: string;
  opacity: number;
};

const TAU = Math.PI * 2;
const DURATION = 30; // seconds for one full loop

const RIBBONS: Ribbon[] = [
  {
    baseX: 0.3, baseY: 0.4, ampX: 0.18, ampY: 0.12,
    cyclesA: 1, cyclesB: 2, cyclesP: 2, phase: 0,
    w: 1600, h: 480, rotate: -18, rotateAmp: 12,
    color: "rgba(255, 110, 15, 1)", opacity: 0.95,
  },
  {
    baseX: 0.7, baseY: 0.55, ampX: 0.14, ampY: 0.1,
    cyclesA: 1, cyclesB: 1, cyclesP: 3, phase: 2.1,
    w: 1450, h: 400, rotate: 22, rotateAmp: 10,
    color: "rgba(255, 140, 35, 1)", opacity: 0.85,
  },
  {
    baseX: 0.5, baseY: 0.35, ampX: 0.22, ampY: 0.08,
    cyclesA: 2, cyclesB: 3, cyclesP: 2, phase: 4.0,
    w: 1280, h: 340, rotate: -8, rotateAmp: 18,
    color: "rgba(255, 80, 5, 1)", opacity: 0.9,
  },
  {
    baseX: 0.45, baseY: 0.6, ampX: 0.2, ampY: 0.1,
    cyclesA: 1, cyclesB: 2, cyclesP: 1, phase: 5.5,
    w: 1200, h: 300, rotate: 14, rotateAmp: 14,
    color: "rgba(255, 170, 60, 1)", opacity: 0.75,
  },
  {
    baseX: 0.62, baseY: 0.42, ampX: 0.16, ampY: 0.14,
    cyclesA: 2, cyclesB: 1, cyclesP: 3, phase: 1.2,
    w: 1000, h: 260, rotate: -28, rotateAmp: 16,
    color: "rgba(255, 60, 0, 1)", opacity: 0.8,
  },
  {
    baseX: 0.38, baseY: 0.5, ampX: 0.12, ampY: 0.16,
    cyclesA: 1, cyclesB: 3, cyclesP: 2, phase: 3.3,
    w: 900, h: 220, rotate: 32, rotateAmp: 10,
    color: "rgba(255, 200, 80, 1)", opacity: 0.7,
  },
];

export const AuroraBackdrop = () => {
  const [p, setP] = useState(0);
  const rafRef = useRef<number | null>(null);
  const startRef = useRef<number | null>(null);

  useEffect(() => {
    const animate = (timestamp: number) => {
      if (startRef.current === null) startRef.current = timestamp;
      const elapsed = (timestamp - startRef.current) / 1000; // seconds
      setP((elapsed % DURATION) / DURATION); // 0 → 1 loop
      rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <div style={{ position: "absolute", inset: 0, backgroundColor: "#000", overflow: "hidden", pointerEvents: "none", zIndex: 0 }}>
      {/* Ribbons layer */}
      <div style={{ position: "absolute", inset: 0, filter: "blur(60px) saturate(1.5)", mixBlendMode: "screen" }}>
        {RIBBONS.map((r, i) => {
          const a = p * TAU * r.cyclesA + r.phase;
          const b = p * TAU * r.cyclesB + r.phase * 0.7;
          const c = p * TAU * r.cyclesP + r.phase;
          const x = (r.baseX + 0.18 + Math.sin(a) * r.ampX) * 100; // vw
          const y = (r.baseY + 0.15 + Math.cos(a) * r.ampY) * 100; // vh
          const rot = r.rotate + Math.sin(b) * r.rotateAmp;
          const pulse = 0.8 + Math.sin(c) * 0.2;
          const stretch = 1 + Math.sin(b) * 0.2;
          return (
            <div
              key={i}
              style={{
                position: "absolute",
                left: `calc(${x}vw - ${r.w / 2}px)`,
                top: `calc(${y}vh - ${r.h / 2}px)`,
                width: r.w,
                height: r.h,
                borderRadius: "50%",
                background: `radial-gradient(ellipse at center, ${r.color} 0%, rgba(255, 90, 0, 0.55) 40%, rgba(255, 40, 0, 0) 75%)`,
                opacity: r.opacity * pulse,
                transform: `rotate(${rot}deg) scaleX(${stretch})`,
              }}
            />
          );
        })}
      </div>

      {/* Frosted glass overlay */}
      <div style={{
        position: "absolute", inset: 0,
        backdropFilter: "blur(40px)",
        WebkitBackdropFilter: "blur(40px)",
        backgroundColor: "rgba(0, 0, 0, 0.2)",
      }} />

      {/* Vignette */}
      <div style={{
        position: "absolute", inset: 0,
        background: "radial-gradient(ellipse 80% 70% at 68% 65%, rgba(0,0,0,0) 40%, rgba(0,0,0,0.7) 100%)",
      }} />
    </div>
  );
};