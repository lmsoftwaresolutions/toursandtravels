"""add estimate_amount to trips

Revision ID: 20260410_04
Revises: 20260410_02
Create Date: 2026-04-10 18:20:00
"""

from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = "20260410_04"
down_revision: Union[str, None] = "20260410_02"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        """
        ALTER TABLE trips
        ADD COLUMN IF NOT EXISTS estimate_amount DOUBLE PRECISION;
        """
    )


def downgrade() -> None:
    op.execute(
        """
        ALTER TABLE trips
        DROP COLUMN IF EXISTS estimate_amount;
        """
    )
