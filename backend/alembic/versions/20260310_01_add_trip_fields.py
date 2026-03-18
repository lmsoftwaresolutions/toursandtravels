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
    # Use IF NOT EXISTS so the migration can be applied safely on DBs
    # where these columns already exist.
    op.execute(
        "ALTER TABLE trips ADD COLUMN IF NOT EXISTS number_of_vehicles INTEGER DEFAULT 1"
    )
    op.execute(
        "ALTER TABLE trips ADD COLUMN IF NOT EXISTS bus_type VARCHAR"
    )

    # Update existing records to have 1 as default for number_of_vehicles
    op.execute("UPDATE trips SET number_of_vehicles = 1 WHERE number_of_vehicles IS NULL")


def downgrade() -> None:
    op.drop_column('trips', 'bus_type')
    op.drop_column('trips', 'number_of_vehicles')
