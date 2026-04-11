"""add trip_id to vendor_payments

Revision ID: 20260410_01
Revises: 20260409_01
Create Date: 2026-04-10 14:45:00
"""

from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = "20260410_01"
down_revision: Union[str, None] = "20260409_01"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        """
        ALTER TABLE vendor_payments
        ADD COLUMN IF NOT EXISTS trip_id INTEGER;

        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1
            FROM pg_constraint
            WHERE conname = 'vendor_payments_trip_id_fkey'
          ) THEN
            ALTER TABLE vendor_payments
            ADD CONSTRAINT vendor_payments_trip_id_fkey
            FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE SET NULL;
          END IF;
        END $$;

        CREATE INDEX IF NOT EXISTS ix_vendor_payments_trip_id
        ON vendor_payments (trip_id);
        """
    )


def downgrade() -> None:
    # Conservative downgrade to avoid breaking historical payment records.
    pass
