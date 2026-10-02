import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyRealtimeEvent, shapeTranscript, toPromptText, type Turn } from '../app/lib/transcript.ts';
import { parseSetup } from '../app/lib/setup.ts';

function run(events: object[]) {
  return events.reduce<Turn[]>((t, e) => applyRealtimeEvent(t, e), []);
}

test('realtime events build ordered turns even when transcription finishes late', () => {
  const turns = run([
    { type: 'response.output_audio_transcript.delta', item_id: 'a1', delta: 'Hello, ' },
    { type: 'response.output_audio_transcript.delta', item_id: 'a1', delta: 'tell me about you?' },
    { type: 'response.output_audio_transcript.done', item_id: 'a1', transcript: 'Hello, tell me about yourself?' },
    { type: 'input_audio_buffer.committed', item_id: 'u1' },
    { type: 'response.output_audio_transcript.delta', item_id: 'a2', delta: 'Thanks.' },
    { type: 'conversation.item.input_audio_transcription.delta', item_id: 'u1', delta: 'I am a ' },
    { type: 'conversation.item.input_audio_transcription.completed', item_id: 'u1', transcript: 'I am a frontend engineer.' },
    { type: 'session.updated' },
  ]);
  assert.deepEqual(
    turns.map((t) => [t.id, t.speaker, t.text, t.final]),
    [
      ['a1', 'interviewer', 'Hello, tell me about yourself?', true],
      ['u1', 'candidate', 'I am a frontend engineer.', true],
      ['a2', 'interviewer', 'Thanks.', false],
    ],
  );
});

test('late deltas do not overwrite a final transcript', () => {
  const turns = run([
    { type: 'conversation.item.input_audio_transcription.completed', item_id: 'u1', transcript: 'Done.' },
    { type: 'conversation.item.input_audio_transcription.delta', item_id: 'u1', delta: ' extra' },
  ]);
  assert.equal(turns[0].text, 'Done.');
});

test('failed transcription leaves an empty final turn that shaping drops', () => {
  const turns = run([
    { type: 'input_audio_buffer.committed', item_id: 'u1' },
    { type: 'conversation.item.input_audio_transcription.failed', item_id: 'u1' },
  ]);
  assert.equal(turns[0].final, true);
  assert.equal(shapeTranscript(turns).turns.length, 0);
});

test('shapeTranscript merges same speaker turns, cleans whitespace, drops junk', () => {
  const s = shapeTranscript([
    { speaker: 'interviewer', text: '  What did   you do?  ' },
    { speaker: 'candidate', text: 'I shipped it.' },
    { speaker: 'candidate', text: '\n\nIt went well.' },
    { speaker: 'system', text: 'ignore me' },
    { speaker: 'candidate', text: '   ' },
  ]);
  assert.deepEqual(s.turns, [
    { speaker: 'interviewer', text: 'What did you do?' },
    { speaker: 'candidate', text: 'I shipped it. It went well.' },
  ]);
  assert.equal(s.candidateWords, 6);
  assert.equal(s.questionsAsked, 1);
  assert.equal(s.truncated, false);
});

test('shapeTranscript caps turn length and total size', () => {
  const long = 'word '.repeat(1000);
  const s = shapeTranscript(
    [
      { speaker: 'interviewer', text: 'Q?' },
      { speaker: 'candidate', text: long },
      { speaker: 'interviewer', text: 'Q2?' },
      { speaker: 'candidate', text: long },
    ],
    { maxTurnChars: 100, maxTotalChars: 150, maxTurns: 10 },
  );
  assert.equal(s.truncated, true);
  assert.ok(s.turns[1].text.endsWith('[cut]'));
  assert.ok(s.turns.reduce((n, t) => n + t.text.length, 0) <= 150);
  assert.equal(s.turns.length, 3);
});

test('toPromptText numbers and labels lines', () => {
  assert.equal(
    toPromptText([
      { speaker: 'interviewer', text: 'Hi?' },
      { speaker: 'candidate', text: 'Hello.' },
    ]),
    '[1] Interviewer: Hi?\n[2] Candidate: Hello.',
  );
});

test('parseSetup validates fields', () => {
  assert.equal(parseSetup(null).ok, false);
  assert.equal(parseSetup({ jobDescription: 'short', level: 'mid', type: 'mixed' }).ok, false);
  const jd = 'x'.repeat(50);
  assert.equal(parseSetup({ jobDescription: jd, level: 'boss', type: 'mixed' }).ok, false);
  assert.equal(parseSetup({ jobDescription: 'x'.repeat(7000), level: 'mid', type: 'mixed' }).ok, false);
  const ok = parseSetup({ jobDescription: jd, level: 'mid', type: 'mixed' });
  assert.ok(ok.ok && ok.setup.roleTitle === 'the role');
});
