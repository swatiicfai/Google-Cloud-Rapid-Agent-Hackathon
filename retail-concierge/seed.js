import { MongoClient } from "mongodb";
import { config } from "dotenv";
config({ path: ".env.local" });

// Replace with your MongoDB connection string
const uri = process.env.MONGODB_URI || "mongodb://localhost:27017";
const client = new MongoClient(uri);

async function seed() {
  try {
    await client.connect();
    const db = client.db("retail_concierge");
    const collection = db.collection("products");

    // Clear existing data
    await collection.deleteMany({});

    // Mock products
    const products = [
      {
        name: "Waterproof Hiking Jacket",
        description: "A durable, waterproof jacket perfect for hiking and outdoor activities in harsh weather.",
        price: 120.00,
        stock: 15,
        category: "Outerwear",
        tags: ["waterproof", "hiking", "jacket", "outdoor"]
      },
      {
        name: "Trail Running Shoes",
        description: "Lightweight trail running shoes with excellent grip and breathable mesh.",
        price: 85.00,
        stock: 32,
        category: "Footwear",
        tags: ["shoes", "running", "trail", "athletic"]
      },
      {
        name: "Insulated Water Bottle",
        description: "Stainless steel water bottle that keeps drinks cold for 24 hours.",
        price: 25.00,
        stock: 50,
        category: "Accessories",
        tags: ["water bottle", "insulated", "camping"]
      },
      {
        name: "Eco-Friendly Yoga Mat",
        description: "Non-slip, 6mm thick yoga mat made from sustainable natural rubber.",
        price: 45.00,
        stock: 20,
        category: "Fitness",
        tags: ["yoga", "mat", "exercise", "eco"]
      },
      {
        name: "Smart Fitness Tracker",
        description: "Water-resistant fitness tracker with heart rate monitor and sleep tracking.",
        price: 55.00,
        stock: 40,
        category: "Electronics",
        tags: ["tracker", "fitness", "watch", "smart"]
      },
      {
        name: "Spacious Gym Bag",
        description: "Durable gym bag with a separate shoe compartment and water-resistant finish.",
        price: 35.00,
        stock: 25,
        category: "Accessories",
        tags: ["bag", "gym", "duffel", "travel"]
      },
      {
        name: "2-Person Camping Tent",
        description: "Lightweight, easy-to-setup camping tent with waterproof rainfly.",
        price: 150.00,
        stock: 10,
        category: "Camping",
        tags: ["tent", "camping", "outdoor", "shelter"]
      },
      {
        name: "Noise-Cancelling Headphones",
        description: "Over-ear wireless headphones with active noise cancellation and 30-hour battery life.",
        price: 199.00,
        stock: 15,
        category: "Electronics",
        tags: ["headphones", "audio", "wireless", "music"]
      },
      {
        name: "Adjustable Dumbbell Set",
        description: "Space-saving adjustable dumbbells that go from 5 to 50 lbs.",
        price: 299.00,
        stock: 5,
        category: "Fitness",
        tags: ["weights", "dumbbells", "strength", "gym"]
      },
      {
        name: "Polarized Sunglasses",
        description: "Stylish polarized sunglasses offering 100% UV protection.",
        price: 65.00,
        stock: 30,
        category: "Accessories",
        tags: ["sunglasses", "eyewear", "summer", "uv"]
      }
    ];

    // In a real scenario, you'd generate vector embeddings for each product here using Gemini API
    // e.g., const embedding = await generateEmbedding(product.description);
    // product.embedding = embedding;

    await collection.insertMany(products);
    console.log("Database seeded successfully!");
  } finally {
    await client.close();
  }
}

seed().catch(console.dir);
