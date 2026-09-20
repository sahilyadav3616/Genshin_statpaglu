import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  return [{ url: 'https://genshin-statpaglu.onrender.com/', changeFrequency: 'weekly', priority: 1 }];
}
