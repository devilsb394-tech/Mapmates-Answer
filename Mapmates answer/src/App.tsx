import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Eye, EyeOff, Search, Loader2, Link2, Sparkles, Plus, ArrowLeft, ArrowRight, History, ExternalLink, Moon, Mic, Bot, PenTool, LayoutPanelLeft, PanelsTopLeft, SplitSquareHorizontal, Gamepad2, LayoutGrid, Copy, Check, BrainCircuit, Video, Volume2, MoreVertical, MessageSquare, FileText, Trash2, Send, ShieldAlert, ShoppingBag, Newspaper, Play, AlertTriangle, Flame, Download } from 'lucide-react';
import Markdown from 'react-markdown';
import { cn } from './lib/utils';
import { auth, googleProvider, db } from './lib/firebase';
import { signInWithPopup, onAuthStateChanged, User } from 'firebase/auth';
import { addDoc, collection, query as firestoreQuery, where, orderBy, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { ArcadeHub } from './components/ArcadeHub';
import { SearchWidgets } from './components/SearchWidgets';

// Types and Interfaces
type AppState = 'splash' | 'home' | 'search' | 'game';

interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  source?: 'mapmates' | 'web';
}

const MAPMATES_LINKS: SearchResult[] = [
  { title: 'MapMates AI', url: 'https://mapmatesai.netlify.app', snippet: 'The powerful AI assistant and tools for the Mapmates ecosystem.', source: 'mapmates' },
  { title: 'MapMates Hub', url: 'https://mapmateshub.netlify.app', snippet: 'Your central hub for all MapMates applications and services.', source: 'mapmates' },
  { title: 'MapMates Demo', url: 'https://mapmatesdemo.netlify.app', snippet: 'Explore the latest demos and features from MapMates.', source: 'mapmates' },
];

const FAMOUS_LINKS = [
  { title: 'MapMates AI', url: 'https://mapmatesai.netlify.app', icon: '🤖' },
  { title: 'MapMates Hub', url: 'https://mapmateshub.netlify.app', icon: '🌐' },
  { title: 'MapMates Demo', url: 'https://mapmatesdemo.netlify.app', icon: '🚀' },
  { title: 'MapMates Creator', url: 'https://creator.mapmates.com', icon: '🛠️' },
  { title: 'YouTube', url: 'https://youtube.com', icon: '▶️' },
  { title: 'Facebook', url: 'https://facebook.com', icon: 'f' },
  { title: 'Twitter', url: 'https://twitter.com', icon: '🐦' },
  { title: 'Instagram', url: 'https://instagram.com', icon: '📷' },
  { title: 'LinkedIn', url: 'https://linkedin.com', icon: '💼' },
  { title: 'Reddit', url: 'https://reddit.com', icon: '👾' },
  { title: 'Netflix', url: 'https://netflix.com', icon: '📺' },
  { title: 'Amazon', url: 'https://amazon.com', icon: '🛒' },
  { title: 'Wikipedia', url: 'https://wikipedia.org', icon: 'W' },
  { title: 'GitHub', url: 'https://github.com', icon: '🐙' },
  { title: 'ChatGPT', url: 'https://chat.openai.com', icon: '💬' },
  { title: 'Google', url: 'https://google.com', icon: 'G' },
];

const BLOCKED_DOMAINS = [
  'youtube.com', 'youtu.be', 'facebook.com', 'instagram.com', 
  'twitter.com', 'x.com', 'linkedin.com', 'github.com', 
  'reddit.com', 'netflix.com', 'amazon.com', 'wikipedia.org', 
  'google.com', 'chat.openai.com', 'tiktok.com', 'twitch.tv'
];

const isBlocked = (url: string) => {
  try {
    const urlObj = new URL(url);
    return BLOCKED_DOMAINS.some(d => urlObj.hostname.includes(d));
  } catch {
    return BLOCKED_DOMAINS.some(d => url.toLowerCase().includes(d));
  }
};

