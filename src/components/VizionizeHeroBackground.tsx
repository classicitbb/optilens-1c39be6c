/**
 * VizionizeHeroBackground
 *
 * Slow-moving cubic bezier curves drawn on a canvas.
 * Each curve's control points drift on independent sinusoidal paths,
 * producing a calm, intelligent-feeling animated backdrop.
 * Colors are drawn from the Meridian Precision palette (teal, gold, white).
 */

import { useEffect, useRef } from "react";

interface Curve {
  // Anchor points (fixed proportions of canvas size)
  x0f: number; y0f: number;
  x3f: number; y3f: number;
  // Control point bases + oscillation params
  cp1xBase: number; cp1yBase: number; cp1xAmp: number; cp1yAmp: number; cp1xFreq: number; cp1yFreq: number; cp1xPhase: number; cp1yPhase: number;
  cp2xBase: number; cp2yBase: number; cp2xAmp: number; cp2yAmp: number; cp2xFreq: number; cp2yFreq: number; cp2xPhase: number; cp2yPhase: number;
  color: string;
  lineWidth: number;
  alpha: number;
}

const CURVES: Curve[] = [
  // Long sweeping teal arcs
  {
    x0f: 0.0,  y0f: 0.3,  x3f: 1.0,  y3f: 0.6,
    cp1xBase: 0.25, cp1yBase: 0.05, cp1xAmp: 0.06, cp1yAmp: 0.08, cp1xFreq: 0.0004, cp1yFreq: 0.0003, cp1xPhase: 0.0,   cp1yPhase: 1.0,
    cp2xBase: 0.75, cp2yBase: 0.95, cp2xAmp: 0.05, cp2yAmp: 0.07, cp2xFreq: 0.0003, cp2yFreq: 0.0005, cp2xPhase: 2.0,   cp2yPhase: 0.5,
    color: "rgba(26,138,156,1)", lineWidth: 1.5, alpha: 0.45,
  },
  {
    x0f: 0.0,  y0f: 0.7,  x3f: 1.0,  y3f: 0.2,
    cp1xBase: 0.3,  cp1yBase: 1.0,  cp1xAmp: 0.07, cp1yAmp: 0.06, cp1xFreq: 0.0005, cp1yFreq: 0.0004, cp1xPhase: 1.2,   cp1yPhase: 2.5,
    cp2xBase: 0.7,  cp2yBase: 0.0,  cp2xAmp: 0.06, cp2yAmp: 0.09, cp2xFreq: 0.0003, cp2yFreq: 0.0006, cp2xPhase: 0.8,   cp2yPhase: 1.8,
    color: "rgba(26,138,156,1)", lineWidth: 1.0, alpha: 0.30,
  },
  // Thicker highlight curve
  {
    x0f: 0.1,  y0f: 0.0,  x3f: 0.9,  y3f: 1.0,
    cp1xBase: 0.6,  cp1yBase: 0.15, cp1xAmp: 0.09, cp1yAmp: 0.06, cp1xFreq: 0.0006, cp1yFreq: 0.0004, cp1xPhase: 0.4,   cp1yPhase: 3.1,
    cp2xBase: 0.4,  cp2yBase: 0.85, cp2xAmp: 0.07, cp2yAmp: 0.08, cp2xFreq: 0.0004, cp2yFreq: 0.0003, cp2xPhase: 1.6,   cp2yPhase: 0.2,
    color: "rgba(26,138,156,1)", lineWidth: 2.5, alpha: 0.20,
  },
  // Gold accent curves
  {
    x0f: 0.0,  y0f: 0.55, x3f: 1.0,  y3f: 0.45,
    cp1xBase: 0.2,  cp1yBase: 0.8,  cp1xAmp: 0.05, cp1yAmp: 0.10, cp1xFreq: 0.0003, cp1yFreq: 0.0007, cp1xPhase: 2.2,   cp1yPhase: 0.9,
    cp2xBase: 0.8,  cp2yBase: 0.2,  cp2xAmp: 0.08, cp2yAmp: 0.05, cp2xFreq: 0.0005, cp2yFreq: 0.0004, cp2xPhase: 0.6,   cp2yPhase: 2.3,
    color: "rgba(200,145,48,1)",  lineWidth: 1.2, alpha: 0.25,
  },
  {
    x0f: 0.15, y0f: 1.0,  x3f: 0.85, y3f: 0.0,
    cp1xBase: 0.0,  cp1yBase: 0.6,  cp1xAmp: 0.08, cp1yAmp: 0.07, cp1xFreq: 0.0004, cp1yFreq: 0.0005, cp1xPhase: 3.5,   cp1yPhase: 1.1,
    cp2xBase: 1.0,  cp2yBase: 0.4,  cp2xAmp: 0.06, cp2yAmp: 0.09, cp2xFreq: 0.0006, cp2yFreq: 0.0003, cp2xPhase: 0.3,   cp2yPhase: 2.8,
    color: "rgba(200,145,48,1)",  lineWidth: 0.8, alpha: 0.18,
  },
  // Subtle white-ish curves for depth
  {
    x0f: 0.0,  y0f: 0.1,  x3f: 1.0,  y3f: 0.9,
    cp1xBase: 0.5,  cp1yBase: 0.0,  cp1xAmp: 0.10, cp1yAmp: 0.05, cp1xFreq: 0.0002, cp1yFreq: 0.0006, cp1xPhase: 1.0,   cp1yPhase: 0.4,
    cp2xBase: 0.5,  cp2yBase: 1.0,  cp2xAmp: 0.09, cp2yAmp: 0.06, cp2xFreq: 0.0005, cp2yFreq: 0.0003, cp2xPhase: 2.7,   cp2yPhase: 1.5,
    color: "rgba(255,255,255,1)", lineWidth: 1.0, alpha: 0.10,
  },
  {
    x0f: 0.0,  y0f: 0.9,  x3f: 1.0,  y3f: 0.1,
    cp1xBase: 0.4,  cp1yBase: 1.0,  cp1xAmp: 0.07, cp1yAmp: 0.08, cp1xFreq: 0.0006, cp1yFreq: 0.0002, cp1xPhase: 0.7,   cp1yPhase: 3.2,
    cp2xBase: 0.6,  cp2yBase: 0.0,  cp2xAmp: 0.08, cp2yAmp: 0.07, cp2xFreq: 0.0003, cp2yFreq: 0.0005, cp2xPhase: 1.9,   cp2yPhase: 0.6,
    color: "rgba(255,255,255,1)", lineWidth: 0.7, alpha: 0.08,
  },
];

