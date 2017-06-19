from flask import Blueprint, abort, request, jsonify

import logging
import re
import ipaddress
from datetime import datetime

from app import db
from app.models import Interface, Machine, Lease, DiscoveredMAC
from app.util import MAC_REGEX, DHCP_ARCH_CODES, mac_vendor

from flask import current_app as app

from schema import Schema, And, Or, Use, SchemaError


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
        data['next-server'] = app.config['DHCP_TFTP_PROXY_HOST']
        data['options'].append({'option': 67, 'value': app.config['DHCP_DEFAULT_BOOTFILE']})

    if interface.static_ipv4:
        data['ipv4'] = interface.static_ipv4

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
        # Already assigned, don't care.
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
