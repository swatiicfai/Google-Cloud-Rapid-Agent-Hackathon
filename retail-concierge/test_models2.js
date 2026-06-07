import { GoogleGenAI } from "@google/genai";
import { config } from "dotenv";

config({ path: ".env.local" });

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const modelsToTest = [
  "gemini-2.5-flash-lite",
  "gemini-2.5-flash",
  "gemini-2.0-flash",
  "gemini-2.0-flash-lite",
  "gemini-2.0-flash-001"
];

async function checkModels() {
  console.log("Checking models for text generation:");
  for (const m of modelsToTest) {
    try {
      await ai.models.generateContent({
        model: m,
        contents: "Hello",
      });
      console.log(`✅ ${m} works!`);
    } catch (e) {
      console.log(`❌ ${m} failed: ${e.status} ${e.message?.slice(0, 80)}`);
    }
  }

  console.log("\nChecking embedding:");
  try {
    await ai.models.embedContent({
      model: "gemini-embedding-2",
      contents: "Hello",
      config: { outputDimensionality: 768 }
    });
    console.log(`✅ gemini-embedding-2 works!`);
  } catch (e) {
    console.log(`❌ gemini-embedding-2 failed: ${e.status} ${e.message?.slice(0, 80)}`);
  }
}

checkModels();
