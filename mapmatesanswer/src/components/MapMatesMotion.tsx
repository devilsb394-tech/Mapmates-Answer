import React, { useState, useEffect, useRef } from 'react';
import { Loader2, Clapperboard, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';

export function MapMatesMotion({ 
  query, 
  videos, 
  isSearching, 
  error,
  hasMore,
  isFetchingMore,
  onLoadMore
}: { 
  query: string, 
  videos: any[], 
  isSearching: boolean, 
  error: string | null,
  hasMore?: boolean,
  isFetchingMore?: boolean,
  onLoadMore?: () => void
}) {
  const loadingRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!hasMore || isFetchingMore || !onLoadMore || videos.length === 0) return;

    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        onLoadMore();
      }
    }, { threshold: 0, rootMargin: "400px" });

    if (loadingRef.current) {
      observer.observe(loadingRef.current);
    }

    return () => observer.disconnect();
  }, [hasMore, isFetchingMore, onLoadMore, videos.length]);

  return (
    <div className="flex-1 overflow-y-auto w-full max-w-2xl mx-auto py-8 px-4 pb-32 no-scrollbar snap-y snap-mandatory">
       <div className="flex flex-col items-center mb-10 snap-start">
          <div className="w-16 h-16 bg-neon-cyan/20 rounded-full flex items-center justify-center mb-4">
             <Clapperboard className="w-8 h-8 text-neon-cyan" />
          </div>
          <h2 className="text-2xl font-black text-white mb-2">
             MapMates <span className="text-neon-cyan text-[#00f0ff]">Motion</span>
          </h2>
          <p className="text-white/40 text-center max-w-sm mb-4 text-xs md:text-sm">
             {query ? `Curating endless immersive reels for: "${query}"` : "Infinite video discovery. Type a concept above to begin."}
          </p>
       </div>

       {isSearching && videos.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-white/50 space-y-4 snap-start">
             <Loader2 className="w-10 h-10 animate-spin text-neon-cyan" />
             <p className="text-sm font-mono tracking-widest uppercase">Engine assembling motion sequence...</p>
          </div>
       )}

       {error && videos.length === 0 && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-6 rounded-xl flex flex-col items-center text-center max-w-2xl mx-auto mb-10 snap-start">
             <h3 className="font-bold mb-2">Motion Engine Error</h3>
             <p className="text-sm text-red-400/80">{error}</p>
          </div>
       )}

       {videos.length > 0 && (
          <div className="space-y-12 pb-20">
             {videos.map((video: any) => {
                // Determine the best video file to play (prefer HD, mp4)
                const videoFile = video.video_files?.find((v: any) => v.file_type === 'video/mp4' && v.quality === 'hd') 
                               || video.video_files?.find((v: any) => v.file_type === 'video/mp4')
                               || video.video_files?.[0];

                return (
                   <motion.div 
                     initial={{ opacity: 0, y: 50 }} 
                     whileInView={{ opacity: 1, y: 0 }} 
                     viewport={{ once: true, margin: "-100px" }}
                     transition={{ duration: 0.5 }}
                     key={video.id} 
                     className="snap-center w-full flex flex-col items-center"
                   >
                      <div className="relative w-full aspect-[9/16] sm:aspect-[9/16] md:w-[400px] md:h-[711px] bg-black rounded-3xl overflow-hidden border border-white/10 shadow-[0_0_30px_rgba(0,240,255,0.1)] group">
                         {videoFile ? (
                            <video 
                              src={videoFile.link} 
                              poster={video.image}
                              className="w-full h-full object-contain max-h-[75vh]"
                              controls
                              loop
                              muted
                              playsInline
                            />
                         ) : video.iframeSrc ? (
                            <iframe 
                              src={video.iframeSrc}
                              className="w-full h-full object-cover"
                              frameBorder="0"
                              allow="autoplay; encrypted-media; picture-in-picture"
                              allowFullScreen
                            />
                         ) : null}
                         <div className="absolute top-4 left-4 right-4 flex justify-between items-start pointer-events-none">
                            <span className="px-3 py-1 bg-black/60 backdrop-blur-md rounded-full text-[10px] text-white/70 font-mono uppercase tracking-widest border border-white/10">
                               {video.platform === 'pexels' ? 'Pexels' : video.platform === 'dailymotion' ? 'Dailymotion' : video.platform === 'bilibili' ? 'Bilibili' : video.platform === 'peertube' ? 'PeerTube' : video.platform === 'archive' ? 'Archive' : 'Creator'}: {video.creatorName || video.user?.name}
                            </span>
                         </div>
                      </div>
                      
                      <div className="mt-4 w-full md:w-[400px] bg-white/5 border border-white/10 p-5 rounded-2xl flex flex-col gap-2">
                         <h3 className="text-white font-bold text-sm leading-snug mb-1">{video.title || "Motion Highlight"}</h3>
                         <div className="flex items-center gap-2 text-neon-cyan text-xs font-bold uppercase tracking-widest">
                            <Sparkles className="w-4 h-4" />
                            AI Insight
                         </div>
                         <p className="text-white/80 text-sm leading-relaxed">
                            {video.aiDescription || "Provides dynamic visual context for your search query."}
                         </p>
                      </div>
                   </motion.div>
                );
             })}
             
             {/* Loading Trigger Point */}
             {(hasMore || isFetchingMore) && (
                <div ref={loadingRef} className="w-full h-32 flex justify-center items-center gap-3">
                   <Loader2 className="w-5 h-5 animate-spin text-neon-cyan" />
                   <span className="text-sm font-mono text-white/50 uppercase tracking-widest">
                     Fetching Next Sequence...
                   </span>
                </div>
             )}
          </div>
       )}

       {!isSearching && videos.length === 0 && !error && query && (
          <div className="text-center py-20 text-white/30 text-sm snap-start">
             No motion sequences found for that query. Try a different concept.
          </div>
       )}
    </div>
  );
}
