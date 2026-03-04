"""sync trip/payment/driver schema and backfill

Revision ID: 20260304_02
Revises: 20260304_01
Create Date: 2026-03-04 00:10:00
"""

from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = "20260304_02"
down_revision: Union[str, None] = "20260304_01"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        """
        ALTER TABLE drivers ADD COLUMN IF NOT EXISTS joining_date DATE;
        ALTER TABLE drivers ADD COLUMN IF NOT EXISTS monthly_salary DOUBLE PRECISION;

        ALTER TABLE trips ADD COLUMN IF NOT EXISTS start_km DOUBLE PRECISION DEFAULT 0;
        ALTER TABLE trips ADD COLUMN IF NOT EXISTS end_km DOUBLE PRECISION DEFAULT 0;
        ALTER TABLE trips ADD COLUMN IF NOT EXISTS fuel_litres DOUBLE PRECISION DEFAULT 0;
        ALTER TABLE trips ADD COLUMN IF NOT EXISTS driver_bhatta DOUBLE PRECISION DEFAULT 0;
        ALTER TABLE trips ADD COLUMN IF NOT EXISTS discount_amount DOUBLE PRECISION DEFAULT 0;
        ALTER TABLE trips ADD COLUMN IF NOT EXISTS invoice_number VARCHAR(50);

        ALTER TABLE payments ADD COLUMN IF NOT EXISTS invoice_number VARCHAR(50);
        ALTER TABLE payments ADD COLUMN IF NOT EXISTS payment_mode VARCHAR(50);

        ALTER TABLE maintenance ADD COLUMN IF NOT EXISTS end_date TIMESTAMP;

        CREATE TABLE IF NOT EXISTS trip_pricing_items (
          id SERIAL PRIMARY KEY,
          trip_id INTEGER NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
          description VARCHAR NOT NULL,
          quantity DOUBLE PRECISION DEFAULT 1,
          rate DOUBLE PRECISION DEFAULT 0,
          amount DOUBLE PRECISION DEFAULT 0,
          item_type VARCHAR DEFAULT 'pricing',
          created_at TIMESTAMPTZ DEFAULT now()
        );

        CREATE TABLE IF NOT EXISTS trip_driver_changes (
          id SERIAL PRIMARY KEY,
          trip_id INTEGER NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
          driver_id INTEGER NOT NULL REFERENCES drivers(id),
          start_time TIMESTAMPTZ,
          end_time TIMESTAMPTZ,
          notes VARCHAR,
          created_at TIMESTAMPTZ DEFAULT now()
        );

        CREATE TABLE IF NOT EXISTS dashboard_notes (
          id SERIAL PRIMARY KEY,
          note_date DATE NOT NULL,
          note VARCHAR NOT NULL,
          created_at TIMESTAMPTZ DEFAULT now()
        );

        UPDATE trips
        SET invoice_number = CONCAT('LEGACY-', id)
        WHERE invoice_number IS NULL OR invoice_number = '';

        UPDATE payments p
        SET invoice_number = COALESCE(p.invoice_number, t.invoice_number, CONCAT('TRIP-', p.trip_id::text), CONCAT('PAY-', p.id::text))
        FROM trips t
        WHERE p.trip_id = t.id
          AND (p.invoice_number IS NULL OR p.invoice_number = '');

        UPDATE payments
        SET invoice_number = CONCAT('PAY-', id)
        WHERE invoice_number IS NULL OR invoice_number = '';

        UPDATE payments
        SET payment_mode = 'cash'
        WHERE payment_mode IS NULL OR payment_mode = '';

        DO $$
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM trips WHERE invoice_number IS NULL OR invoice_number = '') THEN
            ALTER TABLE trips ALTER COLUMN invoice_number SET NOT NULL;
          END IF;

          IF NOT EXISTS (SELECT 1 FROM payments WHERE invoice_number IS NULL OR invoice_number = '') THEN
            ALTER TABLE payments ALTER COLUMN invoice_number SET NOT NULL;
          END IF;

          IF NOT EXISTS (SELECT 1 FROM payments WHERE payment_mode IS NULL OR payment_mode = '') THEN
            ALTER TABLE payments ALTER COLUMN payment_mode SET NOT NULL;
          END IF;

          IF NOT EXISTS (
            SELECT 1 FROM pg_constraint WHERE conname = 'trips_invoice_number_key'
          ) AND NOT EXISTS (
            SELECT invoice_number FROM trips GROUP BY invoice_number HAVING COUNT(*) > 1
          ) THEN
            ALTER TABLE trips ADD CONSTRAINT trips_invoice_number_key UNIQUE (invoice_number);
          END IF;
        END $$;
        """
    )


def downgrade() -> None:
    # Intentionally conservative: avoid destructive downgrade on production data.
    pass
