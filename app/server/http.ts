export function bad(error: string, status = 400) {
  return Response.json({ error }, { status });
}

type Read = { ok: true; body: unknown } | { ok: false; res: Response };

export async function readJson(req: Request, maxBytes: number): Promise<Read> {
  const len = Number(req.headers.get('content-length') ?? 0);
  if (len > maxBytes) return { ok: false, res: bad('Request is too large.', 413) };
  const text = await req.text();
  if (text.length > maxBytes) return { ok: false, res: bad('Request is too large.', 413) };
  if (!text.trim()) return { ok: false, res: bad('Request body is empty.') };
  try {
    return { ok: true, body: JSON.parse(text) };
  } catch {
    return { ok: false, res: bad('Request body must be JSON.') };
  }
}

export function upstreamError(err: unknown) {
  const status = (err as { status?: number })?.status;
  console.error('openai error', status, (err as Error)?.message);
  if (status === 429) return bad('The model is busy right now. Try again in a minute.', 503);
  return bad('Something went wrong talking to the model. Try again.', 502);
}
