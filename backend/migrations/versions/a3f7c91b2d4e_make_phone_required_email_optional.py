"""make_phone_required_email_optional

Revision ID: a3f7c91b2d4e
Revises: 7bf9a4ffcd6e
Create Date: 2026-06-23 10:00:00.000000

NOTE: This change was originally applied directly via SQL on the Supabase
database (ALTER TABLE users ALTER COLUMN email DROP NOT NULL) before this
migration file existed, so the production DB is already in the post-upgrade
state. This file exists to keep migration history consistent for anyone
running a fresh `alembic upgrade head` (new dev environment, CI, etc.).
If you're applying this against a database that was already patched by
hand, `alembic stamp a3f7c91b2d4e` instead of `upgrade` to mark it applied
without re-running the (now no-op) DDL.
"""
from alembic import op
import sqlalchemy as sa

revision = 'a3f7c91b2d4e'
down_revision = '7bf9a4ffcd6e'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.alter_column('users', 'phone', existing_type=sa.String(15), nullable=False)
    op.alter_column('users', 'email', existing_type=sa.String(150), nullable=True)


def downgrade() -> None:
    op.alter_column('users', 'email', existing_type=sa.String(150), nullable=False)
    op.alter_column('users', 'phone', existing_type=sa.String(15), nullable=True)