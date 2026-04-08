import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '営業FSグループ 売上ダッシュボード',
  description: 'Salesforce スナップショット定点観測',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body className="antialiased">{children}</body>
    </html>
  );
}
