import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { readNight } from '../src/digest/read.js';

function tempRuns(files: Record<string, string>): string {
  const dir = mkdtempSync(join(tmpdir(), 'rig-runs-'));
  for (const [name, text] of Object.entries(files)) writeFileSync(join(dir, name), text);
  return dir;
}

describe('readNight', () => {
  it('reads 2026-10-28 into 5 jobs and counts the 1 bad line', () => {
    const night = readNight('runs', '2026-10-28');
    expect(night).not.toBeNull();
    if (night === null) return;
    expect(night.badLines).toBe(1);
    expect(night.counts).toEqual({ ok: 10, retry: 4, fail: 1 });
    expect(night.rows.map((r) => r.job)).toEqual([
      'rig/rotate-logs',
      'lane/sync',
      'fixtures/refresh',
      'notes/backup',
      'digest/render',
    ]);
    const row = (job: string) => night.rows.find((r) => r.job === job);
    expect(row('lane/sync')).toEqual({
      job: 'lane/sync',
      owner: 'rook',
      runs: 8,
      retries: 1,
      lastStatus: 'ok',
      lastError: 'lock held',
      firstAt: '2026-10-28T23:00:06+01:00',
      lastAt: '2026-10-29T05:00:04+01:00',
    });
    expect(row('fixtures/refresh')).toMatchObject({ runs: 4, retries: 3, lastStatus: 'ok', lastError: 'upstream 503' });
    expect(row('notes/backup')).toMatchObject({ runs: 1, lastStatus: 'fail', lastError: 'quota exceeded' });
    expect(row('digest/render')).toMatchObject({ owner: null, runs: 1, lastError: null });
    expect(row('rig/rotate-logs')).toMatchObject({ runs: 1, retries: 0, lastStatus: 'ok' });
  });

  it('reads 2026-10-27 with no bad lines', () => {
    const night = readNight('runs', '2026-10-27');
    expect(night?.rows).toHaveLength(4);
    expect(night?.badLines).toBe(0);
  });

  it('returns null for a night with no file or a name that is not a date', () => {
    expect(readNight('runs', '2026-01-01')).toBeNull();
    expect(readNight('runs', '../package')).toBeNull();
  });

  it('reads an empty file as a night where nothing ran', () => {
    const dir = tempRuns({ '2026-11-01.jsonl': '' });
    expect(readNight(dir, '2026-11-01')).toEqual({
      night: '2026-11-01',
      rows: [],
      badLines: 0,
      counts: { ok: 0, retry: 0, fail: 0 },
    });
  });

  it('counts valid JSON with the wrong shape as bad, never throws', () => {
    const lines = [
      '{"at":"2026-11-01T01:00:00+01:00","job":"a","status":"weird","owner":"rook"}',
      '{"at":"2026-11-01T01:00:00+01:00","job":"a","status":"ok"}',
      '{"at":"not a time","job":"a","status":"ok","owner":"rook"}',
      '[1,2]',
      '{"at":"2026-11-01T01:00:00+01:00","job":"a","status":"ok","owner":"rook"}',
    ];
    const night = readNight(tempRuns({ '2026-11-01.jsonl': lines.join('\n') + '\n' }), '2026-11-01');
    expect(night?.badLines).toBe(4);
    expect(night?.rows).toHaveLength(1);
  });
});
