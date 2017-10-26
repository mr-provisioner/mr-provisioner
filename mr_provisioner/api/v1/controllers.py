from flask import Blueprint, request, g, render_template, jsonify, send_file, redirect, url_for

import logging

from mr_provisioner import db
from mr_provisioner.models import Interface, Machine, Image, Preseed, User, Token, MachineUsers, \
    ConsoleToken
from mr_provisioner.bmc_types import BMCError
from sqlalchemy.exc import DatabaseError, IntegrityError

from flask import current_app as app

from schema import Schema, Optional, And, Or, Use, SchemaError
import validators
import ipaddress
import os
import binascii
from werkzeug.utils import secure_filename
import random
import json


mod = Blueprint('api_v1', __name__, template_folder='templates', static_folder='static')
logger = logging.getLogger('api_v1')


class InvalidUsage(Exception):
    status_code = 400

    def __init__(self, errors, status_code=None, payload=None):
        Exception.__init__(self)
        self.errors = errors if type(errors) is list else [errors]
        if status_code is not None:
            self.status_code = status_code
        self.payload = payload

    def to_dict(self):
        rv = dict(self.payload or ())
        rv['error_type'] = self.__class__.__name__
        rv['errors'] = self.errors
        return rv


def serialize_machine(machine):
    return {
        'id': machine.id,
        'name': machine.name,
        'hostname': machine.hostname,
        'kernel_id': machine.kernel_id,
        'kernel_opts': machine.kernel_opts,
        'initrd_id': machine.initrd_id,
        'preseed_id': machine.preseed_id,
        'netboot_enabled': machine.netboot_enabled,
    }


def serialize_image(image):
    return {
        'id': image.id,
        'name': image.filename,
        'description': image.description,
        'type': image.file_type,
        'upload_date': image.date,
        'user': image.user.username,
        'known_good': image.known_good,
        'public': image.public,
    }


def serialize_preseed(preseed):
    return {
        'id': preseed.id,
        'name': preseed.filename,
        'content': preseed.file_content,
        'description': preseed.description,
        'type': preseed.file_type,
        'user': preseed.user.username,
        'known_good': preseed.known_good,
        'public': preseed.public,
    }


def serialize_interface(interface):
    return {
        'id': interface.id,
        'identifier': interface.identifier,
        'mac': interface.mac,
        'network_name': interface.network.name if interface.network else None,
        'subnetv4': interface.network.subnet if interface.network else None,
        'netmaskv4': interface.network.netmask if interface.network else None,
        'prefixlenv4': interface.network.prefix if interface.network else None,
        'static_pool_v4': interface.network.static_net if interface.network else None,
        'reserved_pool_v4': interface.network.reserved_net if interface.network else None,
        'config_type_v4': interface.config_type_v4,
        'configured_ipv4': interface.configured_ipv4,
        'lease_ipv4': interface.lease.ipv4 if interface.lease else None,
        'last_seen_date': interface.lease.last_seen if interface.lease else None,
    }


def serialize_assignee(assignee):
    return {
        'id': assignee.id,
        'user': assignee.user.username,
        'reason': assignee.reason,
    }


def is_int(s):
    try:
        int(s)
        return True
    except ValueError:
        return False


machine_schema = Schema({
    Optional('netboot_enabled'): bool,
    Optional('preseed_id'): Or(None, Use(int)),
    Optional('kernel_id'): Or(None, Use(int)),
    Optional('kernel_opts'): And(str, lambda s: validators.length(s, min=0, max=1024)),
    Optional('initrd_id'): Or(None, Use(int)),
}, ignore_extra_keys=True)


machine_power_schema = Schema({
    'state': And(str, lambda s: s in ('on', 'off', 'reboot', 'pxe_reboot', 'bios_reboot', 'disk_reboot')),
})


machine_state_post_schema = Schema({
    'state': And(str, lambda s: s in ('provision')),
})


machine_state_put_schema = Schema({
    'state': And(str, lambda s: s in ('ready', 'error', 'unknown')),
})


