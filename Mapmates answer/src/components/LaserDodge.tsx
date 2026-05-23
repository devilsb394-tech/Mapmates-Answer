import React, { useRef, useEffect, useState } from 'react';
import { RotateCcw } from 'lucide-react';

export const LaserDodge: React.FC = () => {
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

    let fov = 300;
    let animationId: number;
    
    let shipX = 0;
    let shipY = 0;
    let targetX = 0;
    let targetY = 0;
    
    let lasers: {x: number, y: number, z: number, angle: number}[] = [];

    const spawn = () => {
       lasers.push({
          x: (Math.random() - 0.5) * 1000,
          y: (Math.random() - 0.5) * 1000,
          z: 2000,
          angle: Math.random() * Math.PI
       });
    };

    for(let i=0; i<6; i++) spawn();

    const draw = () => {
       if (gameOver) return;
       ctx.fillStyle = 'rgba(0,0,0,0.3)';
       ctx.fillRect(0,0,width,height);
       
       const cx = width/2;
       const cy = height/2;

       shipX += (targetX - shipX) * 0.15;
       shipY += (targetY - shipY) * 0.15;

       // Draw lasers
       ctx.lineWidth = 4;
       ctx.lineCap = 'round';
       for(let i=lasers.length-1; i>=0; i--){
         let l = lasers[i];
         l.z -= 20 + (scoreRef.current * 0.2);
         if(l.z < -200) {
            lasers.splice(i, 1);
            setScore(s => s + 5);
            spawn();
            continue;
         }

         let scale = fov / (fov + l.z);
         let px = cx + l.x * scale;
         let py = cy + l.y * scale;
         let length = 500 * scale;

         ctx.strokeStyle = `hsl(${(scoreRef.current * 2 + i * 20) % 360}, 100%, 60%)`;
         ctx.beginPath();
         let dx = Math.cos(l.angle) * length;
         let dy = Math.sin(l.angle) * length;
         ctx.moveTo(px - dx, py - dy);
         ctx.lineTo(px + dx, py + dy);
         ctx.stroke();

         // Collision check if near camera
         if(l.z > -50 && l.z < 50) {
            let actualPx = cx + shipX;
            let actualPy = cy + shipY;
            // distance from point to line Segment
            let A = actualPx - (px - dx);
            let B = actualPy - (py - dy);
            let C = (px + dx) - (px - dx);
            let D = (py + dy) - (py - dy);
            let dot = A * C + B * D;
            let len_sq = C * C + D * D;
            let param = -1;
            if (len_sq != 0) param = dot / len_sq;
            let xx, yy;
            if (param < 0) {
                xx = px - dx; yy = py - dy;
            } else if (param > 1) {
                xx = px + dx; yy = py + dy;
            } else {
                xx = (px - dx) + param * C;
                yy = (py - dy) + param * D;
            }
            let dist = Math.sqrt((actualPx - xx)*(actualPx - xx) + (actualPy - yy)*(actualPy - yy));
            if (dist < 15) {
               setGameOver(true);
            }
         }
       }

       // draw ship
       ctx.fillStyle = '#fff';
       let actualPx = cx + shipX;
       let actualPy = cy + shipY;
       ctx.beginPath();
       ctx.arc(actualPx, actualPy, 8, 0, Math.PI*2);
       ctx.fill();
       ctx.strokeStyle = '#00F0FF';
       ctx.lineWidth = 2;
       ctx.beginPath();
       ctx.arc(actualPx, actualPy, 15, 0, Math.PI*2);
       ctx.stroke();

       animationId = requestAnimationFrame(draw);
    };
    draw();

    const move = (e: PointerEvent) => {
       const rect = canvas.getBoundingClientRect();
       targetX = e.clientX - rect.left - width/2;
       targetY = e.clientY - rect.top - height/2;
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
          <span className="text-white font-mono text-xs uppercase">Survival</span>
          <span className="text-white font-black text-2xl">{score}</span>
       </div>

       {gameOver && (
          <div className="absolute inset-0 bg-red-900/40 backdrop-blur-md flex flex-col items-center justify-center z-20">
             <h2 className="text-4xl font-black text-white mb-2 tracking-tighter">FRIED</h2>
             <p className="text-white/80 font-mono mb-6">Score: {score}</p>
             <button onClick={() => {setScore(0); setGameOver(false);}} className="bg-white text-black font-bold uppercase tracking-widest px-6 py-3 rounded-full flex items-center gap-2 hover:bg-neon-blue transition-colors">
                <RotateCcw className="w-5 h-5"/> Retry
             </button>
          </div>
       )}
    </div>
  );
}
