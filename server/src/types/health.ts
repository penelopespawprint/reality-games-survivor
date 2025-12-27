/**
 * Health Check Types
 *
 * Defines the structure for health check responses and individual component checks.
 */

export type HealthStatus = 'pass' | 'warn' | 'fail';
export type OverallStatus = 'healthy' | 'degraded' | 'unhealthy';

export interface ComponentCheck {
  status: HealthStatus;
  latency?: number;
  error?: string;
  details?: Record<string, any>;
}

export interface SchedulerCheck extends ComponentCheck {
  running?: boolean;
  jobCount?: number;
}

export interface JobFailuresCheck extends ComponentCheck {
  count: number;
  lastFailure?: {
    timestamp: string;
    job: string;
    error: string;
  };
}

export interface DetailedHealthResponse {
  status: OverallStatus;
  timestamp: string;
  checks: {
    database: ComponentCheck;
    scheduler: SchedulerCheck;
    recentJobFailures: JobFailuresCheck;
  };
}

export interface SimpleHealthResponse {
  status: 'ok';
  timestamp: string;
}
