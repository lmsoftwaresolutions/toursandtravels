"""merge vendor payment heads

Revision ID: 20260410_02
Revises: 20260410_01, ee101d14713a
Create Date: 2026-04-10 15:05:00
"""

from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = "20260410_02"
down_revision: Union[str, tuple[str, ...], None] = ("20260410_01", "ee101d14713a")
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Merge revision to unify the two vendor-related heads.
    pass


def downgrade() -> None:
    pass
