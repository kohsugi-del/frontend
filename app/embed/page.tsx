// app/embed/page.tsx
"use client";

import { useState } from "react";
import ChatBubble from "@/components/ChatBubble";
import TypingDots from "@/components/TypingDots";

export const dynamic = "force-dynamic";

type Msg = { role: "user" | "assistant"; content: string };

export default function EmbedPage() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);

  const send = async (): Promise<void> => {
    const q = input.trim();
    if (!q) return;

    setInput("");
    setMessages((m) => [...m, { role: "user", content: q }]);
    setThinking(true);

    try {
      // ✅ Vercel内の API Route を叩く（同一ドメイン）
      const res = await fetch("/api/embed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q }),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`API error: ${res.status} ${res.statusText}\n${text}`);
      }

      const data: any = await res.json().catch(() => ({}));
      const answer =
        data?.answer ??
        data?.message ??
        data?.content ??
        (typeof data === "string" ? data : "");

      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content: answer || "（返答データに answer が見つかりませんでした）",
        },
      ]);
    } catch (e: any) {
      console.error(e);
      setMessages((m) => [
        ...m,
        { role: "assistant", content: `エラー: ${e?.message ?? String(e)}` },
      ]);
    } finally {
      setThinking(false);
    }
  };

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
      <div className="h-12 flex items-center justify-center border-b border-white/10 text-sm font-semibold">
        AI Assistant
      </div>

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
          aria-label="send"
          type="button"
        >
          ➤
        </button>
      </div>
    </div>
  );
}
