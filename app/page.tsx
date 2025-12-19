// app/page.tsx
export default function Home() {
  return (
    <div className="max-w-3xl mx-auto p-6 space-y-3">
      <h1 className="text-2xl font-semibold mb-2">RAG Chatbot</h1>

      <a className="text-blue-600 underline block" href="/chat">
        チャット
      </a>

      <a className="text-blue-600 underline block" href="/ingest">
        ファイル管理（アップロード）
      </a>

      {/* ★ 追加 */}
      <a className="text-blue-600 underline block" href="/websites">
        Webサイト管理
      </a>

      <a className="text-blue-600 underline block" href="/admin">
        管理
      </a>

      <a
        className="text-blue-600 underline block"
        href="/embed"
        target="_blank"
      >
        埋め込みプレビュー
      </a>
    </div>
  );
}
