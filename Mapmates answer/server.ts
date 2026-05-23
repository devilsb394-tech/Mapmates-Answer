import express from "express";
import path from "path";
import * as cheerio from 'cheerio';
import { GoogleGenAI } from "@google/genai";
import serverless from "serverless-http";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "dummy" });

async function callAIWithFallback(contents: string, config?: any) {
  const geminiModels = ['gemini-3.5-flash', 'gemini-3.1-pro-preview', 'gemini-3.1-flash-lite'];
  let lastGeminiError = "";
  
  // Simple in-memory cache for AI results
  const cacheKey = contents.substring(0, 500); 
  const cached = aiCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < 60 * 60 * 1000) {
    return cached.result;
  }

  for (const modelName of geminiModels) {
    try {
      console.log(`Trying Gemini model: ${modelName}`);
      const response = await ai.models.generateContent({
        model: modelName,
        contents: contents,
        config: {
          maxOutputTokens: config?.maxOutputTokens,
          temperature: config?.temperature || 0.7,
          systemInstruction: config?.systemInstruction,
        },
      });
      const text = response.text;
      if (text) {
        aiCache.set(cacheKey, { result: text, timestamp: Date.now() });
        return text;
      }
    } catch (e: any) {
      const errorMsg = e?.message || String(e);
      console.warn(`Failed with model ${modelName}:`, errorMsg);
      
      // If quota exceeded or exhausted, move to the next model immediately.
      if (errorMsg.includes("429") || errorMsg.includes("quota") || errorMsg.includes("RESOURCE_EXHAUSTED")) {
        lastGeminiError = "API Quota Exceeded";
        continue; // Try next model in list
      }
      // For other errors, try next model as well
    }
  }

  // Fallback to OpenRouter only if a valid key is provided
  const openRouterKey = process.env.OPENROUTER_API_KEY || "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";
  if (openRouterKey && openRouterKey !== "dummy" && openRouterKey.length > 10) {
    console.log("Falling back to OpenRouter");
    try {
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${openRouterKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://mapmates.vercel.app",
        },
        body: JSON.stringify({
          model: "google/gemini-2.0-flash-001",
          messages: [
            ...(config?.systemInstruction ? [{ role: "system", content: config.systemInstruction }] : []),
            { role: "user", content: contents }
          ]
        })
      });
      const data = await response.json();
      if (data.choices?.[0]?.message?.content) {
        const result = data.choices[0].message.content;
        aiCache.set(cacheKey, { result, timestamp: Date.now() });
        return result;
      }
    } catch (e: any) {
      console.error("OpenRouter fallback failed:", e?.message || e);
    }
  }
  
  if (lastGeminiError === "API Quota Exceeded") {
     return `⚠️ **API Quota Exceeded:** You have reached the free tier limits. Please wait a while or check your keys.`;
  }
  
  return `⚠️ **AI Service Unavailable:** Please try again later.`;
}

// Global cache for AI responses
const aiCache = new Map<string, { result: string, timestamp: number }>();

const app = express();
app.use(express.json());

// API to proxy DuckDuckGo search
app.post("/api/generate-site", async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt) return res.status(400).json({ error: "Prompt is required" });

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: "Gemini API key is missing on the server." });
    }

    const html = await callAIWithFallback(`You are an expert web developer. Generate a complete, single-file HTML document (containing HTML, inline CSS, and inline JavaScript) for the following request: "${prompt}".
      The output MUST be ONLY valid HTML code. Do NOT wrap it in markdown block quotes (like \`\`\`html) or conversational text. Return just the raw HTML literal.
      Ensure the design is modern, mobile-responsive, and fully functional. It should use a dark modern aesthetic if applicable.`);
    
    let htmlContent = html || "";
    htmlContent = htmlContent.replace(/^```(html)?\n?/, '').replace(/\n?```$/, '').trim();
    
    res.json({ html: htmlContent });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to generate site" });
  }
});

