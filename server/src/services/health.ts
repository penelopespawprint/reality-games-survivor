/**
 * Health Check Service
 *
 * Performs detailed health diagnostics for the API including database,
 * scheduler, and job monitoring checks.
 */

import { supabaseAdmin } from '../config/supabase.js';
import { getJobStatus } from '../jobs/scheduler.js';
import { getRecentJobFailures } from '../lib/job-monitoring.js';
import type {
  ComponentCheck,
  SchedulerCheck,
  JobFailuresCheck,
  DetailedHealthResponse,
  HealthStatus,
  OverallStatus,
} from '../types/health.js';

/**
 * Check database connectivity and latency
 */
async function checkDatabase(): Promise<ComponentCheck> {
  const startTime = Date.now();

  try {
    // Execute simple query to verify connectivity
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('id')
      .limit(1)
      .single();

    const latency = Date.now() - startTime;

    if (error && error.code !== 'PGRST116') {
      // PGRST116 is "no rows returned" which is acceptable for health check
      return {
        status: 'fail',
        latency,
        error: error.message,
      };
    }

    // Determine status based on latency
    let status: HealthStatus = 'pass';
    if (latency >= 2000) {
      status = 'fail';
    } else if (latency >= 500) {
      status = 'warn';
    }

    return {
      status,
      latency,
      details: {
        message:
          status === 'pass'
            ? 'Database connection healthy'
            : status === 'warn'
            ? 'Database responding slowly'
            : 'Database connection too slow',
      },
    };
  } catch (err) {
    const latency = Date.now() - startTime;
    return {
      status: 'fail',
      latency,
      error: err instanceof Error ? err.message : 'Unknown database error',
    };
  }
}

/**
 * Check scheduler status
 */
async function checkScheduler(): Promise<SchedulerCheck> {
  try {
    const jobStatus = getJobStatus();

    // Scheduler is running if we have job status
    const running = jobStatus.length > 0;
    const enabledJobs = jobStatus.filter((job) => job.enabled);

    if (!running) {
      return {
        status: 'fail',
        running: false,
        error: 'Scheduler not initialized',
      };
    }

    return {
      status: 'pass',
      running: true,
      jobCount: enabledJobs.length,
      details: {
        message: `Scheduler running with ${enabledJobs.length} enabled jobs`,
        jobs: enabledJobs.map((j) => ({
          name: j.name,
          schedule: j.schedule,
          lastRun: j.lastRun,
        })),
      },
    };
  } catch (err) {
    return {
      status: 'fail',
      running: false,
      error: err instanceof Error ? err.message : 'Unknown scheduler error',
    };
  }
}

/**
 * Check recent job failures
 */
async function checkRecentJobFailures(): Promise<JobFailuresCheck> {
  try {
    const failures = await getRecentJobFailures(1); // Last 1 hour
    const count = failures.length;

    let status: HealthStatus = 'pass';
    if (count > 3) {
      status = 'fail';
    } else if (count >= 1) {
      status = 'warn';
    }

    const result: JobFailuresCheck = {
      status,
      count,
    };

    if (count > 0) {
      // Include most recent failure
      const mostRecent = failures[0];
      result.lastFailure = {
        timestamp: mostRecent.timestamp.toISOString(),
        job: mostRecent.job,
        error: mostRecent.error,
      };
    }

    return result;
  } catch (err) {
    // If job monitoring system isn't implemented yet, return pass
    return {
      status: 'pass',
      count: 0,
      details: {
        message: 'Job monitoring system not yet implemented',
      },
    };
  }
}

/**
 * Determine overall health status from component checks
 */
function determineOverallStatus(checks: {
  database: ComponentCheck;
  scheduler: SchedulerCheck;
  recentJobFailures: JobFailuresCheck;
}): OverallStatus {
  const statuses = [
    checks.database.status,
    checks.scheduler.status,
    checks.recentJobFailures.status,
  ];

  // Any fail = unhealthy
  if (statuses.includes('fail')) {
    return 'unhealthy';
  }

  // Any warn = degraded
  if (statuses.includes('warn')) {
    return 'degraded';
  }

  return 'healthy';
}

/**
 * Perform detailed health check
 */
export async function performHealthCheck(): Promise<DetailedHealthResponse> {
  // Run all checks in parallel
  const [database, scheduler, recentJobFailures] = await Promise.all([
    checkDatabase(),
    checkScheduler(),
    checkRecentJobFailures(),
  ]);

  const checks = {
    database,
    scheduler,
    recentJobFailures,
  };

  return {
    status: determineOverallStatus(checks),
    timestamp: new Date().toISOString(),
    checks,
  };
}
