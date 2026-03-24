"""add vehicle_type and notes to quotations

Revision ID: a1b2c3d4e5f6
Revises: 91946046eeef
Create Date: 2026-03-21 20:05:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


# revision identifiers, used by Alembic.
revision = 'a1b2c3d4e5f6'
down_revision = '91946046eeef'
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)
    if not inspector.has_table("quotations"):
        from app.models.quotation import Quotation
        Quotation.__table__.create(bind, checkfirst=True)
        return
    op.add_column('quotations', sa.Column('vehicle_type', sa.String(), nullable=True))
    op.add_column('quotations', sa.Column('notes', sa.Text(), nullable=True))


def downgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)
    if not inspector.has_table("quotations"):
        return
    with op.batch_alter_table('quotations') as batch_op:
        batch_op.drop_column('notes')
        batch_op.drop_column('vehicle_type')
