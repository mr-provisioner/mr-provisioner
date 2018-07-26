from flask import Blueprint, Response, request

import logging
import jinja2
import jinja2.utils

from mr_provisioner.models import Machine, MachineEvent
from mr_provisioner import db
from sqlalchemy.exc import DatabaseError
from collections import namedtuple

mod = Blueprint('preseed', __name__, template_folder='templates')
logger = logging.getLogger('preseed')


PInterface = namedtuple('object', ['name', 'static_ipv4', 'prefix', 'netmask', 'mac'])
PImage = namedtuple('object', ['filename', 'description', 'known_good'])


def make_reporting_undefined(machine, request, base=jinja2.Undefined):
    def report(undef):
        if undef._undefined_hint is None:
            if undef._undefined_obj is jinja2.utils.missing:
                hint = '%s is undefined' % undef._undefined_name
            else:
                hint = '%s has no attribute %s' % (
                    jinja2.utils.object_type_repr(undef._undefined_obj),
                    undef._undefined_name)
        else:
            hint = undef._undefined_hint

        MachineEvent.preseed_error(machine.id, None, request.remote_addr, hint)

    class ReportingUndefined(base):
        def __str__(self):
            report(self)
            return base.__str__(self)

        def __iter__(self):
            report(self)
            return base.__iter__(self)

        def __bool__(self):
            report(self)
            return base.__bool__(self)

        def __len__(self):
            report(self)
            return base.__len__(self)

    return ReportingUndefined


@mod.route('/<machine_id>', methods=['GET'])
def get_preseed(machine_id):
    machine = Machine.query.get(machine_id)
    if not machine:
        return "", 404

    preseed = machine.preseed
    if not preseed:
        return "", 404

    MachineEvent.preseed_accessed(machine.id, None, request.remote_addr)

    assignees = machine.assignees

    ssh_key = assignees[0].ssh_key if len(assignees) > 0 else ''
    ssh_keys = [u.ssh_key for u in assignees]

    kernel_opts = machine.kernel_opts

    interfaces = [PInterface(name=i.identifier,
                             static_ipv4=i.static_ipv4,
                             prefix=i.network.prefix,
                             netmask=i.network.netmask,
                             mac=i.mac) for i in machine.interfaces if i.static_ipv4]

    kernel = None
    if machine.kernel:
        kernel = PImage(filename=machine.kernel.filename,
                        description=machine.kernel.description,
                        known_good=machine.kernel.known_good)
    initrd = None
    if machine.initrd:
        initrd = PImage(filename=machine.initrd.filename,
                        description=machine.initrd.description,
                        known_good=machine.initrd.known_good)

    try:
        template = jinja2.Template(preseed.file_content,
                                   undefined=make_reporting_undefined(machine, request))

        return Response(
            template.render(ssh_key=ssh_key, ssh_keys=ssh_keys,
                            hostname=machine.hostname, interfaces=interfaces,
                            kernel=kernel, initrd=initrd,
                            kernel_options=kernel_opts),
            mimetype='text/plain')
    except jinja2.TemplateSyntaxError as e:
        MachineEvent.preseed_error(machine.id, None, request.remote_addr, e.message, e.lineno)
        return Response(
            "Syntax error on preseed template: {} - line: {}".format(e.message, e.lineno), status=400)
    except (jinja2.TemplateError, Exception) as e:
        MachineEvent.preseed_error(machine.id, None, request.remote_addr, e.message)
        return Response(
            "Exception raised while rendering preseed template: {}".format(e.message), status=400)


@mod.errorhandler(DatabaseError)
def handle_db_error(error):
    db.session.rollback()
    raise