interface_schema = Schema({
    Optional('identifier'): Or(None, And(str, lambda s: validators.length(s, min=0, max=64))),
    Optional('config_type_v4'): And(str, lambda s: s in ('dynamic', 'dynamic-reserved', 'static')),
    Optional('configured_ipv4'): Or(None, And(str, lambda s: s == 'auto' or validators.ip_address.ipv4(s))),
}, ignore_extra_keys=True)


assignee_schema = Schema({
    'user': str,
    Optional('reason'): Or(None, And(str, lambda s: validators.length(s, min=0, max=140))),
}, ignore_extra_keys=True)


change_assignee_schema = Schema({
    'reason': Or(None, And(str, lambda s: validators.length(s, min=0, max=140))),
}, ignore_extra_keys=True)


preseed_schema = Schema({
    'name': And(str, lambda s: validators.length(s, min=2, max=256)),
    'type': And(str, lambda s: s in Preseed.list_types()),
    Optional('description'): Or(None, And(str, lambda s: validators.length(s, min=0, max=256))),
    Optional('content'): Or(None, And(str, lambda s: validators.length(s, min=0, max=2 * 1024 * 1024))),
    Optional('known_good'): bool,
    Optional('public'): bool,
}, ignore_extra_keys=True)

change_preseed_schema = Schema({
    Optional('name'): And(str, lambda s: validators.length(s, min=2, max=256)),
    Optional('type'): And(str, lambda s: s in Preseed.list_types()),
    Optional('description'): Or(None, And(str, lambda s: validators.length(s, min=0, max=256))),
    Optional('content'): Or(None, And(str, lambda s: validators.length(s, min=0, max=2 * 1024 * 1024))),
    Optional('known_good'): bool,
    Optional('public'): bool,
}, ignore_extra_keys=True)


image_schema = Schema({
    'type': And(str, lambda s: s in Image.list_types()),
    Optional('description'): Or(None, And(str, lambda s: validators.length(s, min=0, max=256))),
    Optional('known_good'): bool,
    Optional('public'): bool,
}, ignore_extra_keys=True)


change_image_schema = Schema({
    Optional('type'): And(str, lambda s: s in Image.list_types()),
    Optional('description'): Or(None, And(str, lambda s: validators.length(s, min=0, max=256))),
    Optional('known_good'): bool,
    Optional('public'): bool,
}, ignore_extra_keys=True)


reserve_schema = Schema({
    'query': Or(None, And(str, lambda s: validators.length(s, min=0, max=300))),
    Optional('reason'): Or(None, And(str, lambda s: validators.length(s, min=0, max=140))),
}, ignore_extra_keys=True)


@mod.before_request
def authenticate():
    g.user = None

    if request.method == 'OPTIONS':
        return
    if request.endpoint == 'api_v1.static' or \
       request.endpoint == 'api_v1.index' or \
       request.endpoint == 'api_v1.docs_index' or \
       request.endpoint == 'api_v1.swagger_file':
        pass
    else:
        try:
            token_str = request.headers['Authorization'].replace('Bearer ', '')
            token = Token.by_token(token_str)
            if not token:
                return '', 401

            print('user', token.user.id)
            g.user = token.user
        except KeyError:
            return '', 401


@mod.route('/machine', methods=['GET'])
def machines_get():
    show_all = True if request.args.get('show_all', 'false').lower() == 'true' else False
    query_str = request.args.get('q', None)

    q = Machine.query_by_criteria(query_str)

    if show_all:
        machines = q.all()
    else:
        machines = q.join(Machine.assignments).filter(MachineUsers.user_id == g.user.id).all()

    return jsonify([serialize_machine(m) for m in machines]), 200


@mod.route('/machine/<int:id>', methods=['GET'])
def machine_get(id):
    machine = Machine.query.get(id)
    if not machine:
        raise InvalidUsage('machine not found', status_code=404)

    return jsonify(serialize_machine(machine)), 200