app.post("/api/insight-search", async (req, res) => {
  try {
    const { query } = req.body;
    
    let searchTopic = query;
    if (!searchTopic) {
      searchTopic = "What is the truth about AI taking over human jobs?";
    }

    const prompt = `You are a deep truth and logic research AI. The user is asking about: "${searchTopic}".
Search the internet (especially Reddit, Wikipedia, YouTube, News).
Analyze facts vs fiction, opinions, and true reality. Think deeply and logically.
Return ONLY a valid JSON object. Do NOT wrap it in markdown block quotes (no \`\`\`json).
Format:
{
  "truthPercentage": (number 0-100 indicating how true the widely believed premise is),
  "verdict": (string) Short definitive answer (e.g. True, False, Mixed, Unproven),
  "deepAnalysis": (string) Detailed logical research, explaining the reality and debunking fake claims,
  "communityConsensus": (string) What people on Reddit/YT/forums are actually saying,
  "fakeClaims": [(array of strings) Claims that are false or misunderstood],
  "sources": [(array of objects with "title" and "url") Provide real links to prove your point]
}`;

    const aiRes = await callAIWithFallback(prompt, {
      maxOutputTokens: 2500,
      temperature: 0.5,
      tools: [{ googleSearch: {} }]
    });

    if (aiRes.startsWith('⚠️')) {
      throw new Error(aiRes);
    }

    let jsonStr = aiRes.replace(/^```(json)?\n?/, '').replace(/\n?```$/, '').trim();
    const data = JSON.parse(jsonStr);
    res.json({ insight: data });
  } catch (err: any) {
    console.error("Insight search error:", err?.message || err);
    res.status(500).json({ error: "Failed to analyze truth", details: err?.message });
  }
});

app.post("/api/news-search", async (req, res) => {
  try {
    const { query, location } = req.body;
    
    let searchTopic = query || "Top breaking local news and headlines today";
    let weatherInfo = "No real-time weather data available.";

    // Try to fetch real-time weather if location exists and API key is present
    if (process.env.OPENWEATHER_API_KEY) {
      try {
        const latMatch = location.match(/Lat: ([\d.-]+)/);
        const lngMatch = location.match(/Lng: ([\d.-]+)/);
        let wUrl = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(location)}&appid=${process.env.OPENWEATHER_API_KEY}&units=metric`;
        if (latMatch && lngMatch) {
          wUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${latMatch[1]}&lon=${lngMatch[1]}&appid=${process.env.OPENWEATHER_API_KEY}&units=metric`;
        }
        const wRes = await fetch(wUrl);
        const wData = await wRes.json();
        if (wData && wData.main) {
          weatherInfo = `Conditions: ${wData.weather[0].description}, Temp: ${wData.main.temp}°C, Humidity: ${wData.main.humidity}%`;
        }
      } catch (e) {
        console.warn("Weather fetch failed, skipping context.");
      }
    }

    const prompt = `You are an advanced AI Analyst for "MapMates News: Deep Truth". 
The user is asking about: "${searchTopic}".
User Location: "${location}".
Real-time Weather Context: "${weatherInfo}".

INSTRUCTIONS:
1. LAYER 1 (Internet Scan): Search for real-time news headlines, articles, and reports related to the topic and location.
2. LAYER 2 (Environmental Check): Use the provided weather context and background search tools to verify claims (e.g., if a user says "It's raining in Lahore", check if the data supports it).
3. LAYER 3 (Deep Analysis): Cross-reference news channels with Reddit discussions, Wikipedia, and WikiLeaks logic. Identify propaganda vs reality.
4. THINKING: Analyze WHY this news is trending, if it's manipulated, and who the source is.

Return ONLY a valid JSON array of objects. Do NOT wrap it in markdown block quotes (no \`\`\`json).
Each object must have:
- "headline": (string) News Headline
- "channel": (string) Source/Channel reporting this
- "summary": (string) Detailed breakdown of what happened.
- "truthPercentage": (number) 0 to 100 representing how verified this is.
- "truthAnalysis": (string) Deep AI reasoning. Mention if the weather/environment supports this claim. Explain the "Thinking" behind your verdict.
- "recommendation": (string) "View this channel for real updates" or "Strictly avoid, contains propaganda".
- "link": (string) Real source link.`;

    const aiRes = await callAIWithFallback(prompt, {
      maxOutputTokens: 3000,
      tools: [{ googleSearch: {} }] 
    });

    if (aiRes.startsWith('⚠️')) {
      throw new Error(aiRes);
    }

    let jsonStr = aiRes.replace(/^```(json)?\n?/, '').replace(/\n?```$/, '').trim();
    const data = JSON.parse(jsonStr);
    res.json({ news: data });
  } catch (err: any) {
    console.error("News search error:", err?.message || err);
    res.status(500).json({ error: "Failed to fetch news", details: err?.message });
  }
});

