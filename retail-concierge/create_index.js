import { MongoClient } from "mongodb";
import { config } from "dotenv";

config({ path: ".env.local" });

const uri = process.env.MONGODB_URI;

async function run() {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db("retail_concierge");
    const collection = db.collection("products");

    console.log("Creating Vector Search Index...");
    await collection.createSearchIndex({
      name: "vector_index",
      type: "vectorSearch",
      definition: {
        "fields": [
          {
            "type": "vector",
            "path": "embedding",
            "numDimensions": 768,
            "similarity": "cosine"
          }
        ]
      }
    });
    console.log("Vector index creation initiated successfully!");
  } catch (err) {
    console.error(err);
  } finally {
    await client.close();
  }
}
run();
