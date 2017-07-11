"""migrate MACs

Revision ID: 3e5a16bb9124
Revises: 7636dd6850b8
Create Date: 2017-06-18 07:25:08.653971

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.orm import sessionmaker

Session = sessionmaker()

# revision identifiers, used by Alembic.
revision = '3e5a16bb9124'
down_revision = '7636dd6850b8'
branch_labels = None
depends_on = None


from mr_provisioner.models import Machine, Interface


def upgrade():
    bind = op.get_bind()
    session = Session(bind=bind)

    s = sa.sql.text('SELECT id, mac FROM machine').\
        columns(id=sa.Integer, mac=sa.String)
    for id, mac in session.execute(s):
        if mac and mac != '':
            intf = Interface(machine_id=id, mac=mac)
            session.add(intf)

    session.commit()


def downgrade():
    bind = op.get_bind()
    session = Session(bind=bind)

    for m in Machine.query.all():
        macs = m.macs
        if len(macs) > 0:
            s = sa.sql.text('UPDATE machine SET mac=:mac WHERE id=:id')
            session.execute(s, mac=macs[0], id=m.id)

    session.commit()
