import cron from 'node-cron';
import { lockPicks } from './lockPicks.js';
import { autoPick } from './autoPick.js';
import { finalizeDrafts } from './finalizeDrafts.js';
import { autoRandomizeRankings } from './autoRandomizeRankings.js';
import { sendPickReminders, sendDraftReminders } from './sendReminders.js';
import { sendEpisodeResults } from './sendResults.js';
import { sendWeeklySummary } from './weeklySummary.js';

interface ScheduledJob {
  name: string;
  schedule: string;
  description: string;
  handler: () => Promise<any>;
  enabled: boolean;
  lastRun?: Date;
  lastResult?: any;
}

const jobs: ScheduledJob[] = [
  {
    name: 'lock-picks',
    // Wed 3pm PST (23:00 UTC during PST, 22:00 during PDT)
    schedule: '0 23 * * 3',
    description: 'Lock all pending picks',
    handler: lockPicks,
    enabled: true,
  },
  {
    name: 'auto-pick',
    // Wed 3:05pm PST
    schedule: '5 23 * * 3',
    description: 'Fill missing picks with auto-select',
    handler: autoPick,
    enabled: true,
  },
  {
    name: 'pick-reminders',
    // Wed 12pm PST (20:00 UTC)
    schedule: '0 20 * * 3',
    description: 'Send pick reminder emails',
    handler: sendPickReminders,
    enabled: true,
  },
  {
    name: 'results-notification',
    // Fri 12pm PST (20:00 UTC)
    schedule: '0 20 * * 5',
    description: 'Send episode results',
    handler: sendEpisodeResults,
    enabled: true,
  },
  {
    name: 'weekly-summary',
    // Sun 10am PST (18:00 UTC)
    schedule: '0 18 * * 0',
    description: 'Send weekly standings summary',
    handler: sendWeeklySummary,
    enabled: true,
  },
  {
    name: 'draft-reminders',
    // Daily 9am PST (17:00 UTC) during draft window
    schedule: '0 17 * * *',
    description: 'Send draft reminder emails',
    handler: sendDraftReminders,
    enabled: true,
  },
];

// Store for one-time jobs
const oneTimeJobs: Map<string, NodeJS.Timeout> = new Map();

/**
 * Schedule auto-randomize rankings one-time job
 * Jan 5, 2026 12pm PST (draft order deadline)
 */
export function scheduleAutoRandomizeRankings(targetDate?: Date): void {
  const target = targetDate || new Date('2026-01-05T20:00:00Z'); // Jan 5 12pm PST = Jan 5 8pm UTC
  const now = new Date();

  if (target <= now) {
    console.log('Draft order deadline has passed, running auto-randomize immediately');
    autoRandomizeRankings().catch(console.error);
    return;
  }

  const delay = target.getTime() - now.getTime();
  console.log(
    `Scheduling auto-randomize rankings for ${target.toISOString()} (${Math.round(delay / 1000 / 60 / 60)} hours)`
  );

  const timeoutId = setTimeout(async () => {
    console.log('Running scheduled auto-randomize rankings');
    try {
      const result = await autoRandomizeRankings();
      console.log('Auto-randomize rankings result:', result);
    } catch (err) {
      console.error('Auto-randomize rankings failed:', err);
    }
  }, delay);

  oneTimeJobs.set('auto-randomize-rankings', timeoutId);
}

/**
 * Schedule the draft finalization one-time job
 * Mar 2, 2026 8pm PST
 */
export function scheduleDraftFinalize(targetDate?: Date): void {
  const target = targetDate || new Date('2026-03-03T04:00:00Z'); // Mar 2 8pm PST = Mar 3 4am UTC
  const now = new Date();

  if (target <= now) {
    console.log('Draft deadline has passed, running finalization immediately');
    finalizeDrafts().catch(console.error);
    return;
  }

  const delay = target.getTime() - now.getTime();
  console.log(
    `Scheduling draft finalization for ${target.toISOString()} (${Math.round(delay / 1000 / 60 / 60)} hours)`
  );

  const timeoutId = setTimeout(async () => {
    console.log('Running scheduled draft finalization');
    try {
      const result = await finalizeDrafts();
      console.log('Draft finalization result:', result);
    } catch (err) {
      console.error('Draft finalization failed:', err);
    }
  }, delay);

  oneTimeJobs.set('draft-finalize', timeoutId);
}

