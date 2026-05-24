import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'motion/react';
import { Play, RotateCcw, Trophy } from 'lucide-react';

const GRID_SIZE = 20;
const INITIAL_SPEED = 150;

type Point = { x: number, y: number };
type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';

const generateFood = (snake: Point[]): Point => {
  let newFood;
  while (true) {
    newFood = {
      x: Math.floor(Math.random() * GRID_SIZE),
      y: Math.floor(Math.random() * GRID_SIZE)
    };
    if (!snake.some(segment => segment.x === newFood.x && segment.y === newFood.y)) {
      break;
    }
  }
  return newFood;
};

export const SnakeGame: React.FC = () => {
  const [snake, setSnake] = useState<Point[]>([{ x: 10, y: 10 }]);
  const [direction, setDirection] = useState<Direction>('RIGHT');
  const [food, setFood] = useState<Point>({ x: 15, y: 10 });
  const [gameOver, setGameOver] = useState<boolean>(false);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [score, setScore] = useState<number>(0);
  const [highScore, setHighScore] = useState<number>(0);

  const resetGame = () => {
    setSnake([{ x: 10, y: 10 }]);
    setDirection('RIGHT');
    setFood(generateFood([{ x: 10, y: 10 }]));
    setGameOver(false);
    setScore(0);
    setIsPlaying(true);
  };

  const handleKeyPress = useCallback((e: KeyboardEvent) => {
    if (!isPlaying) return;
    switch (e.key) {
      case 'ArrowUp':
      case 'w':
      case 'W':
        setDirection(prev => prev !== 'DOWN' ? 'UP' : prev);
        break;
      case 'ArrowDown':
      case 's':
      case 'S':
        setDirection(prev => prev !== 'UP' ? 'DOWN' : prev);
        break;
      case 'ArrowLeft':
      case 'a':
      case 'A':
        setDirection(prev => prev !== 'RIGHT' ? 'LEFT' : prev);
        break;
      case 'ArrowRight':
      case 'd':
      case 'D':
        setDirection(prev => prev !== 'LEFT' ? 'RIGHT' : prev);
        break;
    }
  }, [isPlaying]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handleKeyPress]);

  useEffect(() => {
    if (!isPlaying || gameOver) return;

    const moveSnake = () => {
      setSnake(prevSnake => {
        const head = prevSnake[0];
        const newHead = { ...head };

        switch (direction) {
          case 'UP': newHead.y -= 1; break;
          case 'DOWN': newHead.y += 1; break;
          case 'LEFT': newHead.x -= 1; break;
          case 'RIGHT': newHead.x += 1; break;
        }

        // Wall collision
        if (newHead.x < 0 || newHead.x >= GRID_SIZE || newHead.y < 0 || newHead.y >= GRID_SIZE) {
          setGameOver(true);
          setIsPlaying(false);
          return prevSnake;
        }

        // Self collision
        if (prevSnake.some(segment => segment.x === newHead.x && segment.y === newHead.y)) {
          setGameOver(true);
          setIsPlaying(false);
          return prevSnake;
        }

        const newSnake = [newHead, ...prevSnake];
        
        // Food collision
        if (newHead.x === food.x && newHead.y === food.y) {
          setScore(s => {
            const newScore = s + 10;
            if (newScore > highScore) setHighScore(newScore);
            return newScore;
          });
          setFood(generateFood(newSnake));
        } else {
          newSnake.pop();
        }

        return newSnake;
      });
    };

    const speed = Math.max(50, INITIAL_SPEED - Math.floor(score / 50) * 10);
    const gameLoop = setInterval(moveSnake, speed);
    return () => clearInterval(gameLoop);
  }, [isPlaying, gameOver, direction, food, score, highScore]);

  return (
    <div className="w-full h-full bg-[#0a0a0a] flex flex-col items-center justify-center p-4 relative font-sans">
      <div className="flex w-full max-w-sm justify-between items-center mb-6 px-4">
        <div className="flex flex-col">
          <span className="text-white/50 font-mono text-xs uppercase tracking-wider">Score</span>
          <span className="text-[#55EE99] font-black text-2xl">{score}</span>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-white/50 font-mono text-xs uppercase tracking-wider flex items-center gap-1">
             <Trophy className="w-3 h-3 text-neon-yellow" /> Best
          </span>
          <span className="text-neon-yellow font-black text-2xl">{highScore}</span>
        </div>
      </div>

      <div 
        className="relative bg-[#111] border-2 border-white/10 rounded-xl overflow-hidden shadow-[0_0_30px_rgba(85,238,153,0.1)] touch-none"
        style={{ 
           width: 'min(90vw, 400px)', 
           height: 'min(90vw, 400px)',
        }}
      >
        {!isPlaying && !gameOver && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm">
             <button 
               onClick={resetGame}
               className="w-16 h-16 rounded-full bg-[#55EE99] flex items-center justify-center shadow-[0_0_20px_rgba(85,238,153,0.5)] hover:scale-105 transition-transform"
             >
                <Play className="w-8 h-8 text-black fill-current ml-1" />
             </button>
             <p className="mt-4 text-white/50 font-mono text-xs uppercase tracking-widest text-center px-4">
               Swipe or use WASD/Arrows to move.<br/>Don't hit the walls!
             </p>
          </div>
        )}

        {gameOver && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-red-900/40 backdrop-blur-md">
             <h3 className="text-4xl font-black text-white mb-2 tracking-tighter shadow-lg">GAME OVER</h3>
             <p className="text-white/80 mb-6 font-mono">Final Score: {score}</p>
             <button 
               onClick={resetGame}
               className="px-6 py-3 bg-white text-black font-bold uppercase tracking-widest rounded-full hover:bg-[#55EE99] transition-colors flex items-center gap-2"
             >
                <RotateCcw className="w-5 h-5" /> Play Again
             </button>
          </div>
        )}

        {/* The Grid Canvas visually represented via divs */}
        {snake.map((segment, index) => (
           <div 
             key={index}
             className="absolute bg-[#55EE99] rounded-[2px] shadow-[0_0_10px_rgba(85,238,153,0.8)]"
             style={{
               left: `${(segment.x / GRID_SIZE) * 100}%`,
               top: `${(segment.y / GRID_SIZE) * 100}%`,
               width: `${100 / GRID_SIZE}%`,
               height: `${100 / GRID_SIZE}%`,
             }}
           />
        ))}
        {/* The Food */}
        <div 
          className="absolute bg-neon-red rounded-full shadow-[0_0_15px_rgba(255,51,102,1)]"
          style={{
            left: `${(food.x / GRID_SIZE) * 100}%`,
            top: `${(food.y / GRID_SIZE) * 100}%`,
            width: `${100 / GRID_SIZE}%`,
            height: `${100 / GRID_SIZE}%`,
          }}
        >
           {/* Pulsing effect in center of food */}
           <div className="w-full h-full rounded-full bg-white/50 animate-ping"></div>
        </div>
      </div>

      {/* Mobile Controls */}
      <div className="mt-8 grid grid-cols-3 gap-2 p-4 md:hidden">
         <div />
         <button onClick={() => setDirection(p => p !== 'DOWN' ? 'UP' : p)} className="bg-white/10 w-16 h-16 rounded-xl flex justify-center items-center active:bg-white/30 border border-white/5">⬆️</button>
         <div />
         <button onClick={() => setDirection(p => p !== 'RIGHT' ? 'LEFT' : p)} className="bg-white/10 w-16 h-16 rounded-xl flex justify-center items-center active:bg-white/30 border border-white/5">⬅️</button>
         <button onClick={() => setDirection(p => p !== 'UP' ? 'DOWN' : p)} className="bg-white/10 w-16 h-16 rounded-xl flex justify-center items-center active:bg-white/30 border border-white/5">⬇️</button>
         <button onClick={() => setDirection(p => p !== 'LEFT' ? 'RIGHT' : p)} className="bg-white/10 w-16 h-16 rounded-xl flex justify-center items-center active:bg-white/30 border border-white/5">➡️</button>
      </div>
    </div>
  );
}