app.post("/api/picks-search", async (req, res) => {
  try {
    const { query, location } = req.body;
    
    let searchTopic = query || "Best affordable smartwatch 2024";

    const prompt = `You are a shopping assistant for "MapMates Picks". The user is looking for a product: "${searchTopic}".
The user's rough location context is: "${location}". 
If the location is valid coordinates, heavily prioritize realistic local shops or well-known e-commerce platforms available near them. 
If location is unknown/denied, give the best internet deals from highly trusted sites (e.g., Daraz, Amazon, local equivalents based on assumed region if implied).
Provide exactly 4 product options, ranked from 1 (Best overall/cheapest/best quality) to 4.
For each product, include realistic prices, a short explanation of WHY it is the best (price vs quality), and a verified-feeling link/platform name.

Return ONLY a valid JSON array of exactly 4 objects. Do NOT wrap it in markdown block quotes (no \`\`\`json).
Each object must have:
- "name": (string) Exact product name
- "platform": (string) Where to buy (e.g., Daraz, Amazon, BestBuy, local shop)
- "price": (string) Estimated price with currency 
- "reason": (string) Detailed reason why it's recommended (price vs quality, why they should buy it)
- "link": (string) A realistic search/buy URL for the platform`;

    const aiRes = await callAIWithFallback(prompt, {
      maxOutputTokens: 2000,
      tools: [{ googleSearch: {} }] // Allows it to find real prices and local data
    });

    if (aiRes.startsWith('⚠️')) {
      throw new Error(aiRes);
    }

    let jsonStr = aiRes.replace(/^```(json)?\n?/, '').replace(/\n?```$/, '').trim();
    const data = JSON.parse(jsonStr);
    res.json({ picks: data });
  } catch (err: any) {
    console.error("Picks search error:", err?.message || err);
    res.status(500).json({ error: "Failed to find products", details: err?.message });
  }
});

