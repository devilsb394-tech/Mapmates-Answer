import React, { useRef, useEffect, useState } from 'react';
import { RotateCcw } from 'lucide-react';

export const CubeSurf: React.FC = () => {
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

    let fov = 350;
    let animationId: number;
    let shipX = 0;
    let targetX = 0;
    
    let cubes: {x: number, y: number, z: number}[] = [];

    const spawn = () => {
       cubes.push({
          x: (Math.random() - 0.5) * 1500,
          y: 200, // Ground level line?
          z: 2000
       });
    };

    for(let i=0; i<8; i++) spawn();

    const drawCube = (px: number, py: number, size: number) => {
       ctx.beginPath();
       ctx.rect(px - size/2, py - size/2, size, size);
       ctx.stroke();
    };

    const draw = () => {
       if (gameOver) return;
       ctx.fillStyle = 'rgba(0,0,0,0.5)';
       ctx.fillRect(0,0,width,height);
       
       const cx = width/2;
       const cy = height/2 + 200; // Horizon is low

       shipX += (targetX - shipX) * 0.15;

       // Ground lines
       ctx.strokeStyle = '#3366FF';
       ctx.lineWidth = 1;
       ctx.beginPath();
       for(let i=-2000; i<=2000; i+=200) {
          ctx.moveTo(cx, cy - 200);
          ctx.lineTo(cx + i, height);
       }
       ctx.stroke();

       // Draw cubes
       ctx.strokeStyle = '#FF33FF';
       ctx.lineWidth = 2;
       for(let i=cubes.length-1; i>=0; i--){
         let c = cubes[i];
         c.z -= 15 + (scoreRef.current * 0.2);
         if(c.z < -50) {
            cubes.splice(i, 1);
            setScore(s => s + 5);
            spawn();
            continue;
         }

         let scale = fov / (fov + c.z);
         let px = cx + c.x * scale;
         let py = cy; // on ground plane
         let size = 150 * scale;

         drawCube(px, py - size/2, size);

         if(c.z > 0 && c.z < 80) {
            let actualPx = cx + shipX;
            if (Math.abs(actualPx - px) < size/2 + 10) {
               setGameOver(true);
            }
         }
       }

       // draw surfer
       ctx.fillStyle = '#FFF';
       let actualPx = cx + shipX;
       ctx.beginPath();
       ctx.arc(actualPx, cy - 20, 10, 0, Math.PI*2);
       ctx.fill();

       animationId = requestAnimationFrame(draw);
    };
    draw();

    const move = (e: PointerEvent) => {
       const rect = canvas.getBoundingClientRect();
       targetX = e.clientX - rect.left - width/2;
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
          <span className="text-[#FF33FF] font-mono text-xs uppercase">Waves</span>
          <span className="text-white font-black text-2xl">{score}</span>
       </div>

       {gameOver && (
          <div className="absolute inset-0 bg-[#FF33FF]/20 backdrop-blur-md flex flex-col items-center justify-center z-20">
             <h2 className="text-4xl font-black text-white mb-2 tracking-tighter">WIPEOUT</h2>
             <p className="text-white/90 font-mono mb-6">Score: {score}</p>
             <button onClick={() => {setScore(0); setGameOver(false);}} className="bg-white text-black font-bold uppercase tracking-widest px-6 py-3 rounded-full flex items-center gap-2 hover:bg-[#FF33FF] hover:text-white transition-colors">
                <RotateCcw className="w-5 h-5"/> Retry
             </button>
          </div>
       )}
    </div>
  );
}
