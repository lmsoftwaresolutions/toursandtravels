"""Add quantity_total_oil and rate_per_liter to oil_bills

Revision ID: 20260512_01
Revises: 20260428_01
Create Date: 2026-05-12

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '20260512_01'
down_revision = '20260428_01'
branch_labels = None
depends_on = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    columns = [c['name'] for c in inspector.get_columns('oil_bills')]

    if 'quantity_total_oil' not in columns:
        op.add_column('oil_bills', sa.Column('quantity_total_oil', sa.Float(), nullable=True, server_default='0'))

    if 'rate_per_liter' not in columns:
        op.add_column('oil_bills', sa.Column('rate_per_liter', sa.Float(), nullable=True, server_default='0'))


def downgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    columns = [c['name'] for c in inspector.get_columns('oil_bills')]

    if 'rate_per_liter' in columns:
        op.drop_column('oil_bills', 'rate_per_liter')

    if 'quantity_total_oil' in columns:
        op.drop_column('oil_bills', 'quantity_total_oil')