export default function App() {
  // State Management
  const [view, setView] = useState<AppState>('splash');
  const [query, setQuery] = useState('');
  const [queryLang, setQueryLang] = useState<'EN' | 'UR'>('EN'); // Added state
  const [searchMode, setSearchMode] = useState<'home' | 'neural' | 'video' | 'thinking' | 'picks' | 'news'>('home');
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);

  const [lensVideos, setLensVideos] = useState<any[]>([]);
  const [isLensLoading, setIsLensLoading] = useState(false);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [lensError, setLensError] = useState<string | null>(null);
  const [lensPage, setLensPage] = useState(1);
  const [hasMoreLens, setHasMoreLens] = useState(true);
  const lensObserverRef = useRef<HTMLDivElement>(null);
  const [playingVideoId, setPlayingVideoId] = useState<string | null>(null);
  const [loaderStep, setLoaderStep] = useState(0);

  const [picksData, setPicksData] = useState<any[]>([]);
  const [isPicksLoading, setIsPicksLoading] = useState(false);
  const [picksError, setPicksError] = useState<string | null>(null);

  const [newsData, setNewsData] = useState<any[]>([]);
  const [isNewsLoading, setIsNewsLoading] = useState(false);
  const [newsError, setNewsError] = useState<string | null>(null);

  const fetchNews = async (q: string) => {
     setIsNewsLoading(true);
     setNewsError(null);
     
     let locationStr = "unknown";
     try {
       const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 });
       });
       
       try {
         const geoRes = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&format=json`);
         const geoData = await geoRes.json();
         locationStr = geoData.display_name || `Lat: ${pos.coords.latitude}, Lng: ${pos.coords.longitude}`;
       } catch (geoErr) {
         locationStr = `Lat: ${pos.coords.latitude}, Lng: ${pos.coords.longitude}`;
       }
     } catch (e) {
       locationStr = "Permission denied or unavailable. Assume global/general.";
     }

     try {
       const res = await fetch('/api/news-search', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ query: q, location: locationStr })
       });
       
       if (!res.ok) throw new Error("Failed to fetch MapMates News");
       const data = await res.json();
       setNewsData(data.news);
     } catch(e: any) {
       console.error("News fetch error", e);
       setNewsError(e.message || "Failed to find news.");
     } finally {
       setIsNewsLoading(false);
     }
  };

  const fetchPicks = async (q: string) => {
     setIsPicksLoading(true);
     setPicksError(null);
     
     let locationStr = "unknown";
     try {
       const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 });
       });
       
       try {
         const geoRes = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&format=json`);
         const geoData = await geoRes.json();
         locationStr = geoData.display_name || `Lat: ${pos.coords.latitude}, Lng: ${pos.coords.longitude}`;
       } catch (geoErr) {
         locationStr = `Lat: ${pos.coords.latitude}, Lng: ${pos.coords.longitude}`;
       }
     } catch (e) {
       locationStr = "Permission denied or unavailable. Fallback to generic online shops.";
     }

     try {
       const res = await fetch('/api/picks-search', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ query: q, location: locationStr })
       });
       
       if (!res.ok) throw new Error("Failed to fetch MapMates Picks");
       const data = await res.json();
       setPicksData(data.picks);
     } catch(e: any) {
       console.error("Picks fetch error", e);
       setPicksError(e.message || "Failed to find products.");
     } finally {
       setIsPicksLoading(false);
     }
  };

  const fetchLensVideos = async (q: string, p = 1, append = false) => { if (p === 1) setPlayingVideoId(null);
     if (p > 1) setIsFetchingMore(true);
     else setIsLensLoading(true);
     setLensError(null);
     try {
       const res = await fetch('/api/lens-search', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ query: q, history: searchHistory, page: p })
       });
       const data = await res.json();
       if (data.videos) {
         if (append) {
           setLensVideos(prev => [...prev, ...data.videos]);
         } else {
           setLensVideos(data.videos);
         }
         setHasMoreLens(data.videos.length > 0);
       } else if (data.error) {
         setLensError(data.error + (data.details ? ": " + data.details : ""));
       }
     } catch(e: any) {
       console.error("Lens fetch error", e);
       setLensError(e.message || "Failed to fetch videos.");
     } finally {
       setIsLensLoading(false);
       setIsFetchingMore(false);
     }
  };

  useEffect(() => {
    if (searchMode === 'video' && lensVideos.length > 0 && hasMoreLens && !isFetchingMore) {
      const observer = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting) {
            const nextPage = lensPage + 1;
            setLensPage(nextPage);
            fetchLensVideos(query || "Fascinating facts", nextPage, true);
          }
        },
        { threshold: 0.1 }
      );
      if (lensObserverRef.current) observer.observe(lensObserverRef.current);
      return () => observer.disconnect();
    }
  }, [searchMode, lensVideos.length, hasMoreLens, isFetchingMore, query, lensPage]);

  const [insightData, setInsightData] = useState<any | null>(null);
  const [isInsightLoading, setIsInsightLoading] = useState(false);
  const [insightError, setInsightError] = useState<string | null>(null);

  const fetchInsight = async (q: string) => {
     setIsInsightLoading(true);
     setInsightError(null);
     try {
       const res = await fetch('/api/insight-search', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ query: q })
       });
       const data = await res.json();
       if (data.insight) {
         setInsightData(data.insight);
       } else if (data.error) {
         setInsightError(data.error + (data.details ? ": " + data.details : ""));
       }
     } catch(e: any) {
       console.error("Insight fetch error", e);
       setInsightError(e.message || "Failed to analyze data.");
     } finally {
       setIsInsightLoading(false);
     }
  };

  useEffect(() => {
    if (searchMode === 'video' && lensVideos.length === 0) {
       fetchLensVideos(query || (searchHistory.length > 0 ? searchHistory[searchHistory.length - 1] : "Fascinating educational facts"));
    }
    if (searchMode === 'thinking' && !insightData) {
       fetchInsight(query || (searchHistory.length > 0 ? searchHistory[searchHistory.length - 1] : "What is the truth about AI taking over human jobs?"));
    }
    if (searchMode === 'picks' && picksData.length === 0) {
       fetchPicks(query || (searchHistory.length > 0 ? searchHistory[searchHistory.length - 1] : "Best affordable smartwatch 2024"));
    }
    if (searchMode === 'news' && newsData.length === 0) {
       fetchNews(query || (searchHistory.length > 0 ? searchHistory[searchHistory.length - 1] : "Top breaking local news and headlines today"));
    }

    let newsInterval: number;
    if (searchMode === 'news') {
      newsInterval = window.setInterval(() => {
        fetchNews(query || "Top breaking local news and headlines today");
      }, 10 * 60 * 1000); // 10 minutes
    }
    return () => {
      if (newsInterval) window.clearInterval(newsInterval);
    };
  }, [searchMode]);

  const [searchHistory, setSearchHistory] = useState<string[]>(() => {
    const saved = window.localStorage?.getItem('mm_search_history');
    return saved ? JSON.parse(saved) : [];
  });
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [activeFrameUrl, setActiveFrameUrl] = useState<string | null>(null);
  const [activeFrameHtml, setActiveFrameHtml] = useState<string | null>(null);
  const [splitMode, setSplitMode] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [showToolsMenu, setShowToolsMenu] = useState(false);
  const [notes, setNotes] = useState<string>(() => window.localStorage?.getItem('mm_notes') || '');
  const [showBuilder, setShowBuilder] = useState(false);
  const [spectateMode, setSpectateMode] = useState(false);
  const [builderPrompt, setBuilderPrompt] = useState('');
  const [isBuilding, setIsBuilding] = useState(false);
  
  const [aiAnswer, setAiAnswer] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiTab, setAiTab] = useState<'answer' | 'map'>('answer');
  const [analyzerMode, setAnalyzerMode] = useState(false);
  const [videoMode, setVideoMode] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [responseTime, setResponseTime] = useState<number>(0);
  const [copied, setCopied] = useState(false);
  const [visibleResultsCount, setVisibleResultsCount] = useState(5);
  const [currentOffset, setCurrentOffset] = useState(0);
  const observerRef = useRef<HTMLDivElement>(null);

  // Intersection Observer for Infinite Scroll
  useEffect(() => {
    if (view !== 'search' || results.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          // Reveal more locally if possible
          if (visibleResultsCount < results.length) {
            setVisibleResultsCount(prev => Math.min(prev + 5, results.length));
          }
          
          // Trigger network fetch when we're close to the end of currently loaded results
          // OR if we've revealed all local results and there's potentially more on the web
          if ((results.length - visibleResultsCount < 8 || visibleResultsCount >= results.length) && !isFetchingMore && !isSearching) {
            fetchMoreResults();
          }
        }
      },
      { threshold: 0.1, rootMargin: '200px' } // Start fetching before user hits the very bottom
    );

    if (observerRef.current) {
      observer.observe(observerRef.current);
    }

    return () => observer.disconnect();
  }, [view, results.length, visibleResultsCount, isFetchingMore, isSearching, query]);

  const fetchMoreResults = async () => {
    if (isFetchingMore || !query || results.length < 5) return;
    setIsFetchingMore(true);
    try {
      // Offset should be the total results we've already parsed from previous pages
      // DuckDuckGo offset usually works by incrementing 's'
      const nextOffset = currentOffset + 30; 
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}&s=${nextOffset}`);
      if (!res.ok) throw new Error('Search request failed');
      const data = await res.json();
      const newResults: SearchResult[] = data.results || [];
      
      if (newResults.length > 0) {
        setResults(prev => {
          // Filter out duplicates
          const uniqueNewResults = newResults.filter(nr => !prev.some(pr => pr.url === nr.url));
          if (uniqueNewResults.length === 0) return prev;
          return [...prev, ...uniqueNewResults];
        });
        setCurrentOffset(nextOffset);
      }
    } catch (err) {
      console.error('Failed to fetch more results:', err);
    } finally {
      setIsFetchingMore(false);
    }
  };

  const handleCopy = async () => {
    if (!aiAnswer) return;
    try {
      await navigator.clipboard.writeText(aiAnswer);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const scrollToHeading = (title: string) => {
    setAiTab('answer');
    
    setTimeout(() => {
      const slug = title.toLowerCase().replace(/[^\w\s-]/g, '').replace(/[\s_-]+/g, '-').replace(/^-+|-+$/g, '');
      const element = document.getElementById(`heading-${slug}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        // Visual indicator
        element.classList.add('bg-neon-blue/5', 'ring-1', 'ring-neon-blue/30', 'rounded-xl', 'px-2', '-mx-2', 'transition-all', 'duration-1000');
        setTimeout(() => {
          element.classList.remove('bg-neon-blue/5', 'ring-1', 'ring-neon-blue/30');
        }, 3000);
      }
    }, 200);
  };

  // Effects
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (view === 'splash' && user && !isAuthLoading) {
      const t = setTimeout(() => {
        setView('home');
      }, 1500);
      return () => clearTimeout(t);
    }
  }, [view, user, isAuthLoading]);

  useEffect(() => {
    window.localStorage?.setItem('mm_notes', notes);
  }, [notes]);

  // Handlers
  const handleGoogleSignIn = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error('Error signing in with Google:', error);
    }
  };

  const stopSpeaking = () => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  };

  const speak = (text: string | null | undefined) => {
    if (!text) return;
    
    if (isSpeaking) {
      stopSpeaking();
      return;
    }
    const cleanText = text
      .replace(/\[[A-Z_]+_START\]|\[[A-Z_]+_END\]/g, '')
      .replace(/##+/g, '')
      .replace(/\*\*/g, '')
      .trim();
    if (!cleanText) return;
    const langMap: Record<string, string> = { 'English': 'en-US', 'Urdu': 'ur-PK', 'Punjabi': 'pa-IN' };
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = langMap[voiceLang] || 'en-US';
    utterance.rate = playbackSpeed;
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  const parseAiAnswer = (text: string) => {
    const sections: Record<string, string> = { ANSWER: text };
    const regex = /\[([A-Z_]+)_START\]([\s\S]*?)\[\1_END\]/g;
    let match;
    let found = false;
    while ((match = regex.exec(text)) !== null) {
      sections[match[1]] = match[2].trim();
      found = true;
    }
    return found ? sections : { ANSWER: text };
  };

  const [activeVoiceUrl, setActiveVoiceUrl] = useState<string | null>(null);
  const [activeMenuUrl, setActiveMenuUrl] = useState<string | null>(null);
  const [showCommentsUrl, setShowCommentsUrl] = useState<string | null>(null);
  const [showSummaryUrl, setShowSummaryUrl] = useState<string | null>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [latestSummary, setLatestSummary] = useState<{ [url: string]: string }>({});
  const [commentCounts, setCommentCounts] = useState<{ [url: string]: number }>({});

  const fetchComments = async (url: string) => {
    const q = firestoreQuery(collection(db, 'comments'), where('url', '==', url), orderBy('timestamp', 'desc'));
    const snapshot = await getDocs(q);
    const commentsList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    setComments(commentsList);
    setCommentCounts(prev => ({ ...prev, [url]: commentsList.length }));
  };

  const [isPostingComment, setIsPostingComment] = useState(false);
  const [isDeletingComment, setIsDeletingComment] = useState<string | null>(null);
  
  // Voice settings state
  const [voiceLang, setVoiceLang] = useState('English');
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [isMuted, setIsMuted] = useState(false);

  const deleteComment = async (commentId: string, url: string) => {
    if (!user) return;
    setIsDeletingComment(commentId);
    try {
      await deleteDoc(doc(db, 'comments', commentId));
      setComments(prev => {
        const updated = prev.filter(c => c.id !== commentId);
        setCommentCounts(p => ({ ...p, [url]: updated.length }));
        return updated;
      });
    } catch (e) {
      alert('Failed to delete comment');
    } finally {
      setIsDeletingComment(null);
    }
  };

  const postComment = async (url: string, text: string) => {
    if (!user || !text.trim()) return;
    
    // Check limit
    const q = firestoreQuery(collection(db, 'comments'), where('url', '==', url), where('userId', '==', user.uid));
    const snapshot = await getDocs(q);
    if (snapshot.size >= 2) { alert('Limit reached.'); return; }
    
    const commentData = { 
      url, 
      userId: user.uid, 
      userEmail: user.email, 
      comment: text.trim(), 
      timestamp: Date.now() 
    };
    
    // Optimistic UI update: Update comments immediately
    const tempId = Date.now().toString();
    setComments(prev => {
      const updated = [{ id: tempId, ...commentData }, ...prev];
      setCommentCounts(p => ({ ...p, [url]: updated.length }));
      return updated;
    });
    setNewComment('');
    setIsPostingComment(true);
    
    try {
      // Simulate progress
      await new Promise(resolve => setTimeout(resolve, 500));
      const docRef = await addDoc(collection(db, 'comments'), commentData);
      setComments(prev => prev.map(c => c.id === tempId ? { id: docRef.id, ...commentData } : c));
    } catch (e) {
      alert('Failed to post comment');
      // Revert if failed
      setComments(prev => {
        const updated = prev.filter(c => c.id !== tempId);
        setCommentCounts(p => ({ ...p, [url]: updated.length }));
        return updated;
      });
    } finally {
      setIsPostingComment(false);
    }
  };

  const handleVoiceSummary = async (url: string, lang: string = 'English') => {
    try {
      setIsAiLoading(true);
      setActiveMenuUrl(null);
      
      const relatedComments = comments.filter(c => c.url === url).map(c => c.text);
      const resultData = results.find(r => r.url === url);
      const title = resultData?.title || '';
      const snippet = resultData?.snippet || '';

      const res = await fetch('/api/video-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, lang, comments: relatedComments, title, snippet })
      });
      const data = await res.json();
      if (data.summary) {
        setLatestSummary(prev => ({ ...prev, [url]: data.summary }));
        speak(data.summary);
      }
    } catch (err) {
      console.error('Failed to summarize:', err);
      if ((err as any).message?.includes('429')) {
        alert('API quota exceeded. Please wait a few moments and try again.');
      } else {
        alert('Failed to summarize. Please try again.');
      }
    } finally {
      setIsAiLoading(false);
    }
  };

  const startVoiceSearch = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Voice search is not supported in this browser.");
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.onstart = () => setIsListening(true);
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setQuery(transcript);
      performSearch(transcript);
    };
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);
    recognition.start();
  };

  const performSearch = async (searchQuery: string, addToHistory = true) => {
    if (!searchQuery.trim()) return;
    setQuery(searchQuery);
    
    if (searchMode === 'video') {
       if (addToHistory) {
         const newHistory = searchHistory.slice(0, historyIndex + 1);
         newHistory.push(searchQuery);
         setSearchHistory(newHistory);
         setHistoryIndex(newHistory.length - 1);
       }
       fetchLensVideos(searchQuery);
       return;
    }

    if (searchMode === 'thinking') {
       if (addToHistory) {
         const newHistory = searchHistory.slice(0, historyIndex + 1);
         newHistory.push(searchQuery);
         setSearchHistory(newHistory);
         setHistoryIndex(newHistory.length - 1);
       }
       fetchInsight(searchQuery);
       return;
    }

    if (searchMode === 'picks') {
       if (addToHistory) {
         const newHistory = searchHistory.slice(0, historyIndex + 1);
         newHistory.push(searchQuery);
         setSearchHistory(newHistory);
         setHistoryIndex(newHistory.length - 1);
       }
       fetchPicks(searchQuery);
       return;
    }

    if (searchMode === 'news') {
       if (addToHistory) {
         const newHistory = searchHistory.slice(0, historyIndex + 1);
         newHistory.push(searchQuery);
         setSearchHistory(newHistory);
         setHistoryIndex(newHistory.length - 1);
       }
       fetchNews(searchQuery);
       return;
    }

    if (searchMode === 'neural') {
       setSearchMode('home');
    }

    setView('search');
    setIsSearching(true);
    setResults([]);
    setAiAnswer(null);
    setIsAiLoading(false);
    setActiveFrameUrl(null);
    setActiveFrameHtml(null);
    setVisibleResultsCount(5);
    setCurrentOffset(0);
    setIsFetchingMore(false);

    if (addToHistory) {
      const newHistory = [...searchHistory];
      // Keep only last 20 unique searches
      const filteredHistory = [searchQuery, ...newHistory.filter(h => h.toLowerCase() !== searchQuery.toLowerCase())].slice(0, 20);
      setSearchHistory(filteredHistory);
      setHistoryIndex(0); // Reset for new session
      window.localStorage?.setItem('mm_search_history', JSON.stringify(filteredHistory));
    }

    const startTime = Date.now();
    try {
      const lowerQuery = searchQuery.toLowerCase();
      const isMapmatesQuery = lowerQuery.includes('mapmates') || lowerQuery.includes('hub') || lowerQuery.includes('mate') || (lowerQuery.includes('map') && lowerQuery.includes('ai'));
      
      const res = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`);
      const data = await res.json();
      let finalResults = data.results || [];
      
      if (isMapmatesQuery) {
        // Inject MapMates links at the top
        finalResults = [...MAPMATES_LINKS, ...finalResults.filter((r: any) => !MAPMATES_LINKS.some(m => m.url === r.url))];
      }
      
      setResults(finalResults);
      setIsSearching(false);

      setIsAiLoading(true);
      const aiRes = await fetch('/api/ai-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          query: searchQuery,
          context: finalResults.slice(0, 8).map((r: any) => `${r.title}: ${r.url}`).join('\n')
        })
      });
      const aiData = await aiRes.json();
      if (aiData.text) {
        setAiAnswer(aiData.text);
        setResponseTime((Date.now() - startTime) / 1000);
      }
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setIsSearching(false);
      setIsAiLoading(false);
    }
  };

  const handleBuildSite = async () => {
    if (!builderPrompt.trim()) return;
    setIsBuilding(true);
    try {
      const res = await fetch('/api/generate-site', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: builderPrompt })
      });
      const data = await res.json();
      if (data.html) {
        setShowBuilder(false);
        setActiveFrameHtml(data.html);
        setActiveFrameUrl(null);
      }
    } catch {
      alert("Error building site");
    } finally {
      setIsBuilding(false);
      setBuilderPrompt('');
    }
  };

  const openUrl = (url: string) => {
    if (spectateMode) {
      setActiveFrameUrl(`/api/proxy?url=${encodeURIComponent(url)}`);
      setActiveFrameHtml(null);
      return;
    }
    
    if (isBlocked(url)) {
      window.open(url, '_blank', 'noopener,noreferrer');
      return;
    }
    setActiveFrameUrl(url);
    setActiveFrameHtml(null);
  };

  const [isSmartIframe, setIsSmartIframe] = useState(true);

  // Smart Embed Rotator for YouTube to avoid connection errors
  const getEmbedUrl = (vidId: string) => {
    const instances = [
      "https://inv.vern.cc",
      "https://iv.melmac.space",
      "https://vid.puffyan.us",
      "https://invidious.flokinet.to",
      "https://invidious.projectsegfau.lt",
      "https://v.vinit.dev"
    ];
    // Rotates instance every hour to find best working one, avoids yewtu.be which often refuses connections
    const instance = instances[Math.floor(Date.now() / 3600000) % instances.length];
    return `${instance}/embed/${vidId}?dark_mode=true&autoplay=0&local=true`;
  };

  const getThumbnailUrl = (vid: any) => {
    const p = vid.platform || 'youtube';
    if (p === 'youtube' || p === 'piped') {
      return `https://img.youtube.com/vi/${vid.videoId}/hqdefault.jpg`;
    }
    if (p === 'dailymotion') {
      return `https://www.dailymotion.com/thumbnail/video/${vid.videoId}`;
    }
    return null;
  };

  const getSmartUrl = (url: string) => {
    if (!isSmartIframe) return url;
    try {
      const urlObj = new URL(url);
      if (urlObj.hostname.includes('youtube.com') && urlObj.searchParams.has('v')) {
        return getEmbedUrl(urlObj.searchParams.get('v')!);
      }
      if (urlObj.hostname.includes('youtu.be')) {
        return getEmbedUrl(urlObj.pathname.slice(1));
      }
      if (isBlocked(url)) {
         return `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
      }
      return url;
    } catch {
      return url;
    }
  };

  const goBack = () => {
    if (activeFrameUrl || activeFrameHtml) {
      setActiveFrameUrl(null);
      setActiveFrameHtml(null);
      return;
    }
    if (historyIndex > 0) {
      const prevQuery = searchHistory[historyIndex - 1];
      setHistoryIndex(historyIndex - 1);
      performSearch(prevQuery, false);
    } else if (historyIndex === 0) {
      setHistoryIndex(-1);
      setView('home');
      setQuery('');
    }
  };

  const goForward = () => {
    if (historyIndex < searchHistory.length - 1) {
      const nextQuery = searchHistory[historyIndex + 1];
      setHistoryIndex(historyIndex + 1);
      performSearch(nextQuery, false);
    }
  };

  return (
    <div className="min-h-screen bg-mm-bg text-white font-sans flex text-[15px] selection:bg-neon-blue/30 selection:text-white">
      <AnimatePresence mode="wait">
        {view === 'splash' ? (
          <motion.div key="splash" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center justify-center min-h-screen w-full relative overflow-hidden">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60vw] h-[60vw] bg-neon-blue/10 rounded-full blur-[120px] pointer-events-none" />
            
            <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.2, type: 'spring' }} className="w-24 h-24 rounded-[18px] bg-mm-gradient flex items-center justify-center shadow-[0_0_20px_rgba(0,102,255,0.4)] mb-8 z-10">
              <span className="text-[40px] font-sans font-black text-white tracking-tighter">MM</span>
            </motion.div>

            <motion.h1 initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.4 }} className="text-3xl md:text-5xl font-sans font-medium tracking-tight text-white mb-2 z-10">
              MapMates Answer
            </motion.h1>

            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }} className="mt-8 z-10">
              {isAuthLoading ? (
                <div className="flex flex-col items-center gap-4 text-white/40">
                   <Loader2 className="w-6 h-6 animate-spin text-neon-blue" />
                   <p className="text-[10px] font-mono uppercase tracking-[2px]">Authenticating...</p>
                </div>
              ) : !user ? (
                <button onClick={handleGoogleSignIn} className="flex items-center gap-3 px-6 py-3 bg-white hover:bg-slate-50 text-slate-900 rounded-full font-medium transition-colors shadow-xl">
                  <svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" /><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" /><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" /><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" /></svg>
                  Sign up with Google
                </button>
              ) : (
                <div className="flex flex-col items-center gap-4 text-white/40">
                   <Loader2 className="w-6 h-6 animate-spin text-neon-blue" />
                   <p className="text-[10px] font-mono uppercase tracking-[2px]">Loading Workspace...</p>
                </div>
              )}
            </motion.div>
            
            <div className="absolute bottom-8 text-center text-white/30 font-mono text-[10px] uppercase tracking-[2px]">Created by Faizan Zeeshan</div>
          </motion.div>
        ) : (
          <motion.div key="main" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-1 h-screen overflow-hidden">
            {/* Global Sidebar */}
            <nav className="w-16 bg-[#0a0a0a] border-r border-white/10 hidden sm:flex flex-col items-center py-4 z-[120]">
              <button 
                onClick={() => { setView('home'); setQuery(''); setActiveFrameUrl(null); }} 
                className="w-10 h-10 rounded-xl bg-mm-gradient flex items-center justify-center shadow-[0_0_15px_rgba(0,102,255,0.3)] mb-4 hover:scale-105 transition-transform"
                title="MapMates Home"
              >
                <span className="font-black text-white text-lg">MM</span>
              </button>
              <div className="w-8 h-px bg-white/10 mb-4" />
              <button onClick={() => setView('game')} className={cn("p-3 rounded-xl transition-colors mb-2", view === 'game' ? "bg-white/10 text-neon-red" : "text-white/40 hover:text-white")} title="Arcade">
                 <Gamepad2 className="w-6 h-6" />
              </button>
              <button onClick={() => setView('search')} className={cn("p-3 rounded-xl transition-colors mb-2", view === 'search' ? "bg-white/10 text-neon-blue" : "text-white/40 hover:text-white")} title="Search Tools">
                 <Search className="w-6 h-6" />
              </button>
              <button onClick={() => setShowNotes(!showNotes)} className={cn("p-3 rounded-xl transition-colors mb-2", showNotes ? "bg-white/10 text-neon-yellow" : "text-white/40 hover:text-white")} title="Quick Notes">
                 <PenTool className="w-6 h-6" />
              </button>
              <a href="#" className="p-3 rounded-xl transition-colors mb-2 text-white/40 hover:text-white" title="Download Desktop App">
                 <Download className="w-6 h-6" />
              </a>
            </nav>

            {/* Note Panel Workspace */}
            <AnimatePresence>
              {showNotes && (
                <motion.div initial={{ width: 0, opacity: 0 }} animate={{ width: 300, opacity: 1 }} exit={{ width: 0, opacity: 0 }} className="h-full bg-[#111] border-r border-white/10 flex flex-col z-[110] overflow-hidden shrink-0">
                  <div className="h-16 border-b border-white/10 flex items-center px-4 bg-[#0a0a0a] shrink-0">
                     <PenTool className="w-4 h-4 text-neon-yellow mr-2" />
                     <h2 className="font-mono text-xs uppercase tracking-widest text-white/90">Quick Notes</h2>
                  </div>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Write anything... automatically saved offline."
                    className="flex-1 w-full bg-transparent resize-none p-6 text-sm text-white/90 focus:outline-none placeholder:text-white/20 leading-relaxed"
                  />
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex flex-col flex-1 min-w-0 h-full">
              {/* Header */}
              <header className="h-16 flex-none px-4 md:px-6 flex items-center justify-between border-b border-white/10 bg-[#0a0a0a]/80 backdrop-blur-xl sticky top-0 z-[100]">
                 <div className="flex items-center gap-4 flex-1">
                   {/* Mobile Menu Icon */}
                   <button onClick={() => setShowToolsMenu(!showToolsMenu)} className="p-2 rounded-lg hover:bg-white/10 transition-colors group relative">
                      <LayoutGrid className={cn("w-6 h-6 transition-colors", showToolsMenu ? "text-neon-blue" : "text-white/70 group-hover:text-white")} />
                      <AnimatePresence>
                        {showToolsMenu && (
                          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="absolute top-full left-0 mt-4 w-56 bg-[#1A1D23] border border-white/10 rounded-2xl shadow-2xl overflow-hidden py-2 z-[200]">
                             <button onClick={() => { setView('home'); setQuery(''); setActiveFrameUrl(null); setShowToolsMenu(false); }} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 text-left text-sm font-medium">
                               <Plus className="w-4 h-4 text-white" /> New Tab
                             </button>
                             <button onClick={() => { setView('game'); setShowToolsMenu(false); }} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 text-left text-sm font-medium">
                               <Gamepad2 className="w-4 h-4 text-neon-red" /> Play Arcade
                             </button>
                             <button onClick={() => { setSplitMode(!splitMode); setShowToolsMenu(false); }} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 text-left text-sm font-medium">
                               <SplitSquareHorizontal className="w-4 h-4 text-neon-blue" /> Split Screen
                             </button>
                             <button onClick={() => { setShowBuilder(true); setShowToolsMenu(false); }} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 text-left text-sm font-medium">
                               <Sparkles className="w-4 h-4 text-neon-purple" /> AI Builder
                             </button>
                             <div className="border-t border-white/5 my-1" />
                             <div className="px-4 py-2 text-[10px] font-bold text-white/30 uppercase tracking-widest">AI Voice Settings</div>
                             <div className="px-4 py-2 flex gap-1">
                                {['English', 'Urdu', 'Punjabi'].map(l => (
                                   <button key={l} onClick={() => setVoiceLang(l)} className={cn("px-2 py-1 rounded text-[10px]", voiceLang === l ? "bg-neon-blue text-black" : "bg-white/5 hover:bg-white/10")}>{l}</button>
                                ))}
                             </div>
                             <div className="px-4 py-2">
                                <label className="text-[10px] text-white/50">Speed: {playbackSpeed}x</label>
                                <input type="range" min="0.25" max="2" step="0.25" value={playbackSpeed} onChange={(e) => setPlaybackSpeed(parseFloat(e.target.value))} className="w-full accent-neon-blue" />
                             </div>
                             <button onClick={() => setIsMuted(!isMuted)} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 text-left text-sm font-medium">
                                {isMuted ? <Volume2 className="w-4 h-4 text-neon-red" /> : <div className="flex gap-0.5 items-center">
                                    <span className="w-1 h-3 bg-neon-blue animate-pulse" />
                                    <span className="w-1 h-4 bg-neon-blue animate-pulse delay-75" />
                                    <span className="w-1 h-2 bg-neon-blue animate-pulse delay-150" />
                                </div>} {isMuted ? "Unmute" : "Mute"}
                             </button>
                          </motion.div>
                        )}
                      </AnimatePresence>
                   </button>

                   <h1 className="text-xl md:text-2xl font-black tracking-tighter text-white shrink-0 hidden sm:block">
                      <span className="text-[#55EE99]">MapMates</span> Answer
                   </h1>

                   {/* Main Search Input (Center) - Hidden when browsing web */}
                   {!(activeFrameUrl || activeFrameHtml) && (
                     <form onSubmit={(e) => { e.preventDefault(); performSearch(query); }} className="hidden lg:flex flex-1 max-w-2xl mx-4 animate-in fade-in duration-300">
                       <div className="relative w-full group">
                          <input 
                            ref={inputRef}
                            type="text" 
                            value={query} 
                            onChange={(e) => setQuery(e.target.value)} 
                            className="w-full bg-white/5 border border-white/10 rounded-full py-2.5 px-6 pl-12 pr-40 text-sm focus:outline-none focus:border-neon-blue focus:ring-1 focus:ring-neon-blue/20 transition-all placeholder:text-white/20" 
                            placeholder="Search anything or try /calc, /game..." 
                          />
                          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 group-focus-within:text-neon-blue transition-colors" />
                          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                             <button type="button" onClick={() => setAnalyzerMode(!analyzerMode)} className={cn("p-2 rounded-full transition-colors", analyzerMode ? "text-neon-blue" : "text-white/20 hover:text-white")}>
                                <BrainCircuit className="w-4 h-4" />
                             </button>
                             <button type="button" onClick={() => setVideoMode(!videoMode)} className={cn("p-2 rounded-full transition-colors", videoMode ? "text-neon-blue" : "text-white/20 hover:text-white")}>
                                <Video className="w-4 h-4" />
                             </button>
                             <button type="button" onClick={() => setQueryLang(queryLang === 'EN' ? 'UR' : 'EN')} className="px-2 py-1 rounded-full text-[10px] font-bold text-neon-blue bg-white/5 hover:bg-white/10">
                               {queryLang}
                             </button>
                             <button type="button" onClick={startVoiceSearch} className={cn("p-2 rounded-full transition-colors relative", isListening ? "text-neon-blue" : "text-white/20 hover:text-white")}>
                                {isListening && <span className="absolute inset-0 rounded-full bg-neon-blue/20 animate-ping" />}
                                <Mic className="w-4 h-4 relative z-10" />
                             </button>
                          </div>
                       </div>
                     </form>
                   )}
                 </div>

                 {/* Top Right Controls */}
                 <div className="flex items-center gap-2 md:gap-4">
                   <button onClick={() => setSpectateMode(!spectateMode)} className={cn("p-2 rounded-lg transition-colors", spectateMode ? "text-neon-red" : "text-white/40")} title="Spectate Mode (Bypass restrictions)">
                      {spectateMode ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                   </button>
                   <div className="flex items-center bg-white/5 rounded-lg p-1 border border-white/5">
                      <button onClick={goBack} disabled={historyIndex < 0 && !activeFrameUrl} className="p-1.5 rounded hover:bg-white/5 disabled:opacity-20 transition-colors"><ArrowLeft className="w-4 h-4 text-white" /></button>
                      <button onClick={goForward} disabled={historyIndex === searchHistory.length - 1 || activeFrameUrl !== null} className="p-1.5 rounded hover:bg-white/5 disabled:opacity-20 transition-colors"><ArrowRight className="w-4 h-4 text-white" /></button>
                   </div>
                   <button 
                      onClick={() => performSearch(query)}
                      className="px-4 py-2 bg-neon-blue text-black text-[12px] font-black uppercase tracking-wider rounded-lg hover:opacity-90 transition-all shadow-[0_0_15px_rgba(0,240,255,0.2)] hidden sm:block"
                    >
                      AI Answer
                   </button>
                   <div className="w-8 h-8 rounded-full bg-neon-blue/10 border border-neon-blue/40 flex items-center justify-center font-black text-[10px] text-neon-blue">
                     {user?.email?.charAt(0).toUpperCase() || 'MM'}
                   </div>
                 </div>
              </header>

              {/* Mobile Search Bar Expansion - Hidden when browsing web */}
              {!(activeFrameUrl || activeFrameHtml) && (
                <div className="lg:hidden px-4 py-4 bg-[#0a0a0a] border-b border-white/5 animate-in slide-in-from-top-4 duration-300">
                  <form onSubmit={(e) => { e.preventDefault(); performSearch(query); }} className="relative w-full group">
                     <input 
                       type="text" 
                       value={query} 
                       onChange={(e) => setQuery(e.target.value)} 
                       className="w-full bg-white/5 border border-white/10 rounded-full py-2.5 px-6 pr-24 text-sm focus:outline-none focus:border-neon-blue transition-all" 
                       placeholder="Ask MapMates Anything..." 
                     />
                     <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                        <button type="button" onClick={() => setQueryLang(queryLang === 'EN' ? 'UR' : 'EN')} className="px-2 py-1 rounded-full text-[10px] font-bold text-neon-blue bg-white/5 hover:bg-white/10">
                          {queryLang}
                        </button>
                        <button type="button" onClick={startVoiceSearch} className={cn("p-1.5 rounded-full transition-colors relative", isListening ? "text-neon-blue" : "text-white/30 hover:text-white")}>
                          {isListening && <span className="absolute inset-0 rounded-full bg-neon-blue/20 animate-ping" />}
                          <Mic className={cn("w-4 h-4 relative z-10", isListening && "text-neon-blue")} />
                        </button>
                     </div>
                  </form>
                </div>
              )}

              {/* Mode Selector Tab Bar - Hidden when browsing web */}
              {!(activeFrameUrl || activeFrameHtml) && (
                <div className="flex items-center gap-4 px-4 py-2 border-b border-white/5 bg-[#0a0a0a] overflow-x-auto no-scrollbar shrink-0 animate-in fade-in duration-300">
                   <button
                     onClick={() => setSearchMode('home')}
                     className={cn("px-4 py-1.5 rounded-full text-xs font-bold transition-colors whitespace-nowrap", searchMode === 'home' ? "bg-white/10 text-white" : "text-white/40 hover:text-white")}
                   >
                     Home
                   </button>
                   <button
                     onClick={() => setSearchMode('neural')}
                     className={cn("flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold transition-colors whitespace-nowrap", searchMode === 'neural' ? "bg-neon-blue/20 text-neon-blue" : "text-neon-blue/60 hover:text-neon-blue")}
                   >
                     <Sparkles className="w-3 h-3" /> MapMates AI
                   </button>
                   <button
                     onClick={() => setSearchMode('video')}
                     className={cn("flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold transition-colors whitespace-nowrap", searchMode === 'video' ? "bg-neon-red/20 text-neon-red" : "text-neon-red/60 hover:text-neon-red")}
                   >
                     <Video className="w-3 h-3" /> MapMates Lens
                   </button>
                   <button
                     onClick={() => setSearchMode('thinking')}
                     className={cn("flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold transition-colors whitespace-nowrap", searchMode === 'thinking' ? "bg-neon-yellow/20 text-neon-yellow" : "text-neon-yellow/60 hover:text-neon-yellow")}
                   >
                     <BrainCircuit className="w-3 h-3" /> MapMates Insight
                   </button>
                   <button
                     onClick={() => setSearchMode('picks')}
                     className={cn("flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold transition-colors whitespace-nowrap", searchMode === 'picks' ? "bg-neon-green/20 text-neon-green" : "text-neon-green/60 hover:text-neon-green")}
                   >
                     <ShoppingBag className="w-3 h-3" /> MapMates Picks
                   </button>
                   <button
                     onClick={() => setSearchMode('news')}
                     className={cn("flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold transition-colors whitespace-nowrap", searchMode === 'news' ? "bg-purple-500/20 text-purple-400" : "text-purple-400/60 hover:text-purple-400")}
                   >
                     <Newspaper className="w-3 h-3" /> MapMates News
                   </button>
                </div>
              )}

              {/* Content Area */}
              <div className="flex flex-1 overflow-hidden">
                {searchMode === 'neural' ? (
                   <div className="flex-1 relative bg-white flex flex-col min-w-0">
                      <iframe src="https://mapmatesai.netlify.app" className="w-full h-full border-none" allow="microphone; camera; display-capture" />
                   </div>
                ) : searchMode === 'thinking' ? (
                   <div className="flex-1 overflow-y-auto no-scrollbar bg-[#050505] p-4 lg:p-8">
                     <div className="max-w-4xl mx-auto space-y-6">
                       <h2 className="text-xl md:text-2xl font-black text-white flex items-center gap-2">
                          <BrainCircuit className="w-6 h-6 text-neon-yellow" />
                          MapMates Deep Truth
                       </h2>
                       {isInsightLoading ? (
                         <div className="flex flex-col items-center justify-center py-20 text-white/50 space-y-4">
                           <Loader2 className="w-8 h-8 animate-spin text-neon-yellow" />
                           <p className="text-sm font-mono tracking-widest uppercase">Deep Scanning Web, Reddit & YouTube...</p>
                         </div>
                       ) : insightError ? (
                         <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-6 rounded-xl flex items-start gap-4">
                           <BrainCircuit className="w-6 h-6 shrink-0 mt-1" />
                           <div>
                             <h3 className="font-bold mb-1">Analysis Failed</h3>
                             <p className="text-sm text-red-400/80 leading-relaxed whitespace-pre-wrap">{insightError}</p>
                           </div>
                         </div>
                       ) : insightData ? (
                         <div className="space-y-6">
                           {/* Truth Meter */}
                           <div className="bg-white/5 border border-white/10 rounded-xl p-6 flex flex-col md:flex-row items-center gap-6">
                              <div className="relative w-24 h-24 flex items-center justify-center shrink-0">
                                 <svg className="w-full h-full transform -rotate-90">
                                   <circle cx="48" cy="48" r="40" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-white/10" />
                                   <circle cx="48" cy="48" r="40" stroke="currentColor" strokeWidth="8" fill="transparent"
                                     strokeDasharray={251.2} strokeDashoffset={251.2 - (251.2 * insightData.truthPercentage) / 100}
                                     className={insightData.truthPercentage > 70 ? "text-green-500" : insightData.truthPercentage > 40 ? "text-yellow-500" : "text-red-500"} 
                                     strokeLinecap="round" />
                                 </svg>
                                 <span className="absolute text-xl font-black text-white">{insightData.truthPercentage}%</span>
                              </div>
                              <div>
                                <h3 className="text-2xl font-black text-white mb-2">{insightData.verdict}</h3>
                                <p className="text-white/60 text-sm leading-relaxed">{insightData.deepAnalysis}</p>
                              </div>
                           </div>
        
                           {/* Grid */}
                           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <div className="bg-white/5 border border-neon-yellow/20 rounded-xl p-6">
                                 <h4 className="font-bold text-neon-yellow mb-4 flex items-center gap-2"><MessageSquare className="w-4 h-4" /> Community Consensus</h4>
                                 <p className="text-sm text-white/70 leading-relaxed">{insightData.communityConsensus}</p>
                              </div>
                              <div className="bg-white/5 border border-red-500/20 rounded-xl p-6">
                                 <h4 className="font-bold text-red-400 mb-4 flex items-center gap-2"><Trash2 className="w-4 h-4" /> Fake Claims & Myths</h4>
                                 <ul className="space-y-3">
                                   {insightData.fakeClaims?.map((claim: string, i: number) => (
                                     <li key={i} className="flex items-start gap-2 text-sm text-white/70">
                                       <span className="text-red-400 mt-0.5">✗</span> {claim}
                                     </li>
                                   ))}
                                 </ul>
                              </div>
                           </div>
        
                           {/* Sources */}
                           <div className="bg-white/5 border border-white/10 rounded-xl p-6">
                              <h4 className="font-bold text-white mb-4 flex items-center gap-2"><Link2 className="w-4 h-4 text-neon-blue" /> Verified Sources</h4>
                              <div className="space-y-3">
                                {insightData.sources?.map((src: any, i: number) => (
                                  <a key={i} href={src.url} target="_blank" rel="noreferrer" className="block p-3 rounded-lg bg-black/50 hover:bg-white/5 border border-white/5 hover:border-white/20 transition-all group">
                                     <div className="text-sm font-bold text-white group-hover:text-neon-blue transition-colors line-clamp-1">{src.title}</div>
                                     <div className="text-xs text-white/40 mt-1 line-clamp-1">{src.url}</div>
                                  </a>
                                ))}
                              </div>
                           </div>
                         </div>
                       ) : (
                         <div className="text-center py-20 text-white/30 text-sm">
                           Search a topic to deeply analyze internet consensus and reality.
                         </div>
                       )}
                     </div>
                   </div>
                ) : searchMode === 'video' ? (
                   <div className="flex-1 overflow-y-auto no-scrollbar bg-[#050505] p-4 lg:p-8">
                     <div className="max-w-4xl mx-auto space-y-6">
                       <h2 className="text-xl md:text-2xl font-black text-white flex items-center gap-2">
                          <Video className="w-6 h-6 text-neon-red" />
                          Curated Lens
                       </h2>
                       {isLensLoading ? (
                          <div className="flex flex-col items-center justify-center py-12 px-4 text-center my-6 bg-black/40 border border-white/5 rounded-2xl max-w-2xl mx-auto space-y-6 animate-pulse animate-duration-[2000ms]">
                            <div className="w-14 h-14 rounded-full bg-red-950/20 border-2 border-dashed border-neon-red/60 flex items-center justify-center animate-spin">
                              <Loader2 className="w-6 h-6 text-neon-red" />
                            </div>
                            <div className="space-y-1">
                              <h3 className="text-base font-bold text-white tracking-wide">Evaluating Global Content Streams</h3>
                              <p className="text-xs text-white/40 max-w-md mx-auto">
                                MapMates is deploying autonomous multi-agent scrapers to curate a targeted high-value feed.
                              </p>
                            </div>
                            <div className="w-full max-w-md bg-white/5 border border-white/10 rounded-xl p-4 text-left space-y-2.5 font-mono text-xs">
                              {[
                                "🌐 Scanning YouTube network hubs for high-engagement & community-approved content...",
                                "📡 Probing PeerTube decentralised node channels and transcript feeds...",
                                "🔍 Fetching Archive.org historic educational files & documentaries...",
                                "📊 Indexing popular Bilibili and Dailymotion video metrics & ratings...",
                                "🧠 Simulating comment section review checks & sentiment vectors...",
                                "🤖 Curation Model synthesizing custom cognitive matches..."
                              ].map((step, idx) => {
                                const isDone = idx < loaderStep;
                                const isActive = idx === loaderStep;
                                return (
                                  <div key={idx} className={`flex items-start gap-2 transition-all duration-300 ${isDone ? 'text-emerald-400 font-medium' : isActive ? 'text-neon-red font-bold' : 'text-white/20'}`}>
                                    <span className="font-bold shrink-0">
                                      {isDone ? '✓' : isActive ? '▶' : '○'}
                                    </span>
                                    <span className={isActive ? 'animate-pulse font-medium' : ''}>{step}</span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ) : lensError ? (
                          <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-6 rounded-xl flex items-start gap-4">
                            <Sparkles className="w-6 h-6 shrink-0 mt-1" />
                            <div>
                              <h3 className="font-bold mb-1">Could not load videos</h3>
                              <p className="text-sm text-red-400/80 leading-relaxed whitespace-pre-wrap">{lensError}</p>
                            </div>
                          </div>
                        ) : lensVideos.length > 0 ? (
                          (() => {
                            const aiSuggestedVideos = lensVideos.filter(v => v.isBest || v.isAISuggested);
                            const conventionalVideos = lensVideos.filter(v => !v.isBest && !v.isAISuggested);
                            return (
                              <div className="space-y-10">
                                {/* Neural Suggestions (Top 10 curate) */}
                                {aiSuggestedVideos.length > 0 && (
                                  <div className="space-y-6">
                                    <div className="flex flex-col pb-4 border-b border-white/10">
                                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-red-950/40 border border-neon-red/30 text-[9px] font-bold tracking-widest text-[#ef4444] uppercase mb-1 w-fit">
                                        <Sparkles className="w-3 h-3 text-neon-red" /> NEURAL COGNITIVE MATCHES
                                      </span>
                                      <h3 className="text-lg md:text-xl font-black text-white">
                                         Top 10 Deep Reasoning Selections
                                      </h3>
                                      <p className="text-xs text-white/40 mt-0.5">
                                         Synthesized from multiple video archives for targeted focus alignment and educational value.
                                      </p>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                      {aiSuggestedVideos.map((vid, idx) => {
                                        const embedUrl = getEmbedUrl(vid.videoId);
                                        const p = vid.platform || 'youtube';
                                        const isPlaying = playingVideoId === vid.videoId;
                                        
                                        let finalVideoUrl = embedUrl;
                                        let externalUrl = `https://youtube.com/watch?v=${vid.videoId}`;
                                        if (p === 'dailymotion') {
                                          finalVideoUrl = `https://www.dailymotion.com/embed/video/${vid.videoId}?autoplay=1`;
                                          externalUrl = `https://www.dailymotion.com/video/${vid.videoId}`;
                                        } else if (p === 'bilibili') {
                                          finalVideoUrl = `https://player.bilibili.com/player.html?bvid=${vid.videoId}&high_quality=1&autoplay=1`;
                                          externalUrl = `https://www.bilibili.com/video/${vid.videoId}`;
                                        } else if (p === 'peertube') {
                                          finalVideoUrl = `https://peertube.cpy.re/videos/embed/${vid.videoId}?autoplay=1`;
                                          externalUrl = `https://peertube.cpy.re/videos/watch/${vid.videoId}`;
                                        } else if (p === 'archive') {
                                          finalVideoUrl = `https://archive.org/embed/${vid.videoId}?autoplay=1`;
                                          externalUrl = `https://archive.org/details/${vid.videoId}`;
                                        } else {
                                          finalVideoUrl = `${getEmbedUrl(vid.videoId)}&autoplay=1`;
                                        }

                                        const thumbUrl = getThumbnailUrl(vid);

                                        return (
                                          <div key={idx} className="bg-white/5 border border-white/10 rounded-xl overflow-hidden hover:border-neon-red/40 transition-all duration-300 group flex flex-col justify-between">
                                            <div>
                                              {/* Thumbnail Display Screen */}
                                              <div className="aspect-video w-full bg-black relative overflow-hidden">
                                                {isPlaying ? (
                                                  <iframe 
                                                    src={finalVideoUrl} 
                                                    className="absolute inset-0 w-full h-full border-none bg-black" 
                                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                                                    allowFullScreen 
                                                    referrerPolicy="no-referrer"
                                                  />
                                                ) : (
                                                  <div 
                                                    onClick={() => setPlayingVideoId(vid.videoId)}
                                                    className="absolute inset-0 w-full h-full cursor-pointer group"
                                                  >
                                                    {thumbUrl ? (
                                                      <img 
                                                        src={thumbUrl} 
                                                        alt={vid.title} 
                                                        className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                                        referrerPolicy="no-referrer"
                                                      />
                                                    ) : (
                                                      <div className="absolute inset-0 bg-gradient-to-br from-neutral-900 to-indigo-950 flex flex-col items-center justify-center p-4">
                                                        <span className="text-[10px] text-white/30 font-mono tracking-widest uppercase mb-1">{p} source</span>
                                                        <span className="text-xs font-bold text-white/50 text-center line-clamp-1">{vid.title}</span>
                                                      </div>
                                                    )}
                                                    <div className="absolute inset-0 bg-black/40 group-hover:bg-black/55 transition-colors flex items-center justify-center">
                                                      <div className="w-12 h-12 rounded-full bg-red-600/10 group-hover:bg-red-600/30 border border-neon-red/50 group-hover:border-neon-red shadow-[0_0_15px_rgba(239,68,68,0.2)] flex items-center justify-center transition-all duration-300 transform group-hover:scale-110">
                                                        <Play className="w-4 h-4 fill-white text-white translate-x-0.5" />
                                                      </div>
                                                    </div>
                                                  </div>
                                                )}
                                                
                                                <button 
                                                  onClick={(e) => { e.stopPropagation(); window.open(externalUrl, '_blank'); }}
                                                  className="absolute top-2 right-2 p-1.5 rounded-full bg-black/75 text-white/50 hover:text-white hover:bg-black/90 transition-all opacity-0 group-hover:opacity-100"
                                                  title={`Open in ${p}`}
                                                >
                                                  <ExternalLink className="w-3 h-3" />
                                                </button>
                                                <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded text-[8px] font-mono uppercase bg-black/80 text-white/80 border border-white/5">
                                                  {p}
                                                </span>
                                              </div>

                                              <div className="p-4 space-y-3">
                                                <div>
                                                  <div className="flex justify-between items-start gap-4">
                                                    <h3 className="font-bold text-white text-sm line-clamp-2 leading-tight group-hover:text-neon-red transition-colors flex-1">{vid.title}</h3>
                                                    <a 
                                                       href={externalUrl} 
                                                       target="_blank" 
                                                       rel="noreferrer"
                                                       className="text-white/40 hover:text-neon-red transition-colors"
                                                       title={`Open in ${p}`}
                                                    >
                                                       <ExternalLink className="w-4 h-4" />
                                                    </a>
                                                  </div>
                                                  <p className="text-xs text-white/40 font-mono uppercase truncate mt-1">{vid.creator}</p>
                                                </div>

                                                <div className="pt-3 border-t border-white/5 space-y-2">
                                                  <div className="flex items-start gap-2 text-white/70">
                                                    <Sparkles className="w-4 h-4 text-neon-red mt-0.5 shrink-0 animate-pulse" />
                                                    <div className="space-y-0.5">
                                                      <span className="text-[9px] font-bold text-neon-red uppercase font-mono block">Why watch this suggestion</span>
                                                      <p className="text-xs leading-relaxed text-white/80">{vid.reason}</p>
                                                    </div>
                                                  </div>
                                                  
                                                  {vid.contentSummary && (
                                                    <div className="flex items-start gap-2 text-white/60 pt-1">
                                                      <Bot className="w-4 h-4 text-neon-blue mt-0.5 shrink-0" />
                                                      <div className="space-y-0.5">
                                                        <span className="text-[9px] font-bold text-neon-blue uppercase font-mono block">What is learned</span>
                                                        <p className="text-xs leading-relaxed text-white/70">{vid.contentSummary}</p>
                                                      </div>
                                                    </div>
                                                  )}
                                                </div>
                                              </div>
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}

                                {/* Warning Banner Zone */}
                                {conventionalVideos.length > 0 && (
                                  <div className="my-8 p-6 rounded-xl bg-orange-500/5 border border-orange-500/20 max-w-2xl mx-auto flex flex-col items-center text-center space-y-3 shadow-[0_0_20px_rgba(249,115,22,0.02)]">
                                    <div className="w-10 h-10 rounded-full bg-orange-500/10 flex items-center justify-center text-orange-500 animate-bounce">
                                      <AlertTriangle className="w-5 h-5" />
                                    </div>
                                    <div className="space-y-1">
                                      <h4 className="text-orange-500 font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-1">
                                        <Flame className="w-4 h-4 animate-pulse text-orange-500" /> Danger Zone: Infinite Stream Warning <Flame className="w-4 h-4 animate-pulse text-orange-500" />
                                      </h4>
                                      <p className="text-xs text-white/70 leading-relaxed max-w-lg">
                                        The AI has found and structured the top 10 most critical matches above. Continuing to scroll below will trigger a conventional infinite stream. This is addictive and may consume your valuable time. We strongly recommend searching another distinct query!
                                      </p>
                                    </div>
                                    <div className="text-[9px] font-mono text-orange-500/50 uppercase">
                                      Continuing scrolling means endless engagement loop
                                    </div>
                                  </div>
                                )}

                                {/* Conventional Scroll Stream Grid */}
                                {conventionalVideos.length > 0 && (
                                  <div className="space-y-6">
                                    <div className="border-b border-white/5 pb-2">
                                      <h3 className="text-xs font-bold text-white/40 uppercase tracking-widest font-mono">
                                        Conventional Streams Feeds
                                      </h3>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                      {conventionalVideos.map((vid, idx) => {
                                        const embedUrl = getEmbedUrl(vid.videoId);
                                        const p = vid.platform || 'youtube';
                                        const isPlaying = playingVideoId === vid.videoId;

                                        let finalVideoUrl = embedUrl;
                                        let externalUrl = `https://youtube.com/watch?v=${vid.videoId}`;
                                        if (p === 'dailymotion') {
                                          finalVideoUrl = `https://www.dailymotion.com/embed/video/${vid.videoId}?autoplay=1`;
                                          externalUrl = `https://www.dailymotion.com/video/${vid.videoId}`;
                                        } else if (p === 'bilibili') {
                                          finalVideoUrl = `https://player.bilibili.com/player.html?bvid=${vid.videoId}&high_quality=1&autoplay=1`;
                                          externalUrl = `https://www.bilibili.com/video/${vid.videoId}`;
                                        } else if (p === 'peertube') {
                                          finalVideoUrl = `https://peertube.cpy.re/videos/embed/${vid.videoId}?autoplay=1`;
                                          externalUrl = `https://peertube.cpy.re/videos/watch/${vid.videoId}`;
                                        } else if (p === 'archive') {
                                          finalVideoUrl = `https://archive.org/embed/${vid.videoId}?autoplay=1`;
                                          externalUrl = `https://archive.org/details/${vid.videoId}`;
                                        } else {
                                          finalVideoUrl = `${getEmbedUrl(vid.videoId)}&autoplay=1`;
                                        }

                                        const thumbUrl = getThumbnailUrl(vid);

                                        return (
                                          <div key={idx} className="bg-white/5 border border-white/5 rounded-xl overflow-hidden hover:border-white/20 transition-all duration-300 group flex flex-col justify-between">
                                            <div>
                                              {/* Video area */}
                                              <div className="aspect-video w-full bg-black relative overflow-hidden">
                                                {isPlaying ? (
                                                  <iframe 
                                                    src={finalVideoUrl} 
                                                    className="absolute inset-0 w-full h-full border-none bg-black" 
                                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                                                    allowFullScreen 
                                                    referrerPolicy="no-referrer"
                                                  />
                                                ) : (
                                                  <div 
                                                    onClick={() => setPlayingVideoId(vid.videoId)}
                                                    className="absolute inset-0 w-full h-full cursor-pointer group"
                                                  >
                                                    {thumbUrl ? (
                                                      <img 
                                                        src={thumbUrl} 
                                                        alt={vid.title} 
                                                        className="absolute inset-0 w-full h-full object-cover group-hover:scale-102 transition-transform duration-500"
                                                        referrerPolicy="no-referrer"
                                                      />
                                                    ) : (
                                                      <div className="absolute inset-0 bg-gradient-to-br from-neutral-900 to-black flex flex-col items-center justify-center p-4">
                                                        <span className="text-[10px] text-white/20 font-mono tracking-widest uppercase mb-1">{p} archive</span>
                                                        <span className="text-xs font-bold text-white/40 text-center line-clamp-1">{vid.title}</span>
                                                      </div>
                                                    )}
                                                    <div className="absolute inset-0 bg-black/45 group-hover:bg-black/55 transition-colors flex items-center justify-center">
                                                      <div className="w-10 h-10 rounded-full bg-white/5 group-hover:bg-white/10 border border-white/30 group-hover:border-white/60 flex items-center justify-center transition-all duration-300 transform group-hover:scale-110">
                                                        <Play className="w-3 h-3 fill-white text-white translate-x-0.5" />
                                                      </div>
                                                    </div>
                                                  </div>
                                                )}
                                                
                                                <button 
                                                  onClick={(e) => { e.stopPropagation(); window.open(externalUrl, '_blank'); }}
                                                  className="absolute top-2 right-2 p-1.5 rounded-full bg-black/75 text-white/50 hover:text-white hover:bg-black/90 transition-all opacity-0 group-hover:opacity-100 shadow"
                                                  title={`Open in ${p}`}
                                                >
                                                  <ExternalLink className="w-3 h-3" />
                                                </button>
                                                <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded text-[8px] font-mono uppercase bg-black/80 text-white/85 border border-white/5">
                                                  {p}
                                                </span>
                                              </div>

                                              <div className="p-4 space-y-2">
                                                <div className="flex justify-between items-start gap-4">
                                                  <h3 className="font-bold text-white/80 text-sm line-clamp-2 leading-tight group-hover:text-white transition-colors flex-1">{vid.title}</h3>
                                                  <a 
                                                     href={externalUrl} 
                                                     target="_blank" 
                                                     rel="noreferrer"
                                                     className="text-white/40 hover:text-white transition-colors"
                                                     title={`Open in ${p}`}
                                                  >
                                                     <ExternalLink className="w-4 h-4" />
                                                  </a>
                                                </div>
                                                <p className="text-xs text-white/40 font-mono uppercase truncate">{vid.creator}</p>
                                              </div>
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>

                                    {/* Scrolling indicator anchor */}
                                    {hasMoreLens && (
                                      <div ref={lensObserverRef} className="h-10 flex items-center justify-center text-white/30 text-xs font-mono py-8 uppercase tracking-widest">
                                        <Loader2 className="w-4 h-4 animate-spin text-neon-red mr-2" />
                                        Generating custom feeds stream...
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })()
                        ) : (
                          <div className="text-center py-20 text-white/30 text-sm">
                            Search for a topic to discover curated content.
                          </div>
                        )}
                      </div>
                    </div>
                 ) : searchMode === 'picks' ? (
                   <div className="flex-1 overflow-y-auto no-scrollbar bg-[#050505] p-4 lg:p-8">
                      <div className="max-w-4xl mx-auto space-y-6">
                        <h2 className="text-xl md:text-2xl font-black text-white flex items-center gap-2">
                           <ShoppingBag className="w-6 h-6 text-neon-green" />
                           MapMates Picks
                        </h2>
                        {isPicksLoading ? (
                          <div className="flex flex-col items-center justify-center py-20 text-white/50 space-y-4">
                            <Loader2 className="w-8 h-8 animate-spin text-neon-green" />
                            <p className="text-sm font-mono tracking-widest uppercase">Hunting for the best deals...</p>
                          </div>
                        ) : picksError ? (
                          <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-6 rounded-xl flex items-start gap-4">
                            <ShoppingBag className="w-6 h-6 shrink-0 mt-1" />
                            <div>
                              <h3 className="font-bold mb-1">Could not load products</h3>
                              <p className="text-sm text-red-400/80 leading-relaxed whitespace-pre-wrap">{picksError}</p>
                            </div>
                          </div>
                        ) : picksData.length > 0 ? (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {picksData.map((item, idx) => (
                              <div key={idx} className="bg-white/5 border border-white/10 rounded-xl overflow-hidden hover:border-neon-green/50 transition-all group flex flex-col p-5">
                                <div className="flex justify-between items-start mb-3">
                                  <div className="bg-neon-green/10 text-neon-green px-2 py-1 rounded text-xs font-bold font-mono">
                                    Option {idx + 1}
                                  </div>
                                  <div className="text-sm font-mono text-white/50">{item.platform}</div>
                                </div>
                                <h3 className="font-bold text-lg text-white leading-tight mb-2 group-hover:text-neon-green transition-colors">{item.name}</h3>
                                <div className="text-2xl font-black text-white mb-4">{item.price}</div>
                                
                                <div className="bg-black/30 rounded p-3 mb-4 flex-1">
                                  <p className="text-sm text-white/80 leading-relaxed">{item.reason}</p>
                                </div>
                                
                                <a 
                                  href={item.link} 
                                  target="_blank" 
                                  rel="noreferrer"
                                  className="w-full py-2.5 bg-neon-green/20 hover:bg-neon-green/30 text-neon-green rounded-lg font-bold flex items-center justify-center gap-2 transition-colors"
                                >
                                  View Deal <ExternalLink className="w-4 h-4" />
                                </a>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-20 text-white/30 text-sm">
                            Search for an item you need to buy to uncover the best value online.
                          </div>
                        )}
                      </div>
                   </div>
                ) : searchMode === 'news' ? (
                   <div className="flex-1 overflow-y-auto no-scrollbar bg-[#050505] p-4 lg:p-8">
                     <div className="max-w-4xl mx-auto space-y-6">
                       <h2 className="text-xl md:text-2xl font-black text-white flex items-center gap-2">
                          <Newspaper className="w-6 h-6 text-purple-500" />
                          MapMates News
                       </h2>
                       {isNewsLoading ? (
                         <div className="flex flex-col items-center justify-center py-20 text-white/50 space-y-4">
                           <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
                           <p className="text-sm font-mono tracking-widest uppercase">Fetching Local Reality...</p>
                         </div>
                       ) : newsError ? (
                         <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-6 rounded-xl flex items-start gap-4">
                           <ShieldAlert className="w-6 h-6 shrink-0 mt-1" />
                           <div>
                             <h3 className="font-bold mb-1">Could not fetch news</h3>
                             <p className="text-sm text-red-400/80 leading-relaxed whitespace-pre-wrap">{newsError}</p>
                           </div>
                         </div>
                       ) : newsData.length > 0 ? (
                         <div className="space-y-6">
                           {newsData.map((news, idx) => (
                             <div key={idx} className="bg-white/5 border border-white/10 rounded-xl overflow-hidden hover:border-purple-500/50 transition-all p-5 lg:p-6">
                               <div className="flex flex-col lg:flex-row gap-6">
                                 <div className="flex-1">
                                   <div className="flex items-center gap-3 mb-3">
                                     <span className="bg-purple-500/20 text-purple-400 px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider">{news.channel}</span>
                                   </div>
                                   <h3 className="text-xl md:text-2xl font-bold text-white mb-3 group-hover:text-purple-400 transition-colors">{news.headline}</h3>
                                   <p className="text-white/70 leading-relaxed mb-4">{news.summary}</p>
                                   
                                   <div className="bg-black/50 rounded-lg p-4 border border-white/5">
                                      <div className="flex items-center gap-3 mb-2">
                                        <div className="text-sm font-bold text-white/50 uppercase tracking-widest">AI Truth Verification</div>
                                        <div className={cn("text-xs font-bold px-2 py-0.5 rounded", news.truthPercentage > 75 ? "bg-green-500/20 text-green-400" : news.truthPercentage > 40 ? "bg-yellow-500/20 text-yellow-500" : "bg-red-500/20 text-red-400")}>
                                           {news.truthPercentage}% Verified
                                        </div>
                                      </div>
                                      <p className="text-sm text-white/60 leading-relaxed">{news.truthAnalysis}</p>
                                   </div>
                                 </div>
                               </div>
                               <div className="mt-4 pt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-4">
                                 <div className="text-sm text-white/40 italic">
                                   {news.recommendation}
                                 </div>
                                 <a 
                                   href={news.link} 
                                   target="_blank" 
                                   rel="noreferrer"
                                   className="px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 rounded-lg font-bold text-sm transition-colors flex items-center gap-2"
                                 >
                                   Source Analysis <ExternalLink className="w-4 h-4" />
                                 </a>
                               </div>
                             </div>
                           ))}
                         </div>
                       ) : (
                         <div className="text-center py-20 text-white/30 text-sm">
                           Search for a local event or topic to unearth real news around you.
                         </div>
                       )}
                     </div>
                   </div>
                ) : view === 'game' ? (
                   <div className="flex-1 overflow-hidden bg-black flex flex-col">
                      <ArcadeHub />
                   </div>
                ) : activeFrameUrl || activeFrameHtml ? (
                  <div className="flex-1 relative bg-white flex flex-col min-w-0">
                    <div className="h-8 bg-[#1A1D23] border-b border-white/10 flex items-center px-4 justify-between shrink-0">
                       <span className="text-[10px] font-mono text-neon-blue uppercase tracking-widest truncate max-w-md">
                          {activeFrameUrl || "AI Dynamic Render"}
                       </span>
                       <div className="flex items-center gap-4">
                         {activeFrameUrl && (
                           <button onClick={() => setIsSmartIframe(!isSmartIframe)} className={cn("text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded transition-colors border", isSmartIframe ? "border-neon-blue text-neon-blue bg-neon-blue/10" : "border-white/20 text-white/40")} title="Bypass iframe blockers">
                             Smart iFrame {isSmartIframe ? 'ON' : 'OFF'}
                           </button>
                         )}
                         <button onClick={() => { setActiveFrameUrl(null); setActiveFrameHtml(null); }} className="text-white/40 hover:text-white transition-colors">
                            <ExternalLink className="w-3 h-3" />
                         </button>
                       </div>
                    </div>
                    <div className="flex-1 relative">
                       <iframe src={activeFrameUrl ? getSmartUrl(activeFrameUrl) : undefined} srcDoc={activeFrameHtml || undefined} className="w-full h-full border-none" />
                    </div>
                  </div>
                ) : (
                  <main className="flex-1 overflow-y-auto w-full max-w-5xl mx-auto py-8 px-4 md:px-8">
                    {view === 'home' ? (
                      <div className="flex flex-col items-center animate-in fade-in slide-in-from-bottom-4 duration-500 mt-12 mb-20">
                         {/* Live Ticker */}
                         <div className="flex items-center gap-2 text-white/50 text-[10px] font-mono uppercase tracking-[2px] mb-4">
                            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                            Join 1,200+ users searching with real-time human reviews right now.
                         </div>

                         <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="w-20 h-20 rounded-2xl bg-mm-gradient flex items-center justify-center shadow-[0_0_20px_rgba(0,102,255,0.4)] mb-8">
                           <span className="text-4xl font-black text-white">MM</span>
                         </motion.div>
                         <h2 className="text-4xl md:text-6xl font-black tracking-tighter uppercase text-center mb-4 leading-none">
                            Master the <span className="text-neon-blue">Web</span>
                         </h2>
                         
                         {/* Glow Badges */}
                         <div className="flex flex-wrap items-center justify-center gap-3 mb-10">
                            {['AI Summaries', 'Voice Search', 'Offline Notes', 'Arcade Games'].map(text => (
                              <div key={text} className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] font-bold uppercase tracking-wider text-white/70 hover:border-neon-blue/50 transition-colors shadow-[0_0_10px_rgba(0,240,255,0.1)]">
                                {text}
                              </div>
                            ))}
                         </div>

                         <p className="text-white/40 text-center max-w-xl mb-12 text-lg">
                            The advanced AI engine for the modern internet. No ads, no tracking, just pure intelligence.
                         </p>

                         <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 w-full">
                            <button onClick={() => setShowBuilder(true)} className="flex flex-col items-center justify-center p-6 rounded-2xl bg-white/[0.03] border border-white/5 hover:border-neon-blue/50 transition-all group">
                              <div className="w-12 h-12 rounded-full bg-neon-blue/10 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform border border-neon-blue/20 group-hover:border-neon-blue">
                                <Plus className="w-6 h-6 text-neon-blue" />
                              </div>
                              <span className="text-xs font-bold uppercase tracking-widest text-white/60 group-hover:text-white">Build App</span>
                            </button>
                            
                            {/* Fixed Top 3 */}
                            {FAMOUS_LINKS.slice(0, 3).map(link => (
                              <button key={link.title} onClick={() => openUrl(link.url)} className="relative flex flex-col items-center justify-center p-6 rounded-2xl bg-white/[0.03] border border-white/5 hover:border-neon-blue/50 transition-all group overflow-hidden">
                                {isBlocked(link.url) && (
                                  <div className="absolute top-2 right-2 text-red-500/80" title="Restricted / Blocked">
                                    <ShieldAlert className="w-4 h-4" />
                                  </div>
                                )}
                                <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform border border-white/5 group-hover:border-white/20">
                                  <span className="text-xl">{link.icon}</span>
                                </div>
                                <span className="text-xs font-medium text-white/50 group-hover:text-white truncate w-full text-center">{link.title}</span>
                              </button>
                            ))}

                            {/* Dynamic Content Algorithm */}
                            {(() => {
                              const dynamicCards = [];
                              const history = searchHistory.slice(0, 22); // Max 22 dynamic
                              
                              for (let i = 0; i < history.length; i++) {
                                const q = history[i];
                                // Types of dynamic cards based on query content or simple rotation
                                if (i % 3 === 0) {
                                  dynamicCards.push(
                                    <button key={`lens-${q}-${i}`} onClick={() => { setSearchMode('video'); performSearch(q); }} className="flex flex-col items-center justify-center p-6 rounded-2xl bg-neon-red/5 border border-neon-red/10 hover:border-neon-red transition-all group overflow-hidden">
                                      <div className="w-10 h-10 rounded-full bg-neon-red/10 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                                        <Video className="w-4 h-4 text-neon-red" />
                                      </div>
                                      <span className="text-[10px] font-bold text-white/50 uppercase truncate w-full text-center">Video: {q}</span>
                                    </button>
                                  );
                                } else if (i % 3 === 1) {
                                  dynamicCards.push(
                                    <button key={`news-${q}-${i}`} onClick={() => { setSearchMode('news'); performSearch(q); }} className="flex flex-col items-center justify-center p-6 rounded-2xl bg-purple-500/5 border border-purple-500/10 hover:border-purple-500 transition-all group overflow-hidden">
                                      <div className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                                        <Newspaper className="w-4 h-4 text-purple-400" />
                                      </div>
                                      <span className="text-[10px] font-bold text-white/50 uppercase truncate w-full text-center">News: {q}</span>
                                    </button>
                                  );
                                } else {
                                  dynamicCards.push(
                                    <button key={`picks-${q}-${i}`} onClick={() => { setSearchMode('picks'); performSearch(q); }} className="flex flex-col items-center justify-center p-6 rounded-2xl bg-neon-green/5 border border-neon-green/10 hover:border-neon-green transition-all group overflow-hidden">
                                      <div className="w-10 h-10 rounded-full bg-neon-green/10 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                                        <ShoppingBag className="w-4 h-4 text-neon-green" />
                                      </div>
                                      <span className="text-[10px] font-bold text-white/50 uppercase truncate w-full text-center">Buy: {q}</span>
                                    </button>
                                  );
                                }
                              }
                              
                              // Fill remaining spots with standard links if history is short
                              const remaining = Math.max(0, 5 - dynamicCards.length);
                              const extraLinks = FAMOUS_LINKS.slice(3, 3 + remaining).map(link => (
                                <button key={link.title} onClick={() => openUrl(link.url)} className="relative flex flex-col items-center justify-center p-6 rounded-2xl bg-white/[0.03] border border-white/5 hover:border-neon-blue/50 transition-all group overflow-hidden">
                                  <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                                    <span className="text-xl">{link.icon}</span>
                                  </div>
                                  <span className="text-xs font-medium text-white/50 group-hover:text-white truncate w-full text-center">{link.title}</span>
                                </button>
                              ));

                              return [...dynamicCards, ...extraLinks];
                            })()}
                          </div>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-10 pb-32">
                        {/* AI Section */}
                        {(isAiLoading || aiAnswer) && (
                          <div className="bg-[#1A1D23] border border-white/10 rounded-3xl overflow-hidden shadow-2xl relative ring-1 ring-neon-blue/10">
                            <div className="h-1.5 bg-mm-gradient w-full" />
                            
                            {/* AI Header Tabs */}
                            <div className="px-6 py-4 flex items-center justify-between border-b border-white/5 bg-black/20">
                               <div className="flex items-center gap-3">
                                 <div className="w-9 h-9 rounded-xl bg-neon-blue/10 flex items-center justify-center">
                                   <Bot className="w-5 h-5 text-neon-blue" />
                                 </div>
                                 <div className="flex flex-col">
                                   <span className="font-black text-white uppercase tracking-tight text-lg">AI Insights</span>
                                   {responseTime > 0 && <span className="font-mono text-[9px] text-white/20 uppercase">Generated in {responseTime}s</span>}
                                 </div>
                               </div>
                               <div className="flex items-center gap-1 bg-black/40 rounded-xl p-1 border border-white/5 max-w-[150px] sm:max-w-none hover:overflow-x-auto no-scrollbar scroll-smooth transition-all overflow-hidden">
                                 <button 
                                   onClick={() => setAiTab('answer')} 
                                   className={cn(
                                     "p-2 md:p-2.5 rounded-lg transition-all flex items-center justify-center group relative", 
                                     aiTab === 'answer' ? "bg-neon-blue text-black" : "text-white/40 hover:text-white hover:bg-white/5"
                                   )}
                                   title="Technical Analysis"
                                 >
                                   <Bot className="w-4 h-4" />
                                   <span className="ml-2 text-[10px] font-black uppercase tracking-tight hidden lg:block">Analysis</span>
                                 </button>
                                 <button 
                                   onClick={() => setAiTab('map')} 
                                   className={cn(
                                     "p-2 md:p-2.5 rounded-lg transition-all flex items-center justify-center group relative", 
                                     aiTab === 'map' ? "bg-neon-blue text-black" : "text-white/40 hover:text-white hover:bg-white/5"
                                   )}
                                   title="Visual Mapping"
                                 >
                                   <LayoutPanelLeft className="w-4 h-4" />
                                   <span className="ml-2 text-[10px] font-black uppercase tracking-tight hidden lg:block">Map</span>
                                 </button>
                                 <div className="w-px h-4 bg-white/10 mx-0.5 shrink-0" />
                                 <button 
                                   onClick={() => aiAnswer && speak(parseAiAnswer(aiAnswer).ANSWER)}
                                   disabled={!aiAnswer}
                                   className={cn(
                                     "p-2 md:p-2.5 rounded-lg transition-all flex items-center justify-center group relative gap-2", 
                                     isSpeaking ? "bg-[#ff007f] text-white" : "text-white/40 hover:text-white hover:bg-white/5",
                                     !aiAnswer && "opacity-0 invisible"
                                   )}
                                   title={isSpeaking ? "Stop Narrating" : "Listen to Analysis"}
                                 >
                                   <Mic className={cn("w-4 h-4", isSpeaking && "animate-pulse")} />
                                   {isSpeaking && <span className="text-[10px] font-black uppercase tracking-tight hidden lg:block">Stop</span>}
                                 </button>
                               </div>
                            </div>

                            <div className="p-8 overflow-x-auto">
                               {isAiLoading ? (
                                 <div className="flex flex-col gap-6 items-center justify-center py-20">
                                    <Loader2 className="w-10 h-10 animate-spin text-neon-blue" />
                                    <p className="font-mono text-[10px] text-white/40 uppercase tracking-[4px]">Synthesizing report...</p>
                                 </div>
                               ) : (
                                 (() => {
                                   const sections = parseAiAnswer(aiAnswer!);
                                   if (aiTab === 'map') {
                                      // Extracting any level of markdown headers for the visual map
                                      const lines = sections.ANSWER.match(/^#+ (.*)/gm) || [];
                                      return (
                                        <div className="flex flex-col gap-8 py-4 animate-in fade-in zoom-in-95 duration-300">
                                           <div 
                                             className="flex items-center gap-6 cursor-pointer group"
                                             onClick={() => scrollToHeading(lines[0]?.replace(/^#+ /, '') || 'Overview')}
                                           >
                                              <div className="w-12 h-12 rounded-full bg-neon-blue flex items-center justify-center text-black font-black text-xl shadow-[0_0_20px_rgba(0,240,255,0.4)] ring-4 ring-neon-blue/20 group-hover:scale-110 transition-transform">1</div>
                                              <div className="h-px flex-1 bg-gradient-to-r from-neon-blue/40 to-transparent" />
                                              <div className="text-white font-black text-2xl uppercase tracking-tighter">
                                                {lines[0]?.replace(/^#+ /, '') || 'Overview'}
                                              </div>
                                           </div>
                                           {lines.slice(1).map((h, i) => {
                                             const title = h.replace(/^#+ /, '');
                                             return (
                                               <div 
                                                 key={i} 
                                                 className="flex items-center gap-6 pl-14 relative group cursor-pointer"
                                                 onClick={() => scrollToHeading(title)}
                                               >
                                                  <div className="absolute left-6 top-[-32px] bottom-1/2 w-0.5 bg-gradient-to-b from-neon-blue/20 to-neon-blue/40" />
                                                  <div className="w-4 h-4 rounded-full border-2 border-neon-blue bg-[#1A1D23] z-10 group-hover:scale-125 group-hover:bg-neon-blue transition-all" />
                                                  <div className="text-white/60 font-bold text-lg group-hover:text-neon-blue transition-colors">
                                                    {title}
                                                  </div>
                                               </div>
                                             );
                                           })}
                                           {lines.length <= 1 && (
                                              <div className="flex flex-col items-center justify-center py-12 text-white/20">
                                                 <Bot className="w-8 h-8 mb-4 opacity-50" />
                                                 <p className="font-mono text-[10px] uppercase tracking-widest text-center">Structure is being simplified...<br/>Switch to Analysis for full details.</p>
                                              </div>
                                           )}
                                           <div className="mt-8 p-6 rounded-2xl bg-neon-blue/5 border border-neon-blue/10 text-white/40 text-sm leading-relaxed text-center">
                                              This visual structure helps you navigate the complex response. Use the <strong>Analysis</strong> tab for full details.
                                           </div>
                                        </div>
                                      );
                                   }

                                   return (
                                     <div className="animate-in fade-in duration-300">
                                       {sections.FACTS && (
                                         <div className="flex flex-wrap gap-2 mb-10">
                                           {sections.FACTS.split('\n').filter(l => l.includes(':')).map((f, i) => {
                                             const [k, ...vParts] = f.replace(/^-\s*/, '').split(':');
                                             const v = vParts.join(':').trim();
                                             return (
                                               <div key={i} className="flex flex-wrap items-center gap-x-2 gap-y-1 px-3 py-1.5 bg-white/[0.03] rounded-2xl border border-white/5 hover:border-neon-blue/30 transition-all max-w-full overflow-hidden">
                                                  <span className="text-[9px] uppercase text-white/30 font-black tracking-widest whitespace-nowrap">{k.trim()}:</span>
                                                  <span className="text-[11px] text-white font-bold break-all">{v}</span>
                                               </div>
                                             );
                                           })}
                                         </div>
                                       )}

                                       <div className="markdown-body prose prose-invert max-w-none overflow-x-auto
                                         prose-p:text-[#94a3b8] prose-p:leading-[1.75] prose-p:text-[15px] prose-p:my-6
                                         prose-h1:text-[#00f0ff] prose-h2:text-[#00f0ff] prose-h3:text-[#00f0ff]
                                         prose-headings:uppercase prose-headings:tracking-widest prose-headings:font-black
                                         prose-strong:text-[#ec4899] prose-strong:font-bold prose-strong:text-[1.05em]
                                         prose-table:border prose-table:border-white/10 prose-th:bg-white/5 prose-td:p-3
                                         prose-li:text-[#94a3b8] prose-pre:bg-black/50 prose-pre:border prose-pre:border-white/10">
                                          <div className="min-w-0 break-words">
                                            <Markdown
                                              components={{
                                                h1: ({node, ...props}) => {
                                                  const content = String(props.children);
                                                  const id = `heading-${content.toLowerCase().replace(/[^\w\s-]/g, '').replace(/[\s_-]+/g, '-').replace(/^-+|-+$/g, '')}`;
                                                  return <h1 id={id} {...props} />;
                                                },
                                                h2: ({node, ...props}) => {
                                                  const content = String(props.children);
                                                  const id = `heading-${content.toLowerCase().replace(/[^\w\s-]/g, '').replace(/[\s_-]+/g, '-').replace(/^-+|-+$/g, '')}`;
                                                  return <h2 id={id} {...props} />;
                                                },
                                                h3: ({node, ...props}) => {
                                                  const content = String(props.children);
                                                  const id = `heading-${content.toLowerCase().replace(/[^\w\s-]/g, '').replace(/[\s_-]+/g, '-').replace(/^-+|-+$/g, '')}`;
                                                  return <h3 id={id} {...props} />;
                                                },
                                                strong: ({node, ...props}) => {
                                                  const content = String(props.children);
                                                  if (content.includes(':')) {
                                                    return (
                                                      <span className="block mt-6 mb-2">
                                                        <strong className="text-[#ff007f] text-lg uppercase tracking-tight" {...props} />
                                                      </span>
                                                    );
                                                  }
                                                  return <strong {...props} />;
                                                }
                                              }}
                                            >
                                              {sections.ANSWER}
                                            </Markdown>
                                          </div>
                                       </div>

                                       {(sections.LINKS || sections.EXPLORE) && (
                                          <div className="mt-12 pt-8 border-t border-white/5 grid md:grid-cols-2 gap-8">
                                             {sections.LINKS && (
                                                <div className="p-6 bg-white/[0.02] rounded-2xl border border-white/5">
                                                   <h3 className="text-xs font-black text-neon-blue uppercase tracking-widest mb-4 flex items-center gap-2">
                                                      <ExternalLink className="w-3 h-3" /> External Sources
                                                   </h3>
                                                   <div className="prose-li:text-sm prose-li:my-1 text-white/50">
                                                      <Markdown>{sections.LINKS}</Markdown>
                                                   </div>
                                                </div>
                                             )}
                                             {sections.EXPLORE && (
                                                <div className="p-6 bg-mm-gradient/5 rounded-2xl border border-neon-blue/20 relative overflow-hidden group">
                                                   <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                                      <Sparkles className="w-12 h-12 text-neon-blue" />
                                                   </div>
                                                   <h3 className="text-xs font-black text-neon-blue uppercase tracking-widest mb-4">Explore More</h3>
                                                   <div className="text-white/70 text-sm leading-relaxed">
                                                      <Markdown>{sections.EXPLORE}</Markdown>
                                                   </div>
                                                </div>
                                             )}
                                          </div>
                                       )}
                                       
                                       {sections.SUMMARY && (
                                          <div className="mt-8 p-6 bg-black/40 rounded-2xl border-l-4 border-neon-blue italic text-white/60">
                                             <Markdown>{sections.SUMMARY}</Markdown>
                                          </div>
                                       )}
                                       
                                       {/* AI Answer Footer Toolset */}
                                       <div className="mt-12 pt-6 border-t border-white/5 flex flex-wrap items-center justify-between gap-4">
                                          <div className="flex items-center gap-4">
                                             <div className="flex flex-col">
                                                <span className="text-[10px] font-mono text-white/20 uppercase tracking-widest">Efficiency</span>
                                                <span className="text-[11px] font-bold text-neon-blue">{responseTime}s Search Process</span>
                                             </div>
                                             <div className="w-px h-6 bg-white/10" />
                                             <div className="flex flex-col">
                                                <span className="text-[10px] font-mono text-white/20 uppercase tracking-widest">Status</span>
                                                <span className="text-[11px] font-bold text-green-400">Analysis Complete</span>
                                             </div>
                                          </div>
                                          
                                          <div className="flex items-center gap-2">
                                             <button 
                                               onClick={handleCopy}
                                               className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 transition-all group"
                                             >
                                                {copied ? (
                                                  <>
                                                    <Check className="w-3.5 h-3.5 text-green-400" />
                                                    <span className="text-[10px] font-black uppercase text-green-400">Copied</span>
                                                  </>
                                                ) : (
                                                  <>
                                                    <Copy className="w-3.5 h-3.5 text-white/40 group-hover:text-white transition-colors" />
                                                    <span className="text-[10px] font-black uppercase text-white/40 group-hover:text-white transition-colors">Copy Result</span>
                                                  </>
                                                )}
                                             </button>
                                             <button 
                                               onClick={() => speak(parseAiAnswer(aiAnswer!).ANSWER)}
                                               className="p-2 bg-neon-blue/10 border border-neon-blue/20 rounded-xl hover:bg-neon-blue/20 transition-all"
                                               title="Narrate Result"
                                             >
                                                <Mic className={cn("w-4 h-4", isSpeaking ? "text-neon-red animate-pulse" : "text-neon-blue")} />
                                             </button>
                                          </div>
                                       </div>
                                     </div>
                                   );
                                 })()
                               )}
                            </div>
                          </div>
                        )}

                        {/* Web Results */}
                        <div className="flex flex-col gap-6">
                           <div className="flex items-center justify-between">
                              <h3 className="font-mono text-[10px] uppercase text-white/30 tracking-[4px] flex items-center gap-2">
                                 <History className="w-3 h-3" /> High Integrity Web Results
                              </h3>
                              {isSearching && <Loader2 className="w-4 h-4 animate-spin text-neon-blue" />}
                           </div>
                           
                           <div className="grid grid-cols-1 gap-4">
                              {results.length > 0 ? (
                                <>
                                  {results.slice(0, visibleResultsCount).map((r, i) => (
                                    <motion.div 
                                      initial={{ opacity: 0, y: 10 }}
                                      animate={{ opacity: 1, y: 0 }}
                                      transition={{ delay: i * 0.05 }}
                                      key={i} 
                                      className="p-6 bg-white/[0.02] border border-white/5 rounded-2xl hover:bg-white/[0.04] hover:border-neon-blue/30 transition-all group"
                                    >
                                       <div className="flex items-center gap-2 mb-2">
                                          <img src={`https://www.google.com/s2/favicons?domain=${new URL(r.url).hostname}&sz=32`} className="w-4 h-4 rounded-sm opacity-50 group-hover:opacity-100 transition-opacity" alt="" />
                                          <span className="text-[10px] font-mono text-white/30 group-hover:text-neon-blue transition-colors truncate">{r.url}</span>
                                          {r.source === 'mapmates' && (
                                            <span className="ml-auto text-[9px] font-black bg-neon-blue/20 text-neon-blue px-2 py-0.5 rounded-full uppercase tracking-tighter">Priority Mate</span>
                                          )}
                                          <div className="relative flex items-center gap-1 ml-auto">
                                            <button
                                              onClick={() => { setShowCommentsUrl(r.url); fetchComments(r.url); }}
                                              className="relative p-2 text-white/50 hover:text-white transition-colors"
                                              title="Comments"
                                            >
                                              <MessageSquare className="w-5 h-5" />
                                              {(commentCounts[r.url] || 0) > 0 && (
                                                <span className="absolute top-0 right-0 bg-neon-blue text-[8px] font-bold text-black rounded-full px-1 min-w-[14px] h-[14px] flex items-center justify-center">
                                                  {commentCounts[r.url]}
                                                </span>
                                              )}
                                            </button>
                                            <button
                                              onClick={() => setShowSummaryUrl(r.url)}
                                              className="p-2 text-white/50 hover:text-white transition-colors"
                                              title="View Summary"
                                            >
                                              <FileText className="w-5 h-5" />
                                            </button>
                                            <button
                                              onClick={() => {
                                                setActiveVoiceUrl(r.url);
                                                handleVoiceSummary(r.url);
                                              }}
                                              className={cn("p-2 transition-colors", activeVoiceUrl === r.url && isSpeaking ? "text-neon-blue animate-pulse" : "text-white/50 hover:text-white")}
                                              title="Voice Summary"
                                            >
                                              <Mic className={cn("w-5 h-5", activeVoiceUrl === r.url && isSpeaking && "text-neon-red")} />
                                            </button>
                                            <button
                                              onClick={() => setActiveMenuUrl(activeMenuUrl === r.url ? null : r.url)}
                                              className="p-2 text-white/50 hover:text-white transition-colors"
                                            >
                                              <MoreVertical className="w-5 h-5" />
                                            </button>
                                            {activeMenuUrl === r.url && (
                                              <div className="absolute right-0 top-8 bg-neutral-900 border border-neutral-700 rounded-lg p-2 w-32 z-50 shadow-xl">
                                                {['English', 'Urdu', 'Hindi', 'Punjabi'].map(lang => (
                                                  <button
                                                    key={lang}
                                                    onClick={() => handleVoiceSummary(r.url, lang)}
                                                    className="block w-full text-left px-4 py-2 hover:bg-neutral-800 text-sm text-white"
                                                  >
                                                    {lang}
                                                  </button>
                                                ))}
                                              </div>
                                            )}
                                          </div>
                                       </div>
                                       <a 
                                         href={r.url} 
                                         onClick={(e) => { e.preventDefault(); openUrl(r.url); }} 
                                         className="text-xl font-bold text-neon-blue hover:underline leading-tight flex items-center gap-2 mb-2"
                                       >
                                          {isBlocked(r.url) && <span title="Restricted / Blocked"><ShieldAlert className="w-5 h-5 text-red-500 shrink-0" /></span>}
                                          <span>{r.title}</span>
                                       </a>
                                       <p className="text-[#94a3b8] text-[15px] leading-relaxed line-clamp-2">{r.snippet}</p>
                                    </motion.div>
                                  ))}
                                  
                                  <div ref={observerRef} className="h-24 flex items-center justify-center mt-6">
                                    {(visibleResultsCount < results.length || isFetchingMore) && (
                                      <div className="flex flex-col items-center gap-2">
                                        <Loader2 className="w-6 h-6 animate-spin text-neon-blue opacity-50" />
                                        <span className="text-[10px] font-mono text-white/20 uppercase tracking-[4px]">
                                          {isFetchingMore ? "Synchronizing network data..." : "Fetching more entries..."}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                </>
                              ) : !isSearching && (
                                <div className="text-center py-12 text-white/20 font-mono text-xs uppercase tracking-widest bg-white/[0.01] border border-dashed border-white/5 rounded-3xl">
                                   No web records for current query
                                </div>
                              )}
                           </div>
                        </div>
                        
                        {/* Interactive Search Widgets (Old context) */}
                        <SearchWidgets query={query} />
                      </div>
                    )}
                  </main>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showCommentsUrl && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} 
            onClick={() => setShowCommentsUrl(null)}
            className="fixed inset-0 bg-black/80 z-[200] flex items-center justify-center p-4">
            <div onClick={(e) => e.stopPropagation()} className="bg-neutral-900 border border-neutral-700 rounded-2xl w-full max-w-lg p-6 max-h-[80vh] flex flex-col">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-white font-bold">{comments.length} Comments</h3>
                <button onClick={() => setShowCommentsUrl(null)} className="text-white/50">Close</button>
              </div>
              {/* Neon Divider & Comments Header */}
              <div className="my-8 flex items-center gap-4">
                  <div className="h-0.5 bg-neon-blue flex-1" />
                  <span className="text-[10px] font-black text-white uppercase tracking-tight">Human Perspective</span>
                  <div className="h-0.5 bg-neon-blue flex-1" />
              </div>
              <div className="flex-1 overflow-y-auto mb-4 space-y-2 pr-2">
                {comments.map(c => (
                  <div key={c.id} className="bg-neutral-800 p-3 rounded-lg flex items-center gap-4">
                     <div className="flex flex-col items-center gap-1">
                        <button className="text-white/30 hover:text-green-400 text-xs">▲</button>
                        <button className="text-white/30 hover:text-red-400 text-xs">▼</button>
                     </div>
                     <div className="flex-1">
                        <p className="text-white/90">{c.comment}</p>
                        <p className="text-[10px] text-white/40">{c.userEmail}</p>
                     </div>
                     {user && c.userId === user.uid && (
                        <button onClick={() => deleteComment(c.id, showCommentsUrl!)} className="text-red-400 hover:text-red-300" disabled={isDeletingComment === c.id}>
                          {isDeletingComment === c.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                        </button>
                     )}
                  </div>
                ))}
              </div>
              <div className="flex gap-2 bg-neutral-800 rounded-lg p-2">
                <input className="flex-1 bg-transparent text-white focus:outline-none" value={newComment} onChange={e => setNewComment(e.target.value)} placeholder="Add comment..." disabled={isPostingComment} />
                <button onClick={() => postComment(showCommentsUrl!, newComment)} className="text-neon-blue" disabled={isPostingComment}>
                  {isPostingComment ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                </button>
              </div>
            </div>
          </motion.div>
        )}
        {showSummaryUrl && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} 
            onClick={() => setShowSummaryUrl(null)}
            className="fixed inset-0 bg-black/80 z-[200] flex items-center justify-center p-4">
            <div onClick={(e) => e.stopPropagation()} className="bg-neutral-900 border border-neutral-700 rounded-2xl w-full max-w-lg p-6 max-h-[80vh] flex flex-col">
              <div className="flex justify-between items-center mb-4 bg-[rgba(15,23,42,0.7)] backdrop-blur-[10px] bg-gradient-to-br from-[rgba(236,72,153,0.2)] to-[rgba(168,85,247,0.2)] p-4 rounded-xl -mx-2">
                <h3 className="text-[#00f0ff] font-bold flex items-center gap-2">
                  <span className="text-[#ec4899]">💡</span> AI Insights
                </h3>
                <div className="flex items-center gap-2">
                   <button onClick={() => speak(latestSummary[showSummaryUrl!])} className="text-neon-blue text-xs font-bold uppercase transition-transform hover:scale-105">Read Aloud</button>
                   <button onClick={() => setShowSummaryUrl(null)} className="text-white/50 hover:text-white">Close</button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto text-[#94a3b8] pr-2">
                {latestSummary[showSummaryUrl] ? (
                  <div className="markdown-body prose prose-invert max-w-none overflow-x-auto
                                         prose-p:text-[#94a3b8] prose-p:leading-[1.75] prose-p:text-[15px] prose-p:my-6
                                         prose-h1:text-[#00f0ff] prose-h2:text-[#00f0ff] prose-h3:text-[#00f0ff]
                                         prose-headings:uppercase prose-headings:tracking-widest prose-headings:font-black
                                         prose-strong:text-[#ec4899] prose-strong:font-bold prose-strong:text-[1.05em]
                                         prose-table:border prose-table:border-white/10 prose-th:bg-white/5 prose-td:p-3
                                         prose-li:text-[#94a3b8] prose-pre:bg-black/50 prose-pre:border prose-pre:border-white/10">
                    <Markdown>{latestSummary[showSummaryUrl]}</Markdown>
                  </div>
                ) : (
                  <p className="leading-[1.75]">No summary available. Click the microphone icon to generate one.</p>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Overlays */}
      <AnimatePresence>
        {showBuilder && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/80 backdrop-blur-xl z-[300] flex items-center justify-center p-6">
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="w-full max-w-xl bg-[#1A1D23] rounded-3xl overflow-hidden border border-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.8)]">
               <div className="h-1.5 bg-mm-gradient" />
               <div className="p-8">
                  <div className="flex items-center gap-4 mb-8">
                     <div className="w-12 h-12 rounded-2xl bg-neon-blue/20 flex items-center justify-center">
                        <Bot className="w-6 h-6 text-neon-blue" />
                     </div>
                     <div>
                        <h2 className="text-2xl font-black uppercase tracking-tight">AI Micro-Build</h2>
                        <p className="text-white/30 text-xs font-mono uppercase tracking-widest">Generative Component Engine</p>
                     </div>
                  </div>
                  <textarea 
                     value={builderPrompt} 
                     onChange={(e) => setBuilderPrompt(e.target.value)} 
                     className="w-full h-40 bg-black/40 border border-white/10 rounded-2xl p-4 text-white resize-none mb-6 focus:outline-none focus:border-neon-blue transition-all placeholder:text-white/10 text-sm leading-relaxed" 
                     placeholder="Example: Build a neon digital clock with floating particles..." 
                  />
                  <div className="flex gap-4">
                     <button onClick={() => setShowBuilder(false)} className="flex-1 py-4 bg-white/5 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-white/10 transition-colors">Cancel</button>
                     <button 
                        onClick={handleBuildSite} 
                        disabled={isBuilding || !builderPrompt.trim()} 
                        className="flex-[2] py-4 bg-neon-blue text-black rounded-2xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-3 hover:opacity-90 transition-all disabled:opacity-30"
                     >
                        {isBuilding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                        {isBuilding ? "Deploying Code..." : "Generate Production Code"}
                     </button>
                  </div>
               </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
