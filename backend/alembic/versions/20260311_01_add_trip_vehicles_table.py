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
    # Make this migration idempotent by using IF NOT EXISTS.
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS trip_vehicles (
            id SERIAL NOT NULL,
            trip_id INTEGER NOT NULL,
            vehicle_number VARCHAR NOT NULL,
            driver_id INTEGER NOT NULL,
            start_km FLOAT DEFAULT 0,
            end_km FLOAT DEFAULT 0,
            distance_km INTEGER,
            driver_bhatta FLOAT DEFAULT 0,
            PRIMARY KEY (id),
            FOREIGN KEY(driver_id) REFERENCES drivers (id),
            FOREIGN KEY(trip_id) REFERENCES trips (id) ON DELETE CASCADE,
            FOREIGN KEY(vehicle_number) REFERENCES vehicles (vehicle_number)
        );
        """
    )
    op.execute("CREATE INDEX IF NOT EXISTS ix_trip_vehicles_id ON trip_vehicles (id);")

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
    op.execute("DROP INDEX IF EXISTS ix_trip_vehicles_id;")
    op.execute("DROP TABLE IF EXISTS trip_vehicles;")
