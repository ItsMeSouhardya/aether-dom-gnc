"""Durable leased work is independent of creative snapshots and command history."""

import sqlalchemy as sa
from alembic import op

revision = "0004"
down_revision = "0003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "jobs",
        sa.Column("job_id", sa.String(), primary_key=True),
        sa.Column("project_id", sa.String(), nullable=False),
        sa.Column("branch_id", sa.String(), nullable=False),
        sa.Column("request_id", sa.String(), nullable=False, unique=True),
        sa.Column("record", sa.JSON(), nullable=False),
        sa.Column("claim_token", sa.String(), nullable=True),
        sa.Column("artifact", sa.JSON(), nullable=True),
    )
    op.create_index("ix_jobs_branch", "jobs", ["project_id", "branch_id"])


def downgrade() -> None:
    op.drop_table("jobs")
