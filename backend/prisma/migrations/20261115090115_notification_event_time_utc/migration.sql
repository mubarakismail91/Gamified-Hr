-- Send the notification time as an unambiguous UTC ISO string ("...Z").
--
-- Prisma stores DateTime values as UTC in "timestamp without time zone" columns. Formatting the
-- column directly gave e.g. "2026-11-15T09:00:00.123" with no zone, which browsers read as LOCAL
-- time (3 hours off in Riyadh). The value is UTC, so say so explicitly.
CREATE OR REPLACE FUNCTION notify_notification_created() RETURNS trigger AS $$
BEGIN
  PERFORM pg_notify(
    'notification_created',
    json_build_object(
      'userId', NEW."userId",
      'id', NEW."id",
      'createdAt', to_char(NEW."createdAt", 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
    )::text
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
