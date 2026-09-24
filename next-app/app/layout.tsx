import type { Metadata } from 'next';
import './globals.css';

const siteUrl = 'https://genshin-statpaglu.onrender.com';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: 'Genshin StatPaglu — Genshin Build Viewer, UID Checker & Character Stats',
  description: 'Genshin UID build viewer for characters, weapons & gear.',
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
    description: 'Genshin UID build viewer for characters, weapons & gear.',
    siteName: 'Genshin StatPaglu',
    locale: 'en_US'
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Genshin StatPaglu — Genshin Build Viewer',
    description: 'Genshin UID build viewer for characters, weapons & gear.'
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
      description: 'Genshin UID build viewer for characters, weapons & gear.',
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