import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'PIRLS 智慧閱讀素養評量與診斷系統',
  description: '依循 IEA PIRLS 國際標準，為國小 3 至 6 年級打造的智慧閱讀出題、批改與常模落點診斷平臺',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-TW">
      <body className="antialiased font-sans">
        {children}
      </body>
    </html>
  );
}
