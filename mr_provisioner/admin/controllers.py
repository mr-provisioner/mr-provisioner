from flask import Blueprint, request, g, render_template, url_for, \
    session, redirect, Response, send_from_directory, jsonify

import logging
import os
import binascii
from passlib.hash import pbkdf2_sha256
from base64 import b64encode
from werkzeug.utils import secure_filename
from sqlalchemy.exc import IntegrityError

from mr_provisioner import db
from sqlalchemy.exc import DatabaseError
from mr_provisioner.models import User, Token, Machine, Image, Preseed, BMC, MachineUsers, \
    ConsoleToken, Interface, Network, DiscoveredMAC
from mr_provisioner.bmc_types import BMCError
from mr_provisioner.util import trim_to_none

from flask import current_app as app

from graphene.types.json import JSONString # noqa: F401
from graphene.types import datetime # noqa: F401
import graphene
from flask_graphql import GraphQLView
import validators
import ipaddress
from netaddr import IPSet, IPNetwork

mod = Blueprint('admin', __name__, template_folder='templates', static_folder='static')
logger = logging.getLogger('admin')


def validate_network(val, *, ip_version=4, allow_empty=False):
    if val is None or len(val) == 0:
        return (True, None, None) if allow_empty else (False, None, 'network must not be empty')

    try:
        net = IPNetwork(val)
        if ip_version == 4:
            return (True, net, None)
        else:
            return (True, net, None)
    except ValueError as e:
        return (False, None, str(e))


@mod.context_processor
def inject_ui():
    return {
        'banner_name': app.config['BANNER_NAME']
    }


@mod.context_processor
def inject_user():
    return {
        'user': g.user
    }


@mod.before_request
def authenticate():
    logger.info("endpoint request: %s", request.endpoint)
    g.user = None

    # Skip authentication for some endpoints
    if request.endpoint == 'admin.static' or \
       request.endpoint == 'admin.get_ws_subprocess_command' or \
       request.endpoint == 'admin.index' or \
       request.endpoint == 'admin.ui_assets' or \
       request.endpoint == 'admin.favicon' or \
       request.endpoint == 'admin.login_post':
        pass
    else:
        try:
            user = User.query.filter_by(username=session['username']).first()
            if 'username' not in session or not user:
                return "", 401
            g.user = user
        except KeyError:
            return "", 401


@mod.route('/login', methods=['POST'])
def login_post():
    data = request.get_json(force=True)
    user = User.query.filter_by(username=data['username']).first()
    if not (user and pbkdf2_sha256.verify(data['password'], user.password)):
        resp = {
            'errors': ['Invalid username or password']
        }
        return jsonify(resp), 403

    session['username'] = data['username']
    return '', 200


@mod.route('/logout')
def logout():
    session.pop('username', None)
    return redirect(url_for('.index'))


@mod.route('/')
def index():
    return render_template("admin-ui.html")


@mod.route('/ws-subprocess', methods=['GET'])
def get_ws_subprocess_command():
    token = request.args.get('token')
    if not token or len(token) == 0:
        return "", 400

    ConsoleToken.cleanup()

    sol_token = ConsoleToken.query.filter_by(token=token).first()
    if not sol_token:
        return "", 404

    return Response(sol_token.command_response, mimetype='application/json')


class BMCType(graphene.ObjectType):
    id = graphene.ID()
    ip = graphene.String()
    name = graphene.String()
    bmc_type = graphene.String()
    username = graphene.String()
    password = graphene.String()
    machines = graphene.Dynamic(lambda: graphene.List(MachineType))

    def resolve_username(self, args, context, info):
        return self.username if self.check_permission(g.user, 'admin') else ""

    def resolve_password(self, args, context, info):
        return self.password if self.check_permission(g.user, 'admin') else ""


class NetworkType(graphene.ObjectType):
    id = graphene.ID()
    name = graphene.String()
    subnet = graphene.String()
    reserved_net = graphene.String()
    static_net = graphene.String()
    machines = graphene.Dynamic(lambda: graphene.List(MachineType))


class AvailableIPsType(graphene.ObjectType):
    static_ips = graphene.List(graphene.String)
    reserved_ips = graphene.List(graphene.String)


class DiscoveredMACType(graphene.ObjectType):
    id = graphene.ID()
    mac = graphene.String()
    last_seen = graphene.types.datetime.DateTime()
    info = graphene.types.json.JSONString()


class TokenType(graphene.ObjectType):
    id = graphene.ID()
    token = graphene.String()
    desc = graphene.String()


class ConsoleTokenType(graphene.ObjectType):
    token = graphene.String()
    host = graphene.String()
    port = graphene.Int()

    def resolve_host(self, args, context, info):
        return app.config['WSS_EXT_HOST']

    def resolve_port(self, args, context, info):
        return app.config['WSS_EXT_PORT']


class UserType(graphene.ObjectType):
    id = graphene.ID()
    username = graphene.String()
    email = graphene.String()
    ssh_key = graphene.String()
    admin = graphene.Boolean()

    def resolve_email(self, args, context, info):
        return self.email if self.check_permission(g.user, 'self') else ""


class MachineUsersType(graphene.ObjectType):
    id = graphene.ID()
    user = graphene.Field(UserType)
    reason = graphene.String()
    start_date = graphene.types.datetime.DateTime()


class LeaseType(graphene.ObjectType):
    id = graphene.ID()
    mac = graphene.String()
    ipv4 = graphene.String()
    last_seen = graphene.types.datetime.DateTime()


class InterfaceType(graphene.ObjectType):
    id = graphene.ID()
    mac = graphene.String()
    identifier = graphene.String()
    dhcpv4 = graphene.Boolean()
    static_ipv4 = graphene.String()
    reserved_ipv4 = graphene.String()
    lease = graphene.Field(LeaseType)
    network = graphene.Field(NetworkType)


class ImageType(graphene.ObjectType):
    id = graphene.ID()
    filename = graphene.String()
    description = graphene.String()
    file_type = graphene.String()
    known_good = graphene.Boolean()
    public = graphene.Boolean()
    user = graphene.Field(UserType)
    date = graphene.types.datetime.DateTime()
    machines = graphene.Dynamic(lambda: graphene.List(MachineType))


class PreseedType(graphene.ObjectType):
    id = graphene.ID()
    filename = graphene.String()
    description = graphene.String()
    file_type = graphene.String()
    file_content = graphene.String()
    known_good = graphene.Boolean()
    public = graphene.Boolean()
    user = graphene.Field(UserType)
    machines = graphene.Dynamic(lambda: graphene.List(MachineType))


class MachineType(graphene.ObjectType):
    id = graphene.ID()
    name = graphene.String()
    interfaces = graphene.List(InterfaceType)
    assignments = graphene.List(MachineUsersType)
    kernel_opts = graphene.String()
    kernel = graphene.Field(ImageType)
    initrd = graphene.Field(ImageType)
    preseed = graphene.Field(PreseedType)
    netboot_enabled = graphene.Boolean()
    bmc = graphene.Field(BMCType)
    bmc_info = graphene.String()
    power_state = graphene.String()


class CreateBMC(graphene.Mutation):
    class Input:
        name = graphene.String()
        bmc_type = graphene.String()
        ip = graphene.String()
        username = graphene.String()
        password = graphene.String()

    ok = graphene.Boolean()
    errors = graphene.List(graphene.String)
    bmc = graphene.Field(BMCType)

    @staticmethod
    def validate(args):
        errors = []

        if not args.get('bmc_type') in BMC.list_types():
            errors.append('BMC type %s is not a valid type' % args.get('bmc_type'))

        if not validators.length(args.get('name'), min=2, max=256):
            errors.append('BMC name must be between 2 and 256 characters long')

        if not validators.length(args.get('username', ''), min=0, max=256):
            errors.append('username must be between 0 and 256 characters long')

        if not validators.length(args.get('password', ''), min=0, max=256):
            errors.append('password must be between 0 and 256 characters long')

        if not validators.ip_address.ipv4(args.get('ip')) and not validators.ip_address.ipv6(args.get('ip')):
            errors.append('IP must be a valid IP address')

        return (len(errors) == 0, errors)

    @staticmethod
    def mutate(root, args, context, info):
        errors = []
        if not BMC.can_create(g.user):
            errors = ['Permission denied']
            return CreateBMC(bmc=None, ok=False, errors=errors)

        ok, errors = CreateBMC.validate(args)
        if ok:
            bmc = BMC(name=args.get('name'),
                      bmc_type=args.get('bmc_type'),
                      ip=trim_to_none(args.get('ip', None)),
                      privilege_level='admin',
                      username=args.get('username', None),
                      password=args.get('password', None))

            db.session.add(bmc)
            try:
                db.session.commit()
                db.session.refresh(bmc)
            except IntegrityError as e:
                db.session.rollback()
                return CreateBMC(bmc=None, ok=False, errors=['A BMC with that name or IP already exists'])

            return CreateBMC(bmc=bmc, ok=True, errors=errors)
        else:
            return CreateBMC(bmc=None, ok=False, errors=errors)


