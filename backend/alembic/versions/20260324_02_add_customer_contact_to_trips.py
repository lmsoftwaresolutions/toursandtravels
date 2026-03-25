"""add customer phone/address to trips (safe)

Revision ID: 20260324_02
Revises: 20260324_01
Create Date: 2026-03-24 00:00:00
"""

from typing import Sequence, Union
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "20260324_02"
down_revision: Union[str, None] = "20260324_01"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("ALTER TABLE trips ADD COLUMN IF NOT EXISTS customer_phone VARCHAR")
    op.execute("ALTER TABLE trips ADD COLUMN IF NOT EXISTS customer_address VARCHAR")


def downgrade() -> None:
    op.execute("ALTER TABLE trips DROP COLUMN IF EXISTS customer_address")
    op.execute("ALTER TABLE trips DROP COLUMN IF EXISTS customer_phone")
