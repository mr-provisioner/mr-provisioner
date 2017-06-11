#!/usr/bin/env python

from flask import Flask, url_for, redirect
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from flask_script import Manager
from flask_migrate import Migrate, MigrateCommand

from app.config import apply_config

db = SQLAlchemy()


def create_app(config_path=None):
    app = Flask(__name__)

    apply_config(app, config_path)

    CORS(app)

    db.init_app(app)

    Migrate(app, db)

    from app.admin.controllers import mod as admin_module
    from app.preseed.controllers import mod as preseed_module
    from app.tftp.controllers import mod as tftp_module

    app.register_blueprint(admin_module, url_prefix='/admin')
    app.register_blueprint(preseed_module, url_prefix='/preseed')
    app.register_blueprint(tftp_module, url_prefix='/tftp')

    @app.route('/')
    def index():
        return redirect(url_for('admin.index'))

    return app


manager = Manager(create_app)
manager.add_option("-c", "--config", dest="config_path", required=True)
manager.add_command('db', MigrateCommand)


@manager.option("-h", "--host", dest="host", default="127.0.0.1")
@manager.option("-p", "--port", dest="port", type=int, default=5000)
def waitress(host, port):
    "Runs the app with waitress"

    from waitress import serve
    serve(manager.app, listen="%s:%d" % (host, port))


@manager.option("-h", "--host", dest="host", default="127.0.0.1")
@manager.option("-p", "--port", dest="port", type=int, default=5000)
def tornado(host, port):
    "Runs the app with tornado"

    from tornado.wsgi import WSGIContainer
    from tornado.httpserver import HTTPServer
    from tornado.ioloop import IOLoop

    http_server = HTTPServer(WSGIContainer(manager.app))
    http_server.listen(port, address=host)
    IOLoop.instance().start()


if __name__ == '__main__':
    manager.run()
