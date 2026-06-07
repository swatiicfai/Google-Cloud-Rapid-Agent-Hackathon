import { GoogleGenAI } from "@google/genai";
import { config } from "dotenv";

config({ path: ".env.local" });

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function checkModels() {
  const modelsToTest = [
    "gemini-1.5-flash",
    "gemini-1.5-flash-latest",
    "gemini-1.5-flash-002",
    "gemini-1.5-pro",
    "gemini-2.0-flash-exp",
    "gemini-2.5-flash",
    "gemini-2.5-flash-exp"
  ];

  for (const m of modelsToTest) {
    try {
      await ai.models.generateContent({
        model: m,
        contents: "Hello",
      });
      console.log(`✅ ${m} works!`);
    } catch (e) {
      console.log(`❌ ${m} failed: ${e.status} ${e.message}`);
    }
  }
}

checkModels();
