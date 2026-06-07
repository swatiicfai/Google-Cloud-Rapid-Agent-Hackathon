"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Send, Image as ImageIcon, Store, Zap, ShoppingCart, Package } from "lucide-react";

// ── Lightweight markdown renderer ──────────────────────────────────────────
function renderMarkdown(text: string): React.ReactNode[] {
  const lines = text.split("\n");
  const nodes: React.ReactNode[] = [];
  let listItems: React.ReactNode[] = [];
  let orderedItems: React.ReactNode[] = [];

  const flushList = () => {
    if (listItems.length > 0) {
      nodes.push(<ul key={`ul-${nodes.length}`}>{listItems}</ul>);
      listItems = [];
    }
    if (orderedItems.length > 0) {
      nodes.push(<ol key={`ol-${nodes.length}`}>{orderedItems}</ol>);
      orderedItems = [];
    }
  };

  const inlineStyle = (s: string): React.ReactNode => {
    const parts = s.split(/(\*\*.*?\*\*|\*.*?\*|`.*?`)/g);
    return parts.map((p, i) => {
      if (p.startsWith("**") && p.endsWith("**"))
        return <strong key={i}>{p.slice(2, -2)}</strong>;
      if (p.startsWith("*") && p.endsWith("*"))
        return <em key={i}>{p.slice(1, -1)}</em>;
      if (p.startsWith("`") && p.endsWith("`"))
        return <code key={i}>{p.slice(1, -1)}</code>;
      return p;
    });
  };

  lines.forEach((line, i) => {
    const ulMatch = line.match(/^[\-\*] (.+)/);
    const olMatch = line.match(/^\d+\. (.+)/);

    if (ulMatch) {
      flushList();
      listItems.push(<li key={i}>{inlineStyle(ulMatch[1])}</li>);
    } else if (olMatch) {
      flushList();
      orderedItems.push(<li key={i}>{inlineStyle(olMatch[1])}</li>);
    } else {
      flushList();
      if (line.trim() === "") {
        // skip blank spacer between paragraphs
      } else {
        nodes.push(<p key={i}>{inlineStyle(line)}</p>);
      }
    }
  });
  flushList();
  return nodes;
}

// ── Score color helper ──────────────────────────────────────────────────────
function getScoreColor(score: number): string {
  if (score >= 0.75) return "var(--score-high)";
  if (score >= 0.5)  return "var(--score-mid)";
  return "var(--score-low)";
}

function getStockBadge(stock: number) {
  if (stock > 10) return { label: "In Stock", cls: "in-stock" };
  if (stock > 0)  return { label: "Low Stock", cls: "low-stock" };
  return { label: "Out of Stock", cls: "out-of-stock" };
}

// ── Types ───────────────────────────────────────────────────────────────────
interface Message {
  role: "user" | "assistant";
  content: string;
  imageThumb?: string;   // base64 thumbnail for user messages
  modelUsed?: string;
}

interface Product {
  name: string;
  description: string;
  price: number;
  stock: number;
  category: string;
  tags: string[];
  score?: number;
}

// ── Helpers ─────────────────────────────────────────────────────────────────
const localImageMap: Record<string, string> = {
  "Waterproof Hiking Jacket": "/images/Waterproof Hiking Jacket.png",
  "Trail Running Shoes": "/images/Trail Running Shoes.png",
  "Insulated Water Bottle": "/images/Insulated Water Bottle.png",
  "Eco-Friendly Yoga Mat": "/images/Eco-Friendly Yoga Mat.png",
  "Smart Fitness Tracker": "/images/Smart Fitness Tracker.png",
  "Spacious Gym Bag": "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=160&q=80",
  "2-Person Camping Tent": "https://images.unsplash.com/photo-1504280390224-3ea339241517?auto=format&fit=crop&w=160&q=80",
  "Noise-Cancelling Headphones": "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=160&q=80",
  "Adjustable Dumbbell Set": "https://images.unsplash.com/photo-1586401100295-7a8096fd231a?auto=format&fit=crop&w=160&q=80",
  "Polarized Sunglasses": "https://images.unsplash.com/photo-1511499767150-a48a237f0083?auto=format&fit=crop&w=160&q=80"
};

