"use client";

import { useEffect, useState } from "react";
import StatusBadge from "@/components/StatusBadge";
import BackButton from "@/components/BackButton";

type Site = {
  id: number;
  url: string;
  scope: string;
  type: string;
  status: "pending" | "crawling" | "done" | "error";
  ingested_urls?: number | null;
};

export default function WebSiteManagePage() {
  const API_BASE = process.env.NEXT_PUBLIC_API_BASE; // ✅ ここで読む（!で握りつぶさない）

  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(false);

  // 追加用 state
  const [url, setUrl] = useState("");
  const [scope, setScope] = useState("all");
  const [type, setType] = useState("静的HTML");
  const [submitting, setSubmitting] = useState(false);

  const api = (path: string) => {
    if (!API_BASE) return ""; // 未設定時は空
    return `${API_BASE.replace(/\/$/, "")}${path}`;
  };

  // 一覧取得
  const fetchSites = async () => {
    if (!API_BASE) {
      console.log("NEXT_PUBLIC_API_BASE が未設定です");
      setSites([]);
      return;
    }

    try {
      const res = await fetch(api("/sites"));

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        console.log("[SITES] status =", res.status, res.statusText);
        console.log("[SITES] body =", text);
        setSites([]);
        return;
      }

      const data = await res.json();

      // ✅ data が配列 or { sites: 配列 } の両対応
      const list: Site[] = Array.isArray(data)
        ? data
        : Array.isArray((data as any)?.sites)
        ? (data as any).sites
        : [];

      setSites(list);
    } catch (e) {
      console.error(e);
      setSites([]);
    }
  };

  // Webサイト追加
  const addSite = async () => {
    if (!url) return;
    if (!API_BASE) {
      alert("NEXT_PUBLIC_API_BASE が未設定です");
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch(api("/sites"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, scope, type }),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`POST /sites failed: ${res.status}\n${text}`);
      }

      setUrl("");
      await fetchSites();
    } catch (e) {
      console.error(e);
      alert("サイト追加に失敗しました（Console を確認してください）");
    } finally {
      setSubmitting(false);
    }
  };

  // 再クロール
  const reingest = async (id: number) => {
    if (!API_BASE) return;

    setLoading(true);
    try {
      const res = await fetch(api(`/sites/${id}/reingest`), { method: "POST" });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`POST /sites/${id}/reingest failed: ${res.status}\n${text}`);
      }
      await fetchSites();
    } finally {
      setLoading(false);
    }
  };

  const deleteSite = async (id: number) => {
    if (!API_BASE) return;
    if (!confirm("このWebサイトを削除しますか？")) return;

    setLoading(true);
    try {
      const res = await fetch(api(`/sites/${id}`), { method: "DELETE" });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`DELETE /sites/${id} failed: ${res.status}\n${text}`);
      }
      await fetchSites();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSites();
    const timer = setInterval(fetchSites, 5000); // 5秒ポーリング
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [API_BASE]);

  return (
    <div className="min-h-screen bg-[#0d1117] text-gray-200 p-4">
      <div className="max-w-md mx-auto">
        <BackButton />

        <h1 className="text-lg font-semibold mb-6 text-center">Webサイト管理</h1>

        {!API_BASE && (
          <div className="bg-red-900/30 border border-red-800 text-red-200 rounded-xl p-3 mb-4 text-sm">
            NEXT_PUBLIC_API_BASE が未設定です（.env.local を確認して Next.js を再起動）
          </div>
        )}

        {/* ===== 新しいWebサイトを追加 ===== */}
        <div className="bg-[#161b22] rounded-xl p-4 mb-6">
          <h2 className="text-sm font-semibold mb-3">新しいWebサイトを追加</h2>

          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com/"
            className="w-full mb-2 rounded bg-[#0d1117] border border-gray-700 px-3 py-2 text-sm"
          />

          <div className="flex gap-2 mb-3">
            <select
              value={scope}
              onChange={(e) => setScope(e.target.value)}
              className="flex-1 rounded bg-[#0d1117] border border-gray-700 px-2 py-2 text-sm"
            >
              <option value="all">配下すべて</option>
              <option value="one-level">1階層下まで</option>
              <option value="single">このURLのみ</option>
            </select>

            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="flex-1 rounded bg-[#0d1117] border border-gray-700 px-2 py-2 text-sm"
            >
              <option value="静的HTML">静的HTML</option>
              <option value="WordPress">WordPress</option>
              <option value="Headless CMS">Headless CMS</option>
            </select>
          </div>

          <button
            onClick={addSite}
            disabled={submitting || !API_BASE}
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white py-2 rounded"
          >
            ＋ Webサイトを追加
          </button>
        </div>

        {/* ===== 登録済みWebサイト一覧 ===== */}
        {sites.length === 0 ? (
          <div className="text-center text-sm text-gray-400">
            まだWebサイトが登録されていません
          </div>
        ) : (
          <div className="space-y-3">
            {sites.map((site) => (
              <div
                key={site.id}
                className="bg-[#161b22] rounded-xl p-4 flex items-center justify-between"
              >
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{site.url}</div>
                  <div className="text-xs text-gray-400 mt-1">
                    {site.type} / {site.scope}
                    {site.ingested_urls != null && site.status === "done" && (
                      <span className="ml-2 text-green-400">
                        ・{site.ingested_urls}ページ取り込み
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <StatusBadge status={site.status} />

                  {(site.status === "done" || site.status === "error") && (
                    <button
                      onClick={() => reingest(site.id)}
                      disabled={loading || !API_BASE}
                      className="text-xs px-2 py-1 rounded bg-gray-700 hover:bg-gray-600"
                    >
                      🔄
                    </button>
                  )}

                  <button
                    onClick={() => deleteSite(site.id)}
                    disabled={loading || !API_BASE}
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
