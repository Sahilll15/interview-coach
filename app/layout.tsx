import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono, Instrument_Serif } from 'next/font/google';
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

const siteUrl = 'https://interview-coach-seven-rose.vercel.app';
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
  '@type': 'WebApplication',
  name: 'Interview Coach',
  url: siteUrl,
  description,
  applicationCategory: 'EducationalApplication',
  operatingSystem: 'Web',
  isAccessibleForFree: true,
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
  author: {
    '@type': 'Person',
    name: 'Sahil Chalke',
    url: 'https://sahilchalke.com',
    sameAs: ['https://github.com/Sahilll15', 'https://x.com/chalke1015'],
  },
};

export const viewport: Viewport = { themeColor: '#f7f6fc' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geist.variable} ${mono.variable} ${serif.variable}`}>
      <body>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />
        {children}
      </body>
    </html>
  );
}
