// app/chat/page.tsx
"use client";

import { useState } from "react";
import ChatContainer from "@/components/ChatContainer";
import ChatBubble from "@/components/ChatBubble";
import ChatInput from "@/components/ChatInput";
import TypingDots from "@/components/TypingDots";
import BackButton from "@/components/BackButton";

export default function ChatPage() {
  const [messages, setMessages] = useState<
    { role: "user" | "assistant"; content: string }[]
  >([]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);

  async function sendMessage() {
    const userMessage = input.trim();
    if (!userMessage) return;

    setInput("");
    setMessages((m) => [...m, { role: "user", content: userMessage }]);
    setThinking(true);

    try {
      const API_BASE = process.env.NEXT_PUBLIC_API_BASE;

      // ✅ env未設定を握りつぶさない
      if (!API_BASE) {
        throw new Error(
          "NEXT_PUBLIC_API_BASE が未設定です（.env.local / Vercel環境変数を確認して、devサーバーを再起動してください）"
        );
      }

      // ✅ 末尾スラッシュ吸収
      const base = API_BASE.replace(/\/$/, "");
      const url = `${base}/chat`; // ✅ FastAPIに存在するパス（/ask は無い）

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // ✅ FastAPIの ChatBody に合わせる：message / top_k
        body: JSON.stringify({ message: userMessage, top_k: 3 }),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        console.log("[CHAT] url =", url);
        console.log("[CHAT] status =", res.status, res.statusText);
        console.log("[CHAT] body =", text);
        throw new Error(`API error: ${res.status} ${res.statusText}\n${text}`);
      }

      const data: any = await res.json();
      const botReply = data?.answer ?? "回答に失敗しました。";

      setMessages((m) => [...m, { role: "assistant", content: botReply }]);
    } catch (e: any) {
      console.error(e);
      setMessages((m) => [
        ...m,
        { role: "assistant", content: `エラー: ${e?.message ?? String(e)}` },
      ]);
    } finally {
      setThinking(false);
    }
  }

  return (
    <ChatContainer>
      <BackButton />
      <h1 className="text-xl font-semibold mb-4">チャット</h1>

      <div className="min-h-[320px] border rounded-xl p-4 mb-4 bg-white">
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

      <ChatInput
        value={input}
        onChange={setInput}
        onSend={sendMessage}
        disabled={thinking}
      />
    </ChatContainer>
  );
}