@mod.route('/machine/<int:id>', methods=['PUT'])
def machine_put(id):
    data = request.get_json(force=True)
    data = machine_schema.validate(data)

    machine = Machine.query.get(id)
    if not machine:
        raise InvalidUsage('machine not found', status_code=404)

    if not machine.check_permission(g.user, 'owner'):
        raise InvalidUsage('Forbidden', status_code=403)

    if 'preseed_id' in data:
        preseed = Preseed.query.get(data['preseed_id'])
        if not preseed:
            raise InvalidUsage('no such preseed')
        elif not preseed.check_permission(g.user, 'user'):
            raise InvalidUsage('not allowed to use preseed', status_code=403)

    if 'kernel_id' in data:
        kernel = Image.query.get(data['kernel_id'])
        if not kernel:
            raise InvalidUsage('no such kernel')
        elif not kernel.check_permission(g.user, 'user'):
            raise InvalidUsage('not allowed to use kernel', status_code=403)
        elif kernel.file_type != 'Kernel':
            raise InvalidUsage('kernel is not a kernel')

    if 'initrd_id' in data:
        initrd = Image.query.get(data['initrd_id'])
        if not initrd:
            raise InvalidUsage('no such initrd')
        elif not initrd.check_permission(g.user, 'user'):
            raise InvalidUsage('not allowed to use initrd', status_code=403)
        elif initrd.file_type != 'Initrd':
            raise InvalidUsage('initrd is not an initrd')

    if 'netboot_enabled' in data:
        machine.netboot_enabled = data['netboot_enabled']
    if 'preseed_id' in data:
        machine.preseed_id = data['preseed_id']
    if 'kernel_id' in data:
        machine.kernel_id = data['kernel_id']
    if 'kernel_opts' in data:
        machine.kernel_opts = data['kernel_opts']
    if 'initrd_id' in data:
        machine.initrd_id = data['initrd_id']

    db.session.commit()
    db.session.refresh(machine)

    return jsonify(serialize_machine(machine)), 200


@mod.route('/machine/<int:id>/interface', methods=['GET'])
def machine_interfaces_get(id):
    machine = Machine.query.get(id)
    if not machine:
        raise InvalidUsage('machine not found', status_code=404)

    return jsonify([serialize_interface(i) for i in machine.interfaces]), 200


@mod.route('/machine/<int:id>/interface/<int:interface_id>', methods=['GET'])
def machine_interface_get(id, interface_id):
    machine = Machine.query.get(id)
    if not machine:
        raise InvalidUsage('machine not found', status_code=404)

    interface = Interface.query.filter_by(id=interface_id, machine_id=machine.id).first()
    if not interface:
        raise InvalidUsage('interface not found', status_code=404)

    return jsonify(serialize_interface(interface)), 200


@mod.route('/machine/<int:id>/interface/<int:interface_id>', methods=['PUT'])
def machine_interface_put(id, interface_id):
    data = request.get_json(force=True)
    data = interface_schema.validate(data)

    machine = Machine.query.get(id)
    if not machine:
        raise InvalidUsage('machine not found', status_code=404)

    interface = Interface.query.filter_by(id=interface_id, machine_id=machine.id).first()
    if not interface:
        raise InvalidUsage('interface not found', status_code=404)

    if not machine.check_permission(g.user, 'owner'):
        raise InvalidUsage('Forbidden', status_code=403)

    config_type_v4 = data['config_type_v4'] if 'config_type_v4' in data else interface.config_type_v4
    configured_ipv4 = data['configured_ipv4'] if 'configured_ipv4' in data else interface.configured_ipv4

    if config_type_v4 != 'dynamic' and not interface.network:
        raise InvalidUsage('interface has no network')

    if config_type_v4 == 'dynamic-reserved':
        if not interface.network.reserved_net:
            raise InvalidUsage('network has no reserved IPv4 range')
        if not configured_ipv4:
            raise InvalidUsage('dynamic-reserved configuration requires an IPv4')

        if configured_ipv4 != 'auto' and \
           ipaddress.IPv4Address(configured_ipv4) not in ipaddress.ip_network(interface.network.reserved_net):
            raise InvalidUsage('dynamic-reserved IP out of range')
        else:
            interface.reserved_ipv4 = configured_ipv4

        interface.static_ipv4 = None
    elif config_type_v4 == 'static':
        if not interface.network.static_net:
            raise InvalidUsage('network has no static IPv4 range')
        if not configured_ipv4:
            raise InvalidUsage('dynamic-reserved configuration requires an IPv4')

        if configured_ipv4 != 'auto' and \
           ipaddress.IPv4Address(configured_ipv4) not in ipaddress.ip_network(interface.network.static_net):
            raise InvalidUsage('static IP out of range')
        else:
            interface.static_ipv4 = configured_ipv4

        interface.reserved_ipv4 = None
    else:
        interface.static_ipv4 = None
        interface.reserved_ipv4 = None

    if 'identifier' in data:
        interface.identifier = data['identifier']

    avail_static_ipv4s, avail_rsvd_ipv4s = interface.network.available_ipv4s(limit=512) \
        if configured_ipv4 == 'auto' else ([], [])

    for n in range(32):
        try:
            if config_type_v4 == 'dynamic-reserved' and configured_ipv4 == 'auto':
                interface.reserved_ipv4 = random.choice(avail_rsvd_ipv4s)
            elif config_type_v4 == 'static' and configured_ipv4 == 'auto':
                interface.static_ipv4 = random.choice(avail_static_ipv4s)

            db.session.commit()
            break
        except IntegrityError as e:
            db.session.rollback()
            if n == 31 or configured_ipv4 != 'auto':
                raise
        except IndexError as e:
            raise InvalidUsage('no more IPs available', status_code=409)

    db.session.refresh(interface)

    return jsonify(serialize_interface(interface)), 200


