"""add trip vehicle expenses table (safe)

Revision ID: 20260324_05
Revises: 20260324_04
Create Date: 2026-03-24 00:00:00
"""

from typing import Sequence, Union
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "20260324_05"
down_revision: Union[str, None] = "20260324_04"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS trip_vehicle_expenses (
            id SERIAL PRIMARY KEY,
            trip_vehicle_id INTEGER NOT NULL REFERENCES trip_vehicles(id) ON DELETE CASCADE,
            expense_type VARCHAR NOT NULL,
            amount DOUBLE PRECISION DEFAULT 0,
            notes VARCHAR,
            created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
        );
        """
    )
    op.execute("CREATE INDEX IF NOT EXISTS ix_trip_vehicle_expenses_id ON trip_vehicle_expenses (id);")
    op.execute("CREATE INDEX IF NOT EXISTS ix_trip_vehicle_expenses_trip_vehicle_id ON trip_vehicle_expenses (trip_vehicle_id);")


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS ix_trip_vehicle_expenses_trip_vehicle_id;")
    op.execute("DROP INDEX IF EXISTS ix_trip_vehicle_expenses_id;")
    op.execute("DROP TABLE IF EXISTS trip_vehicle_expenses;")
