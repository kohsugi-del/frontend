// app/embed/page.tsx
"use client";
import { useState } from "react";
import ChatBubble from "@/components/ChatBubble";
import TypingDots from "@/components/TypingDots";
import { supabase } from "@/lib/supabase";

export default function EmbedPage() {
  const [messages, setMessages] = useState<{role:"user"|"assistant";content:string}[]>([]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);

  async function send() {
    const userMessage = input.trim();
    if (!userMessage) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", content: userMessage }]);
    setThinking(true);

    try {
      const embedRes = await fetch("https://api.openai.com/v1/embeddings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_OPENAI_API_KEY}`,
        },
        body: JSON.stringify({ model: "text-embedding-3-small", input: userMessage }),
      }).then((r) => r.json());

      const embedding = embedRes?.data?.[0]?.embedding;
      const { data } = await supabase.rpc("match_rag_chunks", {
        query_embedding: embedding,
        match_count: 5,
      });
      const context = (Array.isArray(data) ? data : []).map((m: any) => m.content).join("\n\n");

      const answerRes = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "gpt-4.1-mini",
          messages: [
            { role: "system", content: "あなたは案内チャットボットです。" },
            { role: "user", content: `資料:\n${context}\n\n質問:${userMessage}` },
          ],
        }),
      }).then((r) => r.json());

      const botReply = answerRes?.choices?.[0]?.message?.content ?? "回答に失敗しました。";
      setMessages((m) => [...m, { role: "assistant", content: botReply }]);
    } catch {
      setMessages((m) => [...m, { role: "assistant", content: "エラーが発生しました。" }]);
    } finally {
      setThinking(false);
    }
  }

  return (
    <div className="w-[360px] h-[560px] border rounded-2xl p-3 bg-white flex flex-col">
      <div className="text-sm font-semibold mb-2">サイト案内チャット</div>
      <div className="flex-1 overflow-y-auto border rounded-xl p-3 mb-2 bg-gray-50">
        {messages.map((m, i) => (
          <ChatBubble key={i} role={m.role}>{m.content}</ChatBubble>
        ))}
        {thinking && <ChatBubble role="assistant"><TypingDots /></ChatBubble>}
      </div>
      <div className="flex gap-2">
        <input
          className="flex-1 border rounded-lg px-3 py-2"
          value={input}
          onChange={(e)=>setInput(e.target.value)}
          onKeyDown={(e)=>{ if (e.key==="Enter") send(); }}
          placeholder="質問を入力…"
        />
        <button className="bg-blue-600 text-white px-3 rounded-lg" onClick={send}>送信</button>
      </div>
    </div>
  );
}
