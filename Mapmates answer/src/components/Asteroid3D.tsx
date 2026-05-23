import React, { useRef, useEffect, useState } from 'react';
import { RotateCcw } from 'lucide-react';

export const Asteroid3D: React.FC = () => {
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
    let width = canvas.width = window.innerWidth;
    let height = canvas.height = window.innerHeight;

    let fov = 400;
    let animationId: number;

    let ship = { x: 0, y: 0, vx: 0, vy: 0 };
    let target = { x: 0, y: 0 };

    let asteroids: {x: number, y: number, z: number, s: number}[] = [];

    const spawn = () => {
       asteroids.push({
          x: (Math.random() - 0.5) * 2000,
          y: (Math.random() - 0.5) * 2000,
          z: 2000,
          s: 30 + Math.random() * 50
       });
    };

    for(let i=0; i<10; i++) spawn();

    const draw = () => {
       if (gameOver) return;
       ctx.fillStyle = 'rgba(0,0,0,0.3)';
       ctx.fillRect(0,0,width,height);
       
       const cx = width/2;
       const cy = height/2;

       ship.vx = (target.x - ship.x) * 0.1;
       ship.vy = (target.y - ship.y) * 0.1;
       ship.x += ship.vx;
       ship.y += ship.vy;

       ctx.strokeStyle = '#fff';
       ctx.lineWidth = 1;
       for(let i=asteroids.length-1; i>=0; i--){
         let a = asteroids[i];
         a.z -= 10 + (scoreRef.current * 0.1);
         if(a.z < -100) {
            asteroids.splice(i, 1);
            setScore(s => s + 10);
            spawn();
            continue;
         }

         let scale = fov / (fov + a.z);
         let px = cx + a.x * scale;
         let py = cy + a.y * scale;
         let size = a.s * scale;

         ctx.beginPath();
         for(let j=0; j<6; j++){
            let ang = (j/6) * Math.PI * 2;
            let sx = px + Math.cos(ang) * size;
            let sy = py + Math.sin(ang) * size;
            if(j===0) ctx.moveTo(sx, sy);
            else ctx.lineTo(sx, sy);
         }
         ctx.closePath();
         ctx.stroke();

         if(a.z > 0 && a.z < 60) {
            let actualPx = cx + ship.x;
            let actualPy = cy + ship.y;
            let dx = actualPx - px;
            let dy = actualPy - py;
            if (dx*dx+dy*dy < size*size) {
               setGameOver(true);
            }
         }
       }

       // draw ship
       ctx.strokeStyle = '#55EE99';
       ctx.beginPath();
       let actualPx = cx + ship.x;
       let actualPy = cy + ship.y;
       ctx.moveTo(actualPx, actualPy - 10);
       ctx.lineTo(actualPx + 10, actualPy + 10);
       ctx.lineTo(actualPx - 10, actualPy + 10);
       ctx.closePath();
       ctx.stroke();

       animationId = requestAnimationFrame(draw);
    };
    draw();

    const move = (e: PointerEvent) => {
       const rect = canvas.getBoundingClientRect();
       target.x = e.clientX - rect.left - width/2;
       target.y = e.clientY - rect.top - height/2;
    };
    canvas.addEventListener('pointermove', move);
    canvas.addEventListener('pointerdown', move);

    return () => {
       cancelAnimationFrame(animationId);
       canvas.removeEventListener('pointermove', move);
       canvas.removeEventListener('pointerdown', move);
    };
  }, [gameOver]);

  return (
    <div className="w-full h-full relative overflow-hidden bg-black touch-none">
       <canvas ref={canvasRef} className="w-full h-full block" />
       
       <div className="absolute top-4 left-4 z-10 flex flex-col pointer-events-none">
          <span className="text-white font-mono text-xs uppercase">Score</span>
          <span className="text-white font-black text-2xl">{score}</span>
       </div>

       {gameOver && (
          <div className="absolute inset-0 bg-white/10 backdrop-blur-md flex flex-col items-center justify-center z-20">
             <h2 className="text-4xl font-black text-white mb-2 tracking-tighter">IMPACT</h2>
             <p className="text-white/80 font-mono mb-6">Final: {score}</p>
             <button onClick={() => {setScore(0); setGameOver(false);}} className="bg-black text-white font-bold uppercase tracking-widest px-6 py-3 rounded-full flex items-center gap-2 hover:bg-white hover:text-black transition-colors">
                <RotateCcw className="w-5 h-5"/> Retry
             </button>
          </div>
       )}
    </div>
  );
}
