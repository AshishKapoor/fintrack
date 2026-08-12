# Enforce the zero-sum ledger invariant in the database.
#
# The exactly-one-target rule has been a check constraint since 0005, but the
# postings-sum-to-zero rule lived only in the API serializer. Anything writing
# through the ORM, the Django admin, a management command or a psql session
# could create an unbalanced transaction - and an unbalanced ledger is the one
# corruption a double-entry system exists to make impossible.
#
# A deferred constraint trigger checks the parent transaction's posting sum at
# COMMIT, so multi-row writes (the normal case: at least two postings per
# transaction) are validated as a whole rather than row by row.

from django.db import migrations

CREATE_SQL = r"""
CREATE OR REPLACE FUNCTION pft_check_postings_balanced() RETURNS trigger AS $$
DECLARE
    tx_id bigint;
    total numeric;
BEGIN
    IF TG_OP = 'DELETE' THEN
        tx_id := OLD.transaction_id;
    ELSE
        tx_id := NEW.transaction_id;
    END IF;

    SELECT COALESCE(SUM(amount), 0) INTO total
    FROM pft_ledgerposting
    WHERE transaction_id = tx_id;

    IF total <> 0 THEN
        RAISE EXCEPTION
            'ledger transaction % postings sum to % (must be 0)', tx_id, total
            USING ERRCODE = '23514',
                  CONSTRAINT = 'ledger_postings_balanced';
    END IF;

    -- An UPDATE that re-parents a posting must leave the old transaction
    -- balanced as well.
    IF TG_OP = 'UPDATE' AND NEW.transaction_id IS DISTINCT FROM OLD.transaction_id THEN
        SELECT COALESCE(SUM(amount), 0) INTO total
        FROM pft_ledgerposting
        WHERE transaction_id = OLD.transaction_id;

        IF total <> 0 THEN
            RAISE EXCEPTION
                'ledger transaction % postings sum to % (must be 0)', OLD.transaction_id, total
                USING ERRCODE = '23514',
                      CONSTRAINT = 'ledger_postings_balanced';
        END IF;
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE CONSTRAINT TRIGGER ledger_postings_balanced
AFTER INSERT OR UPDATE OR DELETE ON pft_ledgerposting
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION pft_check_postings_balanced();
"""

DROP_SQL = r"""
DROP TRIGGER IF EXISTS ledger_postings_balanced ON pft_ledgerposting;
DROP FUNCTION IF EXISTS pft_check_postings_balanced();
"""


class Migration(migrations.Migration):
    dependencies = [
        ("pft", "0005_v2_finance_foundation"),
    ]

    operations = [
        migrations.RunSQL(CREATE_SQL, reverse_sql=DROP_SQL),
    ]
