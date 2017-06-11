from flask import Blueprint, Response

import logging
import jinja2

from app.models import User, Machine

mod = Blueprint('preseed', __name__, template_folder='templates')
logger = logging.getLogger('preseed')


@mod.route('/<machine_id>', methods=['GET'])
def get_preseed(machine_id):
    machine = Machine.query.get(machine_id)
    if not machine:
        return "", 404

    preseed = machine.preseed
    if not preseed:
        return "", 404

    # XXX: eventually, multiple users (assignees)
    user = machine.user
    if not user:
        user = User.query.first() # if no assignment, a random user is chosen

    template = jinja2.Template(preseed.file_content)
    return Response(template.render(ssh_key=user.ssh_key), mimetype='text/plain')
