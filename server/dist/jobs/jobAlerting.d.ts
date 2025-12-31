/**
 * Job Alerting System
 *
 * Sends email and SMS alerts when scheduled jobs fail.
 * Integrated with job monitoring system to provide real-time notifications
 * for system administrators.
 */
import type { JobExecution } from './jobMonitor.js';
interface AlertConfig {
    adminEmail?: string;
    adminPhone?: string;
}
/**
 * Initialize alerting configuration
 * Should be called on server startup
 */
export declare function initializeAlerting(options: AlertConfig): void;
/**
 * Send alert when a job fails
 * Called automatically by job monitoring system
 */
export declare function alertJobFailure(execution: JobExecution): Promise<void>;
/**
 * Send test alert to verify configuration
 * Can be called via admin endpoint for testing
 */
export declare function sendTestAlert(): Promise<{
    email: boolean;
    sms: boolean;
}>;
/**
 * Get current alerting configuration (for debugging)
 */
export declare function getAlertingConfig(): {
    emailEnabled: boolean;
    smsEnabled: boolean;
    adminEmail?: string;
    criticalJobs: string[];
};
export {};
//# sourceMappingURL=jobAlerting.d.ts.map