// app/admin/page.tsx
"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Row = {
  id: string;
  content: string | null;
  created_at: string | null;
};

export default function AdminPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [q, setQ] = useState("");

  async function load() {
    const base = supabase.from("rag_chunks").select("id, content, created_at").order("created_at", { ascending: false }).limit(50);
    const { data, error } = q
      ? await base.ilike("content", `%${q}%`)
      : await base;

    if (error) {
      console.error(error);
      setRows([]);
      return;
    }
    setRows(data || []);
  }

  useEffect(() => {
  const init = async () => {
    await load();
  };
  init();
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, []);

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-6">管理（RAGデータ）</h1>

      <div className="flex gap-2 mb-4">
        <input
          className="border rounded-lg px-3 py-2 flex-1"
          placeholder="テキスト検索"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") load(); }}
        />
        <button onClick={load} className="bg-gray-900 text-white px-4 rounded-lg">
          検索/更新
        </button>
      </div>

      <div className="border rounded-xl bg-white">
        {rows.map((r) => (
          <div key={r.id} className="p-4 border-b last:border-b-0">
            <div className="text-xs text-gray-500 mb-1">{r.id} / {r.created_at}</div>
            <div className="text-sm whitespace-pre-wrap">{r.content}</div>
          </div>
        ))}
        {rows.length === 0 && <div className="p-6 text-sm text-gray-500">データがありません。</div>}
      </div>
    </div>
  );
}
