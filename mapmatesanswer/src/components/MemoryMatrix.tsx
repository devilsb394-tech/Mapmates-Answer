import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Play, RotateCcw, Trophy } from 'lucide-react';
import { cn } from '../lib/utils';

const GRID_SIZE = 3;

export const MemoryMatrix: React.FC = () => {
  const [sequence, setSequence] = useState<number[]>([]);
  const [playerStep, setPlayerStep] = useState<number>(0);
  const [isShowingSequence, setIsShowingSequence] = useState<boolean>(false);
  const [activeTile, setActiveTile] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [gameOver, setGameOver] = useState<boolean>(false);
  const [score, setScore] = useState<number>(0);
  const [highScore, setHighScore] = useState<number>(0);
  const [message, setMessage] = useState<string>('Watch carefully!');

  const startGame = () => {
    setScore(0);
    setGameOver(false);
    setPlayerStep(0);
    setIsPlaying(true);
    const nextTile = Math.floor(Math.random() * (GRID_SIZE * GRID_SIZE));
    setSequence([nextTile]);
    playSequence([nextTile]);
  };

  const nextRound = () => {
    setScore(s => s + 1);
    setPlayerStep(0);
    const nextTile = Math.floor(Math.random() * (GRID_SIZE * GRID_SIZE));
    const newSeq = [...sequence, nextTile];
    setSequence(newSeq);
    playSequence(newSeq);
  };

  const playSequence = async (seq: number[]) => {
    setIsShowingSequence(true);
    setMessage(`Level ${seq.length}`);
    await new Promise(r => setTimeout(r, 600)); // Pause before starting

    for (let i = 0; i < seq.length; i++) {
       setActiveTile(seq[i]);
       await new Promise(r => setTimeout(r, Math.max(300, 600 - (seq.length * 20))));
       setActiveTile(null);
       await new Promise(r => setTimeout(r, 150));
    }
    
    setIsShowingSequence(false);
    setMessage('Your turn!');
  };

  const handleTileClick = (index: number) => {
    if (!isPlaying || isShowingSequence || gameOver) return;

    setActiveTile(index);
    setTimeout(() => setActiveTile(null), 150);

    if (index === sequence[playerStep]) {
       // Correct tap
       if (playerStep === sequence.length - 1) {
          // Finished round
          setMessage('Good job!');
          setTimeout(nextRound, 500);
       } else {
          setPlayerStep(s => s + 1);
       }
    } else {
       // Wrong tap
       setGameOver(true);
       setIsPlaying(false);
       setMessage('Wrong tile!');
       if (score > highScore) setHighScore(score);
    }
  };

  return (
    <div className="w-full h-full bg-[#0a0a0a] flex flex-col items-center justify-center p-4 font-sans relative select-none">
       
      <div className="flex w-full max-w-sm justify-between items-center mb-4 px-4 relative z-10">
        <div className="flex flex-col">
          <span className="text-white/50 font-mono text-xs uppercase tracking-wider">Level</span>
          <span className="text-neon-yellow font-black text-2xl">{score}</span>
        </div>
        <div className="flex flex-col items-center">
           <div className={cn("px-4 py-1.5 rounded-full text-xs font-bold tracking-widest uppercase transition-colors", isShowingSequence ? "bg-neon-yellow/20 text-neon-yellow" : "bg-[#55EE99]/20 text-[#55EE99]", (!isPlaying || gameOver) && "opacity-0")}>
              {message}
           </div>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-white/50 font-mono text-xs uppercase tracking-wider flex items-center gap-1">
             <Trophy className="w-3 h-3 text-white" /> Best
          </span>
          <span className="text-white font-black text-xl">{highScore}</span>
        </div>
      </div>

      <div 
        className="relative bg-[#000] border-2 border-white/5 p-2 rounded-2xl shadow-[0_0_50px_rgba(255,204,0,0.05)] touch-none"
        style={{ 
           width: 'min(90vw, 360px)', 
           height: 'min(90vw, 360px)',
        }}
      >
         <div className="grid grid-cols-3 grid-rows-3 gap-2 w-full h-full">
            {Array.from({ length: GRID_SIZE * GRID_SIZE }).map((_, i) => (
              <button
                key={i}
                onPointerDown={() => handleTileClick(i)}
                className={cn(
                   "w-full h-full rounded-xl transition-all duration-150 border border-white/10",
                   activeTile === i ? "bg-neon-yellow shadow-[0_0_30px_rgba(255,204,0,0.8)] scale-95 border-none" : "bg-[#111] hover:bg-[#1a1a1a]"
                )}
              />
            ))}
         </div>

         <AnimatePresence>
            {!isPlaying && !gameOver && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm rounded-xl"
              >
                 <button 
                   onClick={startGame}
                   className="w-16 h-16 rounded-full bg-neon-yellow flex items-center justify-center shadow-[0_0_20px_rgba(255,204,0,0.5)] hover:scale-105 transition-transform"
                 >
                    <Play className="w-8 h-8 text-black fill-current ml-1" />
                 </button>
                 <p className="mt-4 text-white/50 font-mono text-xs uppercase tracking-widest text-center px-4">
                   Memorize the sequence
                 </p>
              </motion.div>
            )}

            {gameOver && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-red-900/40 backdrop-blur-md rounded-xl"
              >
                 <h3 className="text-3xl font-black text-white mb-2 tracking-tighter">GAME OVER</h3>
                 <p className="text-white/80 mb-6 font-mono text-sm uppercase">Reached Level {score}</p>
                 <button 
                   onClick={startGame}
                   className="px-6 py-3 bg-white text-black font-bold uppercase tracking-widest rounded-full hover:bg-neon-yellow transition-colors flex items-center gap-2"
                 >
                    <RotateCcw className="w-5 h-5" /> Retry
                 </button>
              </motion.div>
            )}
         </AnimatePresence>
      </div>
    </div>
  );
}
