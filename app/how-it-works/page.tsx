import type { Metadata } from 'next';
import Link from 'next/link';
import { JsonLd } from '../components/JsonLd';
import { breadcrumbs, pageMetadata } from '../lib/seo.ts';

export const metadata: Metadata = pageMetadata({
  title: 'How it works: scoring, limits and privacy',
  description:
    'How Interview Coach runs a spoken mock interview, scores each answer for STAR, clarity and depth, checks every quote against your transcript, and what data it sends.',
  path: '/how-it-works',
});

const STEPS = [
  [
    'Set up the interview',
    'Paste a job description (40 to 6,000 characters) or pick a sample role, add a role title, then choose a level (junior, mid, senior or staff) and an interview type (behavioral, technical concepts or mixed).',
  ],
  [
    'Talk or type',
    'In voice mode a realtime AI interviewer asks one question at a time and asks at most one follow up when an answer is vague, skips your own actions or has no result. It does not coach or score you during the interview. Text mode runs the same interviewer and you type your answers instead.',
  ],
  [
    'Get the report',
    'When the interview ends, the transcript is scored. Each main question gets a short summary of your answer, three scores with quotes and one concrete thing to do differently. You also get two to four strengths, two to four gaps and three practice questions aimed at the gaps.',
  ],
];

const RUBRIC = [
  ['STAR', 'No situation or result', 'Situation and actions, but a vague result or an unclear personal role', 'Clear situation, task, your own actions and a measurable result'],
  ['Clarity', 'Rambling or hard to follow', 'Understandable, with filler or detours', 'Concise, ordered and easy to repeat back'],
  ['Depth', 'Surface level', 'Some reasoning or tradeoffs', 'Expert reasoning, tradeoffs and lessons learned, pitched for the level'],
];

const BANDS = [
  ['4.3 and up', 'Strong hire signal'],
  ['3.5 to 4.2', 'Solid, with clear upside'],
  ['2.5 to 3.4', 'Mixed, needs sharper stories'],
  ['Below 2.5', 'Early, keep practicing'],
];

const LIMITS = [
  'Voice sessions last up to 4.5 minutes. At 30 seconds left the interviewer is told to wrap up, and the browser hangs up at zero. The server also ends the call 15 seconds after the cap if the browser does not.',
  'Text interviews allow up to six answers.',
  'Each IP address gets 3 interview sessions, 40 typed answers and 5 reports per hour. Voice and text sessions share the same count.',
  'The whole site has a daily cap on sessions. Once it is used up, new sessions are refused until the next UTC day.',
  'A report needs at least 15 words of answers. Before scoring, each turn is cut at 1,500 characters and the transcript at 24,000 characters.',
];

const card = 'glass rounded-[24px] p-5 sm:p-6';
const h2 = 'font-serif text-3xl tracking-tight sm:text-4xl';

