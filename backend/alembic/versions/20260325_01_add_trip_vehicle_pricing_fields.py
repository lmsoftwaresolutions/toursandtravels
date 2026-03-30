"""add trip vehicle pricing fields

Revision ID: 20260325_01
Revises: 20260304_02
Create Date: 2026-03-25 00:10:00
"""

from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = "20260325_01"
down_revision: Union[str, None] = "20260324_05"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        """
        ALTER TABLE trip_vehicles ADD COLUMN IF NOT EXISTS vehicle_type VARCHAR;
        ALTER TABLE trip_vehicles ADD COLUMN IF NOT EXISTS seat_count INTEGER;
        ALTER TABLE trip_vehicles ADD COLUMN IF NOT EXISTS pricing_type VARCHAR DEFAULT 'per_km';
        ALTER TABLE trip_vehicles ADD COLUMN IF NOT EXISTS package_amount DOUBLE PRECISION DEFAULT 0;
        ALTER TABLE trip_vehicles ADD COLUMN IF NOT EXISTS cost_per_km DOUBLE PRECISION DEFAULT 0;
        """
    )


def downgrade() -> None:
    # Intentionally conservative: avoid destructive downgrade on production data.
    pass
