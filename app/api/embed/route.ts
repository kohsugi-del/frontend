// app/api/embed/route.ts
import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function mustEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} is missing`);
  return v;
}

function getOpenAI() {
  return new OpenAI({ apiKey: mustEnv("OPENAI_API_KEY") });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const q = String(body?.question ?? body?.message ?? "").trim();
    if (!q) return NextResponse.json({ error: "question is required" }, { status: 400 });

    const openai = getOpenAI();
    const model = process.env.CHAT_MODEL || "gpt-4o-mini";

    const completion = await openai.chat.completions.create({
      model,
      messages: [
        { role: "system", content: "あなたはサイトの案内役です。短く分かりやすく日本語で答えてください。" },
        { role: "user", content: q },
      ],
      temperature: 0.4,
    });

    const answer = completion.choices?.[0]?.message?.content?.trim() || "";
    return NextResponse.json({ answer });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? String(e) }, { status: 500 });
  }
}
