import { useState, useRef, useEffect } from "react";
import "./App.css";

const SYSTEM_PROMPT = "You are a helpful, friendly AI assistant. Give clear and concise answers.";

const TypingIndicator = () => (
  <div className="typing-indicator">
    {[0, 1, 2].map(i => (
      <div key={i} className="typing-dot" style={{ animationDelay: `${i * 0.2}s` }} />
    ))}
  </div>
);

const Message = ({ msg, onCopy }) => {
  const isUser = msg.role === "user";
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    onCopy(msg.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`message-row ${isUser ? "message-row--user" : "message-row--ai"}`}>
      {!isUser && <div className="avatar avatar--ai">AI</div>}
      <div className="message-content">
        <div className={`message-bubble ${isUser ? "bubble--user" : "bubble--ai"}`}>
          {msg.content}
        </div>
        <div className={`message-meta ${isUser ? "message-meta--user" : "message-meta--ai"}`}>
          <span className="message-time">{msg.time}</span>
          <button className="copy-btn" onClick={handleCopy}>
            {copied ? "✅ Copied!" : "📋 Copy"}
          </button>
        </div>
      </div>
      {isUser && <div className="avatar avatar--user">U</div>}
    </div>
  );
};

export default function App() {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: "Hi! I'm your AI assistant. Ask me anything — code help, career advice, DSA, system design! 🚀",
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const getTime = () =>
    new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg = { role: "user", content: text, time: getTime() };
    const updatedMsgs = [...messages, userMsg];
    setMessages(updatedMsgs);
    setInput("");
    setLoading(true);
    setError("");

    try {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.REACT_APP_GROQ_API_KEY}`
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          max_tokens: 1000,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            ...updatedMsgs
              .filter(m => m.role !== "system")
              .map(({ role, content }) => ({ role, content }))
          ]
        })
      });

      const data = await res.json();
      const reply = data?.choices?.[0]?.message?.content || "Sorry, I couldn't get a response.";
      setMessages(prev => [...prev, { role: "assistant", content: reply, time: getTime() }]);
    } catch (err) {
      setError("⚠️ Network error. Please check your API key in .env and try again.");
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearChat = () => {
    setMessages([{
      role: "assistant",
      content: "Chat cleared! Fresh start 😊",
      time: getTime()
    }]);
    setError("");
  };

  const copyAll = () => {
    const text = messages
      .map(m => `${m.role === "user" ? "You" : "AI"}: ${m.content}`)
      .join("\n\n");
    navigator.clipboard.writeText(text);
  };

  const copyMessage = (content) => navigator.clipboard.writeText(content);

  const suggestions = [
    "Explain React hooks",
    "What is system design?",
    "DSA tips for interviews",
    "Review my code approach"
  ];

  return (
    <div className="chat-app">

      {/* Header */}
      <header className="chat-header">
        <div className="chat-header__left">
          <div className="chat-logo">🤖</div>
          <div>
            <div className="chat-title">AI Chat Assistant</div>
            <div className="chat-status">● Online</div>
          </div>
        </div>
        <div className="chat-header__actions">
          <button className="btn btn--ghost" onClick={copyAll}>📋 Copy All</button>
          <button className="btn btn--danger" onClick={clearChat}>🗑️ Clear</button>
        </div>
      </header>

      {/* Messages */}
      <main className="chat-messages">
        {messages.map((msg, i) => (
          <Message key={i} msg={msg} onCopy={copyMessage} />
        ))}

        {loading && (
          <div className="message-row message-row--ai">
            <div className="avatar avatar--ai">AI</div>
            <div className="bubble--ai bubble--typing">
              <TypingIndicator />
            </div>
          </div>
        )}

        {error && <div className="chat-error">{error}</div>}
        <div ref={bottomRef} />
      </main>

      {/* Suggestions */}
      {messages.length <= 1 && (
        <div className="suggestions">
          {suggestions.map((s, i) => (
            <button key={i} className="suggestion-chip"
              onClick={() => { setInput(s); inputRef.current?.focus(); }}>
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <footer className="chat-footer">
        <div className="input-box">
          <textarea
            ref={inputRef}
            rows={1}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message... (Enter to send)"
            className="chat-input"
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || loading}
            className={`btn btn--send ${input.trim() && !loading ? "btn--active" : ""}`}>
            {loading ? "..." : "Send ➤"}
          </button>
        </div>
        <p className="chat-footer__note">Built with React + Groq (Llama 3) — Free AI API</p>
      </footer>

    </div>
  );
}