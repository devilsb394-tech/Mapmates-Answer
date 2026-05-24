import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "dummy" });
const aiCache = new Map<string, { result: string, timestamp: number }>();

export async function callAIWithFallback(contents: string, config?: any) {
  const geminiModels = ['gemini-3.5-flash', 'gemini-3.1-pro-preview', 'gemini-3.1-flash-lite'];
  let lastGeminiError = "";
  
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
      
      if (errorMsg.includes("429") || errorMsg.includes("quota") || errorMsg.includes("RESOURCE_EXHAUSTED")) {
        lastGeminiError = "API Quota Exceeded";
        continue;
      }
    }
  }

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
