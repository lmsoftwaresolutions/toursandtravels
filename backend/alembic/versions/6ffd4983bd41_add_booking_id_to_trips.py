"""Add booking_id to trips

Revision ID: 6ffd4983bd41
Revises: 94160db97ebd
Create Date: 2026-03-20 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '6ffd4983bd41'
down_revision = '94160db97ebd'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # This migration was already applied to the postgres volume 
    # but the python file was lost when the container was destroyed.
    # The DB already has the changes, so we pass here.
    # If starting from scratch, you would need to run alembic --autogenerate again.
    pass


def downgrade() -> None:
    pass
