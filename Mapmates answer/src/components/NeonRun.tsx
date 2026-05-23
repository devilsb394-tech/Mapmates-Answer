import React, { useRef, useEffect, useState } from 'react';
import { RotateCcw } from 'lucide-react';

export const NeonRun: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);

  const scoreRef = useRef(0);

  useEffect(() => {
    scoreRef.current = score;
  }, [score]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = canvas.width = window.innerWidth;
    let height = canvas.height = window.innerHeight;

    let animationFrameId: number;
    let frameCount = 0;
    const fov = 200;

    let playerX = 0;
    let playerY = 0;
    
    let targetX = 0;
    let targetY = 0;

    let obstacles: {x: number, y: number, z: number, w: number, h: number}[] = [];

    const pushObstacle = () => {
      obstacles.push({
        x: (Math.random() - 0.5) * 800,
        y: (Math.random() - 0.5) * 800,
        z: 1500,
        w: 100 + Math.random() * 100,
        h: 100 + Math.random() * 100
      });
    };

    for(let i=0; i<3; i++) pushObstacle();

    const draw = () => {
      if (gameOver) return;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
      ctx.fillRect(0, 0, width, height);

      const cx = width / 2;
      const cy = height / 2;

      ctx.strokeStyle = '#55EE99';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for(let a=0; a<Math.PI*2; a+=Math.PI/4) {
         ctx.moveTo(cx, cy);
         ctx.lineTo(cx + Math.cos(a)*1000, cy + Math.sin(a)*1000);
      }
      ctx.stroke();

      frameCount += 5;
      for (let z = 50; z < 1500; z += 200) {
         let zShift = ((z - frameCount) % 1500 + 1500) % 1500;
         let scale = fov / (fov + zShift);
         ctx.beginPath();
         let s = 800 * scale;
         ctx.rect(cx - s, cy - s, s * 2, s * 2);
         ctx.stroke();
      }

      playerX += (targetX - playerX) * 0.2;
      playerY += (targetY - playerY) * 0.2;

      ctx.strokeStyle = '#FF3366';
      ctx.lineWidth = 3;
      for (let i = obstacles.length - 1; i >= 0; i--) {
        const obs = obstacles[i];
        obs.z -= 15 + scoreRef.current * 0.1;
        
        if (obs.z <= -100) {
           obstacles.splice(i, 1);
           setScore(s => s + 1);
           pushObstacle();
           continue;
        }

        let scale = fov / (fov + obs.z);
        let px = cx + obs.x * scale;
        let py = cy + obs.y * scale;
        let w = obs.w * scale;
        let h = obs.h * scale;

        ctx.strokeRect(px - w/2, py - h/2, w, h);
        
        if (obs.z < 50 && obs.z > -50) {
           let actualPx = cx + playerX;
           let actualPy = cy + playerY;

           if (actualPx > px - w/2 && actualPx < px + w/2 && actualPy > py - h/2 && actualPy < py + h/2) {
              setGameOver(true);
           }
        }
      }

      ctx.fillStyle = '#00F0FF';
      ctx.beginPath();
      let pX = cx + playerX;
      let pY = cy + playerY;
      ctx.moveTo(pX, pY - 15);
      ctx.lineTo(pX + 15, pY + 15);
      ctx.lineTo(pX - 15, pY + 15);
      ctx.closePath();
      ctx.fill();

      animationFrameId = requestAnimationFrame(draw);
    };
    draw();

    const handlePointerMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      targetX = e.clientX - rect.left - width/2;
      targetY = e.clientY - rect.top - height/2;
    };
    canvas.addEventListener('pointermove', handlePointerMove);
    canvas.addEventListener('pointerdown', handlePointerMove);

    return () => {
      cancelAnimationFrame(animationFrameId);
      canvas.removeEventListener('pointermove', handlePointerMove);
      canvas.removeEventListener('pointerdown', handlePointerMove);
    };
  }, [gameOver]); // using score inside loop needs it in dependency or func version `setScore(s=>)`

  return (
    <div className="w-full h-full relative overflow-hidden bg-black touch-none">
       <canvas ref={canvasRef} className="w-full h-full block" />
       
       <div className="absolute top-4 left-4 z-10 flex flex-col pointer-events-none">
          <span className="text-neon-yellow font-mono text-xs uppercase">Distance</span>
          <span className="text-white font-black text-2xl">{score}</span>
       </div>

       {gameOver && (
          <div className="absolute inset-0 bg-red-900/40 backdrop-blur-sm flex flex-col items-center justify-center z-20">
             <h2 className="text-4xl font-black text-white mb-2 tracking-tighter">CRASHED</h2>
             <p className="text-white/80 font-mono mb-6">Score: {score}</p>
             <button onClick={() => {setScore(0); setGameOver(false);}} className="bg-white text-black font-bold uppercase tracking-widest px-6 py-3 rounded-full flex items-center gap-2 hover:bg-[#55EE99] transition-colors">
                <RotateCcw className="w-5 h-5"/> Retry
             </button>
          </div>
       )}
    </div>
  );
}
