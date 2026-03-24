"""add vehicle type and seat count to vehicles

Revision ID: b7c9d8e1f2a3
Revises: a1b2c3d4e5f6
Create Date: 2026-03-23 18:30:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


# revision identifiers, used by Alembic.
revision = 'b7c9d8e1f2a3'
down_revision = 'a1b2c3d4e5f6'
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)
    if not inspector.has_table("vehicles"):
        return
    op.execute("ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS vehicle_type VARCHAR")
    op.execute("ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS seat_count INTEGER")


def downgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)
    if not inspector.has_table("vehicles"):
        return
    op.execute("ALTER TABLE vehicles DROP COLUMN IF EXISTS seat_count")
    op.execute("ALTER TABLE vehicles DROP COLUMN IF EXISTS vehicle_type")
