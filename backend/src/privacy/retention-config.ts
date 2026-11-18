/**
 * Retention periods (PDPL). Each can be changed with an environment variable; the Privacy page
 * shows the values actually in force (GET /privacy/policy).
 */
const days = (name: string, fallback: number) => {
  const n = Number(process.env[name]);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
};

export function retentionPolicy() {
  return {
    /** Notifications are deleted this many days after they were created. */
    notificationsDays: days('RETENTION_NOTIFICATIONS_DAYS', 365),
    /** A deactivated account's personal data is anonymised this many days after deactivation. */
    deactivatedAccountsDays: days('RETENTION_DEACTIVATED_DAYS', 365),
    /** Expired login sessions are deleted at once; revoked ones after this many days (kept briefly for security review). */
    revokedSessionsDays: days('RETENTION_REVOKED_SESSIONS_DAYS', 30),
    /** Whether the daily cleanup job runs (03:00 server time). */
    jobEnabled: process.env.RETENTION_JOB_ENABLED !== 'false',
  };
}

export type RetentionPolicy = ReturnType<typeof retentionPolicy>;
