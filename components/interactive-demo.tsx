/* eslint-disable react/no-unescaped-entities */
"use client";

import { useState } from "react";

type Role = "user" | "assistant" | "system";

interface Message {
  role: Role;
  content: string;
}

interface SimulationResponse {
  reply: string;
  language: string;
  analysis: {
    importance: string;
    summary: string;
    topic: string;
  };
}

export default function InteractiveDemo() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "Assalamualaikum, یہ Iqra ہے. آپ مجھے بتائیں کیسے مدد کر سکتی ہوں؟"
    }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<SimulationResponse["analysis"] | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!input.trim() || loading) {
      return;
    }

    const updatedConversation = [
      ...messages,
      { role: "user" as const, content: input.trim() }
    ];

    setMessages(updatedConversation);
    setLoading(true);
    setInput("");

    try {
      const response = await fetch("/api/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversation: updatedConversation
        })
      });

      if (!response.ok) {
        throw new Error("Failed to simulate conversation");
      }

      const data = (await response.json()) as SimulationResponse;

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.reply
        }
      ]);
      setAnalysis(data.analysis);
    } catch (error) {
      console.error(error);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "I’m sorry, there was an issue processing the response. Please try again."
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const resetConversation = () => {
    setMessages([
      {
        role: "assistant",
        content:
          "Assalamualaikum, یہ Iqra ہے. آپ مجھے بتائیں کیسے مدد کر سکتی ہوں؟"
      }
    ]);
    setAnalysis(null);
  };

  return (
    <section className="demo">
      <div className="demo__header">
        <h2>Experience Iqra’s Voice</h2>
        <button type="button" onClick={resetConversation}>
          Reset
        </button>
      </div>
      <div className="demo__transcript">
        {messages.map((message, index) => (
          <article key={`${message.role}-${index}`} className={`bubble bubble--${message.role}`}>
            <header>{message.role === "user" ? "Caller" : "Iqra"}</header>
            <p>{message.content}</p>
          </article>
        ))}
      </div>
      <form className="demo__form" onSubmit={handleSubmit}>
        <textarea
          placeholder="Tell Iqra why you're calling..."
          value={input}
          onChange={(event) => setInput(event.target.value)}
          rows={3}
        />
        <button type="submit" disabled={loading}>
          {loading ? "Thinking..." : "Send to Iqra"}
        </button>
      </form>
      {analysis ? (
        <div className="demo__analysis">
          <h3>Instant Triage</h3>
          <p>
            <strong>Importance:</strong> {analysis.importance}
          </p>
          <p>
            <strong>Topic:</strong> {analysis.topic}
          </p>
          <p>
            <strong>Summary:</strong> {analysis.summary}
          </p>
        </div>
      ) : null}
    </section>
  );
}