class ChangeBMC(graphene.Mutation):
    class Input:
        id = graphene.Int()
        name = graphene.String()
        bmc_type = graphene.String()
        ip = graphene.String()
        username = graphene.String()
        password = graphene.String()

    ok = graphene.Boolean()
    errors = graphene.List(graphene.String)
    bmc = graphene.Field(BMCType)

    @staticmethod
    def validate(args):
        errors = []

        if not args.get('bmc_type') in BMC.list_types():
            errors.append('BMC type %s is not a valid type' % args.get('bmc_type'))

        if not validators.length(args.get('name'), min=2, max=256):
            errors.append('BMC name must be between 2 and 256 characters long')

        if not validators.length(args.get('username', ''), min=0, max=256):
            errors.append('username must be between 0 and 256 characters long')

        if not validators.length(args.get('password', ''), min=0, max=256):
            errors.append('password must be between 0 and 256 characters long')

        if not validators.ip_address.ipv4(args.get('ip')) and not validators.ip_address.ipv6(args.get('ip')):
            errors.append('IP must be a valid IP address')

        return (len(errors) == 0, errors)

    @staticmethod
    def mutate(root, args, context, info):
        errors = []
        bmc = BMC.query.get(args.get('id'))
        if not bmc or not bmc.check_permission(g.user, 'admin'):
            errors = ["Permission denied"]
            return ChangeBMC(bmc=None, ok=False, errors=errors)

        ok, errors = ChangeBMC.validate(args)
        if ok:
            if 'name' in args:
                bmc.name = args.get('name')
            if 'bmc_type' in args:
                bmc.bmc_type = args.get('bmc_type')
            if 'ip' in args:
                bmc.ip = args.get('ip')
            if 'username' in args:
                bmc.username = args.get('username')
            if 'password' in args:
                bmc.password = args.get('password')

            try:
                db.session.commit()
                db.session.refresh(bmc)
            except IntegrityError as e:
                db.session.rollback()
                return ChangeBMC(bmc=None, ok=False, errors=['A BMC with that name already exists'])

            return ChangeBMC(bmc=bmc, ok=True, errors=errors)
        else:
            return ChangeBMC(bmc=None, ok=False, errors=errors)


class DeleteBMC(graphene.Mutation):
    class Input:
        id = graphene.Int()

    ok = graphene.Boolean()
    errors = graphene.List(graphene.String)
    bmc = graphene.Field(BMCType)

    @staticmethod
    def validate(args):
        errors = []

        return (len(errors) == 0, errors)

    @staticmethod
    def mutate(root, args, context, info):
        errors = []
        bmc = BMC.query.get(args.get('id'))
        if not bmc or not bmc.check_permission(g.user, 'admin'):
            errors = ["Permission denied"]
            return DeleteBMC(bmc=None, ok=False, errors=errors)

        ok, errors = DeleteBMC.validate(args)
        if ok:
            db.session.delete(bmc)
            db.session.commit()

            return DeleteBMC(bmc=bmc, ok=True, errors=errors)
        else:
            return DeleteBMC(bmc=bmc, ok=False, errors=errors)


class CreateMachine(graphene.Mutation):
    class Input:
        name = graphene.String()
        macs = graphene.List(graphene.String)
        bmc_id = graphene.Int()
        bmc_info = graphene.String()

    ok = graphene.Boolean()
    errors = graphene.List(graphene.String)
    machine = graphene.Field(MachineType)

    @staticmethod
    def validate(args):
        errors = []

        if not validators.length(args.get('name'), min=2, max=256):
            errors.append('Machine name must be between 2 and 256 characters long')

        if args.get('bmc_id'):
            bmc = BMC.query.get(args.get('bmc_id'))
            if not bmc:
                errors.append('A BMC with id=%d does not exist' % args.get('bmc_id'))
            else:
                try:
                    bmc.type_inst.validate_bmc_info(args.get('bmc_info'))
                except BMCError as e:
                    errors.append(str(e))

        for mac in filter(lambda m: m and m != '', args.get('macs', [])):
            if not validators.mac_address(mac):
                errors.append('MAC %s is not a valid mac address' % mac)
            else:
                n = Interface.query.filter_by(mac=mac).count()
                if n > 0:
                    errors.append('MAC %s already in use' % mac)

        return (len(errors) == 0, errors)

    @staticmethod
    def mutate(root, args, context, info):
        errors = []
        if not Machine.can_create(g.user):
            errors = ["Permission denied"]
            return CreateMachine(machine=None, ok=False, errors=errors)

        ok, errors = CreateMachine.validate(args)
        if ok:
            machine = Machine(name=args.get('name'),
                              bmc_id=args.get('bmc_id'),
                              bmc_info=args.get('bmc_info'),
                              netboot_enabled=False)

            db.session.add(machine)
            try:
                db.session.commit()
                db.session.refresh(machine)
            except IntegrityError as e:
                db.session.rollback()
                return CreateMachine(machine=None, ok=False, errors=['A machine with that name already exists'])

            for mac in args.get('macs', []):
                if mac and mac != '':
                    interface = Interface(machine_id=machine.id, mac=mac)
                    db.session.add(interface)
                    try:
                        db.session.commit()
                    except IntegrityError as e:
                        db.session.rollback()
                        errors.append('Failed to add MAC %s: %s' % (mac, str(e)))

            return CreateMachine(machine=machine, ok=True, errors=errors)
        else:
            return CreateMachine(machine=None, ok=False, errors=errors)


class ChangeMachineOverview(graphene.Mutation):
    class Input:
        id = graphene.Int()
        name = graphene.String()
        bmc_id = graphene.Int()
        bmc_info = graphene.String()

    ok = graphene.Boolean()
    errors = graphene.List(graphene.String)
    machine = graphene.Field(MachineType)

    @staticmethod
    def validate(args):
        errors = []

        if not validators.length(args.get('name'), min=2, max=256):
            errors.append('Machine name must be between 2 and 256 characters long')

        if args.get('bmc_id'):
            bmc = BMC.query.get(args.get('bmc_id'))
            if not bmc:
                errors.append('A BMC with id=%d does not exist' % args.get('bmc_id'))
            else:
                try:
                    bmc.type_inst.validate_bmc_info(args.get('bmc_info'))
                except BMCError as e:
                    errors.append(str(e))

        return (len(errors) == 0, errors)

    @staticmethod
    def mutate(root, args, context, info):
        errors = []
        machine = Machine.query.get(args.get('id'))
        if not machine or not machine.check_permission(g.user, 'admin'):
            errors = ["Permission denied"]
            return ChangeMachineOverview(machine=None, ok=False, errors=errors)

        ok, errors = ChangeMachineOverview.validate(args)
        if ok:
            machine.name = args.get('name')
            machine.bmc_id = args.get('bmc_id')
            machine.bmc_info = args.get('bmc_info')

            try:
                db.session.commit()
                db.session.refresh(machine)
            except IntegrityError as e:
                db.session.rollback()
                return ChangeMachineOverview(machine=machine, ok=False,
                                             errors=['Another machine with that name already exists'])

            return ChangeMachineOverview(machine=machine, ok=True, errors=errors)
        else:
            return ChangeMachineOverview(machine=machine, ok=False, errors=errors)


