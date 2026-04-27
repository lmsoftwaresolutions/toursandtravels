"""add oil bill tables

Revision ID: 20260427_01
Revises: 20260423_01
Create Date: 2026-04-27
"""

from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = "20260427_01"
down_revision: Union[str, None] = "20260423_01"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS oil_bills (
            id SERIAL PRIMARY KEY,
            vendor_id INTEGER NOT NULL REFERENCES vendors(id),
            bill_number VARCHAR NOT NULL,
            bill_date DATE NOT NULL,
            payment_status VARCHAR NOT NULL DEFAULT 'unpaid',
            payment_mode VARCHAR,
            overall_note TEXT,
            grand_total_amount DOUBLE PRECISION NOT NULL DEFAULT 0,
            created_at TIMESTAMP DEFAULT now(),
            updated_at TIMESTAMP
        );
        """
    )
    op.execute("CREATE INDEX IF NOT EXISTS ix_oil_bills_id ON oil_bills (id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_oil_bills_vendor_id ON oil_bills (vendor_id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_oil_bills_bill_number ON oil_bills (bill_number)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_oil_bills_bill_date ON oil_bills (bill_date)")
    op.execute(
        """
        CREATE UNIQUE INDEX IF NOT EXISTS uq_oil_bills_vendor_bill_number
        ON oil_bills (vendor_id, bill_number);
        """
    )

    op.execute(
        """
        CREATE TABLE IF NOT EXISTS oil_bill_entries (
            id SERIAL PRIMARY KEY,
            oil_bill_id INTEGER NOT NULL REFERENCES oil_bills(id) ON DELETE CASCADE,
            vehicle_number VARCHAR NOT NULL REFERENCES vehicles(vehicle_number),
            particular_name VARCHAR NOT NULL,
            liters DOUBLE PRECISION NOT NULL DEFAULT 0,
            rate DOUBLE PRECISION NOT NULL DEFAULT 0,
            total_amount DOUBLE PRECISION NOT NULL DEFAULT 0,
            note TEXT,
            row_order INTEGER NOT NULL DEFAULT 0,
            created_at TIMESTAMP DEFAULT now()
        );
        """
    )
    op.execute("CREATE INDEX IF NOT EXISTS ix_oil_bill_entries_id ON oil_bill_entries (id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_oil_bill_entries_oil_bill_id ON oil_bill_entries (oil_bill_id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_oil_bill_entries_vehicle_number ON oil_bill_entries (vehicle_number)")

    op.execute(
        """
        UPDATE vendors
        SET category = 'oil'
        WHERE lower(trim(coalesce(category, ''))) = 'oil';
        """
    )


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS oil_bill_entries")
    op.execute("DROP TABLE IF EXISTS oil_bills")
