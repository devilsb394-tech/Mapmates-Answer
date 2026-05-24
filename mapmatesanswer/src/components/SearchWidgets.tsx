import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Calculator, Timer, Cloud, Gamepad2, Play, Plus, Minus, X, Check, RotateCcw } from 'lucide-react';
import { cn } from '../lib/utils';

interface SearchWidgetsProps {
  query: string;
  onPlayGame?: (gameId: string) => void;
}

export const SearchWidgets: React.FC<SearchWidgetsProps> = ({ query, onPlayGame }) => {
  const q = query.toLowerCase();

  // Calculator Logic
  const [calcDisplay, setCalcDisplay] = useState('0');
  const [calcFormula, setCalcFormula] = useState('');
  
  const handleCalc = (val: string) => {
    if (val === 'C') {
      setCalcDisplay('0');
      setCalcFormula('');
    } else if (val === '=') {
      try {
        // Simple eval replacement for basic math
        const result = eval(calcFormula.replace(/[^-()\d/*+.]/g, ''));
        setCalcDisplay(String(result));
        setCalcFormula(String(result));
      } catch {
        setCalcDisplay('Error');
      }
    } else {
      const nextFormula = calcDisplay === '0' ? val : calcFormula + val;
      setCalcFormula(nextFormula);
      setCalcDisplay(calcDisplay === '0' ? val : calcDisplay + val);
    }
  };

  // Timer Logic
  const [timeLeft, setTimeLeft] = useState(0);
  const [isActive, setIsActive] = useState(false);
  
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => setTimeLeft(t => t - 1), 1000);
    } else if (timeLeft === 0) {
      setIsActive(false);
    }
    return () => clearInterval(interval);
  }, [isActive, timeLeft]);

  const formatTime = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Check visibility conditions
  const showCalc = q.includes('calc') || q.includes('math') || /^[0-9+\-*/().\s]+$/.test(q);
  const showTimer = q.includes('timer') || q.includes('stopwatch') || q.includes('count');
  const showGame = ['neon', 'cyber', 'snake', 'memory', 'reflex', 'asteroid', 'cube', 'laser', 'arcade'].some(word => q.includes(word));

  if (!showCalc && !showTimer && !showGame) return null;

  return (
    <motion.div 
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-8 flex flex-col gap-4"
    >
      <h3 className="font-mono text-[11px] text-neon-blue uppercase tracking-[2px]">MapMates Smart Result</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {showCalc && (
          <div className="bg-mm-card border border-white/10 rounded-2xl p-6 shadow-2xl relative overflow-hidden group">
            <div className="flex items-center gap-2 mb-4">
              <Calculator className="w-4 h-4 text-neon-blue" />
              <span className="text-xs font-bold uppercase tracking-wider text-white/50">Quick Calculator</span>
            </div>
            <div className="bg-black/40 rounded-xl p-4 mb-4 text-right">
               <div className="text-xs text-white/30 font-mono h-4 overflow-hidden">{calcFormula || '0'}</div>
               <div className="text-2xl font-bold text-white font-mono truncate">{calcDisplay}</div>
            </div>
            <div className="grid grid-cols-4 gap-2">
               {['7','8','9','/','4','5','6','*','1','2','3','-','C','0','=','+'].map(btn => (
                 <button 
                  key={btn}
                  onClick={() => handleCalc(btn)}
                  className={cn(
                    "py-2 rounded-lg font-bold transition-all",
                    btn === '=' ? "bg-neon-blue text-black col-span-1" : 
                    btn === 'C' ? "bg-neon-red/20 text-neon-red hover:bg-neon-red/30" : 
                    "bg-white/5 text-white hover:bg-white/10"
                  )}
                 >
                   {btn}
                 </button>
               ))}
            </div>
          </div>
        )}

        {showTimer && (
          <div className="bg-mm-card border border-white/10 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
            <div className="flex items-center gap-2 mb-4">
              <Timer className="w-4 h-4 text-neon-yellow" />
              <span className="text-xs font-bold uppercase tracking-wider text-white/50">Smart Timer</span>
            </div>
            <div className="flex flex-col items-center justify-center py-6">
               <div className="text-6xl font-black text-white font-mono tracking-tighter mb-6">{formatTime(timeLeft)}</div>
               <div className="flex gap-3">
                  <button onClick={() => setTimeLeft(t => t + 60)} className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white hover:bg-white/10">+1m</button>
                  <button onClick={() => { setIsActive(!isActive); if(timeLeft === 0 && !isActive) setTimeLeft(300); }} className={cn("px-8 h-12 rounded-full font-black uppercase tracking-widest transition-all", isActive ? "bg-neon-red text-white" : "bg-neon-yellow text-black")}>
                    {isActive ? 'Stop' : 'Start'}
                  </button>
                  <button onClick={() => { setIsActive(false); setTimeLeft(0); }} className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white hover:bg-white/10"><RotateCcw className="w-4 h-4" /></button>
               </div>
            </div>
          </div>
        )}

        {showGame && (
          <div className="bg-[#111] border border-white/10 rounded-2xl p-6 shadow-2xl overflow-hidden relative col-span-1 md:col-span-2">
            <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
               <Gamepad2 className="w-32 h-32 text-white" />
            </div>
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-2">
                <Gamepad2 className="w-4 h-4 text-[#55EE99]" />
                <span className="text-xs font-bold uppercase tracking-wider text-white/50">MapMates Arcade Match</span>
              </div>
              <h4 className="text-2xl font-black text-white mb-2">Want to play a game?</h4>
              <p className="text-white/50 text-sm max-w-md mb-6 font-medium">Bored of searching? Launch our zero-latency 3D arcade games directly from here.</p>
              <button 
                onClick={() => onPlayGame?.('arcade')}
                className="px-8 py-3 bg-white text-black font-black uppercase tracking-[2px] rounded-full hover:bg-[#55EE99] transition-all flex items-center gap-3 active:scale-95"
              >
                <Play className="w-4 h-4 fill-current" /> Open Arcade Hub
              </button>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};
