import { MongoClient } from "mongodb";
import { GoogleGenAI } from "@google/genai";
import { config } from "dotenv";

// Load environment variables
config({ path: ".env.local" });

const uri = process.env.MONGODB_URI || "mongodb://localhost:27017";
const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.error("No GEMINI_API_KEY found in .env.local!");
  process.exit(1);
}

const client = new MongoClient(uri);
const ai = new GoogleGenAI({ apiKey });

async function updateEmbeddings() {
  try {
    await client.connect();
    const db = client.db("retail_concierge");
    const collection = db.collection("products");

    // Fetch all products that don't have an embedding yet (or fetch all to overwrite)
    const products = await collection.find({}).toArray();
    console.log(`Found ${products.length} products. Generating embeddings...`);

    for (const product of products) {
      // Create a rich string to embed
      const textToEmbed = `${product.name}. ${product.description} Category: ${product.category}. Tags: ${product.tags.join(", ")}`;
      
      const response = await ai.models.embedContent({
        model: "gemini-embedding-2",
        contents: textToEmbed,
        config: { outputDimensionality: 768 }
      });

      const embedding = response.embeddings[0].values;

      await collection.updateOne(
        { _id: product._id },
        { $set: { embedding } }
      );
      console.log(`Updated ${product.name} with embedding.`);
    }

    console.log("All embeddings generated and saved successfully!");
  } catch (error) {
    console.error("Error generating embeddings:", error);
  } finally {
    await client.close();
  }
}

updateEmbeddings();
