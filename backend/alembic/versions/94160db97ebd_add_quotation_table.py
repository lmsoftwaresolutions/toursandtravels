"""Add quotation table

Revision ID: 94160db97ebd
Revises: 20260312_01
Create Date: 2026-03-13 10:00:00
"""

from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "94160db97ebd"
down_revision: Union[str, None] = "20260312_01"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    op.create_table(
        "quotations",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("quotation_no", sa.String(), nullable=False),
        sa.Column("customer_name", sa.String(), nullable=False),
        sa.Column("address", sa.String(), nullable=True),
        sa.Column("mobile", sa.String(), nullable=True),
        sa.Column("quotation_date", sa.Date(), nullable=False),
        sa.Column("tour_description", sa.String(), nullable=True),
        sa.Column("approx_km", sa.Float(), nullable=True),
        sa.Column("rate_per_km", sa.Float(), nullable=True),
        sa.Column("no_of_buses", sa.Integer(), nullable=True),
        sa.Column("trip_cost", sa.Float(), nullable=True),
        sa.Column("mp_tax", sa.Float(), nullable=True),
        sa.Column("border_entry", sa.Float(), nullable=True),
        sa.Column("toll", sa.Float(), nullable=True),
        sa.Column("total_amount", sa.Float(), nullable=True),
        sa.Column("amount_in_words", sa.String(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), onupdate=sa.text("CURRENT_TIMESTAMP")),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("is_deleted", sa.Boolean(), server_default="false"),
    )
    op.create_index("ix_quotations_id", "quotations", ["id"])
    op.create_index("ix_quotations_quotation_no", "quotations", ["quotation_no"], unique=True)

def downgrade() -> None:
    op.drop_index("ix_quotations_quotation_no", table_name="quotations")
    op.drop_index("ix_quotations_id", table_name="quotations")
    op.drop_table("quotations")
