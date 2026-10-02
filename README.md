# Interview Coach

A spoken mock interview you run in the browser. Paste a job description (or pick a sample role), choose a level and an interview type, and talk to an AI interviewer for six minutes. When you stop, you get a report that scores every answer and quotes your own words back to you, plus three practice questions aimed at your gaps.

It is for anyone with an interview coming up who wants to practice out loud instead of rehearsing in their head. No mic? Text mode runs the same interviewer and the same report.

## How it works

**Voice session.** The browser asks for the mic first, then calls `POST /api/session`. That route validates the setup, applies the rate limit, and mints an ephemeral client secret with `client.realtime.clientSecrets.create`. The session config (interviewer instructions, `gpt-realtime-mini`, voice, semantic VAD, input transcription with `gpt-4o-transcribe`, `max_output_tokens`) is baked into the secret, so the browser cannot change the prompt. The browser then does the WebRTC SDP exchange with `POST /v1/realtime/calls` and talks to OpenAI directly. The API key never leaves the server.

**Live transcript.** Events on the `oai-events` data channel go through a small reducer (`app/lib/transcript.ts`). Input transcription finishes after the interviewer has started replying, so a candidate turn is placed when its audio is committed and filled in when the transcript arrives. That keeps the order right.

**The orb.** Two Web Audio analysers, one on the mic and one on the remote track, feed RMS levels into CSS variables every frame. Pink reacts to you, blue to the interviewer.

**Session cap.** Six minutes by default. The client runs a visible timer, sends a system note at 30 seconds left so the interviewer closes, and hangs up at zero. On the server side the client secret expires after 60 seconds, so it is good for one handshake and cannot be reused to start more sessions later, and each response is capped by `max_output_tokens`. The server does not hold a connection open, so it cannot force a hang up mid call. That part is client enforced.

**Report.** `POST /api/report` shapes the transcript (merge same speaker turns, clean whitespace, cap each turn and the total size), then calls the Responses API with Structured Outputs (`responses.parse` plus `zodTextFormat`). Per question it returns the question, a summary, STAR, clarity and depth scores with evidence quotes, and one improvement. Then the server checks the model's work:

- Every evidence quote is matched against the candidate's lines after normalizing case and punctuation. Quotes it cannot find are dropped from display.
- A score above 3 with no verified quote is capped at 3, and the report says so.
- A question marked answered with no verifiable quote is treated as unanswered and left out of the averages.
- The report shows the grounding rate ("24 of 25 quotes found word for word").

**Text mode.** `POST /api/interviewer` takes the transcript so far and returns the next interviewer message as structured output. It caps at six answers and uses the same report route.

**Abuse and cost controls.** Per IP limits in memory: 3 sessions per hour (voice and text share it), 40 text answers per hour, 5 reports per hour. The IP comes from `x-real-ip`, then the last `x-forwarded-for` hop, because the leftmost entry is whatever the client sent. Input is validated before it counts against a limit. Bodies are capped and `content-length` is checked before parsing (413 when too large). The SDK retries twice with a 60 second timeout. Upstream errors return a short message and never leak details.

## Cost per run

Rough numbers, check current pricing:

- Six minute voice session on `gpt-realtime-mini`: about $0.05 to $0.15, mostly audio tokens, since the conversation is re-read on each turn.
- Input transcription on `gpt-4o-transcribe`: about $0.02 for three minutes of speech.
- Report on `gpt-5.4-mini`: about 1,500 input and 1,500 output tokens, well under a cent.

Text mode costs a few cents at most.

## Run it

```bash
npm install
cp .env.example .env.local   # add OPENAI_API_KEY
npm run dev                  # http://localhost:3201
```

```bash
npm test        # unit tests for transcript shaping and report scoring
npm run lint
npm run build && npm start
```

## Config

| Variable | Default | What it does |
| --- | --- | --- |
| `OPENAI_API_KEY` | none | Server only. Required. |
| `OPENAI_MODEL` | `gpt-5.4-mini` | Report and text interviewer model |
| `OPENAI_REALTIME_MODEL` | `gpt-realtime-mini` | Voice interviewer model |
| `OPENAI_TRANSCRIBE_MODEL` | `gpt-4o-transcribe` | Live transcription of your answers |
| `OPENAI_VOICE` | `marin` | Interviewer voice |
| `SESSION_SECONDS` | `360` | Voice session cap, clamped to 60 to 1200 |
| `RATE_LIMIT_SESSIONS` | `3` | Sessions per IP per window |
| `RATE_LIMIT_TURNS` | `40` | Text answers per IP per window |
| `RATE_LIMIT_REPORTS` | `5` | Reports per IP per window |
| `RATE_LIMIT_WINDOW_MS` | `3600000` | Rate limit window |

The rate limiter is in memory, so on serverless each instance keeps its own counts. Swap in a shared store before relying on it in front of real traffic.