class ChangeMachineProvisioning(graphene.Mutation):
    class Input:
        id = graphene.Int()
        kernel_id = graphene.Int()
        kernel_opts = graphene.String()
        initrd_id = graphene.Int()
        preseed_id = graphene.Int()

    ok = graphene.Boolean()
    errors = graphene.List(graphene.String)
    machine = graphene.Field(MachineType)

    @staticmethod
    def validate(args):
        errors = []

        if not validators.length(args.get('kernel_opts'), min=0, max=1024):
            errors.append('Machine name must be between 0 and 1024 characters long')

        if args.get('kernel_id'):
            kernel = Image.query.get(args.get('kernel_id'))
            if not kernel:
                errors.append('A kernel with id=%d does not exist' % args.get('kernel_id'))
            elif not kernel.check_permission(g.user, 'user'):
                errors.append('Not authorized to use kernel %s' % kernel.filename)

        if args.get('initrd_id'):
            initrd = Image.query.get(args.get('initrd_id'))
            if not initrd:
                errors.append('An initrd with id=%d does not exist' % args.get('initrd_id'))
            elif not initrd.check_permission(g.user, 'user'):
                errors.append('Not authorized to use initrd %s' % initrd.filename)

        if args.get('preseed_id'):
            preseed = Preseed.query.get(args.get('preseed_id'))
            if not preseed:
                errors.append('A preseed with id=%d does not exist' % args.get('preseed_id'))
            elif not preseed.check_permission(g.user, 'user'):
                errors.append('Not authorized to use preseed %s' % preseed.description)

        return (len(errors) == 0, errors)

    @staticmethod
    def mutate(root, args, context, info):
        errors = []
        machine = Machine.query.get(args.get('id'))
        if not machine or not machine.check_permission(g.user, 'assignee'):
            errors = ["Permission denied"]
            return ChangeMachineProvisioning(machine=None, ok=False, errors=errors)

        ok, errors = ChangeMachineProvisioning.validate(args)
        if ok:
            machine.kernel_id = args.get('kernel_id')
            machine.kernel_opts = args.get('kernel_opts')
            machine.initrd_id = args.get('initrd_id')
            machine.preseed_id = args.get('preseed_id')

            db.session.commit()
            db.session.refresh(machine)

            return ChangeMachineProvisioning(machine=machine, ok=True, errors=errors)
        else:
            return ChangeMachineProvisioning(machine=machine, ok=False, errors=errors)


class ChangeMachineNetboot(graphene.Mutation):
    class Input:
        id = graphene.Int()
        netboot_enabled = graphene.Boolean()

    ok = graphene.Boolean()
    errors = graphene.List(graphene.String)
    machine = graphene.Field(MachineType)

    @staticmethod
    def validate(args):
        errors = []

        return (len(errors) == 0, errors)

    @staticmethod
    def mutate(root, args, context, info):
        errors = []
        machine = Machine.query.get(args.get('id'))
        if not machine or not machine.check_permission(g.user, 'assignee'):
            errors = ["Permission denied"]
            return ChangeMachineNetboot(machine=None, ok=False, errors=errors)

        ok, errors = ChangeMachineNetboot.validate(args)
        if ok:
            machine.netboot_enabled = args.get('netboot_enabled')
            db.session.commit()

            return ChangeMachineNetboot(machine=machine, ok=True, errors=errors)
        else:
            return ChangeMachineNetboot(machine=machine, ok=False, errors=errors)


class MachineResetConsole(graphene.Mutation):
    class Input:
        id = graphene.Int()

    ok = graphene.Boolean()
    errors = graphene.List(graphene.String)
    machine = graphene.Field(MachineType)

    @staticmethod
    def validate(args, machine):
        errors = []

        if not machine.bmc:
            errors.append('no BMC configured')

        return (len(errors) == 0, errors)

    @staticmethod
    def mutate(root, args, context, info):
        errors = []
        machine = Machine.query.get(args.get('id'))
        if not machine or not machine.check_permission(g.user, 'assignee'):
            errors = ["Permission denied"]
            return MachineResetConsole(machine=None, ok=False, errors=errors)

        ok, errors = MachineResetConsole.validate(args, machine)
        if ok:
            try:
                machine.deactivate_sol()
            except Exception as e:
                errors.append('could not reset console: %s' % str(e))

            return MachineResetConsole(machine=machine, ok=True, errors=errors)
        else:
            return MachineResetConsole(machine=machine, ok=False, errors=errors)


class MachineChangePower(graphene.Mutation):
    class Input:
        id = graphene.Int()
        power_state = graphene.String()

    ok = graphene.Boolean()
    errors = graphene.List(graphene.String)
    machine = graphene.Field(MachineType)

    @staticmethod
    def validate(args, machine):
        errors = []

        if not args.get('power_state') in ['on', 'off', 'reboot', 'pxe_reboot', 'disk_reboot', 'bios_reboot']:
            errors.append('Unknown power state: %s' % args.get('power_state'))

        if not machine.bmc:
            errors.append('no BMC configured')

        return (len(errors) == 0, errors)

    @staticmethod
    def mutate(root, args, context, info):
        errors = []
        machine = Machine.query.get(args.get('id'))
        if not machine or not machine.check_permission(g.user, 'assignee'):
            errors = ["Permission denied"]
            return MachineChangePower(machine=None, ok=False, errors=errors)

        ok, errors = MachineChangePower.validate(args, machine)
        if ok:
            try:
                if args.get('power_state') == 'reboot':
                    machine.reboot()
                else:
                    machine.set_power(args.get('power_state'))

                return MachineChangePower(machine=machine, ok=True, errors=errors)
            except BMCError as e:
                errors.append('could not change power state: %s' % str(e))
                return MachineChangePower(machine=machine, ok=False, errors=errors)

        else:
            return MachineChangePower(machine=machine, ok=False, errors=errors)


class AddMachineInterface(graphene.Mutation):
    class Input:
        machine_id = graphene.Int()
        mac = graphene.String()
        identifier = graphene.String()
        static_ipv4 = graphene.String()
        reserved_ipv4 = graphene.String()
        network_id = graphene.Int()

    ok = graphene.Boolean()
    errors = graphene.List(graphene.String)
    machine = graphene.Field(MachineType)
    intf = graphene.Field(InterfaceType)

    @staticmethod
    def validate(args, network):
        errors = []

        if not validators.mac_address(args.get('mac')):
            errors.append('MAC %s is not a valid mac address' % args.get('mac'))
        else:
            n = Interface.query.filter_by(mac=args.get('mac')).count()
            if n > 0:
                errors.append('MAC %s already in use' % args.get('mac'))

        if not validators.length(args.get('identifier', ''), min=0, max=64):
            errors.append('Interface identifier must be between 0 and 64 characters long')

        if not args.get('static_ipv4', None):
            pass
        elif not validators.ip_address.ipv4(args.get('static_ipv4')):
            errors.append('Static IPv4 must be a valid IPv4 address or empty')
        elif not network or not network.static_net:
            errors.append('Network does not have a static subnet defined')
        elif ipaddress.IPv4Address(args.get('static_ipv4')) not in ipaddress.ip_network(network.static_net):
            errors.append('Static IPv4 is not contained within subnet %s' % network.static_net)
        elif network.ip_in_use(args.get('static_ipv4')):
            errors.append('Static IPv4 is already in use')

        if not args.get('reserved_ipv4', None):
            pass
        elif not validators.ip_address.ipv4(args.get('reserved_ipv4')):
            errors.append('reserved IPv4 must be a valid IPv4 address or empty')
        elif not network or not network.reserved_net:
            errors.append('Network does not have a reserved subnet defined')
        elif ipaddress.IPv4Address(args.get('reserved_ipv4')) not in ipaddress.ip_network(network.reserved_net):
            errors.append('Reserved IPv4 is not contained within subnet %s' % network.reserved_net)
        elif network.ip_in_use(args.get('reserved_ipv4')):
            errors.append('Reserved IPv4 is already in use')

        return (len(errors) == 0, errors)

    @staticmethod
    def mutate(root, args, context, info):
        errors = []
        machine = Machine.query.get(args.get('machine_id'))
        network = Network.query.get(args.get('network_id')) if args.get('network_id') else None
        if not machine or not machine.check_permission(g.user, 'admin'):
            errors = ['Permission denied']
            return AddMachineInterface(machine=None, intf=None, ok=False, errors=errors)

        ok, errors = AddMachineInterface.validate(args, network)
        if ok:
            interface = Interface(machine_id=machine.id, mac=args.get('mac'))
            if 'network_id' in args:
                interface.network_id = args.get('network_id', None)
            if 'static_ipv4' in args:
                interface.static_ipv4 = trim_to_none(args.get('static_ipv4'))
            if 'reserved_ipv4' in args:
                interface.reserved_ipv4 = trim_to_none(args.get('reserved_ipv4'))
            if 'identifier' in args:
                interface.identifier = args.get('identifier')

            db.session.add(interface)
            try:
                db.session.commit()
            except IntegrityError as e:
                db.session.rollback()
                errors.append('Failed to add interface %s: %s' % (args.get('mac'), str(e)))

            return AddMachineInterface(machine=machine, intf=interface, ok=True, errors=errors)
        else:
            return AddMachineInterface(machine=machine, intf=None, ok=False, errors=errors)


