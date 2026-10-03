import type { Metadata } from 'next';

export const SITE_URL = 'https://interview-coach-seven-rose.vercel.app';
export const WEBSITE_ID = `${SITE_URL}/#website`;
export const APP_ID = `${SITE_URL}/#app`;
export const PERSON_ID = 'https://sahilchalke.com/#person';
const ogImageAlt = 'Interview Coach report showing an overall score of 3.1 out of 5 with per-question scores for STAR, clarity and depth';

/** Page metadata with matching canonical, Open Graph and Twitter fields. */
export function pageMetadata({ title, description, path }: { title: string; description: string; path: string }): Metadata {
  const fullTitle = `${title} | Interview Coach`;
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      type: 'website',
      siteName: 'Interview Coach',
      title: fullTitle,
      description,
      url: path,
      locale: 'en_US',
      images: [{ url: '/opengraph-image.png', width: 1200, height: 630, alt: ogImageAlt }],
    },
    twitter: {
      card: 'summary_large_image',
      creator: '@chalke1015',
      title: fullTitle,
      description,
      images: [{ url: '/twitter-image.png', alt: ogImageAlt }],
    },
  };
}

export function breadcrumbs(items: { name: string; path: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({ '@type': 'ListItem', position: i + 1, name: it.name, item: `${SITE_URL}${it.path}` })),
  };
}
