// app/layout.tsx
import "./globals.css";

export const metadata = {
  title: "Chatbot",
  description: "RAG Chatbot",
};

export default function RootLayout({
  children,
}: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
