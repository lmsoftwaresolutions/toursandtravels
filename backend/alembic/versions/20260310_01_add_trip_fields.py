"""add trip fields: number_of_vehicles and bus_type

Revision ID: 20260310_01
Revises: 20260304_02
Create Date: 2026-03-10 14:15:00
"""

from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "20260310_01"
down_revision: Union[str, None] = "20260304_02"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_columns = {col["name"] for col in inspector.get_columns("trips")}

    added_number_of_vehicles = "number_of_vehicles" not in existing_columns
    if added_number_of_vehicles:
        op.add_column(
            "trips",
            sa.Column("number_of_vehicles", sa.Integer(), nullable=True, server_default="1"),
        )

    if "bus_type" not in existing_columns:
        op.add_column("trips", sa.Column("bus_type", sa.String(), nullable=True))

    # Update existing records to have 1 as default for number_of_vehicles
    if "number_of_vehicles" in existing_columns or added_number_of_vehicles:
        op.execute("UPDATE trips SET number_of_vehicles = 1 WHERE number_of_vehicles IS NULL")


def downgrade() -> None:
    op.drop_column('trips', 'bus_type')
    op.drop_column('trips', 'number_of_vehicles')
