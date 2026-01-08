"use client";

import { useEffect, useState } from "react";
import StatusBadge from "@/components/StatusBadge";
import BackButton from "@/components/BackButton";

type Site = {
  id: number;
  url: string;
  scope: string;
  type: string;
  status: "pending" | "crawling" | "done" | "error" | string;
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
    if (!API_BASE) return "";
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
    const timer = setInterval(fetchSites, 5000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [API_BASE]);

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
              <div className="text-xs text-zinc-400">Sites</div>
              <h1 className="text-xl font-semibold tracking-tight">Webサイト管理</h1>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-zinc-300">
              sites: {sites.length}
            </span>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-zinc-300">
              poll: 5s
            </span>
          </div>
        </div>

        {!API_BASE && (
          <div className="mb-6 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200">
            NEXT_PUBLIC_API_BASE が未設定です（.env.local を確認して Next.js を再起動）
          </div>
        )}

        {/* Add site card */}
        <section className="mb-6 rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur">
          <div className="mb-2 text-sm font-semibold">新しいWebサイトを追加</div>
          <p className="text-sm text-zinc-400">
            URL・対象範囲・種別を指定して登録します（取り込みは別途実行）。
          </p>

          <div className="mt-4 space-y-3">
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com/"
              className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none placeholder:text-zinc-500 focus:border-white/20"
            />

            <div className="grid gap-2 sm:grid-cols-2">
              <select
                value={scope}
                onChange={(e) => setScope(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none focus:border-white/20"
              >
                <option value="all">配下すべて</option>
                <option value="one-level">1階層下まで</option>
                <option value="single">このURLのみ</option>
              </select>

              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none focus:border-white/20"
              >
                <option value="静的HTML">静的HTML</option>
                <option value="WordPress">WordPress</option>
                <option value="Headless CMS">Headless CMS</option>
              </select>
            </div>

            <button
              onClick={addSite}
              disabled={submitting || !API_BASE}
              className="w-full rounded-xl bg-white px-4 py-2 text-sm font-semibold text-zinc-900 hover:opacity-90 disabled:opacity-60"
            >
              {submitting ? "追加中…" : "＋ Webサイトを追加"}
            </button>

            <div className="text-xs text-zinc-400">
              ※ API が未設定の場合は追加できません
            </div>
          </div>
        </section>

        {/* List card */}
        <section className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="text-sm font-semibold">登録済みWebサイト一覧</div>
            <button
              onClick={fetchSites}
              disabled={loading || !API_BASE}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs hover:bg-white/10 disabled:opacity-60"
            >
              {loading ? "更新中…" : "更新"}
            </button>
          </div>

          {sites.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-black/30 p-6 text-sm text-zinc-400">
              まだWebサイトが登録されていません
            </div>
          ) : (
            <div className="space-y-3">
              {sites.map((site) => (
                <div
                  key={site.id}
                  className="rounded-2xl border border-white/10 bg-black/30 p-4 hover:bg-black/40"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    {/* Left */}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <div className="truncate text-sm font-semibold">{site.url}</div>
                        <span className="text-xs text-zinc-500">#{site.id}</span>
                      </div>

                      <div className="mt-1 text-xs text-zinc-400">
                        {site.type} / {site.scope}
                        {site.ingested_urls != null && site.status === "done" && (
                          <span className="ml-2 text-emerald-300">
                            ・{site.ingested_urls}ページ取り込み
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Right */}
                    <div className="flex items-center gap-2">
                      <StatusBadge status={site.status} />

                      {(site.status === "done" || site.status === "error") && (
                        <button
                          onClick={() => reingest(site.id)}
                          disabled={loading || !API_BASE}
                          className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs hover:bg-white/10 disabled:opacity-60"
                          title="再取り込み"
                        >
                          🔄 再
                        </button>
                      )}

                      <button
                        onClick={() => deleteSite(site.id)}
                        disabled={loading || !API_BASE}
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
          Sites Dashboard
        </div>
      </div>
    </div>
  );
}
