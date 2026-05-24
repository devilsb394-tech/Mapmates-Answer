import React, { useRef, useEffect, useState } from 'react';
import { RotateCcw, Crosshair } from 'lucide-react';

export const CyberWar: React.FC = () => {
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

    let tank = { x: width / 2, y: height - 60, angle: 0 };
    let bullets: { x: number, y: number, vx: number, vy: number }[] = [];
    let enemies: { x: number, y: number, size: number, hp: number }[] = [];
    let animationId: number;
    let frameCount = 0;

    const spawnEnemy = () => {
      enemies.push({
        x: Math.random() * width,
        y: -50,
        size: 30 + Math.random() * 20,
        hp: 1 + Math.floor(scoreRef.current / 50)
      });
    };

    const draw = () => {
      if (gameOver) return;
      frameCount++;

      ctx.fillStyle = '#050505';
      ctx.fillRect(0, 0, width, height);

      // Draw tank
      ctx.save();
      ctx.translate(tank.x, tank.y);
      ctx.rotate(tank.angle);
      ctx.strokeStyle = '#00f0ff';
      ctx.lineWidth = 2;
      ctx.strokeRect(-20, -15, 40, 30);
      ctx.strokeRect(-5, -25, 10, 20);
      ctx.restore();

      // Bullets
      for (let i = bullets.length - 1; i >= 0; i--) {
        const b = bullets[i];
        b.x += b.vx;
        b.y += b.vy;
        
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(b.x, b.y, 2, 0, Math.PI * 2);
        ctx.fill();

        if (b.y < 0 || b.x < 0 || b.x > width || b.y > height) {
          bullets.splice(i, 1);
        }
      }

      // Enemies
      if (frameCount % 60 === 0) spawnEnemy();
      for (let i = enemies.length - 1; i >= 0; i--) {
        const e = enemies[i];
        e.y += 1.5;

        ctx.strokeStyle = '#ff3333';
        ctx.lineWidth = 2;
        ctx.strokeRect(e.x - e.size/2, e.y - e.size/2, e.size, e.size);

        // Check bullet hit
        bullets.forEach((b, bi) => {
          if (Math.abs(b.x - e.x) < e.size/2 && Math.abs(b.y - e.y) < e.size/2) {
             e.hp--;
             bullets.splice(bi, 1);
             if (e.hp <= 0) {
               enemies.splice(i, 1);
               setScore(s => s + 10);
             }
          }
        });

        if (e.y > height - 60) {
           setGameOver(true);
        }
      }

      animationId = requestAnimationFrame(draw);
    };

    draw();

    const handleInput = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      
      // Update tank pos
      tank.x = mx;

      // Shoot automated or on click? User said firing running addiction
      // Let's shoot on interval if mouse is down
    };

    const shoot = () => {
       bullets.push({
         x: tank.x,
         y: tank.y - 20,
         vx: 0,
         vy: -10
       });
    };

    canvas.addEventListener('pointermove', handleInput);
    canvas.addEventListener('pointerdown', shoot);

    return () => {
      cancelAnimationFrame(animationId);
      canvas.removeEventListener('pointermove', handleInput);
      canvas.removeEventListener('pointerdown', shoot);
    };
  }, [gameOver]);

  return (
    <div className="w-full h-full relative overflow-hidden bg-black touch-none">
      <canvas ref={canvasRef} className="w-full h-full block" />
      <div className="absolute top-4 left-4 z-10 flex flex-col pointer-events-none">
        <span className="text-white font-mono text-xs uppercase opacity-50">Kills</span>
        <span className="text-neon-red font-black text-2xl">{score}</span>
      </div>
      {gameOver && (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center z-20 p-6 text-center">
          <h2 className="text-4xl font-black text-neon-red mb-2 tracking-tighter uppercase">Defeated</h2>
          <p className="text-white/60 font-mono mb-6">Base destroyed. Score: {score}</p>
          <button 
            onClick={() => { setScore(0); setGameOver(false); }} 
            className="bg-white text-black font-bold uppercase tracking-widest px-8 py-3 rounded-full hover:bg-neon-blue transition-colors"
          >
            Deploy Again
          </button>
        </div>
      )}
    </div>
  );
};
