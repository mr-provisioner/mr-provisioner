from flask import Blueprint, abort, request, jsonify

import logging
import re
import ipaddress
from datetime import datetime

from mr_provisioner import db
from mr_provisioner.models import Interface, Machine, Lease, DiscoveredMAC, MachineEvent
from mr_provisioner.util import MAC_REGEX, DHCP_ARCH_CODES, mac_vendor
from sqlalchemy.exc import DatabaseError

from flask import current_app as app

from schema import Schema, And, Or, Use, SchemaError
from functools import reduce


mod = Blueprint('dhcp', __name__, template_folder='templates')
logger = logging.getLogger('dhcp')

lease_schema = Schema({
    'mac': And(str, lambda s: re.match(MAC_REGEX, s) is not None),
    'ipv4': Use(ipaddress.IPv4Address),
    'duration': And(int, lambda i: i >= 0)
})

seen_schema = Schema({
    'discover': bool,
    'mac': And(str, lambda s: re.match(MAC_REGEX, s) is not None),
    'options': [{
        'option': And(int, lambda i: i >= 0),
        'value': Or(int, str)
    }]
})

subnet_schema = Schema({
    'mac': And(str, lambda s: re.match(MAC_REGEX, s) is not None),
    'subnets': [{
        'subnetId': int,
        'prefix': Use(ipaddress.IPv4Address),
        'prefixLen': And(int, lambda i: i >= 0 and i <= 32),
        'pools': [{
            'poolId': int,
            'capacity': int,
            'firstIP': Use(ipaddress.IPv4Address),
            'lastIP': Use(ipaddress.IPv4Address),
        }]
    }]
})


@mod.route('/ipv4', methods=['GET'])
def index():
    hwaddr = request.args.get('hwaddr')
    if not hwaddr:
        abort(400)

    machine = Machine.by_mac(hwaddr)
    if not machine:
        abort(404)

    interface = Interface.by_mac(hwaddr)
    if not interface:
        abort(404)

    # query param ?hwaddr=
    # response:
    # {
    #   "ipv4": "",
    #   "next-server": "",
    #   "options": [
    #     { "option": number, "value": "" }
    #   ]
    # }
    # option 67 is bootfile
    data = {
        'options': []
    }

    if machine.netboot_enabled:
        bootloader_image = machine.bootloader
        bootfile = bootloader_image.filename if bootloader_image else app.config['DHCP_DEFAULT_BOOTFILE']

        data['next-server'] = app.config['DHCP_TFTP_PROXY_HOST']
        data['options'].append({'option': 67, 'value': bootfile})

    use_static = True if interface.static_ipv4 else False

    if interface.reserved_ipv4 and not use_static:
        data['ipv4'] = interface.reserved_ipv4

    return jsonify(data), 200


@mod.route('/ipv4/lease', methods=['POST'])
def lease():
    data = request.get_json(force=True)
    try:
        lease_schema.validate(data)
    except SchemaError as e:
        return str(e), 400

    lease = Lease.by_mac(data['mac'])
    if lease:
        lease.ipv4 = data['ipv4']
        lease.last_seen = datetime.utcnow()
        db.session.commit()
    else:
        lease = Lease(mac=data['mac'], ipv4=data['ipv4'])
        db.session.add(lease)
        db.session.commit()

    return "", 201


@mod.route('/ipv4/seen', methods=['POST'])
def seen():
    data = request.get_json(force=True)
    try:
        seen_schema.validate(data)
    except SchemaError as e:
        return str(e), 400

    interface = Interface.by_mac(data['mac'])
    if interface:
        # Already assigned, don't care - but log an event
        MachineEvent.dhcp_request(interface.machine.id, None, discover=data['discover'])
        return "", 200

    options = {o['option']: o['value'] for o in data['options']}

    info = {}

    info['mac_vendor'] = mac_vendor(data['mac'])

    if 12 in options:
        # hostname option
        info['hostname'] = options[12]

    if 93 in options:
        # processor architecture as per rfc4578
        code = options[93]
        info['arch_code'] = code
        info['arch'] = DHCP_ARCH_CODES.get(code, 'unknown')

    discovered_mac = DiscoveredMAC.by_mac(data['mac'])
    if discovered_mac:
        discovered_mac.info = info
        discovered_mac.last_seen = datetime.utcnow()
        db.session.commit()
    else:
        discovered_mac = DiscoveredMAC(mac=data['mac'], info=info)
        db.session.add(discovered_mac)
        db.session.commit()

    return "", 202


@mod.route('/ipv4/subnet', methods=['POST'])
def subnet():
    data = request.get_json(force=True)
    try:
        data = subnet_schema.validate(data)
    except SchemaError as e:
        return str(e), 400

    hwaddr = data['mac']
    if not hwaddr:
        abort(400)

    interface = Interface.by_mac(hwaddr)
    if not interface:
        abort(404)

    if not interface.network:
        abort(404)

    use_static = True if interface.static_ipv4 else False
    use_reserved = True if not use_static and interface.reserved_ipv4 else False

    expected_pool = None
    if use_reserved:
        expected_pool = ipaddress.IPv4Network(interface.network.reserved_net)

    logger.info('expected_pool: %s' % expected_pool)

    if expected_pool is None:
        return jsonify({'subnetId': None}), 200

    response = {}

    for subnet in data['subnets']:
        net = ipaddress.IPv4Network((subnet['prefix'], subnet['prefixLen']), strict=False)
        if not net.overlaps(ipaddress.IPv4Network(interface.network.subnet)):
            continue

        pool_matches = reduce(lambda r, p: r or p['firstIP'] in expected_pool, subnet['pools'], False)
        if pool_matches:
            response['subnetId'] = subnet['subnetId']
            logger.info('matched subnet: %s' % subnet)
            break

    return jsonify(response), 200


@mod.errorhandler(DatabaseError)
def handle_db_error(error):
    db.session.rollback()
    raise
