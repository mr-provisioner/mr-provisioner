#!/usr/bin/env python
import os
import logging
import configparser
import sys

from jinja2 import Environment, FileSystemLoader
from app.ipmi import set_ipmitool

_basedir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))


def apply_config(app, config_file):
    config = configparser.ConfigParser()
    config.read(config_file)

    # Set up logging
    log_format = '%(asctime)s %(name)-12s %(levelname)-8s %(message)s'
    log_datefmt = '%m-%d %H:%M:%S'
    log_level = logging.DEBUG
    log_file = 'stdout'

    try:
        log_level = logging.getLevelName(os.environ['APP_LOG_LEVEL'])
    except KeyError:
        if 'logging' in config:
            log_level = logging.getLevelName(config['logging'].get('level', logging.DEBUG))
            log_file = config['logging'].get('file', 'stdout')

    if log_file == 'stdout':
        logging.basicConfig(level=log_level,
                            format=log_format,
                            datefmt=log_datefmt,
                            stream=sys.stdout)
    elif log_file == 'stderr':
        logging.basicConfig(level=log_level,
                            format=log_format,
                            datefmt=log_datefmt,
                            stream=sys.stderr)
    else:
        logging.basicConfig(level=log_level,
                            format=log_format,
                            datefmt=log_datefmt,
                            filename=log_file)

    tftp_templates_dir = os.path.join(_basedir, "templates")
    tftp_jinja_env = Environment(loader=FileSystemLoader(tftp_templates_dir))

    try:
        set_ipmitool(config.get('tools', 'ipmitool'))
    except configparser.Error:
        pass

    # Config settings used by app itself
    app.config.update(
        TFTP_JINJA_ENV=tftp_jinja_env,
        TFTP_ROOT=config.get('files', 'TFTPRoot'),
        WSS_EXT_HOST=config.get('wssubprocess', 'ext_host', fallback=''),
        WSS_EXT_PORT=int(config.get('wssubprocess', 'ext_port', fallback=8866)),
        CONTROLLER_ACCESS_URI=config.get('controller', 'access_uri'),
        PRESEED_DNS=config.get('provisioning', 'preseed_dns', fallback='')
    )

    # Config settings used by Flask
    app.config.update(
        SECRET_KEY=os.urandom(24),
        MAX_CONTENT_LENGTH=int(config.get('files', 'MaxUploadSize', fallback=(1024 * 1024 * 1024)))
    )

    # Config settings used by Flask SQLAlchemy
    app.config.update(
        SQLALCHEMY_DATABASE_URI=config.get('database', 'uri'),
        SQLALCHEMY_TRACK_MODIFICATIONS=True
    )
