import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Genshin StatPaglu — Genshin builds & stats',
  description: 'A clean Genshin Impact public showcase viewer powered by Enka.Network data.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}