/**
 * Start all scheduled jobs
 */
export function startScheduler(): void {
  console.log('Starting RGFL job scheduler...');

  for (const job of jobs) {
    if (!job.enabled) {
      console.log(`Skipping disabled job: ${job.name}`);
      continue;
    }

    if (!cron.validate(job.schedule)) {
      console.error(`Invalid cron schedule for ${job.name}: ${job.schedule}`);
      continue;
    }

    cron.schedule(job.schedule, async () => {
      console.log(`Running scheduled job: ${job.name}`);
      const startTime = Date.now();

      try {
        const result = await job.handler();
        job.lastRun = new Date();
        job.lastResult = result;
        console.log(
          `Job ${job.name} completed in ${Date.now() - startTime}ms:`,
          result
        );
      } catch (err) {
        console.error(`Job ${job.name} failed:`, err);
        job.lastResult = { error: err instanceof Error ? err.message : 'Unknown error' };
      }
    });

    console.log(`Scheduled job: ${job.name} (${job.schedule})`);
  }

  // Schedule one-time jobs
  scheduleAutoRandomizeRankings();
  scheduleDraftFinalize();

  console.log(`Scheduler started with ${jobs.filter((j) => j.enabled).length} jobs`);
}

/**
 * Stop all scheduled jobs
 */
export function stopScheduler(): void {
  console.log('Stopping RGFL job scheduler...');

  // Cancel one-time jobs
  for (const [name, timeoutId] of oneTimeJobs) {
    clearTimeout(timeoutId);
    console.log(`Cancelled one-time job: ${name}`);
  }
  oneTimeJobs.clear();

  // Note: node-cron doesn't provide a global stop, jobs are stopped when process exits
  console.log('Scheduler stopped');
}

/**
 * Run a job manually by name
 */
export async function runJob(jobName: string): Promise<any> {
  // Check one-time jobs
  if (jobName === 'draft-finalize') {
    return finalizeDrafts();
  }
  if (jobName === 'auto-randomize-rankings') {
    return autoRandomizeRankings();
  }

  const job = jobs.find((j) => j.name === jobName);
  if (!job) {
    throw new Error(`Unknown job: ${jobName}`);
  }

  console.log(`Manually running job: ${jobName}`);
  const startTime = Date.now();

  try {
    const result = await job.handler();
    job.lastRun = new Date();
    job.lastResult = result;
    console.log(`Job ${jobName} completed in ${Date.now() - startTime}ms:`, result);
    return result;
  } catch (err) {
    console.error(`Job ${jobName} failed:`, err);
    throw err;
  }
}

/**
 * Get status of all jobs
 */
export function getJobStatus(): Array<{
  name: string;
  schedule: string;
  description: string;
  enabled: boolean;
  lastRun?: string;
  lastResult?: any;
}> {
  const status = jobs.map((j) => ({
    name: j.name,
    schedule: j.schedule,
    description: j.description,
    enabled: j.enabled,
    lastRun: j.lastRun?.toISOString(),
    lastResult: j.lastResult,
  }));

  // Add one-time jobs
  status.push({
    name: 'auto-randomize-rankings',
    schedule: 'One-time: Jan 5, 2026 12pm PST',
    description: 'Auto-generate random rankings for users who haven\'t submitted',
    enabled: oneTimeJobs.has('auto-randomize-rankings'),
    lastRun: undefined,
    lastResult: undefined,
  });

  status.push({
    name: 'draft-finalize',
    schedule: 'One-time: Mar 2, 2026 8pm PST',
    description: 'Auto-complete incomplete drafts',
    enabled: oneTimeJobs.has('draft-finalize'),
    lastRun: undefined,
    lastResult: undefined,
  });

  return status;
}

export default {
  startScheduler,
  stopScheduler,
  runJob,
  getJobStatus,
  scheduleAutoRandomizeRankings,
  scheduleDraftFinalize,
};
