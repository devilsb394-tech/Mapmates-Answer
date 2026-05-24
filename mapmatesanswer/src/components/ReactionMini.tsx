import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Timer, RotateCcw } from 'lucide-react';
import { cn } from '../lib/utils';

type State = 'idle' | 'waiting' | 'ready' | 'result' | 'early';

export const ReactionMini: React.FC = () => {
  const [state, setState] = useState<State>('idle');
  const [startTime, setStartTime] = useState<number>(0);
  const [reactionTime, setReactionTime] = useState<number | null>(null);
  const [bestTime, setBestTime] = useState<number | null>(null);
  
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const startWaiting = () => {
    setState('waiting');
    setReactionTime(null);
    const delay = Math.random() * 3000 + 1500; // 1.5s to 4.5s
    timeoutRef.current = setTimeout(() => {
       setState('ready');
       setStartTime(Date.now());
    }, delay);
  };

  const handlePointerDown = () => {
     if (state === 'idle' || state === 'result' || state === 'early') {
        startWaiting();
     } else if (state === 'waiting') {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        setState('early');
     } else if (state === 'ready') {
        const time = Date.now() - startTime;
        setReactionTime(time);
        setState('result');
        if (bestTime === null || time < bestTime) {
           setBestTime(time);
        }
     }
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  let bgClass = "bg-[#111]";
  let textClass = "text-white";
  let message = "Click anywhere to start";
  let subMessage = "Test your reflex speed.";

  if (state === 'waiting') {
     bgClass = "bg-neon-red"; 
     textClass = "text-white";
     message = "Wait for green...";
     subMessage = "";
  } else if (state === 'ready') {
     bgClass = "bg-[#55EE99]";
     textClass = "text-black";
     message = "CLICK!";
     subMessage = "";
  } else if (state === 'early') {
     bgClass = "bg-orange-500";
     textClass = "text-white";
     message = "Too early!";
     subMessage = "Click to try again.";
  } else if (state === 'result') {
     bgClass = "bg-neon-blue";
     textClass = "text-black";
     message = `${reactionTime} ms`;
     subMessage = "Click to try again.";
  }

  return (
    <div className="w-full h-full bg-[#0a0a0a] flex flex-col font-sans relative select-none touch-none">
       
      <div className="flex-none flex items-center justify-between p-4 px-6 relative z-20 pointer-events-none">
        <h2 className="text-white/50 font-bold uppercase tracking-widest text-sm flex items-center gap-2">
           <Timer className="w-4 h-4" /> Reflex Test
        </h2>
        
        {bestTime !== null && (
          <div className="text-right">
             <div className="text-white/50 font-mono text-xs uppercase tracking-wider">Best Time</div>
             <div className="text-white font-black text-xl">{bestTime} ms</div>
          </div>
        )}
      </div>

      <div 
         onPointerDown={handlePointerDown}
         className={cn("absolute inset-0 flex flex-col items-center justify-center transition-colors duration-150 cursor-pointer z-10", bgClass)}
      >
         <AnimatePresence mode="wait">
            <motion.div
               key={state}
               initial={{ opacity: 0, scale: 0.9 }}
               animate={{ opacity: 1, scale: 1 }}
               className="text-center px-4"
            >
               {state === 'ready' && <Timer className="w-16 h-16 mx-auto mb-4 opacity-50 font-bold" strokeWidth={3} />}
               {state === 'result' && <Timer className="w-16 h-16 mx-auto mb-4 opacity-50" />}
               
               <h1 className={cn("text-4xl md:text-6xl font-black tracking-tighter mb-2", textClass)}>
                 {message}
               </h1>
               
               {subMessage && (
                 <p className={cn("text-lg font-medium opacity-70", textClass)}>
                   {subMessage}
                 </p>
               )}
            </motion.div>
         </AnimatePresence>
      </div>
    </div>
  );
}
