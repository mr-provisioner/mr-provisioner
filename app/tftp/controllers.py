from flask import Blueprint, Flask, abort, request, send_from_directory, safe_join, Response

import logging
import re
import os

from app.models import Machine

from flask import current_app as app

MAC_FILE_REGEX="/01-([\da-fA-F]{2}-[\da-fA-F]{2}-[\da-fA-F]{2}-[\da-fA-F]{2}-[\da-fA-F]{2}-[\da-fA-F]{2})"
DEFAULT_FILE_REGEXES=["/pxelinux.cfg/default", "/efidefault"]

mod = Blueprint('tftp', __name__, template_folder='templates')
logger = logging.getLogger('tftp')

def clean_filename(filename):
    return filename.replace("..", "")

def is_pxelinux_path(filename):
    return (filename.find("pxelinux.cfg") >= 0)

def render_config(is_pxelinux, machine):
    if (machine and machine.netboot_enabled):
        template_file = "pxelinux.netboot.tmpl" if is_pxelinux else "grub.netboot.tmpl"
    else:
        template_file = "pxelinux.local.tmpl" if is_pxelinux else "grub.local.tmpl"

    template = app.config['TFTP_JINJA_ENV'].get_template(template_file)
    return template.render(machine=machine)

def handle_config_request(client_ip, filename):
    m = re.search(MAC_FILE_REGEX, filename)
    machine = Machine.by_mac(m.group(1).replace('-', ':').lower()) if m else None

    use_def_config = any(re.search(regex, filename) for regex in DEFAULT_FILE_REGEXES)

    if machine or use_def_config:
        return render_config(is_pxelinux_path(filename), machine)
    else:
        return None


@mod.route('/', methods=['GET'])
def get_file_tftp():
    try:
        client_ip = request.headers['X-TFTP-IP']
        filename = request.headers['X-TFTP-File'].lstrip('/')
    except KeyError:
        abort(400)

    filename = clean_filename(filename)
    logger.info("TFTP Request received for filename %s, from ip  %s" % (filename, client_ip))

    path = safe_join(app.config['TFTP_ROOT'], filename)
    logger.info("path being looked at: %s" % path)
    if os.path.isfile(path):
        logger.info("Requested file %s exists, serving" % path)
        return send_from_directory(app.config['TFTP_ROOT'], filename), 200

    config = handle_config_request(client_ip, filename)

    if config:
        return config, 200

    return "",404
