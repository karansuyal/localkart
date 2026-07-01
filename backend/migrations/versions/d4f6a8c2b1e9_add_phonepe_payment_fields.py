"""add_phonepe_payment_fields

Revision ID: d4f6a8c2b1e9
Revises: c1d2e3f4a5b6
Create Date: 2026-07-01 10:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

revision = 'd4f6a8c2b1e9'
down_revision = 'c1d2e3f4a5b6'
branch_labels = None
depends_on = None


def upgrade() -> None:
    paymentstatus_enum = sa.Enum('not_required', 'pending', 'paid', 'failed', name='paymentstatus')
    paymentstatus_enum.create(op.get_bind(), checkfirst=True)

    op.add_column('orders', sa.Column('payment_status', paymentstatus_enum, nullable=False, server_default='not_required'))
    op.add_column('orders', sa.Column('phonepe_merchant_order_id', sa.String(length=63), nullable=True))
    op.add_column('orders', sa.Column('phonepe_transaction_id', sa.String(length=100), nullable=True))
    op.create_unique_constraint('uq_orders_phonepe_merchant_order_id', 'orders', ['phonepe_merchant_order_id'])


def downgrade() -> None:
    op.drop_constraint('uq_orders_phonepe_merchant_order_id', 'orders', type_='unique')
    op.drop_column('orders', 'phonepe_transaction_id')
    op.drop_column('orders', 'phonepe_merchant_order_id')
    op.drop_column('orders', 'payment_status')
    sa.Enum(name='paymentstatus').drop(op.get_bind(), checkfirst=True)
