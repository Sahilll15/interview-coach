export const LEVELS = ['junior', 'mid', 'senior', 'staff'] as const;
export const TYPES = ['behavioral', 'technical', 'mixed'] as const;

export type Level = (typeof LEVELS)[number];
export type InterviewType = (typeof TYPES)[number];

export type Setup = {
  roleTitle: string;
  jobDescription: string;
  level: Level;
  type: InterviewType;
};

export const LEVEL_LABEL: Record<Level, string> = {
  junior: 'Junior',
  mid: 'Mid level',
  senior: 'Senior',
  staff: 'Staff',
};

export const TYPE_LABEL: Record<InterviewType, string> = {
  behavioral: 'Behavioral',
  technical: 'Technical concepts',
  mixed: 'Mixed',
};

export const JD_MIN = 40;
export const JD_MAX = 6000;
export const TITLE_MAX = 80;

type Parsed = { ok: true; setup: Setup } | { ok: false; error: string };

export function parseSetup(input: unknown): Parsed {
  if (!input || typeof input !== 'object') return { ok: false, error: 'Missing interview setup.' };
  const o = input as Record<string, unknown>;
  const jd = typeof o.jobDescription === 'string' ? o.jobDescription.trim() : '';
  const title = typeof o.roleTitle === 'string' ? o.roleTitle.trim().slice(0, TITLE_MAX) : '';
  if (jd.length < JD_MIN) return { ok: false, error: `Paste a job description of at least ${JD_MIN} characters.` };
  if (jd.length > JD_MAX) return { ok: false, error: `Job description is too long (max ${JD_MAX} characters).` };
  if (!LEVELS.includes(o.level as Level)) return { ok: false, error: 'Pick a level.' };
  if (!TYPES.includes(o.type as InterviewType)) return { ok: false, error: 'Pick an interview type.' };
  return {
    ok: true,
    setup: { roleTitle: title || 'the role', jobDescription: jd, level: o.level as Level, type: o.type as InterviewType },
  };
}
