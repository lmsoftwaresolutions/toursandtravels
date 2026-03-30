"""add vehicle_number to trip_driver_changes (safe)

Revision ID: 20260324_04
Revises: 20260324_03
Create Date: 2026-03-24 00:00:00
"""

from typing import Sequence, Union
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "20260324_04"
down_revision: Union[str, None] = "20260324_03"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("ALTER TABLE trip_driver_changes ADD COLUMN IF NOT EXISTS vehicle_number VARCHAR")


def downgrade() -> None:
    op.execute("ALTER TABLE trip_driver_changes DROP COLUMN IF EXISTS vehicle_number")
