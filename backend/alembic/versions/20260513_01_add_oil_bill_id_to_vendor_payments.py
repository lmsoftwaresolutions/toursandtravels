"""Add oil_bill_id to vendor_payments

Revision ID: 20260513_01
Revises: 20260512_01
Create Date: 2026-05-13

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '20260513_01'
down_revision = '20260512_01'
branch_labels = None
depends_on = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    columns = [c['name'] for c in inspector.get_columns('vendor_payments')]

    if 'oil_bill_id' not in columns:
        op.add_column('vendor_payments', sa.Column('oil_bill_id', sa.Integer(), nullable=True))
        op.create_foreign_key('fk_vendor_payments_oil_bill_id', 'vendor_payments', 'oil_bills', ['oil_bill_id'], ['id'], ondelete='SET NULL')


def downgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    columns = [c['name'] for c in inspector.get_columns('vendor_payments')]

    if 'oil_bill_id' in columns:
        op.drop_constraint('fk_vendor_payments_oil_bill_id', 'vendor_payments', type_='foreignkey')
        op.drop_column('vendor_payments', 'oil_bill_id')
