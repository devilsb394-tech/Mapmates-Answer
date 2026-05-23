import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Gamepad2, ArrowLeft, Zap, Orbit, Play, Trophy, Timer, Crosshair, FastForward, Rocket, Box, ShieldAlert } from 'lucide-react';
import { NeonGame } from './NeonGame';
import { SnakeGame } from './SnakeGame';
import { MemoryMatrix } from './MemoryMatrix';
import { ReactionMini } from './ReactionMini';
import { CyberShooter } from './CyberShooter';
import { NeonRun } from './NeonRun';
import { Asteroid3D } from './Asteroid3D';
import { CubeSurf } from './CubeSurf';
import { LaserDodge } from './LaserDodge';
import { VectorRacing } from './VectorRacing';
import { NeonHelix } from './NeonHelix';
import { CyberWar } from './CyberWar';
import { SonicPulse } from './SonicPulse';
import { VoidCollector } from './VoidCollector';
import { GridSlasher } from './GridSlasher';

const GAMES = [
  { id: 'cyber-shooter', name: 'Cyber Shooter', desc: 'Vector 3D firing base defense.', icon: Crosshair, color: 'text-neon-blue', bg: 'bg-neon-blue/10' },
  { id: 'neon-run', name: 'Neon Run', desc: '3D Endless high speed tunnel runner.', icon: FastForward, color: 'text-[#55EE99]', bg: 'bg-[#55EE99]/10' },
  { id: 'vector-racing', name: 'Vector Racing', desc: 'High speed F1 vector track racing.', icon: Zap, color: 'text-neon-yellow', bg: 'bg-neon-yellow/10' },
  { id: 'cyber-war', name: 'Cyber War', desc: 'Intergalactic tank warfare simulation.', icon: ShieldAlert, color: 'text-neon-red', bg: 'bg-neon-red/10' },
  { id: 'sonic-pulse', name: 'Sonic Pulse', desc: 'Adrenaline running through the digital void.', icon: Zap, color: 'text-neon-blue', bg: 'bg-neon-blue/10' },
  { id: 'void-collector', name: 'Void Collector', desc: 'Navigate 3D space to collect energy orbs.', icon: Orbit, color: 'text-[#FF33FF]', bg: 'bg-[#FF33FF]/10' },
  { id: 'grid-slasher', name: 'Grid Slasher', desc: 'Precision sword combat in grid space.', icon: Gamepad2, color: 'text-white', bg: 'bg-white/10' },
  { id: 'asteroid-3d', name: 'Vector Asteroids', desc: 'Dodge the incoming 3D wireframe debris.', icon: Rocket, color: 'text-white', bg: 'bg-white/10' },
  { id: 'cube-surf', name: 'Cube Surf', desc: 'Surf falling neon cubes in an endless void.', icon: Box, color: 'text-[#FF33FF]', bg: 'bg-[#FF33FF]/10' },
  { id: 'laser-dodge', name: 'Laser Dodge', desc: 'Evade intense vector laser beams in 3D.', icon: ShieldAlert, color: 'text-neon-yellow', bg: 'bg-neon-yellow/10' },
  { id: 'neon-rider', name: 'Neon Rider', desc: '3D Endless driving through neon space.', icon: Orbit, color: 'text-neon-blue', bg: 'bg-neon-blue/10' },
  { id: 'snake-grid', name: 'Grid Snake', desc: 'Classic snake game with modern glow.', icon: Gamepad2, color: 'text-neon-green', bg: 'bg-[#55EE99]/10' },
  { id: 'memory-matrix', name: 'Memory Matrix', desc: 'Match the glowing tiles sequence.', icon: Zap, color: 'text-neon-yellow', bg: 'bg-neon-yellow/10' },
  { id: 'reaction-tap', name: 'Reflex Test', desc: 'Tap as fast as you can when it turns green.', icon: Timer, color: 'text-neon-red', bg: 'bg-neon-red/10' },
  { id: 'neon-helix', name: 'Neon Helix', desc: 'Fall through gaps in a rotating tower.', icon: FastForward, color: 'text-[#55EE99]', bg: 'bg-[#55EE99]/10' },
];

