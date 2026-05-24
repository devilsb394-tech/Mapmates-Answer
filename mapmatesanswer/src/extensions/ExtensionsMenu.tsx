import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Calculator as CalcIcon, Repeat, X, Box } from 'lucide-react';
import Calculator from './Calculator';
import UnitConverter from './UnitConverter';
import { ExtensionTab } from './types';

interface ExtensionsMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

const ExtensionsMenu: React.FC<ExtensionsMenuProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<ExtensionTab>('calculator');

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed right-4 top-10 w-[400px] max-w-[calc(100vw-32px)] bg-[#0d0d0d] border border-white/10 rounded-3xl shadow-2xl z-[101] overflow-hidden"
          >
            <div className="flex items-center justify-between p-6 border-b border-white/5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-neon-blue/10 border border-neon-blue/20 flex items-center justify-center">
                  <Box className="w-5 h-5 text-neon-blue" />
                </div>
                <div>
                  <h2 className="text-sm font-black text-white uppercase tracking-widest">MapMates Extensions</h2>
                  <p className="text-[10px] text-white/40 font-mono">Tools for Modern Intelligence</p>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="p-2 rounded-full hover:bg-white/5 text-white/40 hover:text-white transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-2 bg-white/[0.02] border-b border-white/5 flex gap-1">
              <button
                onClick={() => setActiveTab('calculator')}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'calculator' ? 'bg-neon-blue text-black' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
              >
                <CalcIcon className="w-3.5 h-3.5" /> Calculator
              </button>
              <button
                onClick={() => setActiveTab('converter')}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'converter' ? 'bg-neon-blue text-black' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
              >
                <Repeat className="w-3.5 h-3.5" /> Unit Converter
              </button>
            </div>

            <div className="flex flex-col items-center justify-start p-4 sm:p-6 max-h-[70vh] overflow-y-auto no-scrollbar">
              {activeTab === 'calculator' ? <Calculator /> : <UnitConverter />}
            </div>

            <div className="p-4 bg-white/[0.02] border-t border-white/5 text-center">
               <p className="text-[9px] font-mono text-white/20 uppercase tracking-[2px]">Encrypted Processing • Local Execution</p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default ExtensionsMenu;
