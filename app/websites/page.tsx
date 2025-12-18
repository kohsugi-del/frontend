"use client";

import { useState } from "react";

type CrawlScope = "all" | "single" | "one-level";

type Site = {
  id: number;
  url: string;
  scope: CrawlScope;
  type: "WordPress" | "Headless CMS" | "静的HTML";
};

export default function WebSiteManagePage() {
  const [url, setUrl] = useState("");
  const [scope, setScope] = useState<CrawlScope>("all");

  const [sites, setSites] = useState<Site[]>([
    {
      id: 1,
      url: "https://my-company.jp",
      scope: "all",
      type: "WordPress",
    },
    {
      id: 2,
      url: "https://api.example.com",
      scope: "single",
      type: "Headless CMS",
    },
    {
      id: 3,
      url: "https://personal-site.net",
      scope: "one-level",
      type: "静的HTML",
    },
  ]);

  const addSite = () => {
    if (!url) return;

    setSites((prev) => [
      ...prev,
      {
        id: Date.now(),
        url,
        scope,
        type: "静的HTML",
      },
    ]);
    setUrl("");
  };

  const removeSite = (id: number) => {
    setSites((prev) => prev.filter((s) => s.id !== id));
  };

  const scopeLabel = (scope: CrawlScope) => {
    switch (scope) {
      case "all":
        return "配下の階層すべて";
      case "single":
        return "このURLのみ";
      case "one-level":
        return "1階層下まで";
    }
  };

  return (
    <div className="min-h-screen bg-[#0d1117] text-gray-200 p-4">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <header className="flex items-center justify-between mb-6">
          <button className="text-xl"></button>
          <h1 className="text-lg font-semibold">Webサイトの管理</h1>
          <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center">
            👤
          </div>
        </header>

        {/* Add new website */}
        <section className="bg-[#161b22] rounded-2xl p-5 mb-8">
          <h2 className="text-base font-semibold mb-4">
            新しいWebサイトを追加
          </h2>

          <label className="block mb-3">
            <span className="text-sm text-gray-400">URL</span>
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com"
              className="mt-1 w-full rounded-lg bg-[#0d1117] border border-gray-700 px-3 py-2 text-sm"
            />
          </label>

          <label className="block mb-4">
            <span className="text-sm text-gray-400">クロール範囲</span>
            <select
              value={scope}
              onChange={(e) => setScope(e.target.value as CrawlScope)}
              className="mt-1 w-full rounded-lg bg-[#0d1117] border border-gray-700 px-3 py-2 text-sm"
            >
              <option value="all">配下の階層すべて</option>
              <option value="single">このURLのみ</option>
              <option value="one-level">1階層下まで</option>
            </select>
          </label>

          <button
            onClick={addSite}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white py-2 rounded-xl font-medium"
          >
            ＋ URLを追加
          </button>
        </section>

        {/* Registered sites */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold">
              登録済みWebサイト
            </h2>
            <span className="text-sm text-gray-400">
              {sites.length}件
            </span>
          </div>

          <div className="space-y-3">
            {sites.map((site) => (
              <div
                key={site.id}
                className="bg-[#161b22] rounded-xl p-4 flex items-center justify-between"
              >
                <div>
                  <div className="text-sm font-medium truncate max-w-[220px]">
                    {site.url}
                  </div>
                  <div className="text-xs text-gray-400">
                    クロール範囲：{scopeLabel(site.scope)}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs px-2 py-1 rounded-full bg-blue-900 text-blue-300">
                    {site.type}
                  </span>
                  <button
                    onClick={() => removeSite(site.id)}
                    className="text-gray-400 hover:text-red-400"
                  >
                    🗑
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
