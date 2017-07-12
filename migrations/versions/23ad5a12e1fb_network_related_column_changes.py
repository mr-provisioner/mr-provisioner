"""network-related column changes

Revision ID: 23ad5a12e1fb
Revises: 8fed83f88b6b
Create Date: 2017-07-08 07:29:34.535717

"""
from alembic import op
import sqlalchemy as sa

from sqlalchemy.orm import sessionmaker

Session = sessionmaker()

# revision identifiers, used by Alembic.
revision = '23ad5a12e1fb'
down_revision = '8fed83f88b6b'
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    session = Session(bind=bind)

    session.execute(sa.sql.text(
        'ALTER TABLE lease ALTER COLUMN ipv4 TYPE inet USING(ipv4::inet)'))
    session.execute(sa.sql.text(
        'ALTER TABLE interface ALTER COLUMN static_ipv4 TYPE inet USING(static_ipv4::inet)'))
    session.execute(sa.sql.text(
        'ALTER TABLE interface ALTER COLUMN reserved_ipv4 TYPE inet USING(reserved_ipv4::inet)'))

    session.execute(sa.sql.text(
        'ALTER TABLE network ALTER COLUMN subnet TYPE cidr USING(subnet::cidr)'))
    session.execute(sa.sql.text(
        'ALTER TABLE network ALTER COLUMN reserved_net TYPE cidr USING(reserved_net::cidr)'))
    session.execute(sa.sql.text(
        'ALTER TABLE network ALTER COLUMN static_net TYPE cidr USING(static_net::cidr)'))

    session.execute(sa.sql.text(
        'ALTER TABLE "discoveredMAC" ALTER COLUMN mac TYPE macaddr USING(mac::macaddr)'))
    session.execute(sa.sql.text(
        'ALTER TABLE lease ALTER COLUMN mac TYPE macaddr USING(mac::macaddr)'))
    session.execute(sa.sql.text(
        'ALTER TABLE interface ALTER COLUMN mac TYPE macaddr USING(mac::macaddr)'))


def downgrade():
    bind = op.get_bind()
    session = Session(bind=bind)

    session.execute(sa.sql.text(
        'ALTER TABLE lease ALTER COLUMN ipv4 TYPE varchar USING(ipv4::varchar)'))
    session.execute(sa.sql.text(
        'ALTER TABLE interface ALTER COLUMN static_ipv4 TYPE varchar USING(static_ipv4::varchar)'))
    session.execute(sa.sql.text(
        'ALTER TABLE interface ALTER COLUMN reserved_ipv4 TYPE varchar USING(reserved_ipv4::varchar)'))

    session.execute(sa.sql.text(
        'ALTER TABLE network ALTER COLUMN subnet TYPE varchar USING(subnet::varchar)'))
    session.execute(sa.sql.text(
        'ALTER TABLE network ALTER COLUMN reserved_net TYPE varchar USING(reserved_net::varchar)'))
    session.execute(sa.sql.text(
        'ALTER TABLE network ALTER COLUMN static_net TYPE varchar USING(static_net::varchar)'))

    session.execute(sa.sql.text(
        'ALTER TABLE "discoveredMAC" ALTER COLUMN mac TYPE varchar USING(mac::varchar)'))
    session.execute(sa.sql.text(
        'ALTER TABLE lease ALTER COLUMN mac TYPE varchar USING(mac::varchar)'))
    session.execute(sa.sql.text(
        'ALTER TABLE interface ALTER COLUMN mac TYPE varchar USING(mac::varchar)'))
