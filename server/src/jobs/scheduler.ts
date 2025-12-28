import cron from 'node-cron';
import { lockPicks } from './lockPicks.js';
import { autoPick } from './autoPick.js';
import { finalizeDrafts } from './finalizeDrafts.js';
import { autoRandomizeRankings } from './autoRandomizeRankings.js';
import { sendPickReminders, sendDraftReminders } from './sendReminders.js';
import { sendEpisodeResults } from './sendResults.js';
import { sendWeeklySummary } from './weeklySummary.js';
import { releaseWeeklyResults } from './releaseResults.js';
import { processEmailQueue } from '../lib/email-queue.js';
import { pstToCron, formatCronWithTimezone } from '../lib/timezone-utils.js';
import { monitoredJobExecution } from './jobMonitor.js';
import { seasonConfig } from '../lib/season-config.js';

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
    name: 'email-queue-processor',
    // Every 5 minutes
    schedule: '*/5 * * * *',
    description: 'Process pending emails from queue with retry logic',
    handler: processEmailQueue,
    enabled: true,
  },
  {
    name: 'lock-picks',
    // Wed 3pm PST (auto-adjusts for DST)
    schedule: pstToCron(15, 0, 3),
    description: 'Lock all pending picks',
    handler: lockPicks,
    enabled: true,
  },
  {
    name: 'auto-pick',
    // Wed 3:05pm PST (auto-adjusts for DST)
    schedule: pstToCron(15, 5, 3),
    description: 'Fill missing picks with auto-select',
    handler: autoPick,
    enabled: true,
  },
  {
    name: 'pick-reminders',
    // Wed 12pm PST (auto-adjusts for DST)
    schedule: pstToCron(12, 0, 3),
    description: 'Send pick reminder emails',
    handler: sendPickReminders,
    enabled: true,
  },
  {
    name: 'results-notification',
    // Fri 12pm PST (auto-adjusts for DST)
    schedule: pstToCron(12, 0, 5),
    description: 'Send episode results',
    handler: sendEpisodeResults,
    enabled: true,
  },
  {
    name: 'release-results',
    // Fri 2pm PST (auto-adjusts for DST)
    schedule: pstToCron(14, 0, 5),
    description: 'Release spoiler-safe results notifications',
    handler: releaseWeeklyResults,
    enabled: true,
  },
  {
    name: 'weekly-summary',
    // Sun 10am PST (auto-adjusts for DST)
    schedule: pstToCron(10, 0, 0),
    description: 'Send weekly standings summary',
    handler: sendWeeklySummary,
    enabled: true,
  },
  {
    name: 'draft-reminders',
    // Daily 9am PST (auto-adjusts for DST)
    schedule: pstToCron(9, 0),
    description: 'Send draft reminder emails',
    handler: sendDraftReminders,
    enabled: true,
  },
];

// Store for one-time jobs
const oneTimeJobs: Map<string, NodeJS.Timeout> = new Map();

/**
 * Schedule auto-randomize rankings one-time job
 * Uses draft_order_deadline from active season in database
 */
export async function scheduleAutoRandomizeRankings(targetDate?: Date): Promise<void> {
  let target: Date;

  if (targetDate) {
    // Allow manual override for testing
    target = targetDate;
  } else {
    // Load from database
    const draftOrderDeadline = await seasonConfig.getDraftOrderDeadline();
    if (!draftOrderDeadline) {
      console.log('No active season or draft order deadline configured, skipping auto-randomize scheduling');
      return;
    }
    target = draftOrderDeadline.toJSDate();
  }

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
      const result = await monitoredJobExecution('auto-randomize-rankings', autoRandomizeRankings);
      console.log('Auto-randomize rankings result:', result);
    } catch (err) {
      console.error('Auto-randomize rankings failed:', err);
    }
  }, delay);

  oneTimeJobs.set('auto-randomize-rankings', timeoutId);
}

/**
 * Schedule the draft finalization one-time job
 * Uses draft_deadline from active season in database
 */
export async function scheduleDraftFinalize(targetDate?: Date): Promise<void> {
  let target: Date;

  if (targetDate) {
    // Allow manual override for testing
    target = targetDate;
  } else {
    // Load from database
    const draftDeadline = await seasonConfig.getDraftDeadline();
    if (!draftDeadline) {
      console.log('No active season or draft deadline configured, skipping draft finalize scheduling');
      return;
    }
    target = draftDeadline.toJSDate();
  }

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
      const result = await monitoredJobExecution('draft-finalize', finalizeDrafts);
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
export async function startScheduler(): Promise<void> {
  console.log('Starting RGFL job scheduler...');

  // Load season info for logging
  const seasonInfo = await seasonConfig.getSeasonInfo();
  if (seasonInfo) {
    console.log(`Active Season: ${seasonInfo.name} (Season ${seasonInfo.number})`);
    console.log(`  Draft Order Deadline: ${seasonInfo.draftOrderDeadline || 'Not set'}`);
    console.log(`  Draft Deadline: ${seasonInfo.draftDeadline || 'Not set'}`);
    console.log(`  Registration Close: ${seasonInfo.registrationClose || 'Not set'}`);
  } else {
    console.log('No active season found - one-time jobs will be skipped');
  }

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
        // Wrap job handler with monitoring
        const result = await monitoredJobExecution(job.name, job.handler);
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

    // Log schedule with timezone info for DST-aware jobs
    const scheduleInfo = job.description.includes('PST')
      ? job.schedule
      : job.schedule;
    console.log(`Scheduled job: ${job.name} (${scheduleInfo})`);
  }

  // Schedule one-time jobs (these are async now)
  await scheduleAutoRandomizeRankings();
  await scheduleDraftFinalize();

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
  // Check one-time jobs - wrap with monitoring
  if (jobName === 'draft-finalize') {
    return monitoredJobExecution('draft-finalize', finalizeDrafts);
  }
  if (jobName === 'auto-randomize-rankings') {
    return monitoredJobExecution('auto-randomize-rankings', autoRandomizeRankings);
  }

  const job = jobs.find((j) => j.name === jobName);
  if (!job) {
    throw new Error(`Unknown job: ${jobName}`);
  }

  console.log(`Manually running job: ${jobName}`);
  const startTime = Date.now();

  try {
    // Wrap job handler with monitoring
    const result = await monitoredJobExecution(job.name, job.handler);
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

  // Add one-time jobs (schedule shown from database)
  status.push({
    name: 'auto-randomize-rankings',
    schedule: 'One-time: From database (draft_order_deadline)',
    description: 'Auto-generate random rankings for users who haven\'t submitted',
    enabled: oneTimeJobs.has('auto-randomize-rankings'),
    lastRun: undefined,
    lastResult: undefined,
  });

  status.push({
    name: 'draft-finalize',
    schedule: 'One-time: From database (draft_deadline)',
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