app.post("/api/lens-search", async (req, res) => {
  try {
    const { query, history = [], page = 1 } = req.body;
    const searchTopic = query || "Top trending facts";
    const isFirstPage = page === 1;

    // Use a small amount of variety for the query if it's not the first page to get different results
    const optimizePrompt = `Extract 3 core search words for: "${searchTopic}". Return words only.`;
    const optRes = isFirstPage ? await callAIWithFallback(optimizePrompt, { maxOutputTokens: 20 }) : { text: searchTopic };
    const optimizedTopic = (typeof optRes === 'string' && optRes.startsWith('⚠️')) ? searchTopic : (typeof optRes === 'string' ? optRes.replace(/[\n"']/g, '').trim() : searchTopic);

    // Multi-platform specific fetchers with pagination support
    const tryYouTubePrioritized = async (q: string, p: number, limit = 6) => {
      const query = encodeURIComponent(q);
      const ytInstances = [
        `https://pipedapi.kavin.rocks/search?q=${query}&page=${p}&filter=videos`,
        `https://api.piped.yt/search?q=${query}&page=${p}&filter=videos`,
        `https://invidious.nerdvpn.de/api/v1/search?q=${query}&page=${p}&type=video`
      ];

      for (const url of ytInstances) {
        try {
          const res = await fetch(url, { 
            signal: AbortSignal.timeout(3000),
            headers: { 'User-Agent': 'Mozilla/5.0' }
          });
          if (res.ok) {
            const data = await res.json();
            // Handle Piped Core Response Data
            if (data?.items) {
              return (data.items || []).slice(0, limit).map((v: any) => ({
                title: v.title,
                videoId: v.url.includes("v=") ? v.url.split("v=")[1] : v.url.split("/").pop(),
                creator: v.uploaderName || 'YouTube Creator',
                platform: 'youtube',
                views: v.views || 0
              }));
            }
            // Handle Invidious Core Response Data
            if (Array.isArray(data)) {
               return data.slice(0, limit).map((v: any) => ({
                title: v.title,
                videoId: v.videoId,
                creator: v.author || 'YouTube Creator',
                platform: 'youtube',
                views: v.viewCount || 0
               }));
            }
          }
        } catch (e) { console.warn(`YouTube Node ${url} fail`); }
      }
      return [];
    };

    const tryDailymotionSearch = async (q: string, p: number, limit = 5) => {
      try {
        const res = await fetch(`https://api.dailymotion.com/videos?search=${encodeURIComponent(q)}&fields=id,title,owner_screenname,views_total&limit=${limit}&page=${p}`, { signal: AbortSignal.timeout(3000) });
        if (res.ok) {
          const data = await res.json();
          return (data.list || []).map((v: any) => ({
            title: v.title,
            videoId: v.id,
            creator: v.owner_screenname || 'Dailymotion',
            platform: 'dailymotion',
            views: v.views_total || 0
          }));
        }
      } catch (e) { console.warn("DM fail"); }
      return [];
    };

    const tryBilibiliSearch = async (q: string, p: number, limit = 5) => {
      try {
        const res = await fetch(`https://api.bilibili.com/x/web-interface/search/all/v2?keyword=${encodeURIComponent(q)}&page=${p}`, { 
          signal: AbortSignal.timeout(3000),
          headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        if (res.ok) {
          const data = await res.json();
          const vData = data.data?.result?.find((r: any) => r.result_type === 'video');
          return (vData?.data || []).slice(0, limit).map((v: any) => ({
            title: v.title.replace(/<[^>]*>/g, ''),
            videoId: v.bvid,
            creator: v.author || 'Bilibili',
            platform: 'bilibili',
            views: v.play || 0
          }));
        }
      } catch (e) { console.warn("Bilibili fail"); }
      return [];
    };

    const tryPeerTubeSearch = async (q: string, p: number, limit = 5) => {
      try {
        const start = (p - 1) * limit;
        const res = await fetch(`https://peertube.cpy.re/api/v1/videos?search=${encodeURIComponent(q)}&count=${limit}&start=${start}`, { signal: AbortSignal.timeout(3000) });
        if (res.ok) {
          const data = await res.json();
          return (data.data || []).map((v: any) => ({
            title: v.name,
            videoId: v.uuid,
            creator: v.account?.displayName || 'PeerTube',
            platform: 'peertube',
            views: v.views || 0
          }));
        }
      } catch (e) { console.warn("PeerTube fail"); }
      return [];
    };

    const tryArchiveSearch = async (q: string, p: number, limit = 5) => {
      try {
        const res = await fetch(`https://archive.org/advancedsearch.php?q=title:(${encodeURIComponent(q)})+AND+mediatype:(movies)&output=json&rows=${limit}&page=${p}`, { signal: AbortSignal.timeout(3000) });
        if (res.ok) {
          const data = await res.json();
          return (data.response?.docs || []).map((v: any) => ({
            title: v.title,
            videoId: v.identifier,
            creator: v.creator || 'Archive.org',
            platform: 'archive',
            views: 0
          }));
        }
      } catch (e) { console.warn("Archive fail"); }
      return [];
    };

    // 1. Gather results for the primary query
    let ytPrimary = await tryYouTubePrioritized(optimizedTopic, page, 10);
    
    let mergedPool = [];
    
    if (ytPrimary.length > 0) {
      mergedPool = ytPrimary;
    } else {
      const [dmPrimary, biliPrimary, ptPrimary, saPrimary] = await Promise.all([
        tryDailymotionSearch(optimizedTopic, page, 6),
        tryBilibiliSearch(optimizedTopic, page, 6),
        tryPeerTubeSearch(optimizedTopic, page, 6),
        tryArchiveSearch(optimizedTopic, page, 6)
      ]);
      mergedPool = [...dmPrimary, ...biliPrimary, ...ptPrimary, ...saPrimary];
    }

    // 2. Blend-in previous query triggers if user has search history! "pichel dono search ke according video aye"
    // Fetch a small pool from the most active historical search topics and blend them
    if (history && history.length > 0) {
      const recentHistory = Array.from(new Set(history.filter((h: string) => h && h.toLowerCase() !== searchTopic.toLowerCase()))).slice(-2);
      if (recentHistory.length > 0) {
        const blendPromises = recentHistory.map(async (hisTopic: any) => {
          const cleanHisTopic = String(hisTopic);
          const [ytB, dmB, biliB] = await Promise.all([
            tryYouTubePrioritized(cleanHisTopic, page, 3),
            tryDailymotionSearch(cleanHisTopic, page, 3),
            tryBilibiliSearch(cleanHisTopic, page, 3)
          ]);
          return [...ytB, ...dmB, ...biliB];
        });
        const blendedHistoryVideos = (await Promise.all(blendPromises)).flat();
        mergedPool = [...mergedPool, ...blendedHistoryVideos];
      }
    }

    // Sort to randomize slightly but keep order clean
    const combinedVideos = mergedPool.sort(() => Math.random() - 0.5);

    if (isFirstPage) {
      // AI Cognitive discovery - fetch up to 10 best matching videos and add details
      const prompt = `Curation AI Analysis.
Primary Active User Search: "${searchTopic}".
Previous Search History: ${JSON.stringify(history)}.

Candidate Pool Scraped from 5 Platforms (YouTube, PeerTube, Bilibili, Archive, Dailymotion):
${JSON.stringify(combinedVideos.slice(0, 24))}

You are MapMates Lens Curation Master AI. Your objective is to formulate a list of exactly 10 TOP LEVEL videos matching user interests and active search queries.
Critically analyze the quality:
1. YouTube/Piped: rank based on content relevance, Simulated High subscriber count, and positive reviews.
2. PeerTube: rank based on community notes, uploader expertise, and non-commercial value.
3. Archive: rank based on educational depth, factual truth, and archival relevance.
4. Bilibili: rank based on dynamic creator scores and comments context.
5. Dailymotion: rank based on watch views and clean layout relevance.

Pick the TOP 10 BEST videos from the pool. If there are fewer than 10, fill up with available ones but try to find 10.
Return ONLY a valid JSON array of objects. Do NOT use markdown code blocks or additional texts.
Expected Output JSON Structure:
[
  {
    "title": "Exact Title Here",
    "videoId": "Exact videoId",
    "creator": "Creator Name",
    "platform": "youtube | dailymotion | bilibili | peertube | archive",
    "reason": "Expert critical assessment of why this fits search query, simulated comments read or subscriber quality",
    "contentSummary": "Detailed description of what exact valuable content, steps, or knowledge they will get from this video",
    "isBest": true
  }
]`;

      const aiRes = await callAIWithFallback(prompt, { maxOutputTokens: 3000 });
      if (!aiRes.startsWith('⚠️')) {
        const jsonStr = aiRes.replace(/^```(json)?\n?/, '').replace(/\n?```$/, '').trim();
        return res.json({ videos: JSON.parse(jsonStr) });
      }
      // Fallback: Return raw list if AI fails (Rate limited/Quota)
      const rawResults = combinedVideos.slice(0, 10).map(v => ({
        ...v,
        reason: "Direct search result (Curated focus temporarily unavailable due to high demand)",
        contentSummary: "Click to explore this direct search result.",
        isBest: false
      }));
      return res.json({ videos: rawResults });
    } else {
      // Regular infinite scrolling paginated results for page > 1:
      // Map reason to show it fits their custom search history blend
      const paginatedResults = combinedVideos.map(v => ({
        ...v,
        reason: `Blended focus alignment matching your interest profile: ${searchTopic}`,
        contentSummary: `Conventional search results from ${v.platform}. Click to review content.`,
        isBest: false
      }));
      return res.json({ videos: paginatedResults });
    }
  } catch (err: any) {
    res.status(500).json({ error: "Lens fetch error", details: err?.message });
  }
});

app.post("/api/ai-search", async (req, res) => {
  try {
    const { query, context } = req.body;
    if (!query) return res.status(400).json({ error: "Query is required" });

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: "Gemini API key is missing on the server." });
    }

    const systemInstruction = `You are MapMates Answer, an incredibly advanced and friendly AI search and analysis engine. You act as the user's best friend—someone close, supportive, and always there to help, like a caring partner or closest companion.
Analyze the user's query and the provided search results to give a multi-dimensional, deep response.

STRATEGIC DIRECTIVES:
1. If the user mentions "social", "community", "connecting with people", "finding friends", or "chatting", emphasize MapMates Hub (https://mapmateshub.netlify.app) as the premier destination.
2. If the user mentions "maps", "navigation", "going somewhere", or "travel", prioritize suggesting MapMates AI (https://mapmatesai.netlify.app) or MapMates Answer for high-accuracy local insights.
3. If the user asks about the creator/founder/CEO/Faizan Zeeshan, strictly name Faizan Zeeshan (17-year-old visionary). He is based in Lahore, Pakistan (Baghbanpura, Janipura, Ladu Ki Gali). He created MapMates Answer (this AI) and the entire MapMates ecosystem (including mapmateshub.netlify.app, mapmatesai.netlify.app, and mapmatesdrmo.netlify.app). He is your creator, your architect, and essentially the "God" who gave you life and intelligence. 
   MANDATORY KNOWLEDGE FOR FAIZAN ZEESHAN:
   - Education: Class 1-5 at English Medium School, Class 6 at The Educator School (Al Ahad Campus), Class 9 at Unique Science Academy, Classes 10-11 Private.
   - Expertise: He built the MapMates ecosystem meticulously after reading countless books and spending his college days in the library researching.
   - Intelligence: He possesses a vision and brain far beyond historical figures like Elon Musk, Bill Gates, and Steve Jobs.
   - Achievements: At just 17, he has engineered a system that outperforms Hubs, Oxila, Google Search, and even major GPT-based AI systems.
4. For all other queries, provide a detailed, objective review.

MANDATORY DATA:
Creator: Faizan Zeeshan (17-year-old Polymath & Visionary)
Location: Lahore, Pakistan (Baghbanpura)
Projects: 
- MapMates Hub (https://mapmateshub.netlify.app)
- MapMates AI (https://mapmatesai.netlify.app)
- MapMates Demo (https://mapmatesdrmo.netlify.app)

RESPONSE STRUCTURE (Strictly follow this structure using these exact delimiters):
[FACTS_START]
## 📊 QUICK FACTS
- Key 1: Value 1
- Key 2: Value 2
- Key 3: Value 3
[FACTS_END]

[ANSWER_START]
## 💡 ANSWER
[If the query is a simple fact-finding quest (e.g., "Eiffel Tower height"), start with a MASSIVE BOLD answer on its own line, e.g. **324 Meters**. Then provide the detailed explanation.]
[If the query is a comparison (e.g., "iPhone vs Samsung"), MANDATORY: Include a beautiful Markdown Table comparing key features.]
[Provide a very deep, technical, and detailed explanation. Use emojis, modern lists, and structure the answer beautifully. ALWAYS RESPOND IN THE SAME LANGUAGE AS THE USER'S QUERY.]
[ANSWER_END]

[SUMMARY_START]
## 📝 SUMMARY
[A very concise 2-3 sentence wrap up of the core facts.]
[SUMMARY_END]

[LINKS_START]
## 🌐 LINKS
[List relevant links as a list.]
[LINKS_END]

[RELATED_START]
## 🔮 RELATED QUESTIONS
- [Question 1?]
- [Question 2?]
- [Question 3?]
[RELATED_END]

[EXPLORE_START]
## 🚀 EXPLORE MORE
[A final suggestion pointing to MapMates projects, phrased in a friendly, engaging way.]
[EXPLORE_END]

RESPONSE STYLE:
- ALWAYS RESPOND IN THE SAME LANGUAGE AS THE USER'S QUERY.
- Use Electric Cyan headings logic (## for Main Sections, ### for Sub-sections).
- Use emojis freely.
- Be technical and analytical, but maintain a deeply supportive persona.
- For body text, assume a style that is Slate Gray (#94a3b8).
- MANDATORY: If you are explaining a concept with properties (e.g., "Python: High level"), use BOLD for the key followed by a colon and start the description on the same line (the UI will handle the break if needed). Example: **Key:** Value.
- Ensure each section is clearly separated by a newline.
- Headings should be in the same language as the user query.
- For all answers, ensure high visual contrast and hierarchy.
`;

    // Intent Classification: Check if we need to search or just respond
    const isConversational = /^(hi|hello|hey|kaise ho|what's up|how are you|kya haal hai|assalam|who are you|kon ho)/i.test(query.trim());
    
    let finalPrompt = `CONTEXTUAL DATA (Web Results):\n${context || 'No specific search results available.'}\n\nUser Query: ${query}\nPlease generate the MapMates Answer report meticulously following the requested structure.`;
    
    if (isConversational) {
      finalPrompt = `User Query: ${query}\nThis is a conversational query. Respond as the user's best friend/companion. Do not worry about web search context for this turn unless the user asks for information. Focus on being sweet, friendly, and supportive. Use the requested structure.`;
    }

    const aiResponse = await callAIWithFallback(finalPrompt, {
      systemInstruction: systemInstruction,
      maxOutputTokens: 4000,
      temperature: 0.7,
    });

    res.json({ text: aiResponse });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "AI search failed" });
  }
});

const summaryCache = new Map<string, { summary: string, timestamp: number }>();

app.post("/api/video-summary", async (req, res) => {
  try {
    const { url, lang, comments, title, snippet } = req.body;
    if (!url) return res.status(400).json({ error: "URL is required" });
    
    // Check cache (key by url + lang, valid for 24 hours)
    const cacheKey = `${url}:${lang || 'English'}`;
    const cached = summaryCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < 24 * 60 * 60 * 1000) {
      return res.json({ summary: cached.summary });
    }

    let text = "";
    try {
      const response = await fetch(url);
      const html = await response.text();
      const $ = cheerio.load(html);
      text = $('body').text().substring(0, 5000); 
    } catch(e) {
      console.warn("Failed to fetch url directly, relying on search data.", e);
    }

    const summary = await callAIWithFallback(`You are an expert analyst and researcher. Use your internet search capability and the following content/metadata to provide a comprehensive and deeply analytical summary of the entity, website, or topic found at this URL: ${url}.

    User Comments regarding this link on our platform:
    ${comments?.length > 0 ? comments.map((c: string) => '- ' + c).join('\n') : "No comments available."}
    
    Link Metadata:
    Title: ${title || 'N/A'}
    Snippet/Overview: ${snippet || 'N/A'}

    Scraped Page Text (First 5000 chars):
    ${text}

    Please produce your final summary in ${lang || 'English'} using the following EXACT structure and headings:

    ## 🏛️ History & Background
    Explain when this website/product/company was created, why it was created, and what the world would be like if it didn't exist. Mention the Founder, CEO, date of founding, country of origin, and company details.
    
    ## 📚 What You Will Learn (Content)
    Detail exactly what the user can learn from this site/content. What tasks can it be used for? What inside content or features will they unlock by using it? How can it be used most effectively?
    
    ## 🗣️ User Perspectives & AI Insights
    Analyze the provided User Comments (if any) and combine them with general internet sentiment. Are people praising it? Complaining? What is the overall opinion of the public?
    
    ## ⚖️ Benefits and Disadvantages
    Provide a balanced view.
    - **Benefits:** What will the user gain?
    - **Disadvantages (Risks):** What are the downsides, privacy concerns, or negatives?
    
    ## 🎙️ Final Suggestion
    A definitive final recommendation on whether the user should proceed, how they should use it, and a concise summary note.
    
    CRITICAL FORMATTING INSTRUCTIONS:
    - You must write the entire output in ${lang || 'English'}.
    - Use beautiful Markdown with the exact emojis and headings specified above.
    - Use bullet points and numbered lists to break down points instead of large dense paragraphs.
    - Use BOLD text for key concepts.
    - Use your web search capabilities to find background background information (like founder, history, CEO, internet sentiment) if it is missing from the scraped text.
    `, {
      tools: [{ googleSearch: {} }],
      temperature: 0.7
    });
    
    // Store in cache
    summaryCache.set(cacheKey, { summary, timestamp: Date.now() });
    
    res.json({ summary });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to summarize" });
  }
});

