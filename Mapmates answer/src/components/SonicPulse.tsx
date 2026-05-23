import React, { useRef, useEffect, useState } from 'react';
import { Zap } from 'lucide-react';

export const SonicPulse: React.FC = () => {
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

    let player = { y: height / 2, x: 100, targetY: height / 2 };
    let obstacles: { x: number, y: number, w: number, h: number }[] = [];
    let speed = 5;
    let animationId: number;
    let frameCount = 0;

    const spawn = () => {
      obstacles.push({
        x: width + 100,
        y: Math.random() * (height - 100),
        w: 50,
        h: 100 + Math.random() * 200
      });
    };

    const draw = () => {
      if (gameOver) return;
      frameCount++;
      speed = 5 + (scoreRef.current / 500);

      ctx.fillStyle = '#0a0a0d';
      ctx.fillRect(0, 0, width, height);

      // Pulse background
      const pulse = Math.sin(frameCount * 0.1) * 20;
      ctx.strokeStyle = `rgba(0, 240, 255, ${0.1 + Math.abs(pulse)/100})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, height/2 + pulse);
      ctx.lineTo(width, height/2 - pulse);
      ctx.stroke();

      // Player
      player.y += (player.targetY - player.y) * 0.1;
      ctx.shadowBlur = 15;
      ctx.shadowColor = '#00f0ff';
      ctx.fillStyle = '#00f0ff';
      ctx.beginPath();
      ctx.arc(player.x, player.y, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Obstacles
      if (frameCount % 60 === 0) spawn();
      for (let i = obstacles.length - 1; i >= 0; i--) {
        const o = obstacles[i];
        o.x -= speed;

        ctx.strokeStyle = '#ff33ff';
        ctx.lineWidth = 2;
        ctx.strokeRect(o.x, o.y, o.w, o.h);

        if (
          player.x + 8 > o.x && 
          player.x - 8 < o.x + o.w &&
          player.y + 8 > o.y &&
          player.y - 8 < o.y + o.h
        ) {
          setGameOver(true);
        }

        if (o.x < -100) {
          obstacles.splice(i, 1);
          setScore(s => s + 50);
        }
      }

      animationId = requestAnimationFrame(draw);
    };

    draw();

    const handleInput = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      player.targetY = e.clientY - rect.top;
    };
    canvas.addEventListener('pointermove', handleInput);

    return () => {
      cancelAnimationFrame(animationId);
      canvas.removeEventListener('pointermove', handleInput);
    };
  }, [gameOver]);

  return (
    <div className="w-full h-full relative overflow-hidden bg-black touch-none">
      <canvas ref={canvasRef} className="w-full h-full block" />
      <div className="absolute top-4 right-6 z-10 flex flex-col items-end pointer-events-none">
        <span className="text-white font-mono text-[10px] uppercase opacity-40">Distance</span>
        <span className="text-neon-blue font-black text-3xl italic">{score}m</span>
      </div>
      {gameOver && (
        <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center z-20">
          <Zap className="w-12 h-12 text-neon-blue mb-4 animate-pulse" />
          <h2 className="text-5xl font-black text-white mb-2 italic">LOGOUT</h2>
          <p className="text-white/40 font-mono mb-8 uppercase tracking-widest">Pulse Lost at {score}m</p>
          <button 
            onClick={() => { setScore(0); setGameOver(false); }} 
            className="border-2 border-neon-blue text-neon-blue font-black uppercase tracking-[3px] px-10 py-4 rounded-none hover:bg-neon-blue hover:text-black transition-all"
          >
            Re-Connect
          </button>
        </div>
      )}
    </div>
  );
};
