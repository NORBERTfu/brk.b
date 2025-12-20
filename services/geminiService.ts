
import { GoogleGenAI, Type } from "@google/genai";
import { BrkFinancialData } from "../types";

export const fetchLatestBrkData = async (): Promise<BrkFinancialData> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const prompt = `
    Find the absolute latest quarterly financial data for Berkshire Hathaway Inc. (BRK). 
    I need:
    1. Total Shareholder's Equity (Book Value) in millions of USD.
    2. Total outstanding Class A equivalent shares (latest share count).
    3. The current market price of BRK.B (Class B shares).
    
    Return the result in JSON format with fields: totalEquity (number in millions), totalAShares (number), currentPrice (number), and source (string).
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            totalEquity: { type: Type.NUMBER, description: "Total equity in millions" },
            totalAShares: { type: Type.NUMBER, description: "Total A shares count" },
            currentPrice: { type: Type.NUMBER, description: "Current price of BRK.B" },
            source: { type: Type.STRING, description: "Source link" }
          },
          required: ["totalEquity", "totalAShares", "currentPrice"]
        }
      },
    });

    const result = JSON.parse(response.text);
    return {
      totalEquity: result.totalEquity,
      totalAShares: result.totalAShares,
      currentPrice: result.currentPrice,
      lastUpdated: new Date().toLocaleDateString(),
      sourceUrl: result.source
    };
  } catch (error) {
    console.error("Failed to fetch data:", error);
    // Fallback to the latest data shown in the user's screenshots (2024 Q4)
    return {
      totalEquity: 649368,
      totalAShares: 1438223,
      currentPrice: 470, // Rough estimate, actual will vary
      lastUpdated: "2024-12-31 (Manual Fallback)",
      sourceUrl: "https://www.berkshirehathaway.com/"
    };
  }
};
