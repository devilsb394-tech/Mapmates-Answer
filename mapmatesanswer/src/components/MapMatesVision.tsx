import React, { useState, useEffect, useRef } from 'react';
import { Loader2, Image as ImageIcon, X, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export function MapMatesVision({ 
  query, 
  images, 
  isSearching, 
  error,
  hasMore,
  isFetchingMore,
  onLoadMore
}: { 
  query: string, 
  images: any[], 
  isSearching: boolean, 
  error: string | null,
  hasMore?: boolean,
  isFetchingMore?: boolean,
  onLoadMore?: () => void
}) {
  const [selectedImage, setSelectedImage] = useState<any>(null);
  const loadingRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!hasMore || isFetchingMore || !onLoadMore || images.length === 0) return;

    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        onLoadMore();
      }
    }, { threshold: 0.1 });

    if (loadingRef.current) {
      observer.observe(loadingRef.current);
    }

    return () => observer.disconnect();
  }, [hasMore, isFetchingMore, onLoadMore, images.length]);

  return (
    <div className="flex-1 overflow-y-auto w-full max-w-7xl mx-auto py-8 px-4 md:px-8 pb-32">
       <div className="flex flex-col items-center mb-10">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="w-16 h-16 rounded-2xl bg-mm-gradient flex items-center justify-center shadow-[0_0_20px_rgba(150,0,255,0.4)] mb-6">
             <ImageIcon className="w-8 h-8 text-white" />
          </motion.div>
          <h2 className="text-3xl md:text-5xl font-black tracking-tighter uppercase text-center mb-2 leading-none">
             MapMates <span className="text-neon-purple text-[#a64aff]">Vision</span>
          </h2>
          <p className="text-white/40 text-center max-w-lg mb-8 text-sm">
             {query ? `Uncovering visual concepts for: "${query}"` : "Deep AI image synthesis."}
          </p>
       </div>

       {isSearching && images.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-white/50 space-y-4">
             <Loader2 className="w-10 h-10 animate-spin text-neon-purple" />
             <p className="text-sm font-mono tracking-widest uppercase">AI is analyzing intent & rendering visuals...</p>
          </div>
       )}

       {error && images.length === 0 && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-6 rounded-xl flex flex-col items-center text-center max-w-2xl mx-auto mb-10">
             <h3 className="font-bold mb-2">Vision Engine Error</h3>
             <p className="text-sm text-red-400/80">{error}</p>
          </div>
       )}

       {images.length > 0 && (
          <>
             <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="columns-2 sm:columns-3 lg:columns-4 gap-4 space-y-4">
                {images.map((img: any) => (
                   <div key={img.id} onClick={() => setSelectedImage(img)} className="relative group break-inside-avoid overflow-hidden rounded-xl bg-white/5 border border-white/10 hover:border-neon-purple/50 transition-all cursor-pointer">
                      <img 
                        src={img.src.large} 
                        alt={img.alt || 'Vision result'} 
                        className="w-full object-cover transform group-hover:scale-105 transition-transform duration-500"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4">
                         <p className="text-white text-xs font-medium line-clamp-2 mb-1">{img.aiDescription || img.alt}</p>
                         <div className="flex items-center justify-between">
                            <span className="text-[10px] text-neon-purple font-bold px-1.5 py-0.5 bg-neon-purple/20 rounded">
                               Match: {img.aiRating || 90}%
                            </span>
                            <span className="text-white/50 text-[10px] uppercase font-mono tracking-wider">{img.photographer}</span>
                         </div>
                      </div>
                   </div>
                ))}
             </motion.div>
             
             {/* Loading Trigger Point */}
             {(hasMore || isFetchingMore) && (
                <div ref={loadingRef} className="w-full py-10 flex justify-center items-center gap-3">
                   <Loader2 className="w-5 h-5 animate-spin text-neon-purple" />
                   <span className="text-sm font-mono text-white/50 uppercase tracking-widest">
                     Loading More Visions...
                   </span>
                </div>
             )}
          </>
       )}

       {!isSearching && images.length === 0 && !error && query && (
          <div className="text-center py-20 text-white/30 text-sm">
             No specific visuals found for that query. Try a different concept.
          </div>
       )}

       {/* Fullscreen Overlay */}
       <AnimatePresence>
          {selectedImage && (
             <motion.div 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               className="fixed inset-0 z-[500] bg-black/95 flex flex-col"
             >
                <div className="absolute top-4 right-4 z-[510]">
                   <button onClick={() => setSelectedImage(null)} className="p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors">
                      <X className="w-6 h-6" />
                   </button>
                </div>
                
                <div className="flex-1 flex items-center justify-center p-4 min-h-0">
                   <img 
                     src={selectedImage.src.original || selectedImage.src.large2x || selectedImage.src.large} 
                     alt={selectedImage.alt} 
                     className="max-w-full max-h-full object-contain drop-shadow-[0_0_30px_rgba(150,0,255,0.2)]"
                   />
                </div>

                <div className="p-6 md:p-8 bg-gradient-to-t from-black to-transparent flex flex-col items-center justify-center">
                   <div className="max-w-2xl w-full text-center space-y-4">
                      <div className="inline-flex items-center gap-2 px-3 py-1 bg-neon-purple/20 text-neon-purple rounded-full text-xs font-bold uppercase tracking-widest">
                         <Sparkles className="w-3 h-3" />
                         AI Assessment: {selectedImage.aiRating || 90}% Match
                      </div>
                      <p className="text-white/90 text-sm md:text-base leading-relaxed">
                         {selectedImage.aiDescription || selectedImage.alt}
                      </p>
                      <p className="text-white/40 text-xs font-mono uppercase tracking-widest">
                         Photographer: {selectedImage.photographer} • Pexels
                      </p>
                   </div>
                </div>
             </motion.div>
          )}
       </AnimatePresence>
    </div>
  );
}
