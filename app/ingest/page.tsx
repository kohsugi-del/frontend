"use client";

import { useEffect, useState } from "react";
import BackButton from "@/components/BackButton";
import StatusBadge from "@/components/StatusBadge";

/**
 * API_BASE を安全に取得する
 * - 未設定なら "" を返す（その場合、各処理で早期return）
 * - 末尾スラッシュは削除して URL を正規化
 */
function getApiBase() {
  const v = process.env.NEXT_PUBLIC_API_BASE;
  if (!v) {
    console.error(
      "NEXT_PUBLIC_API_BASE is missing. Check frontend/.env.local and restart dev server."
    );
    return "";
  }
  return v.replace(/\/$/, "");
}

/**
 * ✅ バックエンドの status を UI 表示用に正規化
 * 要望: "uploaded" は UI上「完了(done)」として扱う
 */
type UiStatus = "pending" | "processing" | "done" | "error";

function normalizeStatusToUi(s: any): UiStatus {
  const v = String(s ?? "").toLowerCase().trim();

  // ★ここがポイント："uploaded" を "done" に寄せる
  if (v === "uploaded") return "done";

  if (v === "pending" || v === "processing" || v === "done" || v === "error") {
    return v;
  }
  return "pending";
}

type FileItem = {
  id: number;
  filename: string;
  status: UiStatus;
  ingested_chunks?: number | null;
  error_message?: string | null;
};

