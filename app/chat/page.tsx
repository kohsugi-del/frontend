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

      if (!API_BASE) {
        throw new Error(
          "NEXT_PUBLIC_API_BASE が未設定です（.env.local / Vercel環境変数を確認して、devサーバーを再起動してください）"
        );
      }

      const base = API_BASE.replace(/\/$/, "");
      const url = `${base}/chat`;

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMessage, top_k: 8 }),
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
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* 背景の薄いグラデ（単調さ解消） */}
      <div className="pointer-events-none fixed inset-0 opacity-45">
        <div className="absolute -top-40 left-10 h-96 w-96 rounded-full bg-fuchsia-500/30 blur-3xl" />
        <div className="absolute top-40 right-10 h-96 w-96 rounded-full bg-cyan-500/25 blur-3xl" />
        <div className="absolute bottom-10 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-emerald-500/15 blur-3xl" />
      </div>

      <ChatContainer>
        {/* 既存コンテナの上に “カード枠” を置く */}
        <div className="relative mx-auto w-full max-w-4xl px-4 py-8">
          {/* Header */}
          <div className="mb-5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <BackButton />
              <div>
                <div className="text-xs text-zinc-400">RAG Chat</div>
                <h1 className="text-xl font-semibold tracking-tight">チャット</h1>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-zinc-300">
                top_k: 8
              </span>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-zinc-300">
                API: {process.env.NEXT_PUBLIC_API_BASE ? "connected" : "unset"}
              </span>
            </div>
          </div>

          {/* Chat panel */}
          <div className="rounded-3xl border border-white/10 bg-white/5 p-4 backdrop-blur">
            <div className="mb-3 flex items-center justify-between">
              <div className="text-sm font-semibold">Conversation</div>
              <div className="text-xs text-zinc-400">
                サイトの情報を根拠に回答します
              </div>
            </div>

            <div className="min-h-[380px] max-h-[60vh] overflow-auto rounded-2xl border border-white/10 bg-black/30 p-4">
              {messages.length === 0 ? (
                <div className="text-sm text-zinc-400">
                  例：<span className="text-zinc-200">「はたらくあさひかわとは？」</span>
                </div>
              ) : null}

              <div className="space-y-3">
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
            </div>

            {/* Input area */}
            <div className="mt-4 rounded-2xl border border-white/10 bg-black/30 p-3">
              <ChatInput
                value={input}
                onChange={setInput}
                onSend={sendMessage}
                disabled={thinking}
              />

              <div className="mt-2 text-xs text-zinc-400">
                Enterで送信／Shift+Enterで改行（実装がある場合）
              </div>
            </div>
          </div>
        </div>
      </ChatContainer>
    </div>
  );
}
