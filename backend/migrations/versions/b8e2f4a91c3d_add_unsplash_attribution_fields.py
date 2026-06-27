"""add_unsplash_attribution_fields

Revision ID: b8e2f4a91c3d
Revises: a3f7c91b2d4e
Create Date: 2026-06-27 10:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

revision = 'b8e2f4a91c3d'
down_revision = 'a3f7c91b2d4e'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('products', sa.Column('image_source', sa.String(20), nullable=False, server_default='upload'))
    op.add_column('products', sa.Column('unsplash_photo_id', sa.String(50), nullable=True))
    op.add_column('products', sa.Column('unsplash_photographer', sa.String(150), nullable=True))
    op.add_column('products', sa.Column('unsplash_photographer_url', sa.String(), nullable=True))


def downgrade() -> None:
    op.drop_column('products', 'unsplash_photographer_url')
    op.drop_column('products', 'unsplash_photographer')
    op.drop_column('products', 'unsplash_photo_id')
    op.drop_column('products', 'image_source')