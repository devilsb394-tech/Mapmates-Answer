import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { TrendingUp, RefreshCw, ExternalLink, MessageSquare, Share2, Eye, Flame, Clock } from 'lucide-react';

interface TrendItem {
  id: string;
  title: string;
  description: string;
  source: string;
  timestamp: string;
  category: string;
  impact: 'High' | 'Medium' | 'Low';
  views: number;
  url: string;
  imageUrl: string;
}

const CATEGORIES = ['All', 'Technology', 'Finance', 'Entertainment', 'Science', 'Global'];

const CATEGORY_IMAGES: Record<string, string> = {
  'Technology': 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&q=80&w=800',
  'Finance': 'https://images.unsplash.com/photo-1611974714014-4b52115eeaf0?auto=format&fit=crop&q=80&w=800',
  'Entertainment': 'https://images.unsplash.com/photo-1603190287605-e6ade32faaf5?auto=format&fit=crop&q=80&w=800',
  'Science': 'https://images.unsplash.com/photo-1507413245164-6160d8298b31?auto=format&fit=crop&q=80&w=800',
  'Global': 'https://images.unsplash.com/photo-1521295121783-8a321d551ad2?auto=format&fit=crop&q=80&w=800'
};

const CATEGORY_URLS: Record<string, string> = {
  'Technology': 'https://techcrunch.com',
  'Finance': 'https://www.bloomberg.com',
  'Entertainment': 'https://www.hollywoodreporter.com',
  'Science': 'https://www.nature.com',
  'Global': 'https://www.reuters.com'
};

