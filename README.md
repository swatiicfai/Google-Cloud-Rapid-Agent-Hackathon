# Real-Time Retail Concierge

An AI-powered retail assistant built for the **Google Cloud Rapid Agent Hackathon: Building Agents for Real-World Challenges**. 

* **Live Demo:** [https://retail-concierge-262035403755.us-central1.run.app](https://retail-concierge-262035403755.us-central1.run.app)
* **Partner Track:** MongoDB

## 💡 Inspiration
With the massive shift towards digital shopping, brick-and-mortar retail often struggles to provide the same level of instant, personalized search. We wanted to build an agent that brings the digital concierge experience into the physical retail world—helping shoppers find exactly what they need, even if they only have a photo of it.

## ⚙️ What it does
The Retail Concierge is a real-time, multimodal AI agent that helps shoppers find products in a store catalog.
- **Multimodal Search:** Users can type what they are looking for or upload a photo of a product.
- **Semantic Matching:** Using Gemini embeddings and MongoDB Vector Search, it finds the most relevant products instantly based on deep semantic meaning, not just keyword matching.
- **Interactive Chat:** The agent converses naturally with the user, referencing live prices, features, and inventory stock before allowing them to add items directly to their cart.

## 🛠️ How we built it
- **Frontend & Backend:** Next.js (React)
- **AI Brain & Embeddings:** Google Gemini (Gemini 2.5 Flash / Flash-Lite, and `gemini-embedding-2`)
- **Vector Database (Partner Tech):** MongoDB Atlas Vector Search
- **Deployment:** Google Cloud Run

We generated product embeddings using Google Gemini's embedding model and stored them in MongoDB Atlas. When a user queries the app or uploads an image, the backend uses Gemini to describe the image, generates an embedding for the search context, and performs a `$vectorSearch` aggregation against our MongoDB products collection. Finally, Gemini 2.5 Flash is fed the search results as context to power the conversational interface.

## 🧠 Challenges we ran into
- **Multimodal Context:** Getting the AI to perfectly blend an uploaded image with a text query required an intermediate step where Gemini first described the image before we vectorized the description.
- **Deployment Permissions:** We had to configure the correct IAM permissions for Google Cloud Build to properly access our storage buckets and deploy the container to Cloud Run.

## 🏆 Accomplishments that we're proud of
- Seamlessly integrating MongoDB Vector Search with Google Gemini's latest embedding models to return sub-second search results.
- Successfully deploying a polished, production-ready application to Google Cloud Run.

## 📚 What we learned
We learned how incredibly powerful combining **MongoDB Atlas Vector Search** with **Google Gemini** can be for building agents. The ability to retrieve precise catalog data and feed it to a reasoning engine completely changes how we can build user experiences.

## 🚀 What's next for Retail Concierge
- **In-Store Navigation:** Integrating indoor mapping so the agent can tell the user exactly which aisle the product is located in.
- **Voice Interface:** Adding speech-to-text so users can talk to the concierge hands-free.

---

### Local Setup Instructions
1. Clone the repository
2. Run `npm install`
3. Add your `GEMINI_API_KEY` and `MONGODB_URI` to `.env.local`.
4. Run `npm run dev` and navigate to `http://localhost:3000`.
