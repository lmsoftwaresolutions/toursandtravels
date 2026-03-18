"""add vendor phone and normalize categories

Revision ID: 20260311_02
Revises: 20260311_01
Create Date: 2026-03-11 18:10:00
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "20260311_02"
down_revision: Union[str, None] = "20260311_01"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Use IF NOT EXISTS to avoid failure when column already exists.
    op.execute("ALTER TABLE vendors ADD COLUMN IF NOT EXISTS phone VARCHAR")
    op.execute("UPDATE vendors SET category = 'spare_parts' WHERE category = 'spare'")


def downgrade() -> None:
    op.execute("UPDATE vendors SET category = 'spare' WHERE category = 'spare_parts'")
    op.execute("ALTER TABLE vendors DROP COLUMN IF EXISTS phone")
