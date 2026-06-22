"""add_dark_store_fields

Revision ID: 7bf9a4ffcd6e
Revises: e8b33def2262
Create Date: 2026-06-21 15:56:00.000000
"""
from alembic import op
import sqlalchemy as sa

revision = '7bf9a4ffcd6e'
down_revision = 'e8b33def2262'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # New enum type for store_type
    storetype_enum = sa.Enum('shop', 'dark_store', name='storetype')
    storetype_enum.create(op.get_bind(), checkfirst=True)

    op.add_column('shops', sa.Column('store_type', storetype_enum, nullable=False, server_default='shop'))
    op.add_column('shops', sa.Column('service_radius_km', sa.Float(), nullable=False, server_default='5.0'))
    op.add_column('shops', sa.Column('avg_prep_minutes', sa.Integer(), nullable=False, server_default='15'))

    op.add_column('orders', sa.Column('eta_minutes', sa.Integer(), nullable=True))


def downgrade() -> None:
    op.drop_column('orders', 'eta_minutes')
    op.drop_column('shops', 'avg_prep_minutes')
    op.drop_column('shops', 'service_radius_km')
    op.drop_column('shops', 'store_type')
    op.execute("DROP TYPE IF EXISTS storetype")