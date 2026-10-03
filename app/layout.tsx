import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono, Instrument_Serif } from 'next/font/google';
import SiteFooter from './components/SiteFooter';
import { JsonLd } from './components/JsonLd';
import { APP_ID, PERSON_ID, SITE_URL, WEBSITE_ID } from './lib/seo.ts';
import './globals.css';

const geist = Geist({ subsets: ['latin'], display: 'swap', variable: '--font-geist' });
const mono = Geist_Mono({ subsets: ['latin'], display: 'swap', variable: '--font-geist-mono' });
const serif = Instrument_Serif({
  subsets: ['latin'],
  weight: '400',
  style: ['normal', 'italic'],
  display: 'swap',
  variable: '--font-instrument',
});

const siteUrl = SITE_URL;
const title = 'Interview Coach: AI mock interview practice with feedback';
const description =
  'Practice a spoken mock interview in your browser. Paste a job description, answer out loud, and get every answer scored with quotes from your own words.';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  alternates: { canonical: '/' },
  title: { default: title, template: '%s | Interview Coach' },
  description,
  keywords: ['mock interview', 'AI interview practice', 'interview coach', 'behavioral interview practice', 'STAR method feedback', 'job interview preparation', 'practice interview questions', 'voice mock interview'],
  applicationName: 'Interview Coach',
  authors: [{ name: 'Sahil Chalke', url: 'https://sahilchalke.com' }],
  creator: 'Sahil Chalke',
  openGraph: { type: 'website', siteName: 'Interview Coach', title, description, url: '/', locale: 'en_US' },
  twitter: { card: 'summary_large_image', creator: '@chalke1015', title, description },
  robots: { index: true, follow: true },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebSite',
      '@id': WEBSITE_ID,
      name: 'Interview Coach',
      url: siteUrl,
      description,
      inLanguage: 'en',
      publisher: { '@id': PERSON_ID },
      author: { '@id': PERSON_ID },
    },
    {
      '@type': 'WebApplication',
      '@id': APP_ID,
      name: 'Interview Coach',
      url: siteUrl,
      description,
      isPartOf: { '@id': WEBSITE_ID },
      applicationCategory: 'EducationalApplication',
      operatingSystem: 'Web',
      isAccessibleForFree: true,
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
      screenshot: `${siteUrl}/opengraph-image.png`,
      featureList: [
        'Spoken mock interview with a realtime AI interviewer',
        'Text mode with the same interviewer, no microphone needed',
        'Questions based on a pasted job description, level and interview type',
        'Each answer scored 1 to 5 for STAR, clarity and depth',
        'Evidence quotes checked word for word against your transcript',
        'Three practice questions aimed at your gaps',
        'Report download as Markdown',
      ],
      author: { '@id': PERSON_ID },
    },
    {
      '@type': 'Person',
      '@id': PERSON_ID,
      name: 'Sahil Chalke',
      url: 'https://sahilchalke.com',
      sameAs: ['https://github.com/Sahilll15', 'https://x.com/chalke1015'],
    },
  ],
};

export const viewport: Viewport = { themeColor: '#f7f6fc' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geist.variable} ${mono.variable} ${serif.variable}`}>
      <body>
        <JsonLd data={jsonLd} />
        {children}
        <SiteFooter />
      </body>
    </html>
  );
}
