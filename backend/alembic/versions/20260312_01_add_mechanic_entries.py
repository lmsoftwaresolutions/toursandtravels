"""add mechanic entries table

Revision ID: 20260312_01
Revises: 20260311_02
Create Date: 2026-03-12 15:30:00
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "20260312_01"
down_revision: Union[str, None] = "20260311_02"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Use IF NOT EXISTS to allow running against an existing schema.
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS mechanic_entries (
            id SERIAL PRIMARY KEY,
            vehicle_number VARCHAR NOT NULL REFERENCES vehicles(vehicle_number),
            work_description VARCHAR NOT NULL,
            cost FLOAT NOT NULL,
            vendor VARCHAR,
            service_date DATE NOT NULL,
            created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
        );
        """
    )
    op.execute("CREATE INDEX IF NOT EXISTS ix_mechanic_entries_id ON mechanic_entries (id);")


def downgrade() -> None:
    op.drop_index("ix_mechanic_entries_id", table_name="mechanic_entries")
    op.drop_table("mechanic_entries")
