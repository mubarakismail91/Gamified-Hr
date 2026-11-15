-- Real-time notifications (GP2 item 6).
--
-- After every INSERT into "Notification", send a Postgres NOTIFY on the
-- 'notification_created' channel with the recipient and the row's id/time.
-- The API LISTENs on that channel and pushes the event to that user's
-- browser over Socket.IO.
--
-- NOTIFY is transactional: Postgres delivers it only when the inserting
-- transaction COMMITS (and drops it on rollback), so the browser is never
-- told about a notification that doesn't exist. Every place that creates a
-- notification is covered without changing any application code.
CREATE OR REPLACE FUNCTION notify_notification_created() RETURNS trigger AS $$
BEGIN
  PERFORM pg_notify(
    'notification_created',
    json_build_object('userId', NEW."userId", 'id', NEW."id", 'createdAt', NEW."createdAt")::text
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER notification_created
  AFTER INSERT ON "Notification"
  FOR EACH ROW EXECUTE FUNCTION notify_notification_created();
