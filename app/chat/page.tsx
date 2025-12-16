// app/chat/page.tsx
"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import ChatContainer from "@/components/ChatContainer";
import ChatBubble from "@/components/ChatBubble";
import ChatInput from "@/components/ChatInput";
import TypingDots from "@/components/TypingDots";

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
      // 1) Embedding
      const embedRes = await fetch("https://api.openai.com/v1/embeddings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "text-embedding-3-small",
          input: userMessage,
        }),
      }).then((r) => r.json());

      const embedding = embedRes?.data?.[0]?.embedding;
      if (!embedding) throw new Error("embedding取得失敗");

      // 2) Supabase RPC: match_rag_chunks
      const { data, error } = await supabase.rpc("match_rag_chunks", {
        query_embedding: embedding,
        match_count: 5,
      });

      if (error) {
        console.error("Supabase RPC error:", error);
      }
      const matches = Array.isArray(data) ? data : [];
      const context = matches.map((m: any) => m.content).join("\n\n");

      // 3) OpenAI回答
      const answerRes = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "gpt-4.1-mini",
          messages: [
            { role: "system", content: "あなたは案内チャットボットです。資料のみを根拠に端的に回答してください。" },
            { role: "user", content: `資料:\n${context}\n\n質問:${userMessage}` },
          ],
        }),
      }).then((r) => r.json());

      const botReply = answerRes?.choices?.[0]?.message?.content ?? "回答に失敗しました。";
      setMessages((m) => [...m, { role: "assistant", content: botReply }]);
    } catch (e: any) {
      console.error(e);
      setMessages((m) => [...m, { role: "assistant", content: "エラーが発生しました。" }]);
    } finally {
      setThinking(false);
    }
  }

  return (
    <ChatContainer>
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