function getProductImageUrl(productName: string) {
  return localImageMap[productName] || `https://picsum.photos/seed/${encodeURIComponent(productName)}/80/80`;
}

// ── Component ───────────────────────────────────────────────────────────────
export default function Home() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Welcome! I'm your **Real-Time Retail Concierge** powered by *MongoDB Atlas Vector Search* and *Google Gemini*.\n\nYou can:\n- Describe what you're looking for\n- Upload a photo of a product\n- Ask about availability, prices, or categories\n\nHow can I help you find the perfect item today?"
    }
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [liveProducts, setLiveProducts] = useState<Product[]>([]);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [cartItems, setCartItems] = useState<{ product: Product; qty: number }[]>([]);
  const [addedMap, setAddedMap] = useState<Record<string, boolean>>({});
  const [lastModel, setLastModel] = useState<string>("");

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom whenever messages or typing indicator changes
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  // SSE live inventory stream
  useEffect(() => {
    const eventSource = new EventSource("/api/stream");
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "change") {
          console.log("Live inventory update:", data.change);
        }
      } catch (err) {
        console.error("SSE parse error", err);
      }
    };
    return () => eventSource.close();
  }, []);

  // Handle image upload
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setSelectedImage(reader.result as string);
    reader.readAsDataURL(file);
  };

  // Add to cart
  const handleAddToCart = useCallback((product: Product) => {
    setCartItems(prev => {
      const existing = prev.findIndex(i => i.product.name === product.name);
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing].qty += 1;
        return updated;
      }
      return [...prev, { product, qty: 1 }];
    });
    setAddedMap(prev => ({ ...prev, [product.name]: true }));
    setTimeout(() => setAddedMap(prev => ({ ...prev, [product.name]: false })), 2000);
  }, []);

  const cartCount = cartItems.reduce((s, i) => s + i.qty, 0);

  // Send message
  const handleSend = async () => {
    if (!input.trim() && !selectedImage) return;

    const displayContent = input.trim() || "[Uploaded an image]";
    const thumb = selectedImage; // capture for display

    const newUserMsg: Message = {
      role: "user",
      content: displayContent,
      imageThumb: thumb || undefined
    };

    const newMessages: Message[] = [...messages, newUserMsg];
    setMessages(newMessages);
    setInput("");
    setSelectedImage(null);
    setIsTyping(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages, image: thumb })
      });
      const data = await res.json();

      if (data.role) {
        const assistantMsg: Message = {
          role: "assistant",
          content: data.content,
          modelUsed: data.modelUsed
        };
        setMessages(prev => [...prev, assistantMsg]);
        if (data.modelUsed) setLastModel(data.modelUsed);
        if (data.products?.length > 0) setLiveProducts(data.products);
      } else {
        setMessages(prev => [...prev, {
          role: "assistant",
          content: `⚠️ **Error:** ${data.error || "Unknown error from API."}`
        }]);
      }
    } catch {
      setMessages(prev => [...prev, {
        role: "assistant",
        content: "⚠️ **Network error** connecting to the backend."
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <div className="layout-container">

      {/* ── LEFT: Chat Panel ── */}
      <main className="glass-panel chat-section">
        <header className="header">
          <Store size={24} color="var(--primary)" strokeWidth={2} />
          <h1>Retail Concierge</h1>

          {/* Cart button */}
          <button className="cart-header-btn" title="Shopping Cart">
            <ShoppingCart size={14} />
            Cart
            {cartCount > 0 && (
              <span className="cart-count-badge" key={cartCount}>{cartCount}</span>
            )}
          </button>

          {/* Live badge */}
          <div className="live-badge">
            <span className="live-dot" />
            Live
          </div>
        </header>

        {/* Messages */}
        <div className="chat-messages">
          {messages.map((msg, idx) => (
            <div key={idx} className={`message-wrapper ${msg.role}`}>
              <div className={`message ${msg.role}`}>
                {/* Image thumb for user messages */}
                {msg.imageThumb && (
                  <img
                    src={msg.imageThumb}
                    alt="Uploaded"
                    className="message-image-thumb"
                  />
                )}
                {/* Markdown for assistant, plain text for user */}
                {msg.role === "assistant"
                  ? renderMarkdown(msg.content)
                  : msg.content
                }
              </div>
              {msg.role === "assistant" && msg.modelUsed && (
                <span className="model-label">via {msg.modelUsed}</span>
              )}
            </div>
          ))}

          {/* Typing indicator */}
          {isTyping && (
            <div className="message-wrapper assistant">
              <div className="typing-indicator">
                <span className="typing-dot" />
                <span className="typing-dot" />
                <span className="typing-dot" />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input area */}
        <div className="input-area">
          {selectedImage && (
            <div className="image-preview-wrap">
              <img src={selectedImage} alt="Preview" className="image-preview-thumb" />
              <button
                className="image-remove-btn"
                onClick={() => setSelectedImage(null)}
                title="Remove image"
              >✕</button>
            </div>
          )}
          <div className="input-row">
            <label className="icon-btn" title="Upload Image" style={{ cursor: "pointer" }}>
              <ImageIcon size={18} />
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={handleImageUpload}
              />
            </label>
            <input
              type="text"
              className="input-field"
              placeholder="Describe a product or ask a question…"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isTyping}
            />
            <button
              className="icon-btn send-btn"
              onClick={handleSend}
              disabled={isTyping || (!input.trim() && !selectedImage)}
              title="Send"
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      </main>

      {/* ── RIGHT: Products Panel ── */}
      <aside className="glass-panel product-section">
        <div className="sidebar-header">
          <Zap size={18} color="var(--accent)" strokeWidth={2.5} />
          <h2>Live Matches</h2>
          {liveProducts.length > 0 && (
            <span className="result-count">{liveProducts.length} results</span>
          )}
        </div>

        {liveProducts.length > 0 ? (
          <div className="product-grid">
            {liveProducts.map((product, idx) => {
              const score = product.score ?? 0;
              const scoreColor = getScoreColor(score);
              const scorePct = Math.round(score * 100);
              const stock = getStockBadge(product.stock);
              const isAdded = addedMap[product.name];

              return (
                <div
                  key={idx}
                  className="product-card"
                  style={{
                    // @ts-ignore
                    "--score-color": scoreColor,
                    animationDelay: `${idx * 0.08}s`
                  }}
                >
                  <img
                    className="product-img"
                    src={getProductImageUrl(product.name)}
                    alt={product.name}
                  />
                  <div className="product-body">
                    <div className="product-top-row">
                      <h3 className="product-name" title={product.name}>{product.name}</h3>
                      <span className="product-price">${product.price?.toFixed(2)}</span>
                    </div>

                    <div className="product-meta-row">
                      <span className="category-tag">{product.category}</span>
                      <span className={`stock-badge ${stock.cls}`}>{stock.label}</span>
                      {product.stock <= 5 && product.stock > 0 && (
                        <span className="flash-sale-badge">🔥 {product.stock} left</span>
                      )}
                    </div>

                    {/* Similarity score bar */}
                    <div className="score-row">
                      <span className="score-label">Match</span>
                      <div className="score-bar-track">
                        <div
                          className="score-bar-fill"
                          style={{ width: `${scorePct}%`, background: scoreColor }}
                        />
                      </div>
                      <span className="score-value" style={{ color: scoreColor }}>
                        {scorePct}%
                      </span>
                    </div>

                    <button
                      className={`add-to-cart-btn${isAdded ? " added" : ""}`}
                      onClick={() => handleAddToCart(product)}
                    >
                      {isAdded ? (
                        <><Package size={12} /> Added!</>
                      ) : (
                        <><ShoppingCart size={12} /> Add to Cart</>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-state-icon">🛍️</div>
            <div className="empty-state-title">No matches yet</div>
            <div className="empty-state-sub">
              Search for a product or upload a photo to see AI-powered vector matches here.
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}