export default function VizionizeHeroBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf: number;

    const resize = () => {
      canvas.width  = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };

    const draw = (t: number) => {
      const w = canvas.width;
      const h = canvas.height;

      ctx.clearRect(0, 0, w, h);

      for (const c of CURVES) {
        const cp1x = (c.cp1xBase + c.cp1xAmp * Math.sin(t * c.cp1xFreq + c.cp1xPhase)) * w;
        const cp1y = (c.cp1yBase + c.cp1yAmp * Math.sin(t * c.cp1yFreq + c.cp1yPhase)) * h;
        const cp2x = (c.cp2xBase + c.cp2xAmp * Math.sin(t * c.cp2xFreq + c.cp2xPhase)) * w;
        const cp2y = (c.cp2yBase + c.cp2yAmp * Math.sin(t * c.cp2yFreq + c.cp2yPhase)) * h;

        ctx.save();
        ctx.globalAlpha = c.alpha;
        ctx.strokeStyle = c.color;
        ctx.lineWidth   = c.lineWidth;
        ctx.lineCap     = "round";

        ctx.beginPath();
        ctx.moveTo(c.x0f * w, c.y0f * h);
        ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, c.x3f * w, c.y3f * h);
        ctx.stroke();
        ctx.restore();
      }

      raf = requestAnimationFrame(draw);
    };

    resize();
    raf = requestAnimationFrame(draw);

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 h-full w-full"
    />
  );
}
