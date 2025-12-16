// app/embed/page.tsx
"use client";

export const dynamic = "force-dynamic";

import { useState } from "react";
import ChatBubble from "@/components/ChatBubble";
import TypingDots from "@/components/TypingDots";

export default function EmbedPage() {
  const [messages, setMessages] = useState<
    { role: "user" | "assistant"; content: string }[]
  >([]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);

  async function send() {
    const q = input.trim();
    if (!q) return;

    setInput("");
    setMessages((m) => [...m, { role: "user", content: q }]);
    setThinking(true);

    try {
      const API_BASE = process.env.NEXT_PUBLIC_API_BASE!;
      const res = await fetch(`${API_BASE}/embed`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q }),
      });

      if (!res.ok) throw new Error("API error");

      const data = await res.json();
      setMessages((m) => [
        ...m,
        { role: "assistant", content: data.answer },
      ]);
    } catch (e) {
      console.error(e);
      setMessages((m) => [
        ...m,
        { role: "assistant", content: "エラーが発生しました。" },
      ]);
    } finally {
      setThinking(false);
    }
  }

  return (
    <div className="w-[360px] h-[560px] border rounded-2xl p-3 bg-white flex flex-col">
      <div className="text-sm font-semibold mb-2">サイト案内チャット</div>

      <div className="flex-1 overflow-y-auto border rounded-xl p-3 mb-2 bg-gray-50">
        {messages.map((m, i) => (
          <ChatBubble key={i} role={m.role}>
            {m.content}
          </ChatBubble>
        ))}
        {thinking && (
          <ChatBubble role="assistant">
            <TypingDots />
          </ChatBubble>
        )}
      </div>

      <div className="flex gap-2">
        <input
          className="flex-1 border rounded-lg px-3 py-2"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="質問を入力…"
        />
        <button onClick={send} className="bg-blue-600 text-white px-3 rounded-lg">
          送信
        </button>
      </div>
    </div>
  );
}
