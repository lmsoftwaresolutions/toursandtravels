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
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    if not inspector.has_table("mechanic_entries"):
        op.create_table(
            "mechanic_entries",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("vehicle_number", sa.String(), sa.ForeignKey("vehicles.vehicle_number"), nullable=False),
            sa.Column("work_description", sa.String(), nullable=False),
            sa.Column("cost", sa.Float(), nullable=False),
            sa.Column("vendor", sa.String(), nullable=True),
            sa.Column("service_date", sa.Date(), nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP")),
        )
        op.create_index("ix_mechanic_entries_id", "mechanic_entries", ["id"])


def downgrade() -> None:
    op.drop_index("ix_mechanic_entries_id", table_name="mechanic_entries")
    op.drop_table("mechanic_entries")
