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

type BulkResult = {
  total: number;
  ok: { url: string; id?: number | null }[];
  ng: { url: string; reason: string }[];
};

export default function WebSiteManagePage() {
  const API_BASE = process.env.NEXT_PUBLIC_API_BASE;

  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(false);

  // 追加用 state（単一）
  const [url, setUrl] = useState("");

  // ✅ scope は「このURLのみ」が基本、2択のみ
  const [scope, setScope] = useState<"single" | "all">("single");

  // ✅ type はUIから消す（送信は固定）
  const FIXED_TYPE = "静的HTML";

  const [submitting, setSubmitting] = useState(false);

  // ✅ 追加後に取り込み開始するか（任意）
  const [autoIngest, setAutoIngest] = useState(false);

  // ✅ 一括追加モード
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkText, setBulkText] = useState("");
  const [bulkResult, setBulkResult] = useState<BulkResult | null>(null);

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
        : Array.isArray((data as any)?.items)
        ? (data as any).items
        : Array.isArray((data as any)?.data)
        ? (data as any).data
        : [];

      setSites(list);
    } catch (e) {
      console.error(e);
      setSites([]);
    }
  };

  /**
   * ✅ 取り込み開始（サイト用）
   * - 本命: POST /sites/{id}/reingest_local
   * - 互換: POST /sites/{id}/reingest
   */
  const startIngest = async (id: number) => {
    if (!API_BASE) return;

    setLoading(true);

    const candidates = [
      `/sites/${id}/reingest_local`,
      `/sites/${id}/reingest`,
    ];

    try {
      let lastErr: unknown = null;

      for (const path of candidates) {
        const fullUrl = api(path);

        const res = await fetch(fullUrl, { method: "POST" });
        if (res.ok) {
          await fetchSites();
          return;
        }

        const text = await res.text().catch(() => "");
        if (res.status === 404 || res.status === 405) {
          lastErr = new Error(`POST ${fullUrl} => ${res.status}\n${text}`);
          continue;
        }
        throw new Error(`POST ${fullUrl} => ${res.status}\n${text}`);
      }

      throw lastErr ?? new Error("All ingest endpoints failed");
    } catch (e) {
      console.error(e);
      alert("取り込み開始に失敗しました（Console / Network を確認してください）");
    } finally {
      setLoading(false);
    }
  };

  // ✅ URL抽出（改行 / スペース / タブ / カンマ区切りを許容）
  const parseUrls = (text: string) => {
    const tokens = text
      .split(/[\n\r\t ,]+/g)
      .map((s) => s.trim())
      .filter(Boolean);

    const seen = new Set<string>();
    const unique: string[] = [];
    for (const t of tokens) {
      if (!seen.has(t)) {
        seen.add(t);
        unique.push(t);
      }
    }
    return unique;
  };

  // Webサイト追加（単一）
  const addSite = async () => {
    const u = url.trim();
    if (!u) return;

    if (!API_BASE) {
      alert("NEXT_PUBLIC_API_BASE が未設定です");
      return;
    }

    setSubmitting(true);
    setBulkResult(null);

    try {
      const res = await fetch(api("/sites"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // ✅ type は固定で送る
        body: JSON.stringify({ url: u, scope, type: FIXED_TYPE }),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`POST /sites failed: ${res.status}\n${text}`);
      }

      let createdId: number | null = null;
      try {
        const data = await res.json().catch(() => null);
        const id1 = (data as any)?.id;
        const id2 = (data as any)?.site?.id;
        const id3 = (data as any)?.data?.id;
        if (typeof id1 === "number") createdId = id1;
        else if (typeof id2 === "number") createdId = id2;
        else if (typeof id3 === "number") createdId = id3;
      } catch {}

      setUrl("");

      if (autoIngest && createdId != null) {
        await startIngest(createdId);
      } else {
        await fetchSites();
      }
    } catch (e) {
      console.error(e);
      alert("サイト追加に失敗しました（Console / Network を確認してください）");
    } finally {
      setSubmitting(false);
    }
  };

  // ✅ Webサイト追加（一括）
  const addSitesBulk = async () => {
    if (!API_BASE) {
      alert("NEXT_PUBLIC_API_BASE が未設定です");
      return;
    }

    const urls = parseUrls(bulkText);
    if (urls.length === 0) return;

    setSubmitting(true);
    setBulkResult(null);

    try {
      const results = await Promise.allSettled(
        urls.map(async (u) => {
          const res = await fetch(api("/sites"), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            // ✅ type は固定で送る
            body: JSON.stringify({ url: u, scope, type: FIXED_TYPE }),
          });

          if (!res.ok) {
            const text = await res.text().catch(() => "");
            throw new Error(
              `POST /sites failed: ${res.status} ${res.statusText}\n${text}`
            );
          }

          let createdId: number | null = null;
          try {
            const data = await res.json().catch(() => null);
            const id1 = (data as any)?.id;
            const id2 = (data as any)?.site?.id;
            const id3 = (data as any)?.data?.id;
            if (typeof id1 === "number") createdId = id1;
            else if (typeof id2 === "number") createdId = id2;
            else if (typeof id3 === "number") createdId = id3;
          } catch {}

          return { url: u, id: createdId };
        })
      );

      const ok: BulkResult["ok"] = [];
      const ng: BulkResult["ng"] = [];

      for (let i = 0; i < results.length; i++) {
        const u = urls[i];
        const r = results[i];
        if (r.status === "fulfilled") ok.push(r.value);
        else
          ng.push({
            url: u,
            reason: String(r.reason?.message ?? r.reason ?? "unknown"),
          });
      }

      setBulkResult({ total: urls.length, ok, ng });

      if (autoIngest) {
        const ids = ok.map((x) => x.id).filter((v): v is number => typeof v === "number");
        for (const id of ids) {
          await startIngest(id);
        }
      } else {
        await fetchSites();
      }

      setBulkText("");
    } catch (e) {
      console.error(e);
      alert("一括追加に失敗しました（Console / Network を確認してください）");
    } finally {
      setSubmitting(false);
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
    } catch (e) {
      console.error(e);
      alert("削除に失敗しました（Console / Network を確認してください）");
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
      <div className="pointer-events-none fixed inset-0 opacity-45">
        <div className="absolute -top-40 left-10 h-96 w-96 rounded-full bg-fuchsia-500/30 blur-3xl" />
        <div className="absolute top-40 right-10 h-96 w-96 rounded-full bg-cyan-500/25 blur-3xl" />
        <div className="absolute bottom-10 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-emerald-500/15 blur-3xl" />
      </div>

      <div className="relative mx-auto w-full max-w-4xl px-4 py-8">
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
          <div className="mb-2 flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold">新しいWebサイトを追加</div>
              <p className="text-sm text-zinc-400">
                URL・対象範囲を指定して登録します（基本は「このURLのみ」）。
              </p>
            </div>

            <button
              onClick={() => {
                setBulkMode((v) => !v);
                setBulkResult(null);
              }}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs hover:bg-white/10"
              title="入力モード切替"
            >
              {bulkMode ? "単一入力へ" : "一括入力へ"}
            </button>
          </div>

          <div className="mt-4 space-y-3">
            {!bulkMode ? (
              <input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com/"
                className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none placeholder:text-zinc-500 focus:border-white/20"
              />
            ) : (
              <textarea
                value={bulkText}
                onChange={(e) => setBulkText(e.target.value)}
                placeholder={`https://example.com/\nhttps://example.org/\nhttps://example.net/`}
                rows={6}
                className="w-full resize-y rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none placeholder:text-zinc-500 focus:border-white/20"
              />
            )}

            {/* ✅ scope は2択のみ（デフォルト single） */}
            <div className="grid gap-2 sm:grid-cols-2">
              <select
                value={scope}
                onChange={(e) => setScope(e.target.value as "single" | "all")}
                className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none focus:border-white/20"
              >
                <option value="single">このURLのみ（基本）</option>
                <option value="all">配下すべて</option>
              </select>

              {/* 右側は空きスペースにして見た目を揃える（不要なら消してOK） */}
              <div className="hidden sm:block" />
            </div>

            <label className="flex items-center gap-2 text-xs text-zinc-300">
              <input
                type="checkbox"
                checked={autoIngest}
                onChange={(e) => setAutoIngest(e.target.checked)}
                className="h-4 w-4"
              />
              追加後に取り込み開始する（id が返る場合のみ）
            </label>

            <button
              onClick={bulkMode ? addSitesBulk : addSite}
              disabled={submitting || !API_BASE}
              className="w-full rounded-xl bg-white px-4 py-2 text-sm font-semibold text-zinc-900 hover:opacity-90 disabled:opacity-60"
            >
              {submitting
                ? bulkMode
                  ? "一括追加中…"
                  : "追加中…"
                : bulkMode
                ? "＋ Webサイトを一括追加"
                : "＋ Webサイトを追加"}
            </button>

            {bulkMode && (
              <div className="text-xs text-zinc-400">
                ※ 改行/スペース/カンマ区切りOK・重複URLは自動で除外します
              </div>
            )}

            {bulkResult && (
              <div className="rounded-2xl border border-white/10 bg-black/30 p-4 text-xs text-zinc-300">
                <div className="font-semibold">
                  一括追加結果：{bulkResult.total}件中 {bulkResult.ok.length}件成功 /{" "}
                  {bulkResult.ng.length}件失敗
                </div>

                {bulkResult.ng.length > 0 && (
                  <div className="mt-2 space-y-1 text-red-200">
                    {bulkResult.ng.slice(0, 5).map((x) => (
                      <div key={x.url} className="truncate">
                        NG: {x.url}（{x.reason}）
                      </div>
                    ))}
                    {bulkResult.ng.length > 5 && (
                      <div className="text-zinc-400">…他 {bulkResult.ng.length - 5} 件</div>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="text-xs text-zinc-400">※ API が未設定の場合は追加できません</div>
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
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <div className="truncate text-sm font-semibold">{site.url}</div>
                        <span className="text-xs text-zinc-500">#{site.id}</span>
                      </div>

                      <div className="mt-1 text-xs text-zinc-400">
                        {/* ✅ type は固定だが、一覧表示はそのままでもOK（不要なら消してOK） */}
                        {site.type} / {site.scope}
                        {site.ingested_urls != null && site.status === "done" && (
                          <span className="ml-2 text-emerald-300">
                            ・{site.ingested_urls}ページ取り込み
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <StatusBadge status={site.status} />

                      <button
                        onClick={() => startIngest(site.id)}
                        disabled={loading || !API_BASE || site.status === "crawling"}
                        className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs hover:bg-white/10 disabled:opacity-60"
                        title="取り込み開始"
                      >
                        ▶ 取
                      </button>

                      {(site.status === "done" || site.status === "error") && (
                        <button
                          onClick={() => startIngest(site.id)}
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

        <div className="mt-8 text-center text-xs text-zinc-500">Sites Dashboard</div>
      </div>
    </div>
  );
}
