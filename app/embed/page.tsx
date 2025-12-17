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
    <div
      className="
        w-[360px]
        h-[640px]
        rounded-[28px]
        bg-[#0B1220]
        text-white
        shadow-xl
        flex flex-col
        overflow-hidden
      "
    >
      {/* ヘッダー */}
      <div className="h-12 flex items-center justify-center border-b border-white/10 text-sm font-semibold">
        AI Assistant
      </div>

      {/* メッセージエリア */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-2">
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

      {/* 入力欄 */}
      <div className="p-3 border-t border-white/10 flex gap-2">
        <input
          className="
            flex-1
            bg-[#1E293B]
            text-white
            placeholder-gray-400
            rounded-full
            px-4 py-2
            text-sm
            outline-none
          "
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="質問を入力…"
        />

        <button
          onClick={send}
          className="
            w-10 h-10
            rounded-full
            bg-blue-600
            flex items-center justify-center
            text-white
          "
        >
          ➤
        </button>
      </div>
    </div>
  );
}
