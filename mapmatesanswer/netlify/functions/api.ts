// Copy from server.ts and remove Vite stuff
import express from "express";
import serverless from "serverless-http";
import * as cheerio from 'cheerio';
import { callAIWithFallback } from "../../src/lib/ai.js";

const app = express();
app.use(express.json());

// Proxy API for bypassing restrictions
app.post("/generate-site", async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt) return res.status(400).json({ error: "Prompt is required" });
    const html = await callAIWithFallback(`You are an expert web developer. Generate a complete, single-file HTML document (containing HTML, inline CSS, and inline JavaScript) for the following request: "${prompt}". The output MUST be ONLY valid HTML code. Do NOT wrap it in markdown block quotes. Return just the raw HTML literal. Ensure the design is modern, mobile-responsive, and fully functional.`, { maxOutputTokens: 3000 });
    let htmlContent = html || "";
    htmlContent = htmlContent.replace(/^```(html)?\n?/, '').replace(/\n?```$/, '').trim();
    res.json({ html: htmlContent });
  } catch (err) { res.status(500).json({ error: "Failed to generate site" }); }
});

app.post("/insight-search", async (req, res) => {
  try {
    const { query } = req.body;
    let searchTopic = query || "What is the truth about AI taking over human jobs?";
    const prompt = `You are a deep truth and logic research AI. The user is asking about: "${searchTopic}". Search the internet (especially Reddit, Wikipedia, YouTube, News). Analyze facts vs fiction, opinions, and true reality. Think deeply and logically. Return ONLY a valid JSON object. Do NOT wrap it in markdown block quotes (no \`\`\`json). Format: { "truthPercentage": (number 0-100), "verdict": (string), "deepAnalysis": (string), "communityConsensus": (string), "fakeClaims": [(array of strings)], "sources": [(array of objects with "title" and "url")] }`;
    const aiRes = await callAIWithFallback(prompt, { maxOutputTokens: 2500, temperature: 0.5 });
    if (aiRes.startsWith('⚠️')) throw new Error(aiRes);
    let jsonStr = aiRes.replace(/^```(json)?\n?/, '').replace(/\n?```$/, '').trim();
    const data = JSON.parse(jsonStr);
    res.json({ insight: data });
  } catch (err: any) {
    console.error("Insight search error:", err?.message || err);
    res.status(500).json({ error: "Failed to analyze truth", details: err?.message });
  }
});

app.post("/news-search", async (req, res) => {
  try {
    const { query, location } = req.body;
    let searchTopic = query || "Top breaking local news and headlines today";
    const prompt = `You are an advanced AI Analyst for "MapMates News: Deep Truth". The user is asking about: "${searchTopic}". User Location: "${location}". Return ONLY a valid JSON array of objects. Do NOT wrap it in markdown block quotes. Each object must have: "headline", "channel", "summary", "truthPercentage", "truthAnalysis", "recommendation", "link".`;
    const aiRes = await callAIWithFallback(prompt, { maxOutputTokens: 3000 });
    if (aiRes.startsWith('⚠️')) throw new Error(aiRes);
    let jsonStr = aiRes.replace(/^```(json)?\n?/, '').replace(/\n?```$/, '').trim();
    const data = JSON.parse(jsonStr);
    res.json({ news: data });
  } catch (err: any) {
    console.error("News search error:", err?.message || err);
    res.status(500).json({ error: "Failed to fetch news", details: err?.message });
  }
});

app.post("/picks-search", async (req, res) => {
  try {
    const { query, location } = req.body;
    let searchTopic = query || "Best affordable smartwatch 2024";
    const prompt = `You are a shopping assistant for "MapMates Picks". The user is looking for a product: "${searchTopic}". Provide exactly 4 product options, ranked from 1 to 4. Return ONLY a valid JSON array of exactly 4 objects. Each object must have: "name", "platform", "price", "reason", "link".`;
    const aiRes = await callAIWithFallback(prompt, { maxOutputTokens: 2000 });
    if (aiRes.startsWith('⚠️')) throw new Error(aiRes);
    let jsonStr = aiRes.replace(/^```(json)?\n?/, '').replace(/\n?```$/, '').trim();
    const data = JSON.parse(jsonStr);
    res.json({ picks: data });
  } catch (err: any) {
    console.error("Picks search error:", err?.message || err);
    res.status(500).json({ error: "Failed to find products", details: err?.message });
  }
});



app.post("/lens-search", async (req, res) => {
  try {
    const { query, history = [], page = 1 } = req.body;
    const searchTopic = query || "Top trending facts";
    const optimizedTopic = searchTopic;
    const ytInstances = [
      `https://pipedapi.kavin.rocks/search?q=${encodeURIComponent(optimizedTopic)}&page=${page}&filter=videos`,
    ];
    let mergedPool: any[] = [];
    for (const url of ytInstances) {
      try {
        const res = await fetch(url, { signal: AbortSignal.timeout(3000), headers: { 'User-Agent': 'Mozilla/5.0' } });
        if (res.ok) {
          const data = await res.json();
          if (data?.items) {
             mergedPool = (data.items || []).slice(0, 10).map((v: any) => ({
                title: v.title,
                videoId: v.url.includes("v=") ? v.url.split("v=")[1] : v.url.split("/").pop(),
                creator: v.uploaderName || 'YouTube Creator',
                platform: 'youtube',
                views: v.views || 0,
                reason: "Direct search result",
                contentSummary: "Click to explore this direct search result.",
                isBest: false
             }));
          }
        }
      } catch (e: any) { console.warn(`YouTube Node ${url} fail: ${e.message}`); }
    }
    return res.json({ videos: mergedPool });
  } catch (err: any) {
    res.status(500).json({ error: "Lens fetch error", details: err?.message });
  }
});

export const handler = serverless(app);

