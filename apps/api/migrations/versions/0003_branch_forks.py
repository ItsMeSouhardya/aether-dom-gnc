"""Immutable fork lineage/audit without changing existing canonical documents."""

import sqlalchemy as sa
from alembic import op

revision = "0003"
down_revision = "0002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "branch_forks",
        sa.Column("command_id", sa.String(), primary_key=True),
        sa.Column("project_id", sa.String(), nullable=False),
        sa.Column("branch_id", sa.String(), nullable=False),
        sa.Column("source_branch_id", sa.String(), nullable=False),
        sa.Column("source_revision", sa.Integer(), nullable=False),
        sa.Column("payload", sa.JSON(), nullable=False),
        sa.Column("result", sa.JSON(), nullable=False),
        sa.UniqueConstraint("project_id", "branch_id"),
    )
    op.create_index("ix_branch_forks_project", "branch_forks", ["project_id"])


def downgrade() -> None:
    op.drop_table("branch_forks")