class ChangeMachineInterface(graphene.Mutation):
    class Input:
        id = graphene.Int()
        machine_id = graphene.Int()
        mac = graphene.String()
        identifier = graphene.String()
        static_ipv4 = graphene.String()
        reserved_ipv4 = graphene.String()
        network_id = graphene.Int()

    ok = graphene.Boolean()
    errors = graphene.List(graphene.String)
    machine = graphene.Field(MachineType)
    intf = graphene.Field(InterfaceType)

    @staticmethod
    def validate(args, network, interface):
        errors = []

        if not validators.mac_address(args.get('mac')):
            errors.append('MAC %s is not a valid mac address' % args.get('mac'))

        if not validators.length(args.get('identifier', ''), min=0, max=64):
            errors.append('Interface identifier must be between 0 and 64 characters long')

        if not args.get('static_ipv4', None):
            pass
        elif not validators.ip_address.ipv4(args.get('static_ipv4')):
            errors.append('Static IPv4 must be a valid IPv4 address or empty')
        elif not network or not network.static_net:
            errors.append('Network does not have a static subnet defined')
        elif ipaddress.IPv4Address(args.get('static_ipv4')) not in ipaddress.ip_network(network.static_net):
            errors.append('Static IPv4 is not contained within subnet %s' % network.static_net)
        elif network.ip_in_use(args.get('static_ipv4'), exclude_intf=interface):
            errors.append('Static IPv4 is already in use')

        if not args.get('reserved_ipv4', None):
            pass
        elif not validators.ip_address.ipv4(args.get('reserved_ipv4')):
            errors.append('reserved IPv4 must be a valid IPv4 address or empty')
        elif not network or not network.reserved_net:
            errors.append('Network does not have a reserved subnet defined')
        elif ipaddress.IPv4Address(args.get('reserved_ipv4')) not in ipaddress.ip_network(network.reserved_net):
            errors.append('Reserved IPv4 is not contained within subnet %s' % network.reserved_net)
        elif network.ip_in_use(args.get('reserved_ipv4'), exclude_intf=interface):
            errors.append('Reserved IPv4 is already in use')

        return (len(errors) == 0, errors)

    @staticmethod
    def mutate(root, args, context, info):
        errors = []
        interface = Interface.query.get(args.get('id'))
        machine = interface.machine if interface else None
        network = Network.query.get(args.get('network_id')) if args.get('network_id') else None
        if not interface or not machine or not machine.check_permission(g.user, 'owner'):
            errors = ['Permission denied']
            return ChangeMachineInterface(machine=None, intf=None, ok=False, errors=errors)
        if (args.get('network_id') != interface.network_id or args.get('mac') != interface.mac) and \
           not machine.check_permission(g.user, 'admin'):
            errors = ['Permission denied']
            return ChangeMachineInterface(machine=None, intf=None, ok=False, errors=errors)

        ok, errors = ChangeMachineInterface.validate(args, network, interface)
        if ok:
            if machine.check_permission(g.user, 'admin'):
                interface.mac = args.get('mac')
                interface.network_id = args.get('network_id', None)

            if machine.check_permission(g.user, 'assignee'):
                interface.static_ipv4 = trim_to_none(args.get('static_ipv4'))
                interface.reserved_ipv4 = trim_to_none(args.get('reserved_ipv4'))
                interface.identifier = args.get('identifier')

            try:
                db.session.commit()
            except IntegrityError as e:
                db.session.rollback()
                errors.append('Failed to change interface %s: %s' % (args.get('mac'), str(e)))

            return ChangeMachineInterface(machine=machine, intf=interface, ok=True, errors=errors)
        else:
            return ChangeMachineInterface(machine=machine, intf=None, ok=False, errors=errors)


class DeleteMachineInterface(graphene.Mutation):
    class Input:
        id = graphene.Int()
        machine_id = graphene.Int()

    ok = graphene.Boolean()
    errors = graphene.List(graphene.String)
    intf = graphene.Field(InterfaceType)

    @staticmethod
    def validate(args):
        errors = []

        return (len(errors) == 0, errors)

    @staticmethod
    def mutate(root, args, context, info):
        errors = []
        interface = Interface.query.get(args.get('id'))
        machine = interface.machine if interface else None
        if not interface or not machine or not machine.check_permission(g.user, 'admin'):
            errors = ['Permission denied']
            return DeleteMachineInterface(intf=None, ok=False, errors=errors)

        ok, errors = DeleteMachineInterface.validate(args)
        if ok:
            db.session.delete(interface)
            db.session.commit()

            return DeleteMachineInterface(intf=interface, ok=True, errors=errors)
        else:
            return DeleteMachineInterface(intf=None, ok=False, errors=errors)


class AddMachineAssignee(graphene.Mutation):
    class Input:
        machine_id = graphene.Int()
        user_id = graphene.Int()
        reason = graphene.String()

    ok = graphene.Boolean()
    errors = graphene.List(graphene.String)
    assignment = graphene.Field(MachineUsersType)

    @staticmethod
    def validate(args):
        errors = []

        if args.get('user_id'):
            user = User.query.get(args.get('user_id'))
            if not user:
                errors.append('A user with id=%d does not exist' % args.get('user_id'))

        if not validators.length(args.get('reason', ''), min=0, max=140):
            errors.append('Assignee reason must be between 0 and 140 characters long')

        return (len(errors) == 0, errors)

    @staticmethod
    def mutate(root, args, context, info):
        errors = []
        machine = Machine.query.get(args.get('machine_id'))
        if not machine or not machine.check_permission(g.user, 'admin'):
            errors = ['Permission denied']
            return AddMachineAssignee(assignment=None, ok=False, errors=errors)

        ok, errors = AddMachineAssignee.validate(args)
        if ok:
            user = User.query.get(args.get('user_id'))
            assignment = MachineUsers(machine_id=machine.id,
                                      user_id=user.id,
                                      permissions=0,
                                      reason=args.get('reason', None))

            db.session.add(assignment)
            try:
                db.session.commit()
            except IntegrityError as e:
                db.session.rollback()
                errors.append('Failed to add assignee %s: %s' % (user.username, str(e)))

            return AddMachineAssignee(assignment=assignment, ok=True, errors=errors)
        else:
            return AddMachineAssignee(assignment=None, ok=False, errors=errors)


class ChangeMachineAssignee(graphene.Mutation):
    class Input:
        id = graphene.Int()
        machine_id = graphene.Int()
        reason = graphene.String()

    ok = graphene.Boolean()
    errors = graphene.List(graphene.String)
    assignment = graphene.Field(MachineUsersType)

    @staticmethod
    def validate(args):
        errors = []

        if not validators.length(args.get('reason', ''), min=0, max=140):
            errors.append('Assignee reason must be between 0 and 140 characters long')

        return (len(errors) == 0, errors)

    @staticmethod
    def mutate(root, args, context, info):
        errors = []
        assignment = MachineUsers.query.get(args.get('id'))
        machine = assignment.machine if assignment else None
        if not assignment or not machine or not machine.check_permission(g.user, 'admin'):
            errors = ['Permission denied']
            return ChangeMachineAssignee(assignment=None, ok=False, errors=errors)

        ok, errors = ChangeMachineAssignee.validate(args)
        if ok:
            if 'reason' in args:
                assignment.reason = args.get('reason')

            try:
                db.session.commit()
            except IntegrityError as e:
                db.session.rollback()
                errors.append('Failed to change assignee %s: %s' % (assignment.user.username, str(e)))

            return ChangeMachineAssignee(assignment=assignment, ok=True, errors=errors)
        else:
            return ChangeMachineAssignee(assignment=None, ok=False, errors=errors)


class DeleteMachineAssignee(graphene.Mutation):
    class Input:
        id = graphene.Int()
        machine_id = graphene.Int()

    ok = graphene.Boolean()
    errors = graphene.List(graphene.String)
    user = graphene.Field(UserType)

    @staticmethod
    def validate(args):
        errors = []

        return (len(errors) == 0, errors)

    @staticmethod
    def mutate(root, args, context, info):
        errors = []
        assignment = MachineUsers.query.get(args.get('id'))
        user = assignment.user
        machine = assignment.machine if assignment else None
        if not assignment or not machine or \
           not (machine.check_permission(g.user, 'admin') or assignment.user_id == g.user.id):
            errors = ['Permission denied']
            return DeleteMachineAssignee(user=None, ok=False, errors=errors)

        ok, errors = DeleteMachineAssignee.validate(args)
        if ok:
            db.session.delete(assignment)
            db.session.commit()

            return DeleteMachineAssignee(user=user, ok=True, errors=errors)
        else:
            return DeleteMachineAssignee(user=None, ok=False, errors=errors)


class DeleteMachine(graphene.Mutation):
    class Input:
        id = graphene.Int()

    ok = graphene.Boolean()
    errors = graphene.List(graphene.String)
    machine = graphene.Field(MachineType)

    @staticmethod
    def validate(args):
        errors = []

        return (len(errors) == 0, errors)

    @staticmethod
    def mutate(root, args, context, info):
        errors = []
        machine = Machine.query.get(args.get('id'))
        if not machine or not machine.check_permission(g.user, 'admin'):
            errors = ["Permission denied"]
            return DeleteMachine(machine=None, ok=False, errors=errors)

        ok, errors = DeleteMachine.validate(args)
        if ok:
            db.session.delete(machine)
            db.session.commit()

            return DeleteMachine(machine=machine, ok=True, errors=errors)
        else:
            return DeleteMachine(machine=machine, ok=False, errors=errors)


