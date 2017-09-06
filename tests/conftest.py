import os
import pytest
import sqlalchemy
import tempfile
import shutil
from mr_provisioner import create_app
from mr_provisioner import db as db_


@pytest.fixture(scope='session')
def app(request):
    test_config_path = os.environ['TEST_CONFIG']
    app = create_app(test_config_path)

    ctx = app.app_context()
    ctx.push()

    def teardown():
        ctx.pop()

    request.addfinalizer(teardown)
    return app


@pytest.fixture(scope='function', autouse=True)
def tftp_root(app):
    path = tempfile.mkdtemp()
    orig_path = app.config['TFTP_ROOT']

    app.config.update(TFTP_ROOT=path)

    yield

    app.config.update(TFTP_ROOT=orig_path)

    shutil.rmtree(path)


@pytest.yield_fixture(scope='function')
def db(app):
    connection = db_.engine.connect()
    transaction = connection.begin()

    options = dict(bind=connection, binds={})
    session = db_.create_scoped_session(options=options)

    session.begin_nested()

    @sqlalchemy.event.listens_for(session(), 'after_transaction_end')
    def restart_savepoint(sess, trans):
        if trans.nested and not trans._parent.nested:
            session.expire_all()
            session.begin_nested()

    db_.session = session

    yield db_

    session.remove()
    transaction.rollback()
    connection.close()


@pytest.yield_fixture(scope='function')
def client(app, db):
    with app.test_client() as client:
        yield client
