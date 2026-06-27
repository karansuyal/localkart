"""add fcm_token to users

Revision ID: c1d2e3f4a5b6
Revises: b8e2f4a91c3d
Create Date: 2024-01-01 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

revision = 'c1d2e3f4a5b6'
down_revision = 'b8e2f4a91c3d'
branch_labels = None
depends_on = None

def upgrade() -> None:
    op.add_column('users', sa.Column('fcm_token', sa.String(), nullable=True))

def downgrade() -> None:
    op.drop_column('users', 'fcm_token')
