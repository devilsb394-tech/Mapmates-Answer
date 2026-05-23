import React, { useRef, useEffect, useState } from 'react';
import { RotateCcw } from 'lucide-react';

export const VectorRacing: React.FC = () => {
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

    let ship = { x: width / 2, y: height - 100, targetX: width / 2 };
    let obstacles: { x: number, y: number, w: number, h: number, speed: number }[] = [];
    let animationId: number;
    let frameCount = 0;

    const spawnObstacle = () => {
      const w = 40 + Math.random() * 60;
      obstacles.push({
        x: Math.random() * (width - w),
        y: -100,
        w: w,
        h: 20,
        speed: 5 + Math.random() * 5 + (scoreRef.current / 100)
      });
    };

    const draw = () => {
      if (gameOver) return;
      frameCount++;

      ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
      ctx.fillRect(0, 0, width, height);

      // Grid effect
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.05)';
      ctx.lineWidth = 1;
      for (let i = 0; i < width; i += 50) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, height);
        ctx.stroke();
      }
      for (let i = 0; i < height; i += 50) {
        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(width, i);
        ctx.stroke();
      }

      // Ship movement
      ship.x += (ship.targetX - ship.x) * 0.15;

      // Draw ship (Vector style)
      ctx.strokeStyle = '#00f0ff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(ship.x, ship.y - 20);
      ctx.lineTo(ship.x + 15, ship.y + 10);
      ctx.lineTo(ship.x - 15, ship.y + 10);
      ctx.closePath();
      ctx.stroke();

      // Update and draw obstacles
      if (frameCount % 40 === 0) spawnObstacle();

      for (let i = obstacles.length - 1; i >= 0; i--) {
        const o = obstacles[i];
        o.y += o.speed;

        ctx.strokeStyle = '#ff00ff';
        ctx.strokeRect(o.x, o.y, o.w, o.h);

        // Collision
        if (
          ship.x + 10 > o.x && 
          ship.x - 10 < o.x + o.w &&
          ship.y + 10 > o.y &&
          ship.y - 10 < o.y + o.h
        ) {
          setGameOver(true);
        }

        if (o.y > height) {
          obstacles.splice(i, 1);
          setScore(s => s + 10);
        }
      }

      animationId = requestAnimationFrame(draw);
    };

    draw();

    const handleMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      ship.targetX = e.clientX - rect.left;
    };

    canvas.addEventListener('pointermove', handleMove);
    canvas.addEventListener('pointerdown', handleMove);

    return () => {
      cancelAnimationFrame(animationId);
      canvas.removeEventListener('pointermove', handleMove);
      canvas.removeEventListener('pointerdown', handleMove);
    };
  }, [gameOver]);

  return (
    <div className="w-full h-full relative overflow-hidden bg-black touch-none">
      <canvas ref={canvasRef} className="w-full h-full block" />
      <div className="absolute top-4 left-4 z-10 flex flex-col pointer-events-none">
        <span className="text-white font-mono text-xs uppercase opacity-50">Score</span>
        <span className="text-neon-blue font-black text-2xl">{score}</span>
      </div>
      {gameOver && (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center z-20">
          <h2 className="text-4xl font-black text-neon-red mb-2 tracking-tighter uppercase italic">Crashed</h2>
          <p className="text-white/60 font-mono mb-6">Final Score: {score}</p>
          <button 
            onClick={() => { setScore(0); setGameOver(false); }} 
            className="bg-neon-blue text-black font-bold uppercase tracking-widest px-8 py-3 rounded-full hover:scale-105 transition-transform"
          >
            Restart Engine
          </button>
        </div>
      )}
    </div>
  );
};