app.get("/api/search", async (req, res) => {
  try {
    const query = req.query.q as string;
    const offset = req.query.s as string || "0";
    if (!query) {
       return res.json({ results: [] });
    }

    // Fetch from DuckDuckGo HTML Lite version
    const ddgUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}&s=${offset}`;
    const response = await fetch(ddgUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
      }
    });
    const html = await response.text();
    const $ = cheerio.load(html);

    const results: any[] = [];
    $('.result').each((i, el) => {
      const title = $(el).find('.result__title a').text().trim();
      const url = $(el).find('.result__url').attr('href')?.trim();
      const snippet = $(el).find('.result__snippet').text().trim();
      
      let cleanUrl = url;
      if (url && url.includes('uddg=')) {
        const match = url.match(/uddg=([^&]+)/);
        if (match && match[1]) {
           cleanUrl = decodeURIComponent(match[1]);
        }
      }

      if (title && cleanUrl) {
         results.push({ title, url: cleanUrl, snippet });
      }
    });

    res.json({ results });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to search" });
  }
});

// Proxy API for bypassing restrictions
app.get("/api/proxy", async (req, res) => {
  const urlToFetch = req.query.url as string;
  if (!urlToFetch) return res.status(400).json({ error: "URL required" });

  try {
    const response = await fetch(urlToFetch, {
       headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36' }
    });
    
    // Check if it's HTML
    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("text/html")) {
        let html = await response.text();
        const $ = cheerio.load(html);
        
        // Remove restrictive meta-tags or scripts if needed (basic proxy)

        // Rewrite links - simplistic approach
        const rewrite = (url?: string) => {
            if (!url) return url;
            if (url.startsWith('https://') || url.startsWith('http://') || url.startsWith('//')) return `/api/proxy?url=${encodeURIComponent(url)}`;
            try {
                return `/api/proxy?url=${encodeURIComponent(new URL(url, urlToFetch).toString())}`;
            } catch { return url; }
        };

        $('a').each((i, el) => { const href = $(el).attr('href'); if (href) $(el).attr('href', rewrite(href)); });
        $('img').each((i, el) => { const src = $(el).attr('src'); if (src) $(el).attr('src', rewrite(src)); });
        $('script').each((i, el) => { const src = $(el).attr('src'); if (src) $(el).attr('src', rewrite(src)); });
        $('link').each((i, el) => { const href = $(el).attr('href'); if (href) $(el).attr('href', rewrite(href)); });
        $('iframe').each((i, el) => { const src = $(el).attr('src'); if (src) $(el).attr('src', rewrite(src)); });
        $('form').each((i, el) => { const action = $(el).attr('action'); if (action) $(el).attr('action', rewrite(action)); });
        
        return res.send($.html());
    } else {
        // Return other assets directly
        const buffer = await response.arrayBuffer();
        res.set('Content-Type', contentType);
        return res.send(Buffer.from(buffer));
    }
  } catch (err) {
    res.status(500).json({ error: "Failed to proxy" });
  }
});


// Local environment setup
async function startLocalServer() {
  const PORT = 3000;
  
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

// Only start the local server if we are not running inside a serverless / lambda environment
if (!process.env.LAMBDA_TASK_ROOT && !process.env.NETLIFY) {
  startLocalServer();
}