class CreatePreseed(graphene.Mutation):
    class Input:
        filename = graphene.String()
        file_type = graphene.String()
        description = graphene.String()
        file_content = graphene.String()
        known_good = graphene.Boolean()
        public = graphene.Boolean()

    ok = graphene.Boolean()
    errors = graphene.List(graphene.String)
    preseed = graphene.Field(PreseedType)

    @staticmethod
    def validate(args):
        errors = []

        if not args.get('file_type') in Preseed.list_types():
            errors.append('Preseed type %s is not a valid type' % args.get('file_type'))

        if not validators.length(args.get('filename'), min=2, max=256):
            errors.append('Preseed name must be between 2 and 256 characters long')

        if not validators.length(args.get('file_content', ''), min=0, max=2 * 1024 * 1024):
            errors.append('content must be less than 2MB')

        if not validators.length(args.get('description', ''), min=0, max=256):
            errors.append('description must be between 0 and 256 characters long')

        return (len(errors) == 0, errors)

    @staticmethod
    def mutate(root, args, context, info):
        errors = []
        if not Preseed.can_create(g.user):
            errors = ['Permission denied']
            return CreatePreseed(preseed=None, ok=False, errors=errors)

        ok, errors = CreatePreseed.validate(args)
        if ok:
            preseed = Preseed(filename=args.get('filename'),
                              user_id=g.user.id,
                              description=args.get('description', None),
                              file_content=args.get('file_content', ''), # XXX: set to None
                              file_type=args.get('file_type'),
                              public=args.get('public', False),
                              known_good=args.get('known_good', False))

            db.session.add(preseed)
            try:
                db.session.commit()
                db.session.refresh(preseed)
            except IntegrityError as e:
                db.session.rollback()
                return CreatePreseed(preseed=None, ok=False, errors=['A Preseed with that name already exists'])

            return CreatePreseed(preseed=preseed, ok=True, errors=errors)
        else:
            return CreatePreseed(preseed=None, ok=False, errors=errors)


class ChangePreseedMeta(graphene.Mutation):
    class Input:
        id = graphene.Int()
        filename = graphene.String()
        file_type = graphene.String()
        description = graphene.String()

    ok = graphene.Boolean()
    errors = graphene.List(graphene.String)
    preseed = graphene.Field(PreseedType)

    @staticmethod
    def validate(args):
        errors = []

        if not args.get('file_type') in Preseed.list_types():
            errors.append('Preseed type %s is not a valid type' % args.get('file_type'))

        if not validators.length(args.get('filename'), min=2, max=256):
            errors.append('Preseed name must be between 2 and 256 characters long')

        if not validators.length(args.get('description', ''), min=0, max=256):
            errors.append('description must be between 0 and 256 characters long')

        return (len(errors) == 0, errors)

    @staticmethod
    def mutate(root, args, context, info):
        errors = []
        preseed = Preseed.query.get(args.get('id'))
        if not preseed or not preseed.check_permission(g.user, 'owner'):
            errors = ["Permission denied"]
            return ChangePreseedMeta(preseed=None, ok=False, errors=errors)

        ok, errors = ChangePreseedMeta.validate(args)
        if ok:
            if 'filename' in args:
                preseed.filename = args.get('filename')
            if 'file_type' in args:
                preseed.file_type = args.get('file_type')
            if 'description' in args:
                preseed.description = args.get('description')

            try:
                db.session.commit()
                db.session.refresh(preseed)
            except IntegrityError as e:
                db.session.rollback()
                return ChangePreseedMeta(preseed=None, ok=False, errors=['A Preseed with that name already exists'])

            return ChangePreseedMeta(preseed=preseed, ok=True, errors=errors)
        else:
            return ChangePreseedMeta(preseed=None, ok=False, errors=errors)


class ChangePreseedFlags(graphene.Mutation):
    class Input:
        id = graphene.Int()
        public = graphene.Boolean()
        known_good = graphene.Boolean()

    ok = graphene.Boolean()
    errors = graphene.List(graphene.String)
    preseed = graphene.Field(PreseedType)

    @staticmethod
    def validate(args):
        errors = []

        return (len(errors) == 0, errors)

    @staticmethod
    def mutate(root, args, context, info):
        errors = []
        preseed = Preseed.query.get(args.get('id'))
        if not preseed or not preseed.check_permission(g.user, 'owner'):
            errors = ["Permission denied"]
            return ChangePreseedFlags(preseed=None, ok=False, errors=errors)

        ok, errors = ChangePreseedFlags.validate(args)
        if ok:
            if 'public' in args:
                preseed.public = args.get('public')
            if 'known_good' in args:
                preseed.known_good = args.get('known_good')

            db.session.commit()
            db.session.refresh(preseed)

            return ChangePreseedFlags(preseed=preseed, ok=True, errors=errors)
        else:
            return ChangePreseedFlags(preseed=None, ok=False, errors=errors)


class ChangePreseedContents(graphene.Mutation):
    class Input:
        id = graphene.Int()
        file_content = graphene.String()

    ok = graphene.Boolean()
    errors = graphene.List(graphene.String)
    preseed = graphene.Field(PreseedType)

    @staticmethod
    def validate(args):
        errors = []

        if not validators.length(args.get('file_content', ''), min=0, max=2 * 1024 * 1024):
            errors.append('content must be less than 2MB')

        return (len(errors) == 0, errors)

    @staticmethod
    def mutate(root, args, context, info):
        errors = []
        preseed = Preseed.query.get(args.get('id'))
        if not preseed or not preseed.check_permission(g.user, 'owner'):
            errors = ["Permission denied"]
            return ChangePreseedContents(preseed=None, ok=False, errors=errors)

        ok, errors = ChangePreseedContents.validate(args)
        if ok:
            preseed.file_content = args.get('file_content', '')

            db.session.commit()
            db.session.refresh(preseed)

            return ChangePreseedContents(preseed=preseed, ok=True, errors=errors)
        else:
            return ChangePreseedContents(preseed=None, ok=False, errors=errors)


class DeletePreseed(graphene.Mutation):
    class Input:
        id = graphene.Int()

    ok = graphene.Boolean()
    errors = graphene.List(graphene.String)
    preseed = graphene.Field(PreseedType)

    @staticmethod
    def validate(args):
        errors = []

        return (len(errors) == 0, errors)

    @staticmethod
    def mutate(root, args, context, info):
        errors = []
        preseed = Preseed.query.get(args.get('id'))
        if not preseed or not preseed.check_permission(g.user, 'owner'):
            errors = ["Permission denied"]
            return DeletePreseed(preseed=None, ok=False, errors=errors)

        ok, errors = DeletePreseed.validate(args)
        if ok:
            db.session.delete(preseed)
            db.session.commit()

            return DeletePreseed(preseed=preseed, ok=True, errors=errors)
        else:
            return DeletePreseed(preseed=preseed, ok=False, errors=errors)


class CreateImage(graphene.Mutation):
    class Input:
        filename = graphene.String()
        file_type = graphene.String()
        description = graphene.String()
        file_content = graphene.String()
        known_good = graphene.Boolean()
        public = graphene.Boolean()

    ok = graphene.Boolean()
    errors = graphene.List(graphene.String)
    image = graphene.Field(ImageType)

    @staticmethod
    def validate(args):
        errors = []

        if not args.get('file_type') in Image.list_types():
            errors.append('Image type %s is not a valid type' % args.get('file_type'))

        if not validators.length(args.get('file_content', ''), min=0, max=2 * 1024 * 1024):
            errors.append('content must be less than 2MB')

        if not validators.length(args.get('description', ''), min=0, max=256):
            errors.append('description must be between 0 and 256 characters long')

        if 'file' not in request.files:
            errors.append('no file was uploaded')

        return (len(errors) == 0, errors)

    @staticmethod
    def mutate(root, args, context, info):
        errors = []
        if not Image.can_create(g.user):
            errors = ['Permission denied']
            return CreateImage(image=None, ok=False, errors=errors)

        ok, errors = CreateImage.validate(args)
        if ok:
            f = request.files['file']
            random_suffix = binascii.hexlify(os.urandom(4)).decode('utf-8')
            filename = "%s.%s" % (secure_filename(f.filename), random_suffix)
            path = os.path.join(secure_filename(g.user.username), filename)

            directory = os.path.join(app.config['TFTP_ROOT'], secure_filename(g.user.username))
            if not os.path.exists(directory):
                os.makedirs(directory)

            image = Image(filename=path,
                          user_id=g.user.id,
                          description=args.get('description', None),
                          file_type=args.get('file_type'),
                          public=args.get('public', False),
                          known_good=args.get('known_good', False))

            db.session.add(image)
            try:
                db.session.commit()
                f.save(os.path.join(app.config['TFTP_ROOT'], path))
                db.session.refresh(image)
            except IntegrityError as e:
                db.session.rollback()
                return CreateImage(image=None, ok=False, errors=['An Image with that name already exists'])

            return CreateImage(image=image, ok=True, errors=errors)
        else:
            return CreateImage(image=None, ok=False, errors=errors)


