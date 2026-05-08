"""Add bill_number to spare_parts

Revision ID: d8d2ccc135fa
Revises: 20260410_04
Create Date: 2026-04-27 14:20:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'd8d2ccc135fa'
down_revision = '20260427_01'
branch_labels = None
depends_on = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    columns = [c['name'] for c in inspector.get_columns('spare_parts')]
    
    if 'bill_number' not in columns:
        op.add_column('spare_parts', sa.Column('bill_number', sa.String(), nullable=True))

def downgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    columns = [c['name'] for c in inspector.get_columns('spare_parts')]
    
    if 'bill_number' in columns:
        op.drop_column('spare_parts', 'bill_number')
