import React, { useState, useEffect } from 'react';
import { Loader2, Terminal } from 'lucide-react';

const messages = [
  "Initializing Neural Engines...",
  "Scanning Global Neural Web...",
  "Analyzing Reddit & Youtube consensus...",
  "Synthesizing truth vectors...",
  "Connecting to secure nodes...",
  "Extracting high-value insights...",
  "Securing data pathways..."
];

export const HackingLoader = () => {
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentMessageIndex((prev) => (prev + 1) % messages.length);
    }, 1500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center py-20 text-neon-yellow space-y-6 animate-pulse">
      <div className="relative">
        <Loader2 className="w-12 h-12 animate-spin text-neon-yellow opacity-80" />
        <Terminal className="absolute top-1/2 left-1/2 -ml-2 -mt-2 w-4 h-4 text-white" />
      </div>
      <div className="flex flex-col items-center space-y-2">
        <p className="text-xs font-mono tracking-[0.2em] uppercase text-white/70">System Processing</p>
        <p className="text-sm font-mono font-bold tracking-tight text-neon-yellow border-l-2 border-white/20 pl-3">
          {messages[currentMessageIndex]}
        </p>
      </div>
      <div className="w-64 h-1 bg-white/10 rounded-full overflow-hidden">
        <div className="h-full bg-neon-yellow/60 animate-[loading_2s_infinite_ease-in-out]" />
      </div>
    </div>
  );
};
