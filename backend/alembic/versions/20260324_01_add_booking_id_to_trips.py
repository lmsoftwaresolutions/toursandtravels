"""add booking_id to trips (safe)

Revision ID: 20260324_01
Revises: b7c9d8e1f2a3
Create Date: 2026-03-24 00:00:00
"""

from typing import Sequence, Union
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "20260324_01"
down_revision: Union[str, None] = "b7c9d8e1f2a3"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("ALTER TABLE trips ADD COLUMN IF NOT EXISTS booking_id VARCHAR(100)")


def downgrade() -> None:
    op.execute("ALTER TABLE trips DROP COLUMN IF EXISTS booking_id")
