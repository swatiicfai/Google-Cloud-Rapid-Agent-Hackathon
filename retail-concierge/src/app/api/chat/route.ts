import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";
import { MongoClient } from "mongodb";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

const uri = process.env.MONGODB_URI || "mongodb://localhost:27017";
let cachedClient: MongoClient | null = null;

async function getMongoClient() {
  if (cachedClient) return cachedClient;
  cachedClient = new MongoClient(uri);
  await cachedClient.connect();
  return cachedClient;
}

export async function POST(req: Request) {
  try {
    const { messages, image } = await req.json();

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY is not set." },
        { status: 500 }
      );
    }

    const lastMessage = messages[messages.length - 1];
    let searchContent = lastMessage.content;
    let imagePart: any = null;

    if (image) {
      const mimeType = image.split(';')[0].split(':')[1];
      const base64Data = image.split(',')[1];
      
      imagePart = {
        inlineData: {
          data: base64Data,
          mimeType
        }
      };

      // Get description for embedding search
      try {
        const descResponse = await ai.models.generateContent({
          model: "gemini-2.5-flash-lite",
          contents: [
            {
              role: "user",
              parts: [
                imagePart,
                { text: "Describe the main retail product in this image in one concise sentence so it can be searched in our database." }
              ]
            }
          ]
        });
        searchContent = (descResponse.text || "") + " " + searchContent;
      } catch (err) {
        console.error("Image description error", err);
      }
    }

    // 1. Generate an embedding for the user's query
    const embeddingResponse = await ai.models.embedContent({
      model: "gemini-embedding-2",
      contents: searchContent,
      config: { outputDimensionality: 768 }
    });
    const queryVector = embeddingResponse.embeddings?.[0]?.values;
    if (!queryVector) {
      throw new Error("Failed to generate embedding");
    }

    // 2. Perform Vector Search in MongoDB
    const client = await getMongoClient();
    const db = client.db("retail_concierge");
    const collection = db.collection("products");

    const searchResults = await collection.aggregate([
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
          "embedding": 0,
          "score": { "$meta": "vectorSearchScore" }
        }
      }
    ]).toArray();

    // 3. Construct context for Gemini
    const contextStr = searchResults.map((p, i) =>
      `[${i+1}] **${p.name}** — $${p.price?.toFixed(2)} (${p.category})
   ${p.description}
   Stock: ${p.stock} units | Tags: ${(p.tags||[]).join(", ")}`
    ).join("\n\n");

    const systemInstruction = `You are a premium real-time retail concierge powered by MongoDB Atlas Vector Search and Google Gemini. You help shoppers find the perfect products with personalized recommendations.

Guidelines:
- Respond in clean **markdown**: use **bold** for product names, bullet points for features, and keep responses concise but warm.
- Reference the matched products naturally (don't just list them robotically).
- If the user uploads an image, acknowledge what you see and find matches.
- Mention prices and key features when recommending.
- If no products match well, suggest what the user might search for instead.

Relevant Products from Catalog (MongoDB Vector Search results):
${contextStr || 'No specific products matched — answer generally and suggest search terms.'}`;

    // Construct history, ensuring it starts with a user message (skip initial assistant greeting)
    const historyItems = [];
    for (let i = 0; i < messages.length - 1; i++) {
      const m = messages[i];
      if (historyItems.length === 0 && m.role !== "user") continue;
      historyItems.push({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }]
      });
    }

    // Model priority list: lite first (highest free-tier quota), then escalate
    const modelFallbacks = [
      "gemini-2.5-flash-lite",
      "gemini-2.5-flash",
      "gemini-2.0-flash",
    ];

    // Construct the payload for sendMessage
    const messagePayload = imagePart 
      ? [imagePart, lastMessage.content]
      : lastMessage.content;

    // Try each model in order until one succeeds
    let response;
    for (const modelName of modelFallbacks) {
      try {
        console.log(`Trying model: ${modelName}`);
        const chat = ai.chats.create({
          model: modelName,
          history: historyItems,
          config: { systemInstruction }
        });
        response = await chat.sendMessage({ message: messagePayload as any });
        console.log(`Success with model: ${modelName}`);
        break;
      } catch (err: any) {
        console.error(`Model ${modelName} failed:`, err.status, err.message?.slice(0, 120));
        if (err.status === 429 || err.status === 503 || err.status === 400) { // Also catching 400 occasionally thrown for overloaded free tier
          // Try the next model
          continue;
        }
        throw err; // Other errors are fatal
      }
    }

    if (!response) {
      // If we completely run out of quota on all models, use a graceful fallback
      // so the hackathon demo can still proceed smoothly.
      console.log("All models exhausted — using graceful fallback.");
      return NextResponse.json({
        role: "assistant",
        content: "I found some great matches for you based on your request! (Note: Live AI generation is currently rate-limited, but here are the products from our catalog).",
        products: searchResults,
        modelUsed: "mock-fallback (Rate Limit Exceeded)"
      });
    }

    return NextResponse.json({
      role: "assistant",
      content: response.text,
      products: searchResults,
      modelUsed: response.modelVersion || "gemini-2.5-flash-lite"
    });
  } catch (error: any) {
    console.error("Chat API Error:", error);
    const userMessage = error.status === 429
      ? "Rate limit reached on all models. Please wait a minute and try again."
      : error.status === 404
      ? `Model not found: ${error.message}`
      : error.message || "Unknown error";
    return NextResponse.json({ error: userMessage, status: error.status }, { status: error.status || 500 });
  }
}
