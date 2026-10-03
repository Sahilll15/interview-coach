import Link from 'next/link';

const TOOLS = [
  { name: 'Minutes', url: 'https://minutes-sand.vercel.app', what: 'meeting minutes from audio' },
  { name: 'SplitSnap', url: 'https://splitsnap-sandy.vercel.app', what: 'split a bill from a receipt photo' },
  { name: 'AskCSV', url: 'https://askcsv-seven.vercel.app', what: 'ask questions about a CSV' },
  { name: 'ShipNotes', url: 'https://shipnotes-mu.vercel.app', what: 'release notes from GitHub commits' },
  { name: 'ToneRadar', url: 'https://toneradar.vercel.app', what: 'check the tone of a message' },
  { name: 'Headline Arena', url: 'https://headline-arena-gamma.vercel.app', what: 'test and rank headlines' },
  { name: 'FinePrint', url: 'https://fineprint-beta.vercel.app', what: 'find risky clauses in contracts' },
  { name: 'fallacy finder', url: 'https://fallacy-finder-nine.vercel.app', what: 'spot logical fallacies' },
  { name: 'PitchPanel', url: 'https://pitchpanel.vercel.app', what: 'startup pitch feedback' },
  { name: 'Ask India', url: 'https://askindia.online', what: 'answers from official government sites' },
];

const link = 'font-medium text-ink underline decoration-line-strong underline-offset-4 hover:decoration-violet';

export default function SiteFooter() {
  return (
    <footer className="mx-auto w-full max-w-5xl px-4 pb-10">
      <div className="glass rounded-[24px] p-5 text-sm text-ink-soft sm:p-6">
        <p className="max-w-3xl leading-relaxed">
          Your job description and answers go to OpenAI to run and score the interview. In voice mode the audio streams from your browser straight
          to OpenAI. This app saves no transcripts or reports. The server keeps only rate limit counts.
        </p>
        <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
          <Link href="/how-it-works" className={link}>
            How it works
          </Link>
          <span>
            Built by{' '}
            <a href="https://sahilchalke.com" className={link}>
              Sahil Chalke
            </a>
          </span>
          <a href="https://github.com/Sahilll15/interview-coach" className={link}>
            Source code
          </a>
        </p>
        <div className="mt-5 border-t border-line pt-4">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-ink-faint">More tools</h2>
          <ul className="mt-2 grid gap-x-6 gap-y-1.5 sm:grid-cols-2">
            {TOOLS.map((t) => (
              <li key={t.url}>
                <a href={t.url} className={link}>
                  {t.name}
                </a>
                <span className="text-ink-faint">, {t.what}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  );
}
