from flask import Blueprint, Response

import logging
import jinja2

from mr_provisioner.models import Machine
from mr_provisioner import db
from sqlalchemy.exc import DatabaseError
from collections import namedtuple

mod = Blueprint('preseed', __name__, template_folder='templates')
logger = logging.getLogger('preseed')


PInterface = namedtuple('object', ['name', 'static_ipv4', 'prefix', 'netmask'])


@mod.route('/<machine_id>', methods=['GET'])
def get_preseed(machine_id):
    machine = Machine.query.get(machine_id)
    if not machine:
        return "", 404

    preseed = machine.preseed
    if not preseed:
        return "", 404

    assignees = machine.assignees

    ssh_key = assignees[0].ssh_key if len(assignees) > 0 else ''
    ssh_keys = [u.ssh_key for u in assignees]

    kernel_name = machine.kernel.filename if machine.kernel else ""
    kernel_description = machine.kernel.description if machine.kernel else ""
    initrd_name = machine.initrd.filename if machine.initrd else ""
    initrd_description = machine.initrd.description if machine.initrd else ""

    interfaces = [PInterface(name=i.identifier,
                             static_ipv4=i.static_ipv4,
                             prefix=i.network.prefix,
                             netmask=i.network.netmask) for i in machine.interfaces if i.static_ipv4]

    template = jinja2.Template(preseed.file_content)
    return Response(
        template.render(ssh_key=ssh_key, ssh_keys=ssh_keys, hostname=machine.hostname,
                        interfaces=interfaces, kernel_name=kernel_name,
                        kernel_description=kernel_description,
                        initrd_name=initrd_name,
                        initrd_description=initrd_description),
        mimetype='text/plain')


@mod.errorhandler(DatabaseError)
def handle_db_error(error):
    db.session.rollback()
    raise