export default function IngestPage() {
  // ====== 一覧 state ======
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(false);

  // ====== status表示 ======
  const [status, setStatus] = useState("");

  // ====== 1) 一覧取得（GET /files） ======
  const fetchFiles = async () => {
    const api = getApiBase();
    console.log("[API_BASE]", api);

    if (!api) {
      setFiles([]);
      setStatus(
        "API_BASE が未設定です。frontend/.env.local を作成して NEXT_PUBLIC_API_BASE を設定し、npm run dev を再起動してください。"
      );
      return;
    }

    try {
      const res = await fetch(`${api}/files`, { cache: "no-store" });

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

      const normalized: FileItem[] = list.map((x: any) => ({
        id: Number(x.id),
        filename: String(x.filename ?? ""),
        status: normalizeStatusToUi(x.status ?? "pending"),
        ingested_chunks: x.ingested_chunks ?? null,
        error_message: x.error_message ?? null,
      }));

      setFiles(normalized);
    } catch (e) {
      console.error(e);
      setFiles([]);
    }
  };

  /**
   * ✅ 1件アップロード→（可能なら）自動取り込み までを1関数に分離
   * 複数選択時はこれをループで呼ぶ
   */
  const uploadOne = async (file: File) => {
    const api = getApiBase();
    if (!api) throw new Error("API_BASE missing");

    // 1) Upload
    const fd = new FormData();
    fd.append("file", file);

    const res = await fetch(`${api}/files`, {
      method: "POST",
      body: fd,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Upload failed: ${res.status}\n${text}`);
    }

    const created = await res.json().catch(() => null);
    const newId = created?.id;

    // 2) 一覧更新（新規行が入る）
    await fetchFiles();

    // 3) id が取れた場合のみ ingest
    if (typeof newId === "number") {
      // UI上、処理中にする
      setFiles((prev) =>
        prev.map((f) => (f.id === newId ? { ...f, status: "processing" } : f))
      );

      const ingestRes = await fetch(`${api}/files/${newId}/ingest_local`, {
        method: "POST",
      });

      if (!ingestRes.ok) {
        const text = await ingestRes.text().catch(() => "");
        throw new Error(`Ingest failed: ${ingestRes.status}\n${text}`);
      }

      const ingestData = await ingestRes.json().catch(() => ({} as any));
      const chunks =
        typeof ingestData?.ingested_chunks === "number"
          ? ingestData.ingested_chunks
          : null;

      // UI反映（この行だけ done）
      setFiles((prev) =>
        prev.map((f) =>
          f.id === newId ? { ...f, status: "done", ingested_chunks: chunks } : f
        )
      );

      return { id: newId, ingested_chunks: chunks };
    }

    // idが無ければここまで（アップロードは成功）
    return { id: null as any, ingested_chunks: null as any };
  };

  // ====== 2) ファイルアップロード（複数選択対応） ======
  const uploadFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const api = getApiBase();
    console.log("[API]", api);

    if (!api) {
      setStatus(
        "API_BASE が未設定です。frontend/.env.local を作成して NEXT_PUBLIC_API_BASE を設定し、npm run dev を再起動してください。"
      );
      e.target.value = "";
      return;
    }

    const selected = Array.from(e.target.files ?? []);
    if (selected.length === 0) return;

    // PDFだけに絞る（念のため）
    const pdfs = selected.filter(
      (f) => f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf")
    );

    if (pdfs.length === 0) {
      setStatus("PDFファイルが選択されていません。");
      e.target.value = "";
      return;
    }

    setLoading(true);

    try {
      setStatus(`アップロード開始：${pdfs.length}件`);

      // ✅ 1件ずつ順番に処理（バックエンドが単発想定でも安全）
      let ok = 0;
      let ng = 0;

      for (let i = 0; i < pdfs.length; i++) {
        const file = pdfs[i];
        setStatus(`(${i + 1}/${pdfs.length}) 処理中：${file.name}`);

        try {
          const r = await uploadOne(file);
          ok++;
          // 成功ログ（必要なら）
          console.log("[UPLOAD OK]", file.name, r);
        } catch (err) {
          ng++;
          console.error("[UPLOAD NG]", file.name, err);
        }
      }

      setStatus(`完了：成功 ${ok}件 / 失敗 ${ng}件`);
      await fetchFiles();
    } catch (err: any) {
      console.error("[UPLOAD ERROR RAW]", err);
      if (String(err?.message || "").includes("Failed to fetch")) {
        setStatus(
          "アップロードに失敗しました（Failed to fetch）。" +
            "原因は多くの場合、①バックエンド未起動/ポート違い ②CORS です。" +
            "ブラウザで http://127.0.0.1:8000/docs が開けるか確認してください。"
        );
      } else {
        setStatus(
          "アップロード/取り込みに失敗しました。詳細はコンソールログを確認してください。"
        );
      }
    } finally {
      setLoading(false);
      // ✅ multiple の場合も選択状態をリセットするため空にする
      e.target.value = "";
    }
  };

  // ====== 3) 再取り込み（POST /files/{id}/ingest_local） ======
  const reingestFile = async (id: number) => {
    const api = getApiBase();
    console.log("[API]", api);

    if (!api) {
      setStatus(
        "API_BASE が未設定です。frontend/.env.local を作成して NEXT_PUBLIC_API_BASE を設定し、npm run dev を再起動してください。"
      );
      return;
    }

    setLoading(true);
    setStatus("再取り込み中…");

    // UI上、処理中にする
    setFiles((prev) =>
      prev.map((f) => (f.id === id ? { ...f, status: "processing" } : f))
    );

    try {
      const res = await fetch(`${api}/files/${id}/ingest_local`, { method: "POST" });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`Reingest failed: ${res.status}\n${text}`);
      }

      const data = await res.json().catch(() => ({} as any));
      const chunks =
        typeof data?.ingested_chunks === "number" ? data.ingested_chunks : null;

      // UI反映
      setFiles((prev) =>
        prev.map((f) =>
          f.id === id ? { ...f, status: "done", ingested_chunks: chunks } : f
        )
      );

      setStatus(`再取り込み完了${chunks != null ? `（${chunks} チャンク）` : ""}`);
      await fetchFiles();
    } catch (e) {
      console.error(e);
      setStatus("再取り込みに失敗しました。");
      setFiles((prev) =>
        prev.map((f) => (f.id === id ? { ...f, status: "error" } : f))
      );
    } finally {
      setLoading(false);
    }
  };

  // ====== 4) 削除（DELETE /files/{id}） ======
  const deleteFile = async (id: number) => {
    const api = getApiBase();
    console.log("[API]", api);

    if (!api) {
      setStatus(
        "API_BASE が未設定です。frontend/.env.local を作成して NEXT_PUBLIC_API_BASE を設定し、npm run dev を再起動してください。"
      );
      return;
    }

    if (!confirm("このファイルを削除しますか？")) return;

    setLoading(true);
    try {
      const res = await fetch(`${api}/files/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`Delete failed: ${res.status}\n${text}`);
      }
      await fetchFiles();
      setStatus("削除しました。");
    } catch (e) {
      console.error(e);
      setStatus("削除に失敗しました。");
    } finally {
      setLoading(false);
    }
  };

  // ====== 初回 & ポーリング ======
  useEffect(() => {
    fetchFiles();
    const timer = setInterval(fetchFiles, 5000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
                multiple // ✅ 複数選択を有効化
                onChange={uploadFile}
                disabled={loading}
                className="hidden"
              />
              ＋ ファイルを選択（複数可）
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
                        {file.ingested_chunks != null && file.status === "done" && (
                          <>・{file.ingested_chunks} チャンク</>
                        )}
                        {file.error_message && <>・エラー: {file.error_message}</>}
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
