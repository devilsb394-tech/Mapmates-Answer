import React, { useRef, useEffect, useState } from 'react';
import { Crosshair, RotateCcw } from 'lucide-react';

export const CyberShooter: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = canvas.width = window.innerWidth;
    let height = canvas.height = window.innerHeight;

    let animationFrameId: number;
    let particles: {x: number, y: number, z: number, vx: number, vy: number}[] = [];
    let enemies: {x: number, y: number, z: number, speed: number}[] = [];
    let lasers: {x: number, y: number, z: number}[] = [];
    let frameCount = 0;

    const fov = 300;

    const pushEnemy = () => {
      enemies.push({
        x: (Math.random() - 0.5) * 800,
        y: (Math.random() - 0.5) * 800,
        z: 1500,
        speed: 5 + Math.random() * 5 + (score * 0.1)
      });
    };

    for(let i=0; i<3; i++) pushEnemy();
    for(let i=0; i<100; i++) {
       particles.push({
         x: (Math.random() - 0.5) * 2000,
         y: (Math.random() - 0.5) * 2000,
         z: Math.random() * 2000,
         vx: 0, vy: 0
       });
    }

    const draw = () => {
      if (gameOver) return;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
      ctx.fillRect(0, 0, width, height);

      const cx = width / 2;
      const cy = height / 2;

      // Draw stars (particles moving slightly)
      ctx.fillStyle = '#fff';
      for (const p of particles) {
        p.z -= 10;
        if (p.z <= 0) {
           p.z = 2000;
           p.x = (Math.random() - 0.5) * 2000;
           p.y = (Math.random() - 0.5) * 2000;
        }
        let scale = fov / (fov + p.z);
        let px = cx + p.x * scale;
        let py = cy + p.y * scale;
        ctx.globalAlpha = Math.max(0, 1 - (p.z / 2000));
        ctx.fillRect(px, py, scale * 2, scale * 2);
      }
      ctx.globalAlpha = 1;

      // Update and draw lasers
      ctx.strokeStyle = '#00F0FF';
      ctx.lineWidth = 3;
      for (let i = lasers.length - 1; i >= 0; i--) {
        const l = lasers[i];
        l.z += 40;
        if (l.z > 2000) {
          lasers.splice(i, 1);
          continue;
        }
        let scale1 = fov / (fov + l.z);
        let scale2 = fov / (fov + l.z - 40);
        let px1 = cx + l.x * scale1;
        let py1 = cy + l.y * scale1;
        let px2 = cx + l.x * scale2;
        let py2 = cy + l.y * scale2;
        
        ctx.beginPath();
        ctx.moveTo(px1, py1);
        ctx.lineTo(px2, py2);
        ctx.stroke();

        // Collision Check
        for (let j = enemies.length - 1; j >= 0; j--) {
          const e = enemies[j];
          if (Math.abs(e.z - l.z) < 100 && Math.abs(e.x - l.x) < 100 && Math.abs(e.y - l.y) < 100) {
             setScore(s => s + 10);
             enemies.splice(j, 1);
             lasers.splice(i, 1);
             pushEnemy();
             break;
          }
        }
      }

      // Update and draw enemies
      ctx.strokeStyle = '#FF3366';
      ctx.lineWidth = 2;
      for (let i = enemies.length - 1; i >= 0; i--) {
        const e = enemies[i];
        e.z -= e.speed;
        if (e.z <= 0) {
           setGameOver(true);
           return; // end loop
        }
        let scale = fov / (fov + e.z);
        let px = cx + e.x * scale;
        let py = cy + e.y * scale;
        let s = 100 * scale;

        ctx.beginPath();
        ctx.moveTo(px, py - s);
        ctx.lineTo(px + s, py + s);
        ctx.lineTo(px - s, py + s);
        ctx.closePath();
        ctx.stroke();
      }

      if (Math.random() < 0.02) pushEnemy();

      animationFrameId = requestAnimationFrame(draw);
    };
    draw();

    const handlePointerDown = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left - width/2;
      const y = e.clientY - rect.top - height/2;
      // Shoot! The crosshair is targeted based on pointer
      lasers.push({ x: x * 2, y: y * 2, z: 0 }); // scale up local coordinates for 3D world
    };
    canvas.addEventListener('pointerdown', handlePointerDown);

    return () => {
      cancelAnimationFrame(animationFrameId);
      canvas.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [gameOver]);

  return (
    <div className="w-full h-full relative overflow-hidden bg-black touch-none">
       <canvas ref={canvasRef} className="w-full h-full block" />
       
       <div className="absolute top-4 left-4 z-10 flex flex-col pointer-events-none">
          <span className="text-neon-blue font-mono text-xs uppercase">Hits</span>
          <span className="text-white font-black text-2xl">{score}</span>
       </div>
       
       {!gameOver && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white/30 pointer-events-none">
             <Crosshair className="w-8 h-8" />
          </div>
       )}

       {gameOver && (
          <div className="absolute inset-0 bg-red-900/40 backdrop-blur-sm flex flex-col items-center justify-center z-20">
             <h2 className="text-4xl font-black text-white mb-2 tracking-tighter">BREACHED</h2>
             <p className="text-white/80 font-mono mb-6">Score: {score}</p>
             <button onClick={() => {setScore(0); setGameOver(false);}} className="bg-white text-black font-bold uppercase tracking-widest px-6 py-3 rounded-full flex items-center gap-2 hover:bg-neon-blue transition-colors">
                <RotateCcw className="w-5 h-5"/> Retry
             </button>
          </div>
       )}
    </div>
  );
}
