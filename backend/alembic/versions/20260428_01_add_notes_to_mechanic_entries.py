"""Add notes to mechanic_entries

Revision ID: 20260428_01
Revises: d8d2ccc135fa
Create Date: 2026-04-28 18:55:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '20260428_01'
down_revision = 'd8d2ccc135fa'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('mechanic_entries', sa.Column('notes', sa.String(), nullable=True))

def downgrade() -> None:
    op.drop_column('mechanic_entries', 'notes')
