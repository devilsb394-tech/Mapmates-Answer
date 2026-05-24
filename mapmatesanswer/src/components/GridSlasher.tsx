import React, { useRef, useEffect, useState } from 'react';
import { Swords } from 'lucide-react';

export const GridSlasher: React.FC = () => {
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

    let enemies: { x: number, y: number, r: number, vx: number, vy: number }[] = [];
    let trail: { x: number, y: number, life: number }[] = [];
    let animationId: number;

    const spawn = () => {
      enemies.push({
        x: Math.random() * width,
        y: Math.random() * height,
        r: 15 + Math.random() * 10,
        vx: (Math.random() - 0.5) * 4,
        vy: (Math.random() - 0.5) * 4
      });
    };

    for(let i=0; i<5; i++) spawn();

    const draw = () => {
      if (gameOver) return;

      ctx.fillStyle = '#050505';
      ctx.fillRect(0, 0, width, height);

      // Trail
      ctx.beginPath();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 3;
      for (let i = 0; i < trail.length; i++) {
        const p = trail[i];
        p.life -= 0.1;
        if (p.life <= 0) {
          trail.splice(i, 1);
          continue;
        }
        if (i === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      }
      ctx.stroke();

      // Enemies
      for (let i = enemies.length - 1; i >= 0; i--) {
        const e = enemies[i];
        e.x += e.vx;
        e.y += e.vy;

        if (e.x < 0 || e.x > width) e.vx *= -1;
        if (e.y < 0 || e.y > height) e.vy *= -1;

        ctx.strokeStyle = '#ff3333';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.r, 0, Math.PI * 2);
        ctx.stroke();

        // Slice detection
        for (const p of trail) {
          const dx = p.x - e.x;
          const dy = p.y - e.y;
          if (Math.sqrt(dx*dx + dy*dy) < e.r) {
            enemies.splice(i, 1);
            setScore(s => s + 10);
            spawn();
            if (enemies.length < 10) spawn();
            break;
          }
        }
      }

      animationId = requestAnimationFrame(draw);
    };

    draw();

    const handleInput = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      trail.push({ x: e.clientX - rect.left, y: e.clientY - rect.top, life: 1 });
      if (trail.length > 20) trail.shift();
    };
    canvas.addEventListener('pointermove', handleInput);

    return () => {
      cancelAnimationFrame(animationId);
      canvas.removeEventListener('pointermove', handleInput);
    };
  }, [gameOver]);

  return (
    <div className="w-full h-full relative overflow-hidden bg-black touch-none">
      <canvas ref={canvasRef} className="w-full h-full block cursor-crosshair" />
      <div className="absolute top-4 left-4 z-10 flex flex-col pointer-events-none">
        <span className="text-white/40 font-mono text-[10px] uppercase tracking-widest">Slashes</span>
        <span className="text-white font-black text-3xl">{score}</span>
      </div>
      <div className="absolute top-4 right-6 text-neon-red font-black text-xl italic uppercase tracking-tighter">Combat Grid</div>
    </div>
  );
};
