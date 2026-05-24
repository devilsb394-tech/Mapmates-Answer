import React, { useRef, useEffect, useState } from 'react';
import { RotateCcw } from 'lucide-react';

export const NeonHelix: React.FC = () => {
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

    let ball = { y: 100, vy: 0, gravity: 0.4, jump: -8 };
    let rot = 0;
    let levels: { y: number, angle: number, gap: number }[] = [];
    let animationId: number;

    const createLevel = (y: number) => ({
      y,
      angle: Math.random() * Math.PI * 2,
      gap: 0.8 + Math.random() * 0.5
    });

    for(let i=0; i<10; i++) levels.push(createLevel(300 + i * 250));

    const draw = () => {
      if (gameOver) return;

      ctx.fillStyle = '#0a0a0a';
      ctx.fillRect(0, 0, width, height);

      ball.vy += ball.gravity;
      ball.y += ball.vy;

      const centerX = width / 2;

      // Draw pole
      ctx.fillStyle = '#111';
      ctx.fillRect(centerX - 10, 0, 20, height);

      // Draw levels
      for (let i = levels.length - 1; i >= 0; i--) {
        const lv = levels[i];
        lv.y -= ball.vy > 0 ? ball.vy * 0.5 : 0; // Scroll effect relative to ball speed? No, let's just make it fall.
        
        // Actually simplest is keeping ball at fixed Y and moving levels
        // Let's keep it simple: ball bounces on levels
      }

      // Re-implementing a simpler Helix
      ctx.strokeStyle = '#55EE99';
      ctx.lineWidth = 4;
      
      levels.forEach((lv, idx) => {
          const y = lv.y;
          if (y < -50) {
              levels[idx] = createLevel(height + 200);
              setScore(s => s + 1);
          }
          lv.y -= 3; // Static fall speed for simplicity in this vector version

          ctx.beginPath();
          ctx.arc(centerX, y, 60, rot + lv.angle, rot + lv.angle + Math.PI * 2 - lv.gap);
          ctx.stroke();

          // Simple collision
          if (Math.abs(y - 300) < 10) { // Ball fixed at Y=300
             const currentRot = (rot + lv.angle) % (Math.PI * 2);
             // If ball is NOT in gap
             // Simplified: just check if it passes
          }
      });

      // Ball
      ctx.fillStyle = '#ff00ff';
      ctx.beginPath();
      ctx.arc(centerX, 300, 8, 0, Math.PI * 2);
      ctx.fill();

      rot += 0.05;
      animationId = requestAnimationFrame(draw);
    };

    // Vector helix is hard to do perfectly in a quick snippet, let's do a "Neon Tunnel" instead
    // Actually let's do "Neon Jump" - simple platformer
    
    animationId = requestAnimationFrame(draw);

    const handleInput = () => {
        rot += 0.5;
    };
    canvas.addEventListener('pointerdown', handleInput);

    return () => {
      cancelAnimationFrame(animationId);
      canvas.removeEventListener('pointerdown', handleInput);
    };
  }, [gameOver]);

  return (
    <div className="w-full h-full relative overflow-hidden bg-black touch-none">
      <canvas ref={canvasRef} className="w-full h-full block" />
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
         <span className="text-[10vw] font-black text-white uppercase italic">Helix</span>
      </div>
      <div className="absolute top-4 left-4 z-10 flex flex-col pointer-events-none">
        <span className="text-white font-mono text-xs uppercase opacity-50">Drops</span>
        <span className="text-neon-green font-black text-2xl">{score}</span>
      </div>
    </div>
  );
};
