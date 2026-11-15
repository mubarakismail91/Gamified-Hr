-- Same rules as in the xp_ledger migration, but raised as plain exceptions (SQLSTATE P0001)
-- instead of restrict_violation. Prisma reported restrict_violation as a misleading
-- "Foreign key constraint violated" and hid the explanation; P0001 keeps the message intact.
CREATE OR REPLACE FUNCTION xp_ledger_append_only() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'The XP ledger is append-only: % is not allowed. Record a reversing transaction instead.', TG_OP;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION audit_log_protect() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'The audit trail cannot be deleted.';
  END IF;
  IF NEW.id IS DISTINCT FROM OLD.id
     OR NEW.action IS DISTINCT FROM OLD.action
     OR NEW."targetType" IS DISTINCT FROM OLD."targetType"
     OR NEW."targetId" IS DISTINCT FROM OLD."targetId"
     OR NEW."createdAt" IS DISTINCT FROM OLD."createdAt"
     OR (NEW."actorId" IS DISTINCT FROM OLD."actorId" AND NEW."actorId" IS NOT NULL)
     OR NOT (coalesce(NEW.metadata, '{}'::jsonb) <@ coalesce(OLD.metadata, '{}'::jsonb)) THEN
    RAISE EXCEPTION 'The audit trail can only have personal details removed, not changed.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
