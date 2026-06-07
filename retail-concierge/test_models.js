import { GoogleGenAI } from "@google/genai";
import { config } from "dotenv";
config({ path: ".env.local" });

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function run() {
  const models = await ai.models.list();
  for await (const model of models) {
    if (model.name.includes('gemini')) {
      console.log(model.name);
    }
  }
}
run().catch(console.error);
