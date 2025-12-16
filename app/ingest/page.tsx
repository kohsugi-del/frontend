// app/ingest/page.tsx
"use client";
import { useState } from "react";

const API = process.env.NEXT_PUBLIC_API_BASE || "http://127.0.0.1:8000";

export default function IngestPage() {
  const [urls, setUrls] = useState(
    [
      "https://www.hataraku-asahikawa.jp/",
      "https://www.hataraku-asahikawa.jp/htrk/",
      "https://www.hataraku-asahikawa.jp/about/",
    ].join("\n")
  );
  const [status, setStatus] = useState("");

  const ingestUrls = async () => {
    setStatus("URL取り込み中…");
    try {
      const list = urls.split("\n").map((s) => s.trim()).filter(Boolean);
      const res = await fetch(`${API}/ingest`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ web_urls: list, pdf_paths: [] }),
      });
      const data = await res.json();
      setStatus(`完了: 追加チャンク ${data?.added_chunks ?? 0}`);
    } catch (e) {
      console.error(e);
      setStatus("失敗しました。バックエンド（FastAPI）を確認してください。");
    }
  };

  const uploadPdf = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setStatus("PDFアップロード中…");
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`${API}/upload_pdf`, { method: "POST", body: fd });
      const data = await res.json();
      setStatus(`完了: ${data?.path ?? ""} / 追加チャンク ${data?.added_chunks ?? 0}`);
    } catch (err) {
      console.error(err);
      setStatus("アップロード失敗。");
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-6">Webサイト / ファイル取り込み</h1>

      <div className="mb-6">
        <label className="block mb-2">URL（改行区切り）</label>
        <textarea
          className="w-full h-40 bg-[#161B22] p-3 rounded-lg text-gray-200"
          value={urls}
          onChange={(e) => setUrls(e.target.value)}
        />
        <button
          className="mt-3 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg"
          onClick={ingestUrls}
        >
          URLを取り込む
        </button>
      </div>

      <div className="mb-6">
        <label className="block mb-2">PDFアップロード</label>
        <input type="file" accept=".pdf" onChange={uploadPdf} />
      </div>

      <div className="text-sm opacity-80">{status}</div>
    </div>
  );
}
