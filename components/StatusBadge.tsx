type Status = "pending" | "crawling" | "done" | "error";

export default function StatusBadge({ status }: { status: Status }) {
  const map: Record<Status, { label: string; className: string }> = {
    pending: {
      label: "準備中",
      className: "bg-yellow-900 text-yellow-300",
    },
    crawling: {
      label: "クロール中",
      className: "bg-blue-900 text-blue-300 animate-pulse",
    },
    done: {
      label: "完了",
      className: "bg-green-900 text-green-300",
    },
    error: {
      label: "エラー",
      className: "bg-red-900 text-red-300",
    },
  };

  const s = map[status];

  return (
    <span
      className={`text-xs px-2 py-1 rounded-full font-medium ${s.className}`}
    >
      {s.label}
    </span>
  );
}