@mod.route('/machine/<int:id>/assignee', methods=['GET'])
def machine_assignees_get(id):
    machine = Machine.query.get(id)
    if not machine:
        raise InvalidUsage('machine not found', status_code=404)

    return jsonify([serialize_assignee(a) for a in machine.assignments]), 200


@mod.route('/machine/<int:id>/assignee', methods=['POST'])
def machine_assignee_create(id):
    data = request.get_json(force=True)
    data = assignee_schema.validate(data)

    if 'user' not in data:
        raise InvalidUsage('user is required')

    machine = Machine.query.get(id)
    if not machine:
        raise InvalidUsage('machine not found', status_code=404)

    if not machine.check_permission(g.user, 'admin'):
        raise InvalidUsage('Forbidden', status_code=403)

    user = User.by_username(data['user'])
    if not user:
        raise InvalidUsage('no such user')

    assignee = MachineUsers(machine_id=machine.id,
                            user_id=user.id,
                            permissions=0,
                            reason=data.get('reason', None))

    db.session.add(assignee)
    db.session.commit()
    db.session.refresh(assignee)

    return jsonify(serialize_assignee(assignee)), 201


@mod.route('/machine/<int:id>/assignee/<assignee_id>', methods=['GET'])
def machine_assignee_get(id, assignee_id):
    machine = Machine.query.get(id)
    if not machine:
        raise InvalidUsage('machine not found', status_code=404)

    if is_int(assignee_id):
        assignee = MachineUsers.query.filter_by(id=int(assignee_id), machine_id=machine.id).first()
    elif assignee_id == "self":
        assignee = MachineUsers.query.filter_by(user_id=g.user.id, machine_id=machine.id).first()
    else:
        return InvalidUsage('Bad Request', 400)

    if not assignee:
        raise InvalidUsage('assignee not found', status_code=404)

    return jsonify(serialize_assignee(assignee)), 200


@mod.route('/machine/<int:id>/assignee/<assignee_id>', methods=['PUT'])
def machine_assignee_put(id, assignee_id):
    data = request.get_json(force=True)
    data = change_assignee_schema.validate(data)

    machine = Machine.query.get(id)
    if not machine:
        raise InvalidUsage('machine not found', status_code=404)

    if is_int(assignee_id):
        assignee = MachineUsers.query.filter_by(id=int(assignee_id), machine_id=machine.id).first()
    elif assignee_id == "self":
        assignee = MachineUsers.query.filter_by(user_id=g.user.id, machine_id=machine.id).first()
    else:
        return InvalidUsage('Bad Request', 400)

    if not assignee:
        raise InvalidUsage('assignee not found', status_code=404)

    if not (machine.check_permission(g.user, 'admin') or assignee.user_id == g.user.id):
        raise InvalidUsage('Forbidden', status_code=403)

    if 'reason' in data:
        assignee.reason = data['reason']

    db.session.commit()
    db.session.refresh(assignee)

    return jsonify(serialize_assignee(assignee)), 200


