// app/page.tsx
import Link from "next/link";

type Card = {
  title: string;
  desc: string;
  href: string;
  icon: string;
  badge?: { label: string; tone: "ok" | "warn" | "info" };
};

const cards: Card[] = [
  {
    title: "チャット",
    desc: "質問 → 根拠検索 → 回答生成（RAG）をテスト",
    href: "/chat",
    icon: "💬",
    badge: { label: "Ready", tone: "ok" },
  },
  {
    title: "ファイル管理",
    desc: "PDF/ファイルのアップロード・一覧・再取り込み",
    href: "/ingest",
    icon: "📄",
    badge: { label: "Manage", tone: "info" },
  },
  {
    title: "Webサイト管理",
    desc: "サイト登録・状態確認・再ingestキュー",
    href: "/websites",
    icon: "🌐",
    badge: { label: "Ingest", tone: "info" },
  },
  {
    title: "管理",
    desc: "全体設定・実行状況・メンテナンス",
    href: "/admin",
    icon: "🛠️",
    badge: { label: "Admin", tone: "warn" },
  },
];

function Badge({ tone, label }: { tone: "ok" | "warn" | "info"; label: string }) {
  const cls =
    tone === "ok"
      ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/20"
      : tone === "warn"
      ? "bg-amber-500/15 text-amber-300 border-amber-500/20"
      : "bg-sky-500/15 text-sky-300 border-sky-500/20";

  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs ${cls}`}>
      {label}
    </span>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
      <div className="text-xs text-zinc-400">{label}</div>
      <div className="mt-1 text-lg font-semibold">{value}</div>
    </div>
  );
}

export default function Home() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* 背景（単調さ解消：薄いグラデ＋blur） */}
      <div className="pointer-events-none fixed inset-0 opacity-45">
        <div className="absolute -top-40 left-10 h-96 w-96 rounded-full bg-fuchsia-500/30 blur-3xl" />
        <div className="absolute top-40 right-10 h-96 w-96 rounded-full bg-cyan-500/25 blur-3xl" />
        <div className="absolute bottom-10 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-emerald-500/15 blur-3xl" />
      </div>

      <div className="relative mx-auto w-full max-w-6xl px-6 py-10">
        {/* Top bar */}
        <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-sm text-zinc-400">RAG Chatbot</div>
            <h1 className="text-2xl font-semibold tracking-tight">
              はたらくあさひかわ — 管理ダッシュボード
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <a
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm hover:bg-white/10"
              href="/embed"
              target="_blank"
              rel="noreferrer"
            >
              埋め込みプレビュー ↗
            </a>
            <a
              className="rounded-xl bg-white px-3 py-2 text-sm font-semibold text-zinc-900 hover:opacity-90"
              href="/chat"
            >
              チャットを開く
            </a>
          </div>
        </div>

        {/* Hero */}
        <section className="mb-6 rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/30 px-3 py-1 text-xs text-zinc-300">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                System online
              </div>
              <h2 className="mt-3 text-xl font-semibold tracking-tight">
                チャット精度とデータ更新を、ここから一括管理
              </h2>
              <p className="mt-1 text-sm text-zinc-400">
                ingest（夜間自動）・ファイル・サイト・チャット動作確認を、最短導線でまとめました。
              </p>
            </div>

            <div className="grid w-full grid-cols-2 gap-3 md:w-[420px]">
              <Stat label="学習データ" value="Documents: —" />
              <Stat label="最終Ingest" value="—" />
              <Stat label="状態" value="OK" />
              <Stat label="環境" value="Local / Actions" />
            </div>
          </div>
        </section>

        {/* Quick actions */}
        <section className="mb-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {cards.map((c) => (
            <Link
              key={c.href}
              href={c.href}
              className="group rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur transition hover:border-white/20 hover:bg-white/10"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="text-2xl">{c.icon}</div>
                {c.badge ? <Badge tone={c.badge.tone} label={c.badge.label} /> : null}
              </div>

              <div className="mt-4">
                <div className="text-base font-semibold">{c.title}</div>
                <div className="mt-1 text-sm text-zinc-400">{c.desc}</div>
              </div>

              <div className="mt-4 text-sm text-zinc-300">
                <span className="opacity-70 group-hover:opacity-100">開く</span> →
              </div>
            </Link>
          ))}
        </section>

        {/* Activity / Tips */}
        <div className="grid gap-6 lg:grid-cols-3">
          <section className="lg:col-span-2 rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-zinc-400">Recent</div>
                <div className="text-lg font-semibold">最近の操作</div>
              </div>
              <span className="text-xs text-zinc-400">（今はダミー表示）</span>
            </div>

            <div className="mt-4 space-y-3">
              {[
                { title: "Nightly ingest 実行", meta: "GitHub Actions / 成功", time: "—" },
                { title: "documents 更新", meta: "Supabase", time: "—" },
                { title: "チャットテスト", meta: "Local", time: "—" },
              ].map((r, i) => (
                <div
                  key={i}
                  className="rounded-2xl border border-white/10 bg-black/30 p-4 hover:bg-black/40"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="font-medium">{r.title}</div>
                    <div className="text-xs text-zinc-400">{r.time}</div>
                  </div>
                  <div className="mt-1 text-sm text-zinc-400">{r.meta}</div>
                </div>
              ))}
            </div>
          </section>

          <aside className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur">
            <div className="text-sm text-zinc-400">Tips</div>
            <div className="text-lg font-semibold">精度を上げるコツ</div>

            <ul className="mt-4 space-y-3 text-sm text-zinc-300">
              <li className="rounded-2xl border border-white/10 bg-black/30 p-4">
                <div className="font-medium">まず /about/ を学習対象へ</div>
                <div className="mt-1 text-zinc-400">
                  「〜とは？」系の質問は概要ページが根拠になります。
                </div>
              </li>
              <li className="rounded-2xl border border-white/10 bg-black/30 p-4">
                <div className="font-medium">top_k を 8〜12 に</div>
                <div className="mt-1 text-zinc-400">
                  根拠が少ないと外しやすいので、まず拾う量を増やします。
                </div>
              </li>
              <li className="rounded-2xl border border-white/10 bg-black/30 p-4">
                <div className="font-medium">参照リンクを表示</div>
                <div className="mt-1 text-zinc-400">
                  URLとタイトルを出すだけで信頼性が一段上がります。
                </div>
              </li>
            </ul>

            <div className="mt-6 flex gap-2">
              <Link
                href="/chat"
                className="flex-1 rounded-xl bg-white px-3 py-2 text-center text-sm font-semibold text-zinc-900 hover:opacity-90"
              >
                チャットへ
              </Link>
              <Link
                href="/websites"
                className="flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-center text-sm hover:bg-white/10"
              >
                サイト管理へ
              </Link>
            </div>
          </aside>
        </div>

        {/* Footer */}
        <footer className="mt-10 text-center text-xs text-zinc-500">
          © RAG Chatbot Dashboard
        </footer>
      </div>
    </div>
  );
}
