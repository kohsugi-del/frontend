// app/ingest/page.tsx
"use client";

import { useState } from "react";

const API = process.env.NEXT_PUBLIC_API_BASE || "http://127.0.0.1:8000";

export default function IngestPage() {
  const [urls, setUrls] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // URL取り込み
  const ingestUrls = async () => {
    if (!urls.trim()) return;
    setLoading(true);
    setStatus("🔗 URLを取り込み中…");

    try {
      const list = urls
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean);

      const res = await fetch(`${API}/ingest`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ web_urls: list, pdf_paths: [] }),
      });

      const data = await res.json();
      setStatus(`✅ URL取り込み完了（追加チャンク数：${data?.added_chunks ?? 0}）`);
      setUrls("");
    } catch (e) {
      console.error(e);
      setStatus("❌ URL取り込みに失敗しました");
    } finally {
      setLoading(false);
    }
  };

  // PDFアップロード
  const uploadPdf = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setStatus("📄 PDFをアップロード中…");

    try {
      const fd = new FormData();
      fd.append("file", file);

      const res = await fetch(`${API}/upload_pdf`, {
        method: "POST",
        body: fd,
      });

      const data = await res.json();
      setStatus(
        `✅ PDF登録完了：${file.name}（追加チャンク数：${data?.added_chunks ?? 0}）`
      );
    } catch (err) {
      console.error(err);
      setStatus("❌ PDFアップロードに失敗しました");
    } finally {
      setLoading(false);
      e.target.value = "";
    }
  };

  return (
    <div className="min-h-screen bg-[#0d1117] text-gray-200 p-6">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <h1 className="text-xl font-semibold mb-6 text-center">Manage Files</h1>

        {/* Upload Card */}
        <div className="border border-dashed border-gray-600 rounded-xl p-6 bg-[#161b22] mb-6">
          <div className="text-center mb-4">
            <div className="text-sm text-gray-400 mb-1">
              PDF / URL をアップロード
            </div>
            <div className="text-xs text-gray-500">
              アップロードされた内容は自動的にAIにインデックスされます
            </div>
          </div>

          {/* PDF Upload */}
          <label className="block mb-4">
            <span className="block text-sm mb-1">PDFファイル</span>
            <input
              type="file"
              accept=".pdf"
              onChange={uploadPdf}
              className="block w-full text-sm file:mr-4 file:py-2 file:px-4
                file:rounded-lg file:border-0
                file:bg-blue-600 file:text-white
                hover:file:bg-blue-500"
            />
          </label>

          {/* URL Input */}
          <label className="block mb-4">
            <span className="block text-sm mb-1">Web URL（改行区切り）</span>
            <textarea
              value={urls}
              onChange={(e) => setUrls(e.target.value)}
              placeholder="https://example.com"
              className="w-full h-28 rounded-lg bg-[#0d1117] border border-gray-700 p-3 text-sm"
            />
          </label>

          <button
            onClick={ingestUrls}
            disabled={loading}
            className="w-full py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50"
          >
            {loading ? "処理中…" : "Upload"}
          </button>
        </div>

        {/* Status */}
        {status && (
          <div className="text-xs bg-[#161b22] border border-gray-700 rounded-lg p-3">
            {status}
          </div>
        )}
      </div>
    </div>
  );
}