@mod.route('/machine/<int:id>/assignee/<assignee_id>', methods=['DELETE'])
def machine_assignee_delete(id, assignee_id):
    machine = Machine.query.get(id)
    if not machine:
        raise InvalidUsage('machine not found', status_code=404)

    if is_int(assignee_id):
        assignee = MachineUsers.query.filter_by(id=int(assignee_id), machine_id=machine.id).first()
    elif assignee_id == "self":
        assignee = MachineUsers.query.filter_by(user_id=g.user.id, machine_id=machine.id).first()
    else:
        return InvalidUsage('Bad Request', 400)

    if not assignee:
        raise InvalidUsage('assignee not found', status_code=404)

    if not (machine.check_permission(g.user, 'admin') or assignee.user_id == g.user.id):
        raise InvalidUsage('Forbidden', status_code=403)

    db.session.delete(assignee)
    db.session.commit()

    return '', 204


@mod.route('/machine/<int:id>/power', methods=['GET'])
def machine_power_get(id):
    machine = Machine.query.get(id)
    if not machine:
        raise InvalidUsage('machine not found', status_code=404)

    return jsonify({'state': machine.power_state}), 200


@mod.route('/machine/<int:id>/power', methods=['POST'])
def machine_power_post(id):
    data = request.get_json(force=True)
    data = machine_power_schema.validate(data)

    machine = Machine.query.get(id)
    if not machine:
        raise InvalidUsage('machine not found', status_code=404)

    if not machine.check_permission(g.user, 'assignee'):
        return '', 403

    if not machine.bmc:
        raise InvalidUsage('power state changes require a BMC', status_code=400)

    machine.set_power(data['state'])

    return '', 202


@mod.route('/machine/reservation', methods=['POST'])
def machine_reserve():
    data = request.get_json(force=True)
    data = reserve_schema.validate(data)

    q = Machine.query_by_criteria(data['query'], no_assignees=True)

    # Wrap the query and the commit later on into a transaction so
    # that it happens atomically; otherwise, there's a race between
    # querying for an available machine and actually reserving that
    # machine.
    for n in range(0, 3):
        db.session.begin_nested()

        machine = q.first()
        if machine:
            assignee = MachineUsers(machine_id=machine.id,
                                    user_id=g.user.id,
                                    permissions=0,
                                    reason=data.get('reason', None))
            db.session.add(assignee)
            db.session.flush()
            db.session.refresh(machine)
            if len(machine.assignments) == 1:
                db.session.commit()
                return jsonify(serialize_machine(machine)), 200
            else:
                db.session.rollback()
        else:
            raise InvalidUsage('no matching machine', status_code=404)

    raise InvalidUsage('no matching machine', status_code=404)


@mod.route('/machine/<int:id>/state', methods=['GET'])
def machine_state_get(id):
    machine = Machine.query.get(id)
    if not machine:
        raise InvalidUsage('machine not found', status_code=404)

    return jsonify({'state': machine.state}), 200


@mod.route('/machine/<int:id>/state', methods=['POST'])
def machine_state_post(id):
    data = request.get_json(force=True)
    data = machine_state_post_schema.validate(data)

    machine = Machine.query.get(id)
    if not machine:
        raise InvalidUsage('machine not found', status_code=404)

    if not machine.check_permission(g.user, 'assignee'):
        return '', 403

    if data['state'] == 'provision':
        if not machine.bmc:
            raise InvalidUsage('provisioning requires a BMC', status_code=400)

        if not machine.kernel:
            raise InvalidUsage('provisioning requires a kernel', status_code=400)

        machine.netboot_enabled = True
        machine.state = 'provisioning'
        db.session.commit()
        db.session.refresh(machine)

        machine.set_power('pxe_reboot')
    else:
        return '', 400

    return jsonify({'state': machine.state}), 202


