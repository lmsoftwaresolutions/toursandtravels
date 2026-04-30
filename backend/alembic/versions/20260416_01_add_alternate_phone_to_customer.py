"""add alternate phone to customer

Revision ID: 20260416_01
Revises: 20260410_04
Create Date: 2026-04-16

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '20260416_01'
down_revision = '20260410_04'
branch_labels = None
depends_on = None


def upgrade():
    # Attempt to add the column, using a check to see if it already exists
    # manually added check to prevent error if already exists in DB
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    columns = [c['name'] for c in inspector.get_columns('customers')]
    
    if 'alternate_phone' not in columns:
        op.add_column('customers', sa.Column('alternate_phone', sa.String(), nullable=True))


def downgrade():
    # Safe downgrade check
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    columns = [c['name'] for c in inspector.get_columns('customers')]
    
    if 'alternate_phone' in columns:
        op.drop_column('customers', 'alternate_phone')
