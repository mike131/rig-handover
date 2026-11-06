export type RunStatus = 'ok' | 'retry' | 'fail';

// One row per job in a night, in order of the job's first line in the log.
export type DigestRow = {
  job: string;
  owner: string | null; // from the job's last line; views show null as `—`
  runs: number; // every valid line for the job, retries included
  retries: number; // lines with status `retry`
  lastStatus: RunStatus; // status of the job's last line
  lastError: string | null; // most recent `error` seen for the job, even if a later line is `ok`
  firstAt: string; // `at` of the job's first line, as written in the log (offset kept)
  lastAt: string; // `at` of the job's last line, as written in the log (offset kept)
};

export type Night = {
  night: string; // YYYY-MM-DD
  rows: DigestRow[]; // empty when the file has no valid lines ("nothing ran")
  badLines: number; // non-blank lines that are not JSON or have the wrong shape
  counts: Record<RunStatus, number>; // valid lines per status across the night
};

// Sync. Returns null when runs/<night>.jsonl does not exist or `night` is not YYYY-MM-DD (route: 404).
export type ReadNight = (runsDir: string, night: string) => Night | null;
