"""Add default user

Revision ID: 9dd78c6c2e3b
Revises: e212b1b698e4
Create Date: 2017-05-23 18:01:00.464892

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '9dd78c6c2e3b'
down_revision = 'e212b1b698e4'
branch_labels = None
depends_on = None

from mr_provisioner import db
from mr_provisioner.models import User
from passlib.hash import pbkdf2_sha256

def upgrade():
    user = User('admin','admin@example.com', '0','', pbkdf2_sha256.hash("linaro"), '1')
    db.session.add(user)
    db.session.commit()


def downgrade():
    user = User.query.filter_by(username='admin').first()
    db.session.delete(user)
    db.session.commit()
