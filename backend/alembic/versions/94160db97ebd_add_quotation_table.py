"""Add quotation table

Revision ID: 94160db97ebd
Revises: 20260312_01
Create Date: 2026-03-13 10:00:00
"""

from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "94160db97ebd"
down_revision: Union[str, None] = "20260312_01"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    # Use IF NOT EXISTS so this can run safely on a schema that already contains the table.
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS quotations (
            id SERIAL PRIMARY KEY,
            quotation_no VARCHAR NOT NULL,
            customer_name VARCHAR NOT NULL,
            address VARCHAR,
            mobile VARCHAR,
            quotation_date DATE NOT NULL,
            tour_description VARCHAR,
            approx_km FLOAT,
            rate_per_km FLOAT,
            no_of_buses INTEGER,
            trip_cost FLOAT,
            mp_tax FLOAT,
            border_entry FLOAT,
            toll FLOAT,
            total_amount FLOAT,
            amount_in_words VARCHAR,
            created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
            deleted_at TIMESTAMPTZ,
            is_deleted BOOLEAN DEFAULT false
        );
        """
    )
    op.execute("CREATE INDEX IF NOT EXISTS ix_quotations_id ON quotations (id);")
    op.execute(
        "CREATE UNIQUE INDEX IF NOT EXISTS ix_quotations_quotation_no ON quotations (quotation_no);"
    )

def downgrade() -> None:
    op.drop_index("ix_quotations_quotation_no", table_name="quotations")
    op.drop_index("ix_quotations_id", table_name="quotations")
    op.drop_table("quotations")