export default function HowItWorksPage() {
  return (
    <div className="flex flex-col gap-10 pb-16">
      <JsonLd
        data={breadcrumbs([
          { name: 'Home', path: '/' },
          { name: 'How it works', path: '/how-it-works' },
        ])}
      />
      <header className="sticky top-3 z-20 mx-auto flex w-full max-w-3xl items-center justify-between gap-3 px-4">
        <nav className="glass flex items-center gap-1 rounded-full py-1.5 pl-2 pr-4" aria-label="Main">
          <Link href="/" className="flex items-center gap-2 rounded-full py-1 pl-1 pr-3 font-semibold">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icon.svg" alt="" width={26} height={26} />
            Interview Coach
          </Link>
        </nav>
        <Link href="/#start" className="glass rounded-full px-4 py-2.5 text-sm font-medium hover:bg-white">
          Start
        </Link>
      </header>

      <main className="mx-auto flex w-full max-w-3xl flex-col gap-10 px-4">
        <div>
          <nav aria-label="Breadcrumb" className="text-sm text-ink-soft">
            <ol className="flex flex-wrap gap-1.5">
              <li>
                <Link href="/" className="hover:text-violet-deep hover:underline">
                  Home
                </Link>{' '}
                /
              </li>
              <li aria-current="page">How it works</li>
            </ol>
          </nav>
          <h1 className="mt-3 font-serif text-5xl leading-[1.05] tracking-tight sm:text-6xl">How Interview Coach works</h1>
          <div className="mt-5 space-y-3 text-base leading-relaxed text-ink-soft sm:text-lg">
            <p>
              Interview Coach is a free mock interview tool that runs in your browser. You paste a job description, answer an AI interviewer out loud or
              in writing, and get a report that scores every answer for STAR structure, clarity and depth.
            </p>
            <p>
              Every score above 3 has to be backed by a quote that the server finds word for word in your answers. There is no account, voice sessions
              last up to 4.5 minutes, and the app does not save your transcript or report.
            </p>
          </div>
        </div>

        <section aria-labelledby="steps">
          <h2 id="steps" className={h2}>
            The three steps
          </h2>
          <ol className="mt-5 grid gap-4">
            {STEPS.map(([title, body], i) => (
              <li key={title} className={card}>
                <span className="font-mono text-xs text-violet-deep">0{i + 1}</span>
                <h3 className="mt-1 font-serif text-2xl">{title}</h3>
                <p className="mt-2 leading-relaxed text-ink-soft">{body}</p>
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="scoring">
          <h2 id="scoring" className={h2}>
            How answers are scored
          </h2>
          <p className="mt-4 leading-relaxed text-ink-soft">
            The model scores each main question from 1 to 5 on three dimensions. A follow up is scored as part of the question it follows. For conceptual
            technical questions, STAR measures how well the answer moves from problem to approach to outcome.
          </p>
          <div className="mt-5 overflow-x-auto rounded-[20px] border border-line bg-white/70">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="text-ink">
                <tr className="border-b border-line">
                  <th scope="col" className="p-3 font-semibold">
                    Dimension
                  </th>
                  <th scope="col" className="p-3 font-semibold">
                    1
                  </th>
                  <th scope="col" className="p-3 font-semibold">
                    3
                  </th>
                  <th scope="col" className="p-3 font-semibold">
                    5
                  </th>
                </tr>
              </thead>
              <tbody className="text-ink-soft">
                {RUBRIC.map(([dim, one, three, five]) => (
                  <tr key={dim} className="border-b border-line last:border-0 align-top">
                    <th scope="row" className="p-3 font-semibold text-ink">
                      {dim}
                    </th>
                    <td className="p-3">{one}</td>
                    <td className="p-3">{three}</td>
                    <td className="p-3">{five}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h3 className="mt-8 font-serif text-2xl">The quote check</h3>
          <p className="mt-2 leading-relaxed text-ink-soft">
            For each score the model gives one or two short quotes from your answers. The server then checks its work before you see anything:
          </p>
          <ul className="mt-3 list-disc space-y-2 pl-5 leading-relaxed text-ink-soft marker:text-violet">
            <li>
              Each quote is compared with your lines only, after ignoring case and punctuation. Quotes under three words or not found in your answers are
              hidden from the report and do not count.
            </li>
            <li>A score above 3 with no verified quote is capped at 3, and the report says it was capped.</li>
            <li>A question marked as answered with no verified quote is treated as unanswered and left out of the averages.</li>
            <li>The report shows how many quotes were found word for word, for example &quot;24 of 25 quotes found word for word in your answers&quot;.</li>
          </ul>

          <h3 className="mt-8 font-serif text-2xl">Overall score</h3>
          <p className="mt-2 leading-relaxed text-ink-soft">
            Each dimension is averaged over the answered questions, and the overall score is the average of all their scores, rounded to one decimal.
            The overall score maps to a short label:
          </p>
          <dl className="mt-3 grid gap-2 sm:grid-cols-2">
            {BANDS.map(([range, label]) => (
              <div key={range} className="rounded-2xl border border-line bg-white/70 px-4 py-3">
                <dt className="font-mono text-xs text-violet-deep">{range}</dt>
                <dd className="mt-0.5 font-medium text-ink">{label}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section aria-labelledby="example">
          <h2 id="example" className={h2}>
            Example from a sample interview
          </h2>
          <p className="mt-4 leading-relaxed text-ink-soft">
            The home page has two sample transcripts you can score without a microphone. In the &quot;Frontend, mid level&quot; sample the interviewer asks
            about making a slow page faster, and part of the answer reads:
          </p>
          <blockquote className={`${card} mt-4 font-serif text-xl leading-snug text-ink`}>
            &quot;I moved the hero image to eager loading with a preload hint, split the filters panel into its own chunk, and server rendered the first
            twelve products. LCP dropped to 2.1 seconds at the 75th percentile and conversion went up about 3 percent over the next month.&quot;
          </blockquote>
          <p className="mt-4 leading-relaxed text-ink-soft">
            A quote such as &quot;LCP dropped to 2.1 seconds at the 75th percentile&quot; appears in the answer word for word, so it passes the check and can
            support a high STAR score. A paraphrase such as &quot;cut load time in half&quot; does not appear in the answer, so it would be dropped, and a score above 3 resting on it alone would be capped at 3. The same sample ends with a one sentence answer about a disagreement with a
            designer, which gives the model little to quote.
          </p>
        </section>

        <section aria-labelledby="where">
          <h2 id="where" className={h2}>
            What runs where
          </h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div className={card}>
              <h3 className="font-serif text-2xl">In your browser</h3>
              <ul className="mt-3 list-disc space-y-2 pl-5 leading-relaxed text-ink-soft marker:text-violet">
                <li>Asks for the microphone before a voice session starts.</li>
                <li>Sends and receives interview audio over WebRTC directly with OpenAI.</li>
                <li>Builds the live transcript, runs the countdown and animates the orb from audio levels.</li>
                <li>Creates the Markdown report download.</li>
              </ul>
            </div>
            <div className={card}>
              <h3 className="font-serif text-2xl">On the server</h3>
              <ul className="mt-3 list-disc space-y-2 pl-5 leading-relaxed text-ink-soft marker:text-violet">
                <li>
                  Opens the voice call with OpenAI (gpt-realtime-mini by default, with gpt-4o-transcribe for live transcription) using its own key and a fixed
                  interviewer setup. The browser never receives a key.
                </li>
                <li>Runs text mode turns and the report through the OpenAI Responses API with structured outputs (gpt-5.4-mini by default).</li>
                <li>Checks the quotes, applies the score caps and counts the rate limits.</li>
              </ul>
            </div>
          </div>
        </section>

        <section aria-labelledby="limits">
          <h2 id="limits" className={h2}>
            Limits
          </h2>
          <ul className="mt-4 list-disc space-y-2 pl-5 leading-relaxed text-ink-soft marker:text-violet">
            {LIMITS.map((l) => (
              <li key={l}>{l}</li>
            ))}
          </ul>
          <p className="mt-4 leading-relaxed text-ink-soft">
            Voice interviews run in English. Technical interviews ask about concepts and tradeoffs, with no live coding.
          </p>
        </section>

        <section aria-labelledby="privacy">
          <h2 id="privacy" className={h2}>
            Privacy
          </h2>
          <ul className="mt-4 list-disc space-y-2 pl-5 leading-relaxed text-ink-soft marker:text-violet">
            <li>There is no account and no sign in.</li>
            <li>Your job description and setup are sent to the server, which passes them to OpenAI to run the interview.</li>
            <li>In voice mode your audio goes from your browser to OpenAI over WebRTC and does not pass through this app&apos;s server.</li>
            <li>
              To score the interview, the browser sends the transcript to the server, which sends it to OpenAI and returns the report. The app does not
              save the transcript or the report.
            </li>
            <li>The server keeps rate limit counts keyed by IP address so the hourly and daily limits hold.</li>
          </ul>
        </section>

        <p>
          <Link href="/#start" className="btn-dark">
            Start a mock interview
            <span aria-hidden="true">&rarr;</span>
          </Link>
        </p>
      </main>
    </div>
  );
}
