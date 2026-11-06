import type { DigestRow, Night } from '../digest/types.js';

const dash = '—';

function Row({ row }: { row: DigestRow }) {
  const failed = row.lastStatus === 'fail';
  return (
    <tr class={failed ? 'warn' : undefined}>
      <td>{row.job}</td>
      <td>{row.owner ?? dash}</td>
      <td>{row.runs}</td>
      <td class={row.retries >= 3 ? 'warn' : undefined}>{row.retries}</td>
      <td>{row.lastStatus}</td>
      <td>{row.lastError ?? dash}</td>
      <td>{row.firstAt}</td>
      <td>{row.lastAt}</td>
    </tr>
  );
}

export function DigestPage({ night, rows }: { night: Night; rows: readonly DigestRow[] }) {
  return (
    <>
      <h1>digest · {night.night}</h1>
      {night.badLines > 0 && (
        <p class="warn">{night.badLines === 1 ? '1 line could not be read' : `${night.badLines} lines could not be read`}</p>
      )}
      {rows.length === 0 ? (
        <p class="mute">nothing ran</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>job</th><th>owner</th><th>runs</th><th>retries</th>
              <th>last status</th><th>last error</th><th>first</th><th>last</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <Row row={row} />
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}

export function DigestNotFound({ night }: { night: string }) {
  return (
    <>
      <h1>digest · {night}</h1>
      <p class="mute">no log for this night</p>
    </>
  );
}
