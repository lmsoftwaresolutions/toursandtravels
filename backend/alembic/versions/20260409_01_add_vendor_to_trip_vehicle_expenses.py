"""add vendor column to trip_vehicle_expenses

Revision ID: 20260409_01
Revises: 20260325_02
Create Date: 2026-04-09 16:30:00
"""

from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = "20260409_01"
down_revision: Union[str, None] = "20260325_02"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        """
        ALTER TABLE trip_vehicle_expenses
        ADD COLUMN IF NOT EXISTS vendor VARCHAR;
        """
    )


def downgrade() -> None:
    # Conservative downgrade to avoid data loss.
    pass
