/**
 * Admin Campaigns API
 *
 * Handles email and SMS campaign management:
 * - Create, schedule, and send email campaigns via Resend
 * - Create, schedule, and send SMS campaigns via Twilio
 * - Campaign archiving and history
 * - Recipient management and segmentation
 */
declare const router: import("express-serve-static-core").Router;
/**
 * Send email campaign immediately
 */
declare function sendEmailCampaignNow(campaignId: string): Promise<void>;
/**
 * Send SMS campaign immediately
 */
declare function sendSmsCampaignNow(campaignId: string): Promise<void>;
export default router;
export { sendEmailCampaignNow, sendSmsCampaignNow };
//# sourceMappingURL=campaigns.d.ts.map