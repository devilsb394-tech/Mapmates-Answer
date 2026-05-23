import React, { useRef, useEffect, useState } from 'react';
import { Orbit } from 'lucide-react';

export const VoidCollector: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const scoreRef = useRef(0);

  useEffect(() => { scoreRef.current = score; }, [score]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    let width = canvas.width = canvas.parentElement?.clientWidth || window.innerWidth;
    let height = canvas.height = canvas.parentElement?.clientHeight || window.innerHeight;

    let points: { x: number, y: number, z: number, r: number, color: string }[] = [];
    let ship = { x: 0, y: 0, z: 0 };
    let target = { x: 0, y: 0 };
    let fov = 400;
    let animationId: number;

    const spawn = () => {
       points.push({
         x: (Math.random() - 0.5) * 2000,
         y: (Math.random() - 0.5) * 2000,
         z: 2000,
         r: 10 + Math.random() * 20,
         color: Math.random() > 0.8 ? '#ff33ff' : '#00f0ff'
       });
    };

    for(let i=0; i<30; i++) spawn();

    const draw = () => {
      if (gameOver) return;

      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, width, height);

      const cx = width / 2;
      const cy = height / 2;

      ship.x += (target.x - ship.x) * 0.1;
      ship.y += (target.y - ship.y) * 0.1;

      for (let i = points.length - 1; i >= 0; i--) {
        const p = points[i];
        p.z -= 15;

        if (p.z < -100) {
          points.splice(i, 1);
          spawn();
          continue;
        }

        const scale = fov / (fov + p.z);
        const x = cx + (p.x - ship.x) * scale;
        const y = cy + (p.y - ship.y) * scale;
        const size = p.r * scale;

        if (size > 0) {
          ctx.strokeStyle = p.color;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(x, y, size, 0, Math.PI * 2);
          ctx.stroke();

          // Collect
          if (p.z > -10 && p.z < 20) {
             const dx = x - cx;
             const dy = y - cy;
             if (Math.sqrt(dx*dx + dy*dy) < 30) {
                setScore(s => s + (p.color === '#ff33ff' ? 50 : 10));
                points.splice(i, 1);
                spawn();
             }
          }
        }
      }

      // HUD crossing
      ctx.strokeStyle = 'rgba(255,255,255,0.2)';
      ctx.beginPath();
      ctx.moveTo(cx - 20, cy); ctx.lineTo(cx + 20, cy);
      ctx.moveTo(cx, cy - 20); ctx.lineTo(cx, cy + 20);
      ctx.stroke();

      animationId = requestAnimationFrame(draw);
    };

    draw();

    const handleMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      target.x = (e.clientX - rect.left - width/2) * 5;
      target.y = (e.clientY - rect.top - height/2) * 5;
    };
    canvas.addEventListener('pointermove', handleMove);

    return () => {
      cancelAnimationFrame(animationId);
      canvas.removeEventListener('pointermove', handleMove);
    };
  }, [gameOver]);

  return (
    <div className="w-full h-full relative overflow-hidden bg-black touch-none">
      <canvas ref={canvasRef} className="w-full h-full block" />
      <div className="absolute top-4 left-4 z-10 flex flex-col pointer-events-none">
        <span className="text-white/40 font-mono text-[10px] uppercase tracking-widest">Captured</span>
        <span className="text-white font-black text-3xl">{score}</span>
      </div>
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/20 font-mono text-[9px] uppercase tracking-[4px]">Navigation Active</div>
    </div>
  );
};
