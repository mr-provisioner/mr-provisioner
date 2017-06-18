"""remove MAC column from machine

Revision ID: 37af89374583
Revises: 3e5a16bb9124
Create Date: 2017-06-18 07:25:18.202302

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '37af89374583'
down_revision = '3e5a16bb9124'
branch_labels = None
depends_on = None


def upgrade():
    op.drop_constraint('machine_mac_key', 'machine', type_='unique')
    op.drop_column('machine', 'mac')


def downgrade():
    op.add_column('machine', sa.Column('mac', sa.VARCHAR(), autoincrement=False, nullable=True))
    op.create_unique_constraint('machine_mac_key', 'machine', ['mac'])