@mod.route('/machine/<int:id>/state', methods=['PUT'])
def machine_state_put(id):
    data = request.get_json(force=True)
    data = machine_state_put_schema.validate(data)

    machine = Machine.query.get(id)
    if not machine:
        raise InvalidUsage('machine not found', status_code=404)

    if not machine.check_permission(g.user, 'assignee'):
        return '', 403

    machine.state = data['state']
    db.session.commit()
    db.session.refresh(machine)

    return jsonify({'state': machine.state}), 200


@mod.route('/machine/<int:id>/console', methods=['POST'])
def machine_console_post(id):
    machine = Machine.query.get(id)
    if not machine:
        raise InvalidUsage('machine not found', status_code=404)

    if not machine.check_permission(g.user, 'assignee'):
        return '', 403

    if not machine.bmc:
        raise InvalidUsage('console requires a BMC', status_code=400)

    try:
        machine.deactivate_sol()
    except Exception as e:
        pass

    host = app.config['WSS_EXT_HOST'] if app.config['WSS_EXT_HOST'] != '' else None
    port = app.config['WSS_EXT_PORT'] if app.config['WSS_EXT_PORT'] != '' else 8866
    sol_token = ConsoleToken.create_token_for_machine(machine)

    return jsonify({
        'host': host,
        'port': port,
        'token': sol_token.token,
    })


@mod.route('/preseed', methods=['GET'])
def preseeds_get():
    show_all = True if request.args.get('show_all', 'false').lower() == 'true' else False

    if show_all:
        preseeds = Preseed.all_visible(g.user)
    else:
        preseeds = Preseed.query.filter(Preseed.user_id == g.user.id).all()

    return jsonify([serialize_preseed(p) for p in preseeds]), 200


@mod.route('/preseed', methods=['POST'])
def preseed_create():
    data = request.get_json(force=True)
    data = preseed_schema.validate(data)

    if 'name' not in data:
        raise InvalidUsage('name is required')
    if 'type' not in data:
        raise InvalidUsage('type is required')

    preseed = Preseed(filename=data.get('name'),
                      user_id=g.user.id,
                      description=data.get('description', None),
                      file_content=data.get('content', ''), # XXX: set to None
                      file_type=data.get('type'),
                      public=data.get('public', False),
                      known_good=data.get('known_good', False))

    db.session.add(preseed)
    db.session.commit()
    db.session.refresh(preseed)

    return jsonify(serialize_preseed(preseed)), 201


@mod.route('/preseed/<int:id>', methods=['GET'])
def preseed_get(id):
    preseed = Preseed.query.get(id)
    if not preseed:
        raise InvalidUsage('preseed not found', status_code=404)

    if not preseed.check_permission(g.user, 'user'):
        raise InvalidUsage('Forbidden', status_code=403)

    return jsonify(serialize_preseed(preseed)), 200


@mod.route('/preseed/<int:id>', methods=['PUT'])
def preseed_put(id):
    data = request.get_json(force=True)
    data = change_preseed_schema.validate(data)

    preseed = Preseed.query.get(id)
    if not preseed:
        raise InvalidUsage('preseed not found', status_code=404)

    if not preseed.check_permission(g.user, 'owner'):
        raise InvalidUsage('Forbidden', status_code=403)

    if 'name' in data:
        preseed.filename = data['name']
    if 'type' in data:
        preseed.file_type = data['type']
    if 'description' in data:
        preseed.description = data['description']
    if 'content' in data:
        preseed.file_content = data['content']
    if 'known_good' in data:
        preseed.known_good = data['known_good']
    if 'public' in data:
        preseed.public = data['public']

    db.session.commit()
    db.session.refresh(preseed)

    return jsonify(serialize_preseed(preseed)), 200


@mod.route('/preseed/<int:id>', methods=['DELETE'])
def preseed_delete(id):
    preseed = Preseed.query.get(id)
    if not preseed:
        raise InvalidUsage('preseed not found', status_code=404)

    if not preseed.check_permission(g.user, 'owner'):
        raise InvalidUsage('Forbidden', status_code=403)

    db.session.delete(preseed)
    db.session.commit()

    return '', 204


@mod.route('/image', methods=['GET'])
def images_get():
    show_all = True if request.args.get('show_all', 'false').lower() == 'true' else False

    if show_all:
        images = Image.all_visible(g.user)
    else:
        images = Image.query.filter(Image.user_id == g.user.id).all()

    return jsonify([serialize_image(i) for i in images]), 200


