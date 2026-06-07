import { MongoClient } from "mongodb";
import { GoogleGenAI } from "@google/genai";
import { config } from "dotenv";

config({ path: ".env.local" });

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const client = new MongoClient(process.env.MONGODB_URI);

async function run() {
  await client.connect();
  const db = client.db("retail_concierge");
  const collection = db.collection("products");

  const queries = ["I need a water bottle", "shoes for hiking", "[Image uploaded] "];

  for (const q of queries) {
    console.log(`\nQuery: "${q}"`);
    const embeddingResponse = await ai.models.embedContent({
      model: "gemini-embedding-2",
      contents: q,
      config: { outputDimensionality: 768 } // Wait, did seed.js use 768?
    });
    
    const queryVector = embeddingResponse.embeddings[0].values;

    const results = await collection.aggregate([
      {
        "$vectorSearch": {
          "index": "vector_index",
          "path": "embedding",
          "queryVector": queryVector,
          "exact": true,
          "limit": 3
        }
      },
      {
        "$project": {
          "_id": 0,
          "name": 1,
          "score": { "$meta": "vectorSearchScore" }
        }
      }
    ]).toArray();
    
    console.log(results);
  }
  await client.close();
}

run().catch(console.error);
