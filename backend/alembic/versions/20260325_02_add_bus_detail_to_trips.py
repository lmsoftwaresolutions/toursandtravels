"""add bus_detail to trips

Revision ID: 20260325_02
Revises: 20260325_01
Create Date: 2026-03-25 16:10:00
"""

from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = "20260325_02"
down_revision: Union[str, None] = "20260325_01"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        """
        ALTER TABLE trips ADD COLUMN IF NOT EXISTS bus_detail VARCHAR;
        """
    )


def downgrade() -> None:
    # Intentionally conservative: avoid destructive downgrade on production data.
    pass
