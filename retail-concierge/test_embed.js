import { GoogleGenAI } from "@google/genai";
import { config } from "dotenv";

config({ path: ".env.local" });

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Test all generative models from the list to find one that works
const modelsToTest = [
  "gemini-2.5-flash-lite",
  "gemini-2.0-flash-lite",
  "gemini-2.0-flash-lite-001",
  "gemini-2.5-flash",
  "gemini-2.0-flash",
  "gemini-2.0-flash-001",
];

async function findWorkingModel() {
  for (const model of modelsToTest) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: "Say: OK"
      });
      console.log(`✅ ${model} works! Response: ${response.text?.slice(0,50)}`);
      return model;
    } catch (e) {
      const retry = e.message?.match(/retry in (\d+)/)?.[1];
      console.log(`❌ ${model}: ${e.status} ${retry ? `(retry in ${retry}s)` : e.message?.slice(0, 80)}`);
    }
  }
  console.log("No working model found.");
}

findWorkingModel();
