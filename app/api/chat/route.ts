// app/api/chat/route.ts
import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs"; // Edgeにしない（OpenAI/Supabaseで安定）
export const dynamic = "force-dynamic";

function env(name: string): string | undefined {
  const v = process.env[name];
  return v && v.trim() ? v.trim() : undefined;
}

function mustEnv(name: string): string {
  const v = env(name);
  if (!v) throw new Error(`${name} is missing`);
  return v;
}

// ---- OpenAI ----
const openai = new OpenAI({ apiKey: mustEnv("OPENAI_API_KEY") });

// ---- Supabase ----
// あなたの .env.local では NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY もあるのでフォールバック対応
const SUPABASE_URL =
  env("SUPABASE_URL") ?? env("NEXT_PUBLIC_SUPABASE_URL") ?? "";

if (!SUPABASE_URL) {
  throw new Error("SUPABASE_URL is missing (set SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL)");
}

// 優先：SERVICE_ROLE（サーバー専用） → 無ければ ANON（機能制限あり）
const SUPABASE_KEY =
  env("SUPABASE_SERVICE_ROLE_KEY") ??
  env("SUPABASE_ANON_KEY") ??
  env("NEXT_PUBLIC_SUPABASE_ANON_KEY") ??
  "";

if (!SUPABASE_KEY) {
  throw new Error(
    "SUPABASE key is missing (set SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY)"
  );
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false },
});

// RPC名は環境変数で切替可能（match_documents / match_chunks どちらでも）
const RPC_NAME = env("SUPABASE_MATCH_RPC") ?? "match_documents";

type ChatBody = {
  question?: string;
  message?: string;
  top_k?: number;
};

async function embedQuery(text: string): Promise<number[]> {
  const res = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: text,
  });
  // openai sdk は number[] で返すが、型を明示しておく
  return res.data[0].embedding as unknown as number[];
}

type Retrieved = {
  text: string;
  source: string;
  similarity: number;
};

async function searchSupabase(query: string, topK: number): Promise<Retrieved[]> {
  const qEmb = await embedQuery(query);

  const { data, error } = await supabase.rpc(RPC_NAME, {
    query_embedding: qEmb,
    match_count: topK,
  });

  if (error) {
    // RLSや権限不足、RPC名の間違いもここに出る
    throw new Error(`supabase.rpc(${RPC_NAME}) failed: ${error.message}`);
  }

  const rows = (data ?? []) as any[];

  return rows.map((row) => ({
    text: String(row.content ?? row.text ?? ""),
    source: String(row.source ?? ""),
    similarity: Number(row.similarity ?? row.score ?? 0),
  }));
}

function buildMessages(question: string, contexts: { text: string; source: string }[]) {
  const ctx = contexts
    .map((c, i) => `[#${i + 1}] source: ${c.source}\n${c.text}`.trim())
    .join("\n\n");

  const system = `あなたは与えられたコンテキストに基づいて回答するアシスタントです。
コンテキストに根拠がない内容は推測せず、「不明」と答えてください。
回答は日本語で。`;

  const user = `# コンテキスト
${ctx || "(コンテキストなし)"}

# 質問
${question}

# 回答（日本語）
`;

  return [
    { role: "system" as const, content: system },
    { role: "user" as const, content: user },
  ];
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as ChatBody;
    const q = (body.question ?? body.message ?? "").trim();
    if (!q) {
      return NextResponse.json(
        { error: "question (or message) is required" },
        { status: 400 }
      );
    }

    const topK = Math.max(1, Math.min(Number(body.top_k ?? 8), 20));

    // 1) 検索
    const retrieved = await searchSupabase(q, topK);

    // 2) 回答生成
    const messages = buildMessages(
      q,
      retrieved.map((r) => ({ text: r.text, source: r.source }))
    );

    const chat = await openai.chat.completions.create({
      model: env("OPENAI_CHAT_MODEL") ?? "gpt-4.1-mini",
      messages,
      temperature: 0.2,
    });

    const answer = chat.choices[0]?.message?.content ?? "";

    // references 形式（フロントが使いやすい）
    const references = retrieved.map((r) => ({
      source: r.source,
      score: Number(r.similarity),
    }));

    return NextResponse.json({
      answer,
      references,
      meta: {
        top_k: topK,
        rpc: RPC_NAME,
        hits: retrieved.length,
      },
    });
  } catch (e: any) {
    // エラーの見分けがつくようにメッセージを整形
    const msg = `${e?.name ?? "Error"}: ${e?.message ?? String(e)}`;
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
