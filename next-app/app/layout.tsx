import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Genshin StatPaglu | Genshin Build Viewer & Stats',
  description: 'Free Genshin Impact build viewer and UID stat checker. View public character showcases, weapons, artifacts, talents, constellations and combat stats from Enka.Network.',
  applicationName: 'Genshin StatPaglu',
  keywords: [
    'Genshin StatPaglu',
    'Genshin build viewer',
    'Genshin build checker',
    'Genshin stats checker',
    'Genshin UID checker',
    'Genshin character showcase',
    'Genshin artifact stats',
    'Genshin weapon stats',
    'Genshin Enka viewer'
  ],
  robots: { index: true, follow: true, 'max-image-preview': 'large' },
  openGraph: {
    type: 'website',
    title: 'Genshin StatPaglu | Genshin Build Viewer & Stats',
    description: 'View Genshin Impact character builds, artifacts, weapons, talents and combat stats from a public UID.',
    siteName: 'Genshin StatPaglu'
  },
  twitter: {
    card: 'summary',
    title: 'Genshin StatPaglu | Genshin Build Viewer & Stats',
    description: 'Free Genshin Impact UID build viewer for public character showcases.'
  }
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}