// app/chat/page.tsx
"use client";
import { useState } from "react";
import ChatContainer from "@/components/ChatContainer";
import ChatBubble from "@/components/ChatBubble";
import ChatInput from "@/components/ChatInput";
import TypingDots from "@/components/TypingDots";
import BackButton from "@/components/BackButton";


export default function ChatPage() {
  const [messages, setMessages] = useState<{role:"user"|"assistant";content:string}[]>([]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);

  async function sendMessage() {
    const userMessage = input.trim();
    if (!userMessage) return;

    setInput("");
    setMessages((m) => [...m, { role: "user", content: userMessage }]);
    setThinking(true);

    try {
  const API_BASE = process.env.NEXT_PUBLIC_API_BASE!;
  
  const res = await fetch(`${API_BASE}/ask`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      question: userMessage,
    }),
  });

  if (!res.ok) {
    throw new Error(`API error: ${res.status}`);
  }

  const data = await res.json();

  const botReply = data?.answer ?? "回答に失敗しました。";

  setMessages((m) => [
    ...m,
    { role: "assistant", content: botReply },
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
    <ChatContainer>
      <BackButton />
      <h1 className="text-xl font-semibold mb-4">チャット</h1>

      <div className="min-h-[320px] border rounded-xl p-4 mb-4 bg-white">
        {messages.map((m, i) => (
          <ChatBubble key={i} role={m.role}>{m.content}</ChatBubble>
        ))}
        {thinking && <ChatBubble role="assistant"><TypingDots /></ChatBubble>}
      </div>

      <ChatInput value={input} onChange={setInput} onSend={sendMessage} disabled={thinking}/>
    </ChatContainer>
  );
}