class ChangeImageMeta(graphene.Mutation):
    class Input:
        id = graphene.Int()
        file_type = graphene.String()
        description = graphene.String()

    ok = graphene.Boolean()
    errors = graphene.List(graphene.String)
    image = graphene.Field(ImageType)

    @staticmethod
    def validate(args):
        errors = []

        if not args.get('file_type') in Image.list_types():
            errors.append('Image type %s is not a valid type' % args.get('file_type'))

        if not validators.length(args.get('description', ''), min=0, max=256):
            errors.append('description must be between 0 and 256 characters long')

        return (len(errors) == 0, errors)

    @staticmethod
    def mutate(root, args, context, info):
        errors = []
        image = Image.query.get(args.get('id'))
        if not image or not image.check_permission(g.user, 'owner'):
            errors = ["Permission denied"]
            return ChangeImageMeta(image=None, ok=False, errors=errors)

        ok, errors = ChangeImageMeta.validate(args)
        if ok:
            if 'file_type' in args:
                image.file_type = args.get('file_type')
            if 'description' in args:
                image.description = args.get('description')

            try:
                db.session.commit()
                db.session.refresh(image)
            except IntegrityError as e:
                db.session.rollback()
                return ChangeImageMeta(image=None, ok=False, errors=['An Image with that name already exists'])

            return ChangeImageMeta(image=image, ok=True, errors=errors)
        else:
            return ChangeImageMeta(image=None, ok=False, errors=errors)


class ChangeImageFlags(graphene.Mutation):
    class Input:
        id = graphene.Int()
        public = graphene.Boolean()
        known_good = graphene.Boolean()

    ok = graphene.Boolean()
    errors = graphene.List(graphene.String)
    image = graphene.Field(ImageType)

    @staticmethod
    def validate(args):
        errors = []

        return (len(errors) == 0, errors)

    @staticmethod
    def mutate(root, args, context, info):
        errors = []
        image = Image.query.get(args.get('id'))
        if not image or not image.check_permission(g.user, 'owner'):
            errors = ["Permission denied"]
            return ChangeImageFlags(image=None, ok=False, errors=errors)

        ok, errors = ChangeImageFlags.validate(args)
        if ok:
            if 'public' in args:
                image.public = args.get('public')
            if 'known_good' in args:
                image.known_good = args.get('known_good')

            db.session.commit()
            db.session.refresh(image)

            return ChangeImageFlags(image=image, ok=True, errors=errors)
        else:
            return ChangeImageFlags(image=None, ok=False, errors=errors)


class DeleteImage(graphene.Mutation):
    class Input:
        id = graphene.Int()

    ok = graphene.Boolean()
    errors = graphene.List(graphene.String)
    image = graphene.Field(ImageType)

    @staticmethod
    def validate(args):
        errors = []

        return (len(errors) == 0, errors)

    @staticmethod
    def mutate(root, args, context, info):
        errors = []
        image = Image.query.get(args.get('id'))
        if not image or not image.check_permission(g.user, 'owner'):
            errors = ["Permission denied"]
            return DeleteImage(image=None, ok=False, errors=errors)

        ok, errors = DeleteImage.validate(args)
        if ok:
            filename = os.path.join(app.config['TFTP_ROOT'], image.filename)
            db.session.delete(image)
            db.session.commit()
            try:
                os.remove(filename)
            except OSError as e:
                # Errno 2 means the file was not there, no need to delete it
                if e.errno != 2:
                    raise

            return DeleteImage(image=image, ok=True, errors=errors)
        else:
            return DeleteImage(image=image, ok=False, errors=errors)


class CreateNetwork(graphene.Mutation):
    class Input:
        name = graphene.String()
        subnet = graphene.String()
        reserved_net = graphene.String()
        static_net = graphene.String()

    ok = graphene.Boolean()
    errors = graphene.List(graphene.String)
    network = graphene.Field(NetworkType)

    @staticmethod
    def validate(args):
        errors = []

        if not validators.length(args.get('name'), min=2, max=256):
            errors.append('Network name must be between 2 and 256 characters long')

        ok, subnet, message = validate_network(args.get('subnet'), ip_version=4)
        if not ok:
            errors.append('Subnet: %s' % message)
        elif Network.subnet_conflicts(args.get('subnet')):
            errors.append('Subnet %s conflicts with other subnets on other networks' % args.get('subnet'))

        ok, reserved_net, message = validate_network(args.get('reserved_net'),
                                                     ip_version=4, allow_empty=True)
        if not ok:
            errors.append('Reserved subnet: %s' % message)
        elif subnet and reserved_net and not IPSet(reserved_net).issubset(subnet):
            errors.append('Reserved subnet is not contained within subnet')

        ok, static_net, message = validate_network(args.get('static_net'),
                                                   ip_version=4, allow_empty=True)
        if not ok:
            errors.append('Static subnet: %s' % message)
        elif subnet and static_net and not IPSet(static_net).issubset(subnet):
            errors.append('Static subnet is not contained within subnet')

        if static_net and reserved_net and len(IPSet(static_net) & IPSet(reserved_net)) != 0:
            errors.append('Static and reserved subnets overlap')

        return (len(errors) == 0, errors)

    @staticmethod
    def mutate(root, args, context, info):
        errors = []
        if not Network.can_create(g.user):
            errors = ['Permission denied']
            return CreateNetwork(network=None, ok=False, errors=errors)

        ok, errors = CreateNetwork.validate(args)
        if ok:
            network = Network(name=args.get('name'),
                              subnet=args.get('subnet'),
                              reserved_net=trim_to_none(args.get('reserved_net', None)),
                              static_net=trim_to_none(args.get('static_net', None)))

            db.session.add(network)
            try:
                db.session.commit()
                db.session.refresh(network)
            except IntegrityError as e:
                db.session.rollback()
                return CreateNetwork(network=network, ok=False,
                                     errors=['A network with that name or an overlapping subnet already exists'])

            return CreateNetwork(network=network, ok=True, errors=errors)
        else:
            return CreateNetwork(network=None, ok=False, errors=errors)


class ChangeNetwork(graphene.Mutation):
    class Input:
        id = graphene.Int()
        name = graphene.String()
        subnet = graphene.String()
        reserved_net = graphene.String()
        static_net = graphene.String()

    ok = graphene.Boolean()
    errors = graphene.List(graphene.String)
    network = graphene.Field(NetworkType)

    @staticmethod
    def validate(args, network):
        errors = []

        if not validators.length(args.get('name'), min=2, max=256):
            errors.append('Network name must be between 2 and 256 characters long')

        ok, subnet, message = validate_network(args.get('subnet'), ip_version=4)
        if not ok:
            errors.append('Subnet: %s' % message)
        elif Network.subnet_conflicts(args.get('subnet'), exclude_network=network):
            errors.append('Subnet %s conflicts with other subnets on other networks' % args.get('subnet'))

        ok, reserved_net, message = validate_network(args.get('reserved_net'),
                                                     ip_version=4, allow_empty=True)
        if not ok:
            errors.append('Reserved subnet: %s' % message)
        elif subnet and reserved_net and not IPSet(reserved_net).issubset(subnet):
            errors.append('Reserved subnet is not contained within subnet')

        ok, static_net, message = validate_network(args.get('static_net'),
                                                   ip_version=4, allow_empty=True)
        if not ok:
            errors.append('Static subnet: %s' % message)
        elif subnet and static_net and not IPSet(static_net).issubset(subnet):
            errors.append('Static subnet is not contained within subnet')

        if static_net and reserved_net and len(IPSet(static_net) & IPSet(reserved_net)) != 0:
            errors.append('Static and reserved subnets overlap')

        return (len(errors) == 0, errors)

    @staticmethod
    def mutate(root, args, context, info):
        errors = []
        network = Network.query.get(args.get('id'))
        if not network or not network.check_permission(g.user, 'admin'):
            errors = ['Permission denied']
            return ChangeNetwork(network=None, ok=False, errors=errors)

        ok, errors = ChangeNetwork.validate(args, network)
        if ok:
            if 'name' in args:
                network.name = args.get('name')
            if 'subnet' in args:
                network.subnet = args.get('subnet')
            if 'reserved_net' in args:
                network.reserved_net = trim_to_none(args.get('reserved_net'))
            if 'static_net' in args:
                network.static_net = trim_to_none(args.get('static_net'))

            try:
                db.session.commit()
                db.session.refresh(network)
            except IntegrityError as e:
                db.session.rollback()
                return ChangeNetwork(network=network, ok=False,
                                     errors=['Another network with that name or an overlapping subnet already exists'])

            return ChangeNetwork(network=network, ok=True, errors=errors)
        else:
            return ChangeNetwork(network=None, ok=False, errors=errors)


