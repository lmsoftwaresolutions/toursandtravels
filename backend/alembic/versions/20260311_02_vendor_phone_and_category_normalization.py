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
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_columns = {col["name"] for col in inspector.get_columns("vendors")}

    if "phone" not in existing_columns:
        op.add_column("vendors", sa.Column("phone", sa.String(), nullable=True))

    op.execute("UPDATE vendors SET category = 'spare_parts' WHERE category = 'spare'")


def downgrade() -> None:
    op.execute("UPDATE vendors SET category = 'spare' WHERE category = 'spare_parts'")
    op.drop_column("vendors", "phone")
