-- CreateEnum
CREATE TYPE "XpSource" AS ENUM ('quest_approved', 'kudos_received', 'challenge_bonus', 'admin_adjustment', 'starting_balance', 'legacy');

-- CreateTable
CREATE TABLE "XpTransaction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "seq" INTEGER NOT NULL,
    "amount" INTEGER NOT NULL,
    "balanceAfter" INTEGER NOT NULL,
    "source" "XpSource" NOT NULL,
    "refType" TEXT,
    "refId" TEXT,
    "idempotencyKey" TEXT NOT NULL,
    "actorId" TEXT,
    "prevHash" TEXT NOT NULL,
    "hash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "XpTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "XpTransaction_idempotencyKey_key" ON "XpTransaction"("idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "XpTransaction_userId_seq_key" ON "XpTransaction"("userId", "seq");

-- AddForeignKey
ALTER TABLE "XpTransaction" ADD CONSTRAINT "XpTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- Hashing. Must match XpLedgerService.hashOf() exactly (same fields, same order,
-- same separators, timestamps as UTC ISO strings with milliseconds and "Z").
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION xp_hash(
  p_prev text, p_user text, p_seq int, p_amount int, p_balance int, p_source text,
  p_ref_type text, p_ref_id text, p_key text, p_actor text, p_created timestamp
) RETURNS text AS $$
  SELECT encode(sha256(convert_to(
    p_prev || '|' || p_user || '|' || p_seq || '|' || p_amount || '|' || p_balance || '|' || p_source || '|' ||
    coalesce(p_ref_type, '') || '|' || coalesce(p_ref_id, '') || '|' || p_key || '|' || coalesce(p_actor, '') || '|' ||
    to_char(p_created, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
  'UTF8')), 'hex');
$$ LANGUAGE sql IMMUTABLE;

-- ---------------------------------------------------------------------------
-- Backfill: every existing XP change in the activity log becomes a ledger row, in time order,
-- chained per person. If someone's cached total disagrees with their history, one final
-- 'legacy' row records the difference, so the ledger always starts out matching totalXp.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  u record;
  a record;
  v_seq int;
  v_prev text;
  v_balance int;
  v_source "XpSource";
  v_hash text;
  v_now timestamp := date_trunc('milliseconds', (now() AT TIME ZONE 'UTC'));
BEGIN
  FOR u IN SELECT id, "totalXp" FROM "User" ORDER BY "createdAt" LOOP
    v_seq := 0; v_prev := repeat('0', 64); v_balance := 0;
    FOR a IN
      SELECT id, "xpDelta", kind, "refType", "refId", "textEn", "createdAt" FROM "ActivityLog"
      WHERE "userId" = u.id AND "xpDelta" <> 0 ORDER BY "createdAt", id
    LOOP
      v_seq := v_seq + 1;
      v_balance := v_balance + a."xpDelta";
      v_source := CASE
        WHEN a."refType" = 'Quest' THEN 'quest_approved'
        WHEN a."refType" = 'Kudo' THEN 'kudos_received'
        WHEN a."refType" = 'SquadChallenge' THEN 'challenge_bonus'
        WHEN a."textEn" = 'Starting balance' THEN 'starting_balance'
        WHEN a.kind = 'xp' THEN 'admin_adjustment'
        ELSE 'legacy' END;
      v_hash := xp_hash(v_prev, u.id, v_seq, a."xpDelta", v_balance, v_source::text, a."refType", a."refId", 'legacy:' || a.id, NULL, a."createdAt");
      INSERT INTO "XpTransaction" (id, "userId", seq, amount, "balanceAfter", source, "refType", "refId", "idempotencyKey", "actorId", "prevHash", hash, "createdAt")
      VALUES ('xpl_' || md5(a.id), u.id, v_seq, a."xpDelta", v_balance, v_source, a."refType", a."refId", 'legacy:' || a.id, NULL, v_prev, v_hash, a."createdAt");
      v_prev := v_hash;
    END LOOP;
    IF v_balance <> u."totalXp" THEN
      v_seq := v_seq + 1;
      v_hash := xp_hash(v_prev, u.id, v_seq, u."totalXp" - v_balance, u."totalXp", 'legacy', 'Reconciliation', NULL, 'legacy-reconcile:' || u.id, NULL, v_now);
      INSERT INTO "XpTransaction" (id, "userId", seq, amount, "balanceAfter", source, "refType", "refId", "idempotencyKey", "actorId", "prevHash", hash, "createdAt")
      VALUES ('xpl_r_' || md5(u.id), u.id, v_seq, u."totalXp" - v_balance, u."totalXp", 'legacy', 'Reconciliation', NULL, 'legacy-reconcile:' || u.id, NULL, v_prev, v_hash, v_now);
    END IF;
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- Append-only rules, enforced by the database itself.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION xp_ledger_append_only() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'The XP ledger is append-only: % is not allowed. Record a reversing transaction instead.', TG_OP
    USING ERRCODE = 'restrict_violation';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER xp_transaction_no_update_delete
  BEFORE UPDATE OR DELETE ON "XpTransaction"
  FOR EACH ROW EXECUTE FUNCTION xp_ledger_append_only();

-- The audit trail: never deleted. The only edit allowed is removing personal details from
-- metadata (PDPL erasure): every other column must stay the same and the new metadata must be
-- contained in the old one (keys removed, nothing added or changed).
CREATE OR REPLACE FUNCTION audit_log_protect() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'The audit trail cannot be deleted.' USING ERRCODE = 'restrict_violation';
  END IF;
  IF NEW.id IS DISTINCT FROM OLD.id
     OR NEW.action IS DISTINCT FROM OLD.action
     OR NEW."targetType" IS DISTINCT FROM OLD."targetType"
     OR NEW."targetId" IS DISTINCT FROM OLD."targetId"
     OR NEW."createdAt" IS DISTINCT FROM OLD."createdAt"
     OR (NEW."actorId" IS DISTINCT FROM OLD."actorId" AND NEW."actorId" IS NOT NULL)
     OR NOT (coalesce(NEW.metadata, '{}'::jsonb) <@ coalesce(OLD.metadata, '{}'::jsonb)) THEN
    RAISE EXCEPTION 'The audit trail can only have personal details removed, not changed.' USING ERRCODE = 'restrict_violation';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audit_log_protect
  BEFORE UPDATE OR DELETE ON "AuditLog"
  FOR EACH ROW EXECUTE FUNCTION audit_log_protect();
