import { Hono } from 'hono';
import { readNight } from './digest/read.js';
import { byJob } from './digest/sort.js';
import { loadConfig, type RigConfig } from './config.js';
import { lane } from './lane.js';
import { readStatus } from './status.js';
import { DigestNotFound, DigestPage } from './views/digest.js';
import { Layout } from './views/layout.js';
import { StatusBoard } from './views/status.js';

export function createApp(config: RigConfig = loadConfig()) {
  const app = new Hono();

  app.get('/health', (c) => c.json({ ok: true, lane: lane().id }));

  app.get('/', (c) =>
    c.html(
      <Layout title="status" lane={lane()}>
        <StatusBoard status={readStatus(config)} />
      </Layout>,
    ),
  );

  app.get('/digest/:night', (c) => {
    const name = c.req.param('night');
    const night = readNight(config.runsDir, name);
    if (night === null) {
      return c.html(
        <Layout title={`digest · ${name}`} lane={lane()}>
          <DigestNotFound night={name} />
        </Layout>,
        404,
      );
    }
    return c.html(
      <Layout title={`digest · ${name}`} lane={lane()}>
        <DigestPage night={night} rows={byJob(night.rows)} />
      </Layout>,
    );
  });

  app.get('/api/digest/:night', (c) => {
    const night = readNight(config.runsDir, c.req.param('night'));
    if (night === null) return c.json({ error: `no run log for ${c.req.param('night')}` }, 404);
    return c.json({ night: night.night, rows: byJob(night.rows), badLines: night.badLines, counts: night.counts });
  });

  return app;
}
