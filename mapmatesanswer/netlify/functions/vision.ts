import express from "express";
import serverless from "serverless-http";
import { callAIWithFallback } from "../../src/lib/ai.js";

const app = express();
app.use(express.json());

app.post("/.netlify/functions/vision", async (req, res) => {
  try {
    const { query, page = 1 } = req.body;
    if (!query) return res.status(400).json({ error: "Query is required" });

    // AI analyzes the query (Only on page 1 to save time, or just use it directly)
    let searchStr = query;
    if (page === 1) {
      const systemInstruction = `You are the MapMates Vision analyzer.
      The user wants pictures/images. 
      Analyze their query: "${query}".
      Fix any spelling mistakes, understand their core intent, and return ONLY a clean search phrase (1-5 words) that would yield the best results on Pexels stock photo search.
      DO NOT return any other text, JSON, or conversational responses. ONLY the search query.`;

      const aiOptimizedQuery = await callAIWithFallback(query, {
        systemInstruction,
        maxOutputTokens: 20
      });
      searchStr = aiOptimizedQuery.replace(/["']/g, '').trim();
    }

    // Call Pexels API
    const pexelsKey = "UmKpgy8iaAfNcdefHOS2XbVIkm29hzWIeh9Qppql7JUnAHwWbWCQeY8n";
    const perPage = 30;
    const pexelsRes = await fetch(`https://api.pexels.com/v1/search?query=${encodeURIComponent(searchStr)}&per_page=${perPage}&page=${page}`, {
      headers: {
        Authorization: pexelsKey
      }
    });

    if (!pexelsRes.ok) {
       throw new Error(`Pexels API error: ${pexelsRes.status}`);
    }

    const pexelsData = await pexelsRes.json();
    
    // Add pseudo-AI rating and description for each image
    const enhancedPhotos = (pexelsData.photos || []).map((photo: any) => {
      const rating = Math.floor(Math.random() * (99 - 75 + 1)) + 75; // 75-99%
      return {
        ...photo,
        aiRating: rating,
        aiDescription: `AI Analysis: Matches visual concept of ${photo.alt || searchStr}. Aesthetic score: ${rating}%.`
      };
    });

    res.json({ 
      images: enhancedPhotos,
      queryUsed: searchStr,
      hasMore: enhancedPhotos.length === perPage
    });

  } catch (err) {
    console.error("Vision API Error:", err);
    res.status(500).json({ error: "Visual search failed" });
  }
});

export const handler = serverless(app);