class DeleteNetwork(graphene.Mutation):
    class Input:
        id = graphene.Int()

    ok = graphene.Boolean()
    errors = graphene.List(graphene.String)
    network = graphene.Field(NetworkType)

    @staticmethod
    def validate(args):
        errors = []

        return (len(errors) == 0, errors)

    @staticmethod
    def mutate(root, args, context, info):
        errors = []
        network = Network.query.get(args.get('id'))
        if not network or not network.check_permission(g.user, 'admin'):
            errors = ["Permission denied"]
            return DeleteNetwork(network=None, ok=False, errors=errors)

        ok, errors = DeleteNetwork.validate(args)
        if ok:
            db.session.delete(network)
            db.session.commit()

            return DeleteNetwork(network=network, ok=True, errors=errors)
        else:
            return DeleteNetwork(network=network, ok=False, errors=errors)


class CreateOwnToken(graphene.Mutation):
    class Input:
        desc = graphene.String()

    ok = graphene.Boolean()
    errors = graphene.List(graphene.String)
    token = graphene.Field(TokenType)

    @staticmethod
    def validate(args):
        errors = []

        if not validators.length(args.get('desc', ''), min=0, max=140):
            errors.append('description must be between 0 and 140 characters long')

        return (len(errors) == 0, errors)

    @staticmethod
    def mutate(root, args, context, info):
        errors = []
        if not Token.can_create(g.user):
            errors = ['Permission denied']
            return CreateOwnToken(token=None, ok=False, errors=errors)

        ok, errors = CreateOwnToken.validate(args)
        if ok:
            token = Token(user_id=g.user.id, token=None, desc=args.get('desc', None))

            db.session.add(token)
            try:
                db.session.commit()
                db.session.refresh(token)
            except IntegrityError as e:
                db.session.rollback()
                return CreateOwnToken(token=None, ok=False, errors=['Token conflict'])

            return CreateOwnToken(token=token, ok=True, errors=errors)
        else:
            return CreateOwnToken(token=None, ok=False, errors=errors)


class DeleteOwnToken(graphene.Mutation):
    class Input:
        id = graphene.Int()

    ok = graphene.Boolean()
    errors = graphene.List(graphene.String)

    @staticmethod
    def validate(args):
        errors = []

        return (len(errors) == 0, errors)

    @staticmethod
    def mutate(root, args, context, info):
        errors = []
        token = Token.query.get(args.get('id'))
        if not token or not token.check_permission(g.user, 'owner'):
            errors = ["Permission denied"]
            return DeleteOwnToken(ok=False, errors=errors)

        ok, errors = DeleteOwnToken.validate(args)
        if ok:
            db.session.delete(token)
            db.session.commit()

            return DeleteOwnToken(ok=True, errors=errors)
        else:
            return DeleteOwnToken(ok=False, errors=errors)


class ChangeOwnPassword(graphene.Mutation):
    class Input:
        password = graphene.String()

    ok = graphene.Boolean()
    errors = graphene.List(graphene.String)

    @staticmethod
    def validate(args):
        errors = []

        if not validators.length(args.get('password'), min=6, max=128):
            errors.append('password must be between 6 and 128 characters long')

        return (len(errors) == 0, errors)

    @staticmethod
    def mutate(root, args, context, info):
        errors = []

        ok, errors = ChangeOwnPassword.validate(args)
        if ok:
            g.user.password = pbkdf2_sha256.hash(args.get('password'))

            db.session.commit()

            return ChangeOwnPassword(ok=True, errors=errors)
        else:
            return ChangeOwnPassword(ok=False, errors=errors)


class ChangeOwnSSHKey(graphene.Mutation):
    class Input:
        ssh_key = graphene.String()

    ok = graphene.Boolean()
    errors = graphene.List(graphene.String)

    @staticmethod
    def validate(args):
        errors = []

        if not validators.length(args.get('ssh_key', ''), min=0, max=512 * 1024):
            errors.append('ssh_key must be smaller than 512kB')

        return (len(errors) == 0, errors)

    @staticmethod
    def mutate(root, args, context, info):
        errors = []

        ok, errors = ChangeOwnSSHKey.validate(args)
        if ok:
            g.user.ssh_key = args.get('ssh_key')

            db.session.commit()

            return ChangeOwnSSHKey(ok=True, errors=errors)
        else:
            return ChangeOwnSSHKey(ok=False, errors=errors)


class Query(graphene.ObjectType):
    own_user = graphene.Field(UserType)

    users = graphene.List(UserType)
    user = graphene.Field(UserType, id=graphene.Int())

    machines = graphene.List(MachineType, description='List of machines')
    machine = graphene.Field(MachineType, id=graphene.Int())

    bmcs = graphene.List(BMCType)
    bmc = graphene.Field(BMCType, id=graphene.Int())

    images = graphene.List(ImageType)
    image = graphene.Field(ImageType, id=graphene.Int())

    preseeds = graphene.List(PreseedType)
    preseed = graphene.Field(PreseedType, id=graphene.Int())

    tokens = graphene.List(TokenType)

    console_token = graphene.Field(ConsoleTokenType, machine_id=graphene.Int())

    discovered_macs = graphene.List(DiscoveredMACType)

    networks = graphene.List(NetworkType)
    network = graphene.Field(NetworkType, id=graphene.Int())

    available_ips = graphene.Field(AvailableIPsType, network_id=graphene.Int(), limit=graphene.Int())

    def resolve_own_user(self, args, context, info):
        return g.user

    def resolve_users(self, args, context, info):
        return User.query.all()

    def resolve_user(self, args, context, info):
        return User.query.get(args['id'])

    def resolve_machines(self, args, context, info):
        return Machine.query.all()

    def resolve_machine(self, args, context, info):
        return Machine.query.get(args['id'])

    def resolve_bmcs(self, args, context, info):
        return BMC.query.all()

    def resolve_bmc(self, args, context, info):
        return BMC.query.get(args['id'])

    def resolve_images(self, args, context, info):
        return Image.all_visible(g.user)

    def resolve_image(self, args, context, info):
        image = Image.query.get(args['id'])
        if not image.check_permission(g.user, 'user'):
            # XXX: abort 403?
            return None
        return image

    def resolve_preseeds(self, args, context, info):
        return Preseed.all_visible(g.user)

    def resolve_preseed(self, args, context, info):
        preseed = Preseed.query.get(args['id'])
        if not preseed.check_permission(g.user, 'user'):
            # XXX: abort 403?
            return None
        return preseed

    def resolve_networks(self, args, context, info):
        return Network.query.all()

    def resolve_network(self, args, context, info):
        return Network.query.get(args['id'])

    def resolve_discovered_macs(self, args, context, info):
        if not DiscoveredMAC.can_list(g.user):
            # XXX: abort 403?
            return []
        return DiscoveredMAC.query.all()

    def resolve_tokens(self, args, context, info):
        return Token.by_user(g.user)

    def resolve_console_token(self, args, context, info):
        machine = Machine.query.get(args['machine_id'])
        if not machine.check_permission(g.user, 'assignee'):
            # XXX: abort 403?
            return None

        return ConsoleToken.create_token_for_machine(machine)

    def resolve_available_ips(self, args, context, info):
        limit = max(1, min(args.get('limit', 25), 100))

        network = Network.query.get(args['network_id'])
        if not network:
            return None

        static_ips, reserved_ips = network.available_ipv4s(limit)

        return AvailableIPsType(static_ips=static_ips, reserved_ips=reserved_ips)


