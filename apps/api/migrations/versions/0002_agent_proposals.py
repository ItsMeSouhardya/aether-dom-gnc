"""Persist AI review records without changing canonical snapshots or histories."""

import sqlalchemy as sa
from alembic import op

revision = "0002"
down_revision = "0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "agent_proposals",
        sa.Column("proposal_id", sa.String(), primary_key=True),
        sa.Column("project_id", sa.String(), nullable=False),
        sa.Column("branch_id", sa.String(), nullable=False),
        sa.Column("request_id", sa.String(), nullable=False, unique=True),
        sa.Column("request", sa.JSON(), nullable=False),
        sa.Column("record", sa.JSON(), nullable=False),
    )
    op.create_index("ix_agent_proposals_branch", "agent_proposals", ["project_id", "branch_id"])


def downgrade() -> None:
    op.drop_table("agent_proposals")
