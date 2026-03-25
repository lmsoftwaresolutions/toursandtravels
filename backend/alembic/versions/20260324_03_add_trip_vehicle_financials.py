"""add trip vehicle financial fields (safe)

Revision ID: 20260324_03
Revises: 20260324_02
Create Date: 2026-03-24 00:00:00
"""

from typing import Sequence, Union
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "20260324_03"
down_revision: Union[str, None] = "20260324_02"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("ALTER TABLE trip_vehicles ADD COLUMN IF NOT EXISTS fuel_cost DOUBLE PRECISION DEFAULT 0")
    op.execute("ALTER TABLE trip_vehicles ADD COLUMN IF NOT EXISTS fuel_litres DOUBLE PRECISION DEFAULT 0")
    op.execute("ALTER TABLE trip_vehicles ADD COLUMN IF NOT EXISTS diesel_used DOUBLE PRECISION DEFAULT 0")
    op.execute("ALTER TABLE trip_vehicles ADD COLUMN IF NOT EXISTS petrol_used DOUBLE PRECISION DEFAULT 0")
    op.execute("ALTER TABLE trip_vehicles ADD COLUMN IF NOT EXISTS fuel_price DOUBLE PRECISION DEFAULT 0")
    op.execute("ALTER TABLE trip_vehicles ADD COLUMN IF NOT EXISTS fuel_vendor VARCHAR")
    op.execute("ALTER TABLE trip_vehicles ADD COLUMN IF NOT EXISTS toll_amount DOUBLE PRECISION DEFAULT 0")
    op.execute("ALTER TABLE trip_vehicles ADD COLUMN IF NOT EXISTS parking_amount DOUBLE PRECISION DEFAULT 0")
    op.execute("ALTER TABLE trip_vehicles ADD COLUMN IF NOT EXISTS other_expenses DOUBLE PRECISION DEFAULT 0")
    op.execute("ALTER TABLE trip_vehicles ADD COLUMN IF NOT EXISTS bus_type VARCHAR")


def downgrade() -> None:
    op.execute("ALTER TABLE trip_vehicles DROP COLUMN IF EXISTS bus_type")
    op.execute("ALTER TABLE trip_vehicles DROP COLUMN IF EXISTS other_expenses")
    op.execute("ALTER TABLE trip_vehicles DROP COLUMN IF EXISTS parking_amount")
    op.execute("ALTER TABLE trip_vehicles DROP COLUMN IF EXISTS toll_amount")
    op.execute("ALTER TABLE trip_vehicles DROP COLUMN IF EXISTS fuel_vendor")
    op.execute("ALTER TABLE trip_vehicles DROP COLUMN IF EXISTS fuel_price")
    op.execute("ALTER TABLE trip_vehicles DROP COLUMN IF EXISTS petrol_used")
    op.execute("ALTER TABLE trip_vehicles DROP COLUMN IF EXISTS diesel_used")
    op.execute("ALTER TABLE trip_vehicles DROP COLUMN IF EXISTS fuel_litres")
    op.execute("ALTER TABLE trip_vehicles DROP COLUMN IF EXISTS fuel_cost")