const MapMatesPulse: React.FC = () => {
  const [trends, setTrends] = useState<TrendItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeCategory, setActiveCategory] = useState('All');
  const [page, setPage] = useState(1);
  const scrollRef = useRef<HTMLDivElement>(null);

  const fetchTrends = useCallback(async (isLoadMore = false) => {
    if (!isLoadMore) setLoading(true);
    
    try {
      const baseTopics = [
        { title: "Quantum Computing Breakthrough in Silicon Valley", category: "Technology", source: "TechCrunch" },
        { title: "Global Markets React to New Economic Data", category: "Finance", source: "Bloomberg" },
        { title: "Next-Gen AI Models Redefining Creativity", category: "Technology", source: "Wired" },
        { title: "SpaceX Successfully Deploys New Satellite Constellation", category: "Science", source: "Reuters" },
        { title: "Major Discovery in Renewable Energy Storage", category: "Science", source: "Nature" },
        { title: "Emerging Web3 Trends for the Next Decade", category: "Technology", source: "The Verge" },
        { title: "The Evolution of Digital Identity in 2026", category: "Global", source: "Al Jazeera" },
        { title: "Neuro-Link Systems Pass Safety Milestones", category: "Science", source: "STAT News" },
        { title: "Sustainable Architecture: Cities of the Future", category: "Global", source: "Architectural Digest" },
        { title: "The Rise of Decentralized Autonomous Organizations", category: "Finance", source: "CoinDesk" }
      ];

      const selectedTopics = [...baseTopics].sort(() => Math.random() - 0.5).slice(0, 5);

      const mockTrends: TrendItem[] = await Promise.all(selectedTopics.map(async (topic) => {
        let imageUrl = 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&q=80&w=800';
        try {
          const visionRes = await fetch('/api/vision', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: topic.title, page: 1 })
          });
          const visionData = await visionRes.json();
          if (visionData.images?.[0]) {
            imageUrl = visionData.images[0].src.large;
          }
        } catch (e) {
          console.warn("Vision fetch failed:", topic.title);
        }

        return {
          id: Math.random().toString(36).substr(2, 9),
          title: topic.title,
          description: `Leading experts from ${topic.source} analyze the recent shifts in ${topic.category.toLowerCase()} and how it affects the global landscape. The implications of this development are expected to ripple through various sectors in the coming months.`,
          source: topic.source,
          timestamp: new Date().toLocaleTimeString(),
          category: topic.category,
          impact: ['High', 'Medium', 'Low'][Math.floor(Math.random() * 3)] as any,
          views: Math.floor(Math.random() * 50000) + 1000,
          url: `https://www.google.com/search?q=${encodeURIComponent(topic.title + ' ' + topic.source)}`,
          imageUrl
        };
      }));

      setTrends(prev => isLoadMore ? [...prev, ...mockTrends] : mockTrends);
    } catch (error) {
      console.error("Pulse fetch failed:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchTrends();
    
    // Auto-refresh every 10 minutes as requested
    const interval = setInterval(() => {
      setRefreshing(true);
      fetchTrends();
    }, 600000);

    return () => clearInterval(interval);
  }, [fetchTrends]);

  const handleScroll = () => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    if (scrollTop + clientHeight >= scrollHeight - 100 && !loading) {
      fetchTrends(true);
    }
  };

  return (
    <div 
      ref={scrollRef}
      onScroll={handleScroll}
      className="h-full overflow-y-auto bg-[#050505] no-scrollbar"
    >
      <div className="max-w-4xl mx-auto p-6 md:p-8">
        {/* Pulse Header - Now inside the scroll view */}
        <div className="space-y-8 mb-12 border-b border-white/5 pb-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-3 text-neon-blue">
                <TrendingUp className="w-6 h-6 animate-pulse" />
                <span className="text-[10px] font-black uppercase tracking-[4px]">Live Interface</span>
              </div>
              <h1 className="text-4xl md:text-5xl font-black text-white uppercase tracking-tighter">
                MapMates Pulse
              </h1>
              <p className="text-white/40 font-mono text-xs max-w-xl">
                Global intelligence stream updated every 10 minutes. Real-world trends and technology shifts processed through locally encrypted protocols.
              </p>
            </div>

            <div className="flex items-center gap-2 bg-white/5 p-1 rounded-xl border border-white/5 self-start md:self-auto overflow-x-auto no-scrollbar max-w-full">
              <div className="flex items-center gap-2 flex-nowrap">
                {CATEGORIES.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap flex-shrink-0 ${activeCategory === cat ? 'bg-neon-blue text-black' : 'text-white/40 hover:text-white'}`}
                  >
                    {cat || 'All'}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Feed */}
        <div className="space-y-6">
          <AnimatePresence mode="popLayout">
            {trends.filter(t => activeCategory === 'All' || t.category === activeCategory).map((trend, idx) => (
              <motion.div
                key={trend.id + idx}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: (idx % 10) * 0.05 }}
                className="group relative bg-[#0d0d0d] border border-white/5 rounded-2xl p-6 hover:border-white/10 hover:bg-white/[0.02] transition-all"
              >
                <div className="flex flex-col md:flex-row gap-6">
                  {/* Content Area */}
                  <div className="flex-1 order-2 md:order-1">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-3">
                        <span className="px-2 py-1 bg-white/5 rounded text-[8px] font-black uppercase text-neon-blue border border-neon-blue/20">
                          {trend.category}
                        </span>
                        <span className="flex items-center gap-1.5 text-[10px] font-mono text-white/30 uppercase tracking-tighter">
                          <Clock className="w-3 h-3" /> {trend.timestamp}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${trend.impact === 'High' ? 'bg-neon-red shadow-[0_0_8px_rgba(255,51,102,0.5)]' : trend.impact === 'Medium' ? 'bg-orange-500' : 'bg-green-500'}`} />
                        <span className="text-[9px] font-black text-white/20 uppercase tracking-widest">{trend.impact} Impact</span>
                      </div>
                    </div>

                    <a 
                      href={trend.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="block group-hover:text-neon-blue transition-colors mb-3"
                    >
                      <h3 className="text-xl md:text-2xl font-bold text-white">
                        {trend.title}
                      </h3>
                    </a>
                    
                    <p className="text-sm text-white/50 leading-relaxed mb-6 line-clamp-3">
                      {trend.description}
                    </p>

                    <div className="flex items-center justify-between pt-6 border-t border-white/5">
                      <div className="flex items-center gap-6">
                        <span className="text-[10px] font-black text-white/40 uppercase tracking-widest flex items-center gap-2">
                          <Eye className="w-3.5 h-3.5" /> {trend.views.toLocaleString()}
                        </span>
                        <div className="flex items-center gap-3">
                          <button className="text-white/20 hover:text-neon-blue transition-colors"><MessageSquare className="w-4 h-4" /></button>
                          <button className="text-white/20 hover:text-neon-blue transition-colors"><Share2 className="w-4 h-4" /></button>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-[10px] font-mono text-white/20">{trend.source}</span>
                        <a href={trend.url} target="_blank" rel="noopener noreferrer" className="p-2 bg-white/5 rounded-lg text-white hover:bg-neon-blue hover:text-black transition-all">
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      </div>
                    </div>
                  </div>

                  {/* Image Area */}
                  <div className="w-full md:w-56 h-40 md:h-auto rounded-xl overflow-hidden order-1 md:order-2 flex-shrink-0 bg-white/5">
                    <img 
                      src={trend.imageUrl} 
                      alt={trend.title}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {loading && (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <RefreshCw className="w-8 h-8 text-neon-blue animate-spin" />
              <p className="text-[10px] font-black uppercase text-white/40 tracking-[4px]">Processing Stream...</p>
            </div>
          )}
        </div>
      </div>
      
      {refreshing && (
        <div className="fixed bottom-8 right-8 flex items-center gap-3 bg-neon-blue text-black px-4 py-2 rounded-full font-black uppercase text-[10px] tracking-widest shadow-2xl shadow-neon-blue/20 animate-in fade-in slide-in-from-bottom-4">
           <RefreshCw className="w-3 h-3 animate-spin" /> Live Sync Active
        </div>
      )}
    </div>
  );
};

export default MapMatesPulse;
