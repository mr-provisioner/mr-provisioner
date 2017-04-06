#!/usr/bin/env python
import os
import errno
import logging
import configparser
import sys

from jinja2 import Environment, FileSystemLoader

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

    wss_host = ''
    wss_port = 8866

    if 'wssubprocess' in config:
        wss_host = config['wssubprocess'].get('ext_host', '')
        wss_port = int(config['wssubprocess'].get('ext_port', 8866))

    tftp_templates_dir = os.path.join(_basedir, "templates")
    tftp_jinja_env = Environment(
       loader = FileSystemLoader(tftp_templates_dir)
    )

    # Config settings used by app itself
    app.config.update(
        TFTP_ROOT = config['files'].get('TFTPRoot'),
        TFTP_JINJA_ENV = tftp_jinja_env,
        WSS_EXT_HOST = wss_host,
        WSS_EXT_PORT = wss_port
    )

    # Config settings used by Flask
    app.config.update(
        SECRET_KEY = os.urandom(24),
        MAX_CONTENT_LENGTH = int(config['files'].get('MaxUploadSize', 1024*1024*1024))
    )

    # Config settings used by Flask SQLAlchemy
    app.config.update(
        SQLALCHEMY_DATABASE_URI = config['database']['uri'],
        SQLALCHEMY_TRACK_MODIFICATIONS = True
    )