export function ArcadeHub() {
  const [activeGame, setActiveGame] = useState<string | null>(null);

  return (
    <div className="w-full h-full flex flex-col bg-[#0a0a0a] overflow-hidden text-white pattern-dots text-white/[0.05]">
      {/* Header */}
      <div className="h-16 flex-none border-b border-white/10 flex items-center px-4 bg-black/50 backdrop-blur-md relative z-10">
         {activeGame ? (
           <button 
             onClick={() => setActiveGame(null)}
             className="flex items-center gap-2 px-3 py-2 text-white/70 hover:text-white transition-colors hover:bg-white/5 rounded-lg"
           >
             <ArrowLeft className="w-5 h-5" />
             <span className="font-bold text-sm tracking-wide uppercase">Arcade Menu</span>
           </button>
         ) : (
           <div className="flex items-center gap-3">
             <div className="w-10 h-10 rounded-xl bg-mm-gradient flex items-center justify-center">
               <Gamepad2 className="w-5 h-5 text-white" />
             </div>
             <h2 className="font-black text-xl tracking-tight text-white uppercase">MapMates Arcade</h2>
           </div>
         )}
      </div>

      <div className="flex-1 min-w-0 p-4 md:p-8 overflow-y-auto relative">
        <AnimatePresence mode="wait">
          {!activeGame ? (
            <motion.div
              key="menu"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="max-w-4xl mx-auto flex flex-col gap-8 h-full pb-20"
            >
              <div className="mb-4">
                <h3 className="font-mono text-neon-blue uppercase tracking-widest text-xs mb-2">Select a game</h3>
                <p className="text-3xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-br from-white to-white/40">
                  Ready to Play?
                </p>
                <p className="text-white/50 mt-2 max-w-lg">
                  Highly addictive offline mini-games to pass the time while you browse. Optimized for mobile and desktop.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
                {GAMES.map(game => {
                  const Icon = game.icon;
                  return (
                    <button
                      key={game.id}
                      onClick={() => setActiveGame(game.id)}
                      className="group relative flex flex-col items-start p-6 rounded-2xl bg-[#111] border border-white/10 hover:border-white/30 transition-all overflow-hidden text-left"
                    >
                      {/* background hover fx */}
                      <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 ${game.bg} blur-xl pointer-events-none`}></div>
                      
                      <div className={`w-14 h-14 rounded-xl flex items-center justify-center mb-4 border border-white/5 bg-black z-10`}>
                         <Icon className={`w-6 h-6 ${game.color}`} />
                      </div>
                      <h4 className="text-xl font-bold text-white mb-2 z-10">{game.name}</h4>
                      <p className="text-[#888] text-sm leading-relaxed z-10 h-[40px]">{game.desc}</p>
                      
                      <div className="mt-6 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-white/40 group-hover:text-white transition-colors z-10">
                         <Play className="w-4 h-4 fill-current" /> Play Now
                      </div>
                    </button>
                  );
                })}
                
                {/* Coming soon slot */}
                <div className="flex flex-col items-center justify-center p-6 rounded-2xl border-2 border-dashed border-white/10 bg-[#111]/30 opacity-60">
                   <Gamepad2 className="w-8 h-8 text-white/30 mb-2" />
                   <h4 className="font-bold text-white mb-1">More Games</h4>
                   <p className="text-xs text-[#888] uppercase tracking-widest font-mono">Coming Soon...</p>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="game"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              className="w-full h-full relative"
            >
              <div className="w-full h-[calc(100vh-140px)] md:h-[calc(100vh-180px)] rounded-2xl overflow-hidden border border-white/20 bg-black shadow-2xl relative">
                  {activeGame === 'cyber-shooter' && <CyberShooter />}
                  {activeGame === 'neon-run' && <NeonRun />}
                  {activeGame === 'vector-racing' && <VectorRacing />}
                  {activeGame === 'cyber-war' && <CyberWar />}
                  {activeGame === 'sonic-pulse' && <SonicPulse />}
                  {activeGame === 'void-collector' && <VoidCollector />}
                  {activeGame === 'grid-slasher' && <GridSlasher />}
                  {activeGame === 'asteroid-3d' && <Asteroid3D />}
                  {activeGame === 'cube-surf' && <CubeSurf />}
                  {activeGame === 'laser-dodge' && <LaserDodge />}
                  {activeGame === 'neon-rider' && <NeonGame />}
                  {activeGame === 'snake-grid' && <SnakeGame />}
                  {activeGame === 'memory-matrix' && <MemoryMatrix />}
                  {activeGame === 'reaction-tap' && <ReactionMini />}
                  {activeGame === 'neon-helix' && <NeonHelix />}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
