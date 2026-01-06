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
      const API_BASE = process.env.NEXT_PUBLIC_API_BASE;

      if (!API_BASE) {
        throw new Error(
          "NEXT_PUBLIC_API_BASE が未設定です（.env.local / Vercel環境変数を確認）"
        );
      }

      const base = API_BASE.replace(/\/$/, "");
      const url = `${base}/embed`;

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q }),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        console.log("[API ERROR] url =", url);
        console.log("[API ERROR] status =", res.status, res.statusText);
        console.log("[API ERROR] body =", text);

        throw new Error(`API error: ${res.status} ${res.statusText}\n${text}`);
      }

      const data: any = await res.json();

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
          aria-label="send"
          type="button"
        >
          ➤
        </button>
      </div>
    </div>
  );
}