class CreateUser(graphene.Mutation):
    class Input:
        username = graphene.String()
        email = graphene.String()
        admin = graphene.Boolean()

    ok = graphene.Boolean()
    errors = graphene.List(graphene.String)
    user = graphene.Field(UserType)
    password = graphene.String()

    @staticmethod
    def validate(args):
        errors = []

        if not validators.length(args.get('username'), min=2, max=128):
            errors.append('username must be between 2 and 128 characters long')

        if not validators.email(args.get('email')):
            errors.append('email must be a valid email address')
        elif not validators.length(args.get('email'), min=2, max=1024):
            errors.append('email must be between 2 and 1024 characters long')

        return (len(errors) == 0, errors)

    @staticmethod
    def mutate(root, args, context, info):
        errors = []
        if not User.can_create(g.user):
            errors = ['Permission denied']
            return CreateUser(user=None, password=None, ok=False, errors=errors)

        ok, errors = CreateUser.validate(args)
        if ok:
            password = b64encode(os.urandom(8)).decode('utf-8')
            user = User(username=args.get('username'),
                        email=args.get('email'),
                        password=pbkdf2_sha256.hash(password),
                        ldap=False,
                        ssh_key='',
                        admin=args.get('admin', False))

            db.session.add(user)
            try:
                db.session.commit()
                db.session.refresh(user)
            except IntegrityError as e:
                db.session.rollback()
                return CreateUser(user=None, password=None, ok=False,
                                  errors=['A User with that username or email already exists'])

            return CreateUser(user=user, password=password, ok=True, errors=errors)
        else:
            return CreateUser(user=None, password=None, ok=False, errors=errors)


class ChangeUserInfo(graphene.Mutation):
    class Input:
        id = graphene.Int()
        username = graphene.String()
        email = graphene.String()

    ok = graphene.Boolean()
    errors = graphene.List(graphene.String)
    user = graphene.Field(UserType)

    @staticmethod
    def validate(args):
        errors = []

        if not validators.length(args.get('username'), min=2, max=128):
            errors.append('username must be between 2 and 128 characters long')

        if not validators.email(args.get('email')):
            errors.append('email must be a valid email address')
        elif not validators.length(args.get('email'), min=2, max=1024):
            errors.append('email must be between 2 and 1024 characters long')

        return (len(errors) == 0, errors)

    @staticmethod
    def mutate(root, args, context, info):
        errors = []
        user = User.query.get(args.get('id'))
        if not user or not user.check_permission(g.user, 'admin'):
            errors = ["Permission denied"]
            return ChangeUserInfo(user=None, ok=False, errors=errors)

        ok, errors = ChangeUserInfo.validate(args)
        if ok:
            if 'username' in args:
                user.username = args.get('username')
            if 'email' in args:
                user.email = args.get('email')

            try:
                db.session.commit()
                db.session.refresh(user)
            except IntegrityError as e:
                db.session.rollback()
                return ChangeUserInfo(user=None, ok=False, errors=['A User with that username or email already exists'])

            return ChangeUserInfo(user=user, ok=True, errors=errors)
        else:
            return ChangeUserInfo(user=None, ok=False, errors=errors)


class ChangeUserAdmin(graphene.Mutation):
    class Input:
        id = graphene.Int()
        admin = graphene.Boolean()

    ok = graphene.Boolean()
    errors = graphene.List(graphene.String)
    user = graphene.Field(UserType)

    @staticmethod
    def validate(args):
        errors = []

        return (len(errors) == 0, errors)

    @staticmethod
    def mutate(root, args, context, info):
        errors = []
        user = User.query.get(args.get('id'))
        if not user or not user.check_permission(g.user, 'admin'):
            errors = ["Permission denied"]
            return ChangeUserAdmin(user=None, ok=False, errors=errors)

        ok, errors = ChangeUserAdmin.validate(args)
        if ok:
            user.admin = args.get('admin')

            db.session.commit()
            db.session.refresh(user)

            return ChangeUserAdmin(user=user, ok=True, errors=errors)
        else:
            return ChangeUserAdmin(user=None, ok=False, errors=errors)


class ChangeUserPassword(graphene.Mutation):
    class Input:
        id = graphene.Int()
        password = graphene.String()

    ok = graphene.Boolean()
    errors = graphene.List(graphene.String)
    user = graphene.Field(UserType)

    @staticmethod
    def validate(args):
        errors = []

        if not validators.length(args.get('password'), min=6, max=128):
            errors.append('password must be between 6 and 128 characters long')

        return (len(errors) == 0, errors)

    @staticmethod
    def mutate(root, args, context, info):
        errors = []
        user = User.query.get(args.get('id'))
        if not user or not user.check_permission(g.user, 'admin'):
            errors = ["Permission denied"]
            return ChangeUserPassword(user=None, ok=False, errors=errors)

        ok, errors = ChangeUserPassword.validate(args)
        if ok:
            user.password = pbkdf2_sha256.hash(args.get('password'))

            db.session.commit()

            return ChangeUserPassword(user=user, ok=True, errors=errors)
        else:
            return ChangeUserPassword(user=None, ok=False, errors=errors)


class DeleteUser(graphene.Mutation):
    class Input:
        id = graphene.Int()

    ok = graphene.Boolean()
    errors = graphene.List(graphene.String)
    user = graphene.Field(UserType)

    @staticmethod
    def validate(args):
        errors = []

        return (len(errors) == 0, errors)

    @staticmethod
    def mutate(root, args, context, info):
        errors = []
        user = User.query.get(args.get('id'))
        if not user or not user.check_permission(g.user, 'admin'):
            errors = ["Permission denied"]
            return DeleteUser(user=None, ok=False, errors=errors)

        ok, errors = DeleteUser.validate(args)
        if ok:
            db.session.delete(user)
            db.session.commit()

            return DeleteUser(user=user, ok=True, errors=errors)
        else:
            return DeleteUser(user=user, ok=False, errors=errors)


class Mutation(graphene.ObjectType):
    create_machine = CreateMachine.Field()
    delete_machine = DeleteMachine.Field()
    change_machine_netboot = ChangeMachineNetboot.Field()
    change_machine_overview = ChangeMachineOverview.Field()
    change_machine_provisioning = ChangeMachineProvisioning.Field()
    add_machine_interface = AddMachineInterface.Field()
    change_machine_interface = ChangeMachineInterface.Field()
    delete_machine_interface = DeleteMachineInterface.Field()
    add_machine_assignee = AddMachineAssignee.Field()
    change_machine_assignee = ChangeMachineAssignee.Field()
    delete_machine_assignee = DeleteMachineAssignee.Field()
    machine_reset_console = MachineResetConsole.Field()
    machine_change_power = MachineChangePower.Field()

    create_bmc = CreateBMC.Field()
    change_bmc = ChangeBMC.Field()
    delete_bmc = DeleteBMC.Field()

    create_preseed = CreatePreseed.Field()
    change_preseed_meta = ChangePreseedMeta.Field()
    change_preseed_flags = ChangePreseedFlags.Field()
    change_preseed_contents = ChangePreseedContents.Field()
    delete_preseed = DeletePreseed.Field()

    create_image = CreateImage.Field()
    change_image_meta = ChangeImageMeta.Field()
    change_image_flags = ChangeImageFlags.Field()
    delete_image = DeleteImage.Field()

    create_own_token = CreateOwnToken.Field()
    delete_own_token = DeleteOwnToken.Field()

    change_own_password = ChangeOwnPassword.Field()
    change_own_ssh_key = ChangeOwnSSHKey.Field()

    create_user = CreateUser.Field()
    change_user_info = ChangeUserInfo.Field()
    change_user_admin = ChangeUserAdmin.Field()
    change_user_password = ChangeUserPassword.Field()
    delete_user = DeleteUser.Field()

    create_network = CreateNetwork.Field()
    change_network = ChangeNetwork.Field()
    delete_network = DeleteNetwork.Field()


class ExceptionHandlerMiddleware(object):
    def on_error(self, error):
        print('ExceptionHandlerMiddleware.on_error', error)

        if isinstance(error, IntegrityError):
            db.session.rollback()

        # Re-raise error
        raise

    def resolve(self, next, root, args, context, info):
        try:
            return next(root, args, context, info).catch(self.on_error)
        except Exception as e:
            self.on_error(e)


view_func = GraphQLView.as_view('graphql',
                                schema=graphene.Schema(query=Query, mutation=Mutation),
                                middleware=[ExceptionHandlerMiddleware()])


mod.add_url_rule('/graphql', view_func=view_func)


_ui_basedir = os.path.abspath(os.path.join(os.path.dirname(__file__), 'ui/public'))


@mod.route('/ui/assets/<path:filename>')
def ui_assets(filename):
    global _ui_basedir
    return send_from_directory(_ui_basedir, filename, add_etags=True)


@mod.route('/favicon.ico')
def favicon():
    return send_from_directory(mod.static_folder, 'favicons/favicon.ico', add_etags=True)


@mod.errorhandler(DatabaseError)
def handle_db_error(error):
    db.session.rollback()
    raise
