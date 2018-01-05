import os
import pytest
import sqlalchemy
import tempfile
import shutil
from mr_provisioner import create_app
from mr_provisioner import db as db_
from mr_provisioner.models import User, BMC, Machine, MachineUsers, Interface, Network, Image, Preseed


@pytest.fixture(scope='session')
def app(request):
    test_config_path = os.environ.get('TEST_CONFIG', '')
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


@pytest.fixture(scope='function')
def user_nonadmin(db):
    user = User('apitest', 'api@example.com', False, '', 'apitest', False)
    db.session.add(user)
    db.session.commit()
    db.session.refresh(user)

    return user

# XXX: Figure out if I need a second user for anything, if not, delete this fixture
@pytest.fixture(scope='function')
def user_nonadmin2(db):
    user = User('apitest2', 'api2@example.com', False, '', 'apitest', False)
    db.session.add(user)
    db.session.commit()
    db.session.refresh(user)

    return user


@pytest.fixture(scope='function')
def user_admin(db):
    user = User('apitest-admin', 'api-admin@example.com', False, '', 'apitest', True)
    db.session.add(user)
    db.session.commit()
    db.session.refresh(user)

    return user


@pytest.fixture(scope='function')
def valid_bmc_moonshot(db):
    bmc = BMC('10.0.0.99', 'bmc moonshot', 'admin', 'password', 'admin', 'moonshot')
    db.session.add(bmc)
    db.session.commit()
    db.session.refresh(bmc)

    return bmc


@pytest.fixture(scope='function')
def valid_bmc_plain(db):
    bmc = BMC('10.0.0.98', 'bmc plain', 'admin', 'password', 'admin', 'plain')
    db.session.add(bmc)
    db.session.commit()
    db.session.refresh(bmc)

    return bmc


@pytest.fixture(scope='function')
def valid_moonshot_machine(db, valid_bmc_moonshot):
    machine = Machine(name='c1n1', bmc_id=valid_bmc_moonshot.id, bmc_info='3')
    db.session.add(machine)
    db.session.commit()
    db.session.refresh(machine)

    return machine


@pytest.fixture(scope='function')
def valid_plain_machine(db, valid_bmc_plain):
    machine = Machine(name='plain01', bmc_id=valid_bmc_plain.id)
    db.session.add(machine)
    db.session.commit()
    db.session.refresh(machine)

    return machine


@pytest.fixture(scope='function')
def valid_assignment_nonadmin(db, valid_plain_machine, user_nonadmin):
    machineuser = MachineUsers(machine_id=valid_plain_machine.id,
                               user_id=user_nonadmin.id,
                               permissions=0,
                               reason="testing")
    db.session.add(machineuser)
    db.session.commit()
    db.session.refresh(machineuser)

    return machineuser

@pytest.fixture(scope='function')
def valid_network(db):
    network = Network(name='default',
                      subnet='10.0.0.0/20')
    db.session.add(network)
    db.session.commit()
    db.session.refresh(network)

    return network


@pytest.fixture(scope='function')
def valid_interface_1(db, valid_plain_machine, valid_network):
    interface = Interface(mac='00:11:22:33:44:55',
                          machine_id=valid_plain_machine.id,
                          network_id=valid_network.id)
    db.session.add(interface)
    db.session.commit()
    db.session.refresh(interface)

    return interface


@pytest.fixture(scope='function')
def valid_image_kernel(db, user_admin):
    image = Image(filename='%s/kernel' % user_admin.username, description='kernel',
                  file_type='Kernel', user_id=user_admin.id,
                  known_good=False, public=True)
    db.session.add(image)
    db.session.commit()
    db.session.refresh(image)

    return image


@pytest.fixture(scope='function')
def valid_preseed(db, user_admin):
    preseed = Preseed(filename="someseed", description="johnnys seed",
                      file_type="preseed", file_content="",
                      user_id=user_admin.id, known_good=False, public=True)
    db.session.add(preseed)
    db.session.commit()
    db.session.refresh(preseed)

    return preseed

@pytest.fixture(scope='function')
def valid_image_initrd(db, user_admin):
    image = Image(filename='%s/initrd' % user_admin.username, description='initrd',
                  file_type='Initrd', user_id=user_admin.id,
                  known_good=False, public=True)
    db.session.add(image)
    db.session.commit()
    db.session.refresh(image)

    return image


@pytest.fixture(scope='function')
def machines_for_reservation(db, valid_bmc_plain, valid_bmc_moonshot, user_nonadmin):
    machines = [
        Machine(name='machine0', bmc_id=valid_bmc_plain.id),
        Machine(name='machine1', bmc_id=valid_bmc_moonshot.id),
        Machine(name='machine2', bmc_id=None),
        Machine(name='machine3', bmc_id=None),
        Machine(name='machine4', bmc_id=valid_bmc_moonshot.id),
    ]

    db.session.add_all(machines)
    db.session.commit()
    for m in machines:
        db.session.refresh(m)

    m1u = MachineUsers(machine_id=machines[1].id,
                       user_id=user_nonadmin.id,
                       permissions=0,
                       reason="testing")

    m2u = MachineUsers(machine_id=machines[2].id,
                       user_id=user_nonadmin.id,
                       permissions=0,
                       reason="testing")

    db.session.add_all([m1u, m2u])
    db.session.commit()

    return machines
