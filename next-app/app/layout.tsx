import type { Metadata } from 'next';
import './globals.css';

const siteUrl = 'https://genshin-statpaglu.onrender.com';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: 'Genshin StatPaglu — Genshin Build Viewer, UID Checker & Character Stats',
  description: 'Free Genshin Impact build viewer and UID checker. Inspect public character showcases, combat stats, weapons, artifacts, talents and constellations using Enka.Network data.',
  applicationName: 'Genshin StatPaglu',
  alternates: { canonical: '/' },
  keywords: [
    'Genshin StatPaglu',
    'Genshin build viewer',
    'Genshin UID checker',
    'Genshin character stats',
    'Genshin artifact stats',
    'Genshin weapon builds'
  ],
  robots: {
    index: true,
    follow: true,
    'max-image-preview': 'large',
    'max-snippet': -1,
    'max-video-preview': -1
  },
  openGraph: {
    type: 'website',
    url: siteUrl,
    title: 'Genshin StatPaglu — Genshin Build Viewer & Character Stats',
    description: 'Inspect Genshin Impact public showcases with character stats, weapons, artifacts, talents and constellations.',
    siteName: 'Genshin StatPaglu',
    locale: 'en_US'
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Genshin StatPaglu — Genshin Build Viewer',
    description: 'Inspect Genshin Impact character builds and public UID stats.'
  }
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebApplication',
      '@id': siteUrl + '/#app',
      name: 'Genshin StatPaglu',
      alternateName: ['StatPaglu', 'Genshin Stat Paglu'],
      url: siteUrl,
      description: 'Free Genshin Impact build viewer, UID checker and character stats viewer for public showcases.',
      applicationCategory: 'GameApplication',
      operatingSystem: 'Web',
      isAccessibleForFree: true,
      browserRequirements: 'Requires JavaScript'
    },
    {
      '@type': 'WebSite',
      '@id': siteUrl + '/#website',
      url: siteUrl,
      name: 'Genshin StatPaglu',
      alternateName: 'Genshin Build Viewer'
    }
  ]
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <head>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      </head>
      <body>{children}</body>
    </html>
  );
}