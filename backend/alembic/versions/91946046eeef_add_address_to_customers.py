"""add address to customers

Revision ID: 91946046eeef
Revises: 6ffd4983bd41
Create Date: 2026-03-20 19:26:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '91946046eeef'
down_revision = '6ffd4983bd41'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("ALTER TABLE customers ADD COLUMN IF NOT EXISTS address VARCHAR")


def downgrade() -> None:
    op.execute("ALTER TABLE customers DROP COLUMN IF EXISTS address")
