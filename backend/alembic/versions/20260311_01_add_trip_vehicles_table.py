"""add trip vehicles table

Revision ID: 20260311_01
Revises: 20260310_01
Create Date: 2026-03-11 12:30:00
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "20260311_01"
down_revision: Union[str, None] = "20260310_01"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "trip_vehicles",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("trip_id", sa.Integer(), nullable=False),
        sa.Column("vehicle_number", sa.String(), nullable=False),
        sa.Column("driver_id", sa.Integer(), nullable=False),
        sa.Column("start_km", sa.Float(), nullable=True, server_default="0"),
        sa.Column("end_km", sa.Float(), nullable=True, server_default="0"),
        sa.Column("distance_km", sa.Integer(), nullable=True),
        sa.Column("driver_bhatta", sa.Float(), nullable=True, server_default="0"),
        sa.ForeignKeyConstraint(["driver_id"], ["drivers.id"]),
        sa.ForeignKeyConstraint(["trip_id"], ["trips.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["vehicle_number"], ["vehicles.vehicle_number"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_trip_vehicles_id"), "trip_vehicles", ["id"], unique=False)

    op.execute(
        """
        INSERT INTO trip_vehicles (
            trip_id,
            vehicle_number,
            driver_id,
            start_km,
            end_km,
            distance_km,
            driver_bhatta
        )
        SELECT
            id,
            vehicle_number,
            driver_id,
            COALESCE(start_km, 0),
            COALESCE(end_km, 0),
            distance_km,
            COALESCE(driver_bhatta, 0)
        FROM trips
        WHERE vehicle_number IS NOT NULL AND driver_id IS NOT NULL
        """
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_trip_vehicles_id"), table_name="trip_vehicles")
    op.drop_table("trip_vehicles")