@mod.route('/image', methods=['POST'])
def image_create():
    data = json.loads(request.form.get('q'))
    # data = request.get_json(force=True)
    data = image_schema.validate(data)

    if 'file' not in request.files:
        raise InvalidUsage('multipart `file` is required')

    if 'type' not in data:
        raise InvalidUsage('type is required')

    f = request.files['file']
    random_suffix = binascii.hexlify(os.urandom(4)).decode('utf-8')
    filename = "%s.%s" % (secure_filename(f.filename), random_suffix)
    path = os.path.join(secure_filename(g.user.username), filename)

    directory = os.path.join(app.config['TFTP_ROOT'], secure_filename(g.user.username))
    if not os.path.exists(directory):
        os.makedirs(directory)

    image = Image(filename=path,
                  user_id=g.user.id,
                  description=data.get('description', None),
                  file_type=data.get('type'),
                  public=data.get('public', False),
                  known_good=data.get('known_good', False))

    db.session.add(image)

    db.session.commit()
    f.save(os.path.join(app.config['TFTP_ROOT'], path))
    db.session.refresh(image)

    return jsonify(serialize_image(image)), 201


@mod.route('/image/<int:id>', methods=['GET'])
def image_get(id):
    image = Image.query.get(id)
    if not image:
        raise InvalidUsage('image not found', status_code=404)

    if not image.check_permission(g.user, 'user'):
        raise InvalidUsage('Forbidden', status_code=403)

    return jsonify(serialize_image(image)), 200


@mod.route('/image/<int:id>', methods=['PUT'])
def image_put(id):
    data = request.get_json(force=True)
    data = change_image_schema.validate(data)

    image = Image.query.get(id)
    if not image:
        raise InvalidUsage('image not found', status_code=404)

    if not image.check_permission(g.user, 'owner'):
        raise InvalidUsage('Forbidden', status_code=403)

    if 'type' in data:
        image.file_type = data['type']
    if 'description' in data:
        image.description = data['description']
    if 'known_good' in data:
        image.known_good = data['known_good']
    if 'public' in data:
        image.public = data['public']

    db.session.commit()
    db.session.refresh(image)

    return jsonify(serialize_image(image)), 200


@mod.route('/image/<int:id>', methods=['DELETE'])
def image_delete(id):
    image = Image.query.get(id)
    if not image:
        raise InvalidUsage('image not found', status_code=404)

    if not image.check_permission(g.user, 'owner'):
        raise InvalidUsage('Forbidden', status_code=403)

    db.session.delete(image)
    db.session.commit()

    return '', 204


@mod.route('/')
def index():
    return redirect(url_for('.docs_index'))


@mod.route('/docs')
def docs_index():
    return render_template('swagger-ui.html')


@mod.route('/swagger.yaml')
def swagger_file():
    return send_file(os.path.abspath(os.path.join(os.path.dirname(__file__), 'swagger.yaml')), cache_timeout=1)


def handle_generic_error(error, status_code=400):
    response = {
        'error_type': error.__class__.__name__,
        'errors': str(error),
    }
    return jsonify(response), status_code


mod.register_error_handler(ValueError, handle_generic_error)
mod.register_error_handler(BMCError, lambda e: handle_generic_error(e, 500))


@mod.errorhandler(IntegrityError)
def handle_integrity_error(error):
    db.session.rollback()
    return handle_generic_error(error, 409)


@mod.errorhandler(DatabaseError)
def handle_db_error(error):
    db.session.rollback()
    return handle_generic_error(error)


@mod.errorhandler(SchemaError)
def handle_schema_error(error):
    response = {
        'error_type': error.__class__.__name__,
        'errors': error.errors + error.autos,
    }
    return jsonify(response), 400


@mod.errorhandler(InvalidUsage)
def handle_usage_error(error):
    response = jsonify(error.to_dict())
    response.status_code = error.status_code
    return response


@mod.route('/<path:path>')
def handle_not_found(path):
    response = {
        'error_type': 'NotFound',
        'errors': ['404: Not Found'],
    }
    return jsonify(response), 404
