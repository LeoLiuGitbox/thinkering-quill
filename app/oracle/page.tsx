"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import GameNav from "@/components/layout/GameNav";
import MarkdownContext from "@/components/game/MarkdownContext";

export default function OraclePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [question, setQuestion] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [response, setResponse] = useState("");
  const [history, setHistory] = useState<{ q: string; a: string }[]>([]);
  const responseRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const id = localStorage.getItem("activeProfileId");
    if (!id) { router.push("/login"); return; }
    fetch(`/api/profile/${id}`).then(r => r.json()).then(d => setProfile(d.profile));
  }, [router]);

  useEffect(() => {
    if (responseRef.current) {
      responseRef.current.scrollTop = responseRef.current.scrollHeight;
    }
  }, [response]);

  async function askOracle() {
    if (!question.trim() || streaming) return;
    const q = question.trim();
    setQuestion("");
    setResponse("");
    setStreaming(true);

    let fullResponse = "";
    try {
      const res = await fetch("/api/oracle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q }),
      });

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No reader");
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const payload = line.slice(6);
            if (payload === "[DONE]") break;
            try {
              const data = JSON.parse(payload);
              if (data.text) {
                fullResponse += data.text;
                setResponse(fullResponse);
              }
            } catch {}
          }
        }
      }
    } finally {
      setStreaming(false);
      if (fullResponse) {
        setHistory(prev => [...prev, { q, a: fullResponse }]);
        setResponse("");
      }
    }
  }

  const EXAMPLE_QUESTIONS = [
    "What is probability and how do I calculate it?",
    "How do I find the main idea of a passage?",
    "What is a Venn diagram and when do I use it?",
    "How do I solve a ratio question step by step?",
    "What's the trick to abstract reasoning patterns?",
  ];

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#0F1C3F" }}>
      <GameNav profile={profile} />

      <main className="flex-1 max-w-4xl mx-auto w-full px-6 py-8 flex flex-col">
        {/* Header */}
        <div className="text-center mb-8">
          <div
            className="text-7xl mb-4"
            style={{ filter: "drop-shadow(0 0 20px rgba(107, 74, 196, 0.6))" }}
          >
            🔮
          </div>
          <h1
            className="text-3xl font-bold mb-2"
            style={{ color: "#E7C777", fontFamily: "Georgia, serif",
              textShadow: "0 0 20px rgba(231, 199, 119, 0.3)" }}
          >
            Ask the Oracle
          </h1>
          <p style={{ color: "#EADFC8", opacity: 0.7 }}>
            The Oracle explains any concept — with real examples and strategies
          </p>
        </div>

        {/* Conversation history */}
        <div className="flex-1 space-y-6 mb-6 min-h-0 overflow-y-auto" ref={responseRef}>
          {history.length === 0 && !streaming && (
            <div>
              <p className="text-sm mb-4 text-center" style={{ color: "#B68A3A" }}>
                Try asking about…
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                {EXAMPLE_QUESTIONS.map((q, i) => (
                  <button
                    key={i}
                    onClick={() => setQuestion(q)}
                    className="px-3 py-2 rounded-xl text-sm transition-all hover:opacity-90"
                    style={{
                      background: "#1E2E5A",
                      border: "1px solid #B68A3A44",
                      color: "#EADFC8",
                    }}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {history.map((item, i) => (
            <div key={i} className="space-y-3">
              {/* Question bubble */}
              <div className="flex justify-end">
                <div
                  className="max-w-lg px-5 py-4 rounded-2xl"
                  style={{
                    background: "#B68A3A22",
                    border: "1px solid #B68A3A",
                    color: "#E7C777",
                    fontSize: "1.2rem",
                    lineHeight: 1.85,
                  }}
                >
                  {item.q}
                </div>
              </div>
              {/* Oracle response */}
              <div className="flex justify-start">
                <div
                  className="max-w-3xl px-6 py-5 rounded-2xl leading-relaxed"
                  style={{ background: "#1E2E5A", border: "1px solid #6B4AC444", color: "#EADFC8" }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span>🔮</span>
                    <span className="text-xs font-bold" style={{ color: "#B68A3A" }}>
                      The Oracle speaks
                    </span>
                  </div>
                  <MarkdownContext
                    text={item.a}
                    style={{ fontFamily: "Georgia, serif", color: "#EADFC8" }}
                    enableCharts={false}
                    baseFontSize="1.4rem"
                    baseLineHeight={2.05}
                  />
                </div>
              </div>
            </div>
          ))}

          {/* Active streaming */}
          {streaming && (
            <div className="space-y-3">
              <div className="flex justify-end">
                <div
                  className="max-w-lg px-5 py-4 rounded-2xl"
                  style={{
                    background: "#B68A3A22",
                    border: "1px solid #B68A3A",
                    color: "#E7C777",
                    fontSize: "1.2rem",
                    lineHeight: 1.85,
                  }}
                >
                  {question || history[history.length - 1]?.q || "…"}
                </div>
              </div>
              <div className="flex justify-start">
                <div
                  className="max-w-3xl px-6 py-5 rounded-2xl leading-relaxed"
                  style={{ background: "#1E2E5A", border: "1px solid #6B4AC444", color: "#EADFC8" }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="animate-pulse">🔮</span>
                    <span className="text-xs font-bold" style={{ color: "#B68A3A" }}>
                      The Oracle speaks…
                    </span>
                  </div>
                  {response ? (
                    <div>
                      <MarkdownContext
                        text={response}
                        style={{ fontFamily: "Georgia, serif", color: "#EADFC8" }}
                        enableCharts={false}
                        baseFontSize="1.4rem"
                        baseLineHeight={2.05}
                      />
                      <span className="animate-pulse" style={{ color: "#B68A3A" }}>▋</span>
                    </div>
                  ) : (
                    <p className="animate-pulse" style={{ color: "#B68A3A" }}>
                      The Oracle consults the ancient scrolls…
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <div
          className="flex gap-3 p-4 rounded-2xl"
          style={{ background: "#1E2E5A", border: "1px solid #B68A3A44" }}
        >
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && askOracle()}
            placeholder="Ask the Oracle anything about the ASET exam…"
            disabled={streaming}
            className="flex-1 bg-transparent outline-none"
            style={{ color: "#EADFC8", fontFamily: "Georgia, serif", fontSize: "1.25rem", lineHeight: 1.9 }}
          />
          <button
            onClick={askOracle}
            disabled={streaming || !question.trim()}
            className="px-5 py-2 rounded-xl font-bold transition-all hover:opacity-90 disabled:opacity-40"
            style={{
              background: "linear-gradient(135deg, #B68A3A, #E7C777)",
              color: "#0F1C3F",
              fontFamily: "Georgia, serif",
              fontSize: "1.1rem",
            }}
          >
            {streaming ? "…" : "Ask ✨"}
          </button>
        </div>
      </main>
    </div>
  );
}
