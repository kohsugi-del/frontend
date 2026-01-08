"use client";

import { useEffect, useState } from "react";
import BackButton from "@/components/BackButton";
import StatusBadge from "@/components/StatusBadge";

const API = process.env.NEXT_PUBLIC_API_BASE!;

type FileItem = {
  id: number;
  filename: string;
  status: "pending" | "processing" | "done" | "error" | string;
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
        setFiles([]);
        return;
      }

      const data = await res.json();
      const list = Array.isArray(data)
        ? data
        : Array.isArray(data?.files)
        ? data.files
        : [];

      setFiles(list);
    } catch (e) {
      console.error(e);
      setFiles([]);
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
        const text = await res.text().catch(() => "");
        throw new Error(`Upload failed: ${res.status}\n${text}`);
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
    const timer = setInterval(fetchFiles, 5000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* 背景の薄いグラデ（統一トーン） */}
      <div className="pointer-events-none fixed inset-0 opacity-45">
        <div className="absolute -top-40 left-10 h-96 w-96 rounded-full bg-fuchsia-500/30 blur-3xl" />
        <div className="absolute top-40 right-10 h-96 w-96 rounded-full bg-cyan-500/25 blur-3xl" />
        <div className="absolute bottom-10 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-emerald-500/15 blur-3xl" />
      </div>

      <div className="relative mx-auto w-full max-w-4xl px-4 py-8">
        {/* Header */}
        <div className="mb-5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <BackButton />
            <div>
              <div className="text-xs text-zinc-400">Ingest</div>
              <h1 className="text-xl font-semibold tracking-tight">
                ファイル管理（アップロード）
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-zinc-300">
              files: {files.length}
            </span>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-zinc-300">
              poll: 5s
            </span>
          </div>
        </div>

        {/* Upload card */}
        <section className="mb-6 rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur">
          <div className="mb-2 text-sm font-semibold">アップロード</div>
          <p className="text-sm text-zinc-400">
            PDFをアップロードすると取り込み（インデックス化）対象として登録されます。
          </p>

          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <label className="inline-flex w-fit cursor-pointer items-center justify-center rounded-xl bg-white px-4 py-2 text-sm font-semibold text-zinc-900 hover:opacity-90">
              <input
                type="file"
                accept=".pdf"
                onChange={uploadFile}
                disabled={loading}
                className="hidden"
              />
              ＋ ファイルを選択
            </label>

            <div className="text-xs text-zinc-400">
              {loading ? "処理中…" : "PDFのみ対応"}
            </div>
          </div>

          {status && (
            <div className="mt-4 rounded-2xl border border-white/10 bg-black/30 p-3 text-sm text-zinc-200">
              {status}
            </div>
          )}
        </section>

        {/* List card */}
        <section className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="text-sm font-semibold">ファイル一覧</div>
            <button
              onClick={fetchFiles}
              disabled={loading}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs hover:bg-white/10 disabled:opacity-60"
            >
              {loading ? "更新中…" : "更新"}
            </button>
          </div>

          {files.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-black/30 p-6 text-sm text-zinc-400">
              まだファイルがありません
            </div>
          ) : (
            <div className="space-y-3">
              {files.map((file) => (
                <div
                  key={file.id}
                  className="rounded-2xl border border-white/10 bg-black/30 p-4 hover:bg-black/40"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    {/* Left */}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <div className="truncate text-sm font-semibold">
                          {file.filename}
                        </div>
                        <span className="text-xs text-zinc-500">#{file.id}</span>
                      </div>

                      <div className="mt-1 text-xs text-zinc-400">
                        {file.ingested_chunks != null &&
                          file.status === "done" && (
                            <>・{file.ingested_chunks} チャンク</>
                          )}
                      </div>
                    </div>

                    {/* Right */}
                    <div className="flex items-center gap-2">
                      <StatusBadge status={file.status} />

                      {(file.status === "done" || file.status === "error") && (
                        <button
                          onClick={() => reingestFile(file.id)}
                          disabled={loading}
                          className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs hover:bg-white/10 disabled:opacity-60"
                          title="再取り込み"
                        >
                          🔄 再
                        </button>
                      )}

                      <button
                        onClick={() => deleteFile(file.id)}
                        disabled={loading}
                        className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-200 hover:bg-red-500/15 disabled:opacity-60"
                        title="削除"
                      >
                        🗑 削
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <div className="mt-8 text-center text-xs text-zinc-500">
          Ingest Dashboard
        </div>
      </div>
    </div>
  );
}
