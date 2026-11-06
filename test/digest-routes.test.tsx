import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import type { DigestRow } from '../src/digest/types.js';

let runsDir: string;
const savedMarker = process.env.LANE_MARKER;

const line = (o: Record<string, unknown>) => JSON.stringify(o);

const GOOD = [
  line({ at: '2026-11-01T01:00:00+01:00', job: 'zeta', status: 'ok', owner: 'mike' }),
  line({ at: '2026-11-01T02:00:00+01:00', job: 'alpha', status: 'retry', owner: null, error: 'boom' }),
  line({ at: '2026-11-01T03:00:00+01:00', job: 'mid', status: 'ok', owner: 'sam' }),
  line({ at: '2026-11-01T04:00:00+01:00', job: 'alpha', status: 'ok', owner: null }),
];

beforeAll(() => {
  runsDir = mkdtempSync(join(tmpdir(), 'rig-digest-routes-'));
  writeFileSync(join(runsDir, '2026-11-01.jsonl'), GOOD.join('\n') + '\n');
  writeFileSync(join(runsDir, '2026-11-02.jsonl'), '');
  writeFileSync(join(runsDir, '2026-11-03.jsonl'), [GOOD[0], 'not json at all', GOOD[2]].join('\n') + '\n');
});

afterAll(() => {
  rmSync(runsDir, { recursive: true, force: true });
});

beforeEach(() => {
  process.env.LANE_MARKER = 'TEST-MARKER';
});

afterEach(() => {
  if (savedMarker === undefined) delete process.env.LANE_MARKER;
  else process.env.LANE_MARKER = savedMarker;
});

const app = () =>
  createApp({ adapter: 'shim', installed: '2026-10-29T14:06:00+01:00', beatEverySeconds: 60, runsDir });

type DigestJson = { night: string; rows: DigestRow[]; badLines: number };

describe('GET /digest/:night', () => {
  it('renders a night with the lane banner', async () => {
    const res = await app().request('/digest/2026-11-01');
    const html = await res.text();
    expect(res.status).toBe(200);
    expect(html).toContain('digest · 2026-11-01');
    expect(html).toContain('TEST-MARKER');
    expect(html).toContain('<td>mid</td>');
  });

  it('answers 404 with a page for a night with no file', async () => {
    const res = await app().request('/digest/2026-12-31');
    const html = await res.text();
    expect(res.status).toBe(404);
    expect(res.headers.get('content-type')).toContain('text/html');
    expect(html).toContain('no log for this night');
  });

  it('says nothing ran for an empty night', async () => {
    const res = await app().request('/digest/2026-11-02');
    const html = await res.text();
    expect(res.status).toBe(200);
    expect(html).toContain('nothing ran');
    expect(html).not.toContain('<table');
  });

  it('warns about a bad line and still renders the good rows', async () => {
    const res = await app().request('/digest/2026-11-03');
    const html = await res.text();
    expect(res.status).toBe(200);
    expect(html).toContain('1 line could not be read');
    expect(html).toContain('<td>zeta</td>');
    expect(html).toContain('<td>mid</td>');
  });

  it('renders a null owner as a dash', async () => {
    const html = await (await app().request('/digest/2026-11-01')).text();
    expect(html).toMatch(/<td>alpha<\/td>\s*<td>—<\/td>/);
  });
});

describe('GET /api/digest/:night', () => {
  it('returns the night as JSON', async () => {
    const res = await app().request('/api/digest/2026-11-01');
    const body = (await res.json()) as DigestJson;
    expect(res.status).toBe(200);
    expect(body.night).toBe('2026-11-01');
    expect(body.badLines).toBe(0);
    expect(body.rows).toHaveLength(3);
  });

  it('answers 404 with an error object for a night with no file', async () => {
    const res = await app().request('/api/digest/2026-12-31');
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: 'no run log for 2026-12-31' });
  });

  it('returns no rows for an empty night', async () => {
    const res = await app().request('/api/digest/2026-11-02');
    const body = (await res.json()) as DigestJson;
    expect(res.status).toBe(200);
    expect(body.rows).toEqual([]);
    expect(body.badLines).toBe(0);
  });

  it('counts a bad line and keeps the good rows', async () => {
    const body = (await (await app().request('/api/digest/2026-11-03')).json()) as DigestJson;
    expect(body.badLines).toBe(1);
    expect(body.rows.map((r) => r.job)).toEqual(['mid', 'zeta']);
  });

  it('keeps a null owner as null', async () => {
    const body = (await (await app().request('/api/digest/2026-11-01')).json()) as DigestJson;
    expect(body.rows.find((r) => r.job === 'alpha')?.owner).toBeNull();
  });
});

describe('page and JSON agree', () => {
  it('list the same jobs in the same order, sorted by job', async () => {
    const html = await (await app().request('/digest/2026-11-01')).text();
    const body = (await (await app().request('/api/digest/2026-11-01')).json()) as DigestJson;
    const pageJobs = [...html.matchAll(/<tr[^>]*>\s*<td>([^<]*)<\/td>/g)].map((m) => m[1]);
    const jsonJobs = body.rows.map((r) => r.job);
    expect(jsonJobs).toEqual(['alpha', 'mid', 'zeta']);
    expect(pageJobs).toEqual(jsonJobs);
  });
});
