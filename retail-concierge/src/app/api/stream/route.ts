import { NextResponse } from 'next/server';
import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI || "mongodb://localhost:27017";

// We use a global variable to reuse the client across API routes in dev
let client: MongoClient | null = null;

async function getClient() {
  if (!client) {
    client = new MongoClient(uri);
    await client.connect();
  }
  return client;
}

export async function GET(req: Request) {
  const encoder = new TextEncoder();
  
  const customReadable = new ReadableStream({
    async start(controller) {
      try {
        const dbClient = await getClient();
        const db = dbClient.db("retail_concierge");
        const collection = db.collection("products");

        // Open a change stream on the products collection
        // In a real scenario, you'd filter for updates or inserts
        const changeStream = collection.watch();

        // Send an initial connected message
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'connected' })}\n\n`));

        changeStream.on('change', (change) => {
          // Push the change event to the client via SSE
          const data = JSON.stringify({ type: 'change', change });
          controller.enqueue(encoder.encode(`data: ${data}\n\n`));
        });

        // Handle disconnects
        req.signal.addEventListener('abort', () => {
          changeStream.close();
          console.log("Client disconnected, closed change stream.");
        });

      } catch (err) {
        console.error("Change stream error:", err);
        controller.error(err);
      }
    }
  });

  return new NextResponse(customReadable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
    },
  });
}
