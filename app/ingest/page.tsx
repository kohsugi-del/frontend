"use client";

import { useEffect, useState } from "react";
import BackButton from "@/components/BackButton";
import StatusBadge from "@/components/StatusBadge";

const API = process.env.NEXT_PUBLIC_API_BASE!;

type FileItem = {
  id: number;
  filename: string;
  status: "pending" | "processing" | "done" | "error";
  ingested_chunks?: number | null;
};

export default function IngestPage() {
  // ====== 一覧 state ======
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(false);

  // ====== status表示 ======
  const [status, setStatus] = useState("");

  // ====== 1) 一覧取得（GET /files） ======
  const fetchFiles = async () => {
    try {
      const res = await fetch(`${API}/files`);

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        console.log("[FILES] status =", res.status, res.statusText);
        console.log("[FILES] body =", text);
        setFiles([]); // 失敗時は空配列にして落とさない
        return;
      }

      const data = await res.json();

      // ✅ APIが配列を直接返す場合: data が配列
      // ✅ APIが { files: [...] } を返す場合: data.files が配列
      const list = Array.isArray(data) ? data : Array.isArray(data?.files) ? data.files : [];

      setFiles(list);
    } catch (e) {
      console.error(e);
      setFiles([]); // ネットワークエラー等でも落とさない
    }
  };


  // ====== 2) ファイルアップロード（POST /files） ======
  const uploadFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setStatus("ファイルをアップロード中…");

    try {
      const fd = new FormData();
      fd.append("file", file);

      const res = await fetch(`${API}/files`, {
        method: "POST",
        body: fd,
      });

      if (!res.ok) {
        throw new Error(`Upload failed: ${res.status}`);
      }

      setStatus(`アップロード完了：${file.name}`);
      await fetchFiles();
    } catch (err) {
      console.error(err);
      setStatus("アップロードに失敗しました。");
    } finally {
      setLoading(false);
      e.target.value = "";
    }
  };

  // ====== 3) 再取り込み（POST /files/{id}/reingest） ======
  const reingestFile = async (id: number) => {
    setLoading(true);
    try {
      await fetch(`${API}/files/${id}/reingest`, { method: "POST" });
      await fetchFiles();
    } finally {
      setLoading(false);
    }
  };

  // ====== 4) 削除（DELETE /files/{id}） ======
  const deleteFile = async (id: number) => {
    if (!confirm("このファイルを削除しますか？")) return;

    setLoading(true);
    try {
      await fetch(`${API}/files/${id}`, { method: "DELETE" });
      await fetchFiles();
    } finally {
      setLoading(false);
    }
  };

  // ====== 初回 & ポーリング ======
  useEffect(() => {
    fetchFiles();
    const timer = setInterval(fetchFiles, 5000); // 5秒ポーリング
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="min-h-screen bg-[#0d1117] text-gray-200 p-4">
      <div className="max-w-md mx-auto">
        <BackButton />

        <h1 className="text-lg font-semibold mb-6 text-center">
          ファイル管理（アップロード）
        </h1>

        {/* ====== アップロードUI（上部） ====== */}
        <div className="bg-[#161b22] rounded-xl p-4 mb-6">
          <p className="text-sm text-gray-400 mb-3">
            PDFをアップロードすると自動で取り込み（インデックス化）します。
          </p>

          <label className="block">
            <input
              type="file"
              accept=".pdf"
              onChange={uploadFile}
              disabled={loading}
              className="hidden"
            />
            <span className="inline-block cursor-pointer bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white px-4 py-2 rounded">
              ＋ ファイルを選択
            </span>
          </label>

          {status && <div className="mt-3 text-sm opacity-90">{status}</div>}
        </div>

        {/* ====== ここが「あなたが貼った files.map」の置き場所（下部一覧） ====== */}
        {files.length === 0 ? (
          <div className="text-center text-sm text-gray-400">
            まだファイルがありません
          </div>
        ) : (
          <div className="space-y-3">
            {files.map((file) => (
              <div
                key={file.id}
                className="bg-[#161b22] rounded-xl p-4 flex justify-between"
              >
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">
                    {file.filename}
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    {file.ingested_chunks != null && file.status === "done" && (
                      <>・{file.ingested_chunks}チャンク</>
                    )}
                  </div>
                </div>

                <div className="flex gap-2 items-center">
                  <StatusBadge status={file.status} />

                  {(file.status === "done" || file.status === "error") && (
                    <button
                      onClick={() => reingestFile(file.id)}
                      disabled={loading}
                      className="text-xs px-2 py-1 rounded bg-gray-700 hover:bg-gray-600"
                      title="再取り込み"
                    >
                      🔄
                    </button>
                  )}

                  <button
                    onClick={() => deleteFile(file.id)}
                    disabled={loading}
                    className="text-xs px-2 py-1 rounded bg-red-700 hover:bg-red-600"
                    title="削除"
                  >
                    🗑
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
