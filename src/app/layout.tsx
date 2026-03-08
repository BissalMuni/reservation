import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '강남구 세금상담회 예약',
  description: '현장밀착 열린 세금상담회 예약시스템 - 강남구청 / 한국세무사회',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body className="min-h-screen text-gray-900 antialiased">
        <main className="mx-auto max-w-lg px-4 py-6 pb-12">
          {children}
        </main>
      </body>
    </html>
  );
}
