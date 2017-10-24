import pytest
from mr_provisioner.models import User, Token, BMC, Machine, MachineUsers, Interface, Network, Image, Preseed
from werkzeug.datastructures import Headers


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
def token_nonadmin(db, user_nonadmin):
    token = Token(user_nonadmin.id, None, 'api test token')
    db.session.add(token)
    db.session.commit()
    db.session.refresh(token)

    return token.token


@pytest.fixture(scope='function')
def token_admin(db, user_admin):
    token = Token(user_admin.id, None, 'api test token')
    db.session.add(token)
    db.session.commit()
    db.session.refresh(token)

    return token.token


@pytest.fixture(scope='function')
def valid_headers_admin(token_admin):
    d = Headers()
    d.add('Authorization', 'Bearer %s' % token_admin)
    return d


@pytest.fixture(scope='function')
def valid_headers_nonadmin(token_nonadmin):
    d = Headers()
    d.add('Authorization', 'Bearer %s' % token_nonadmin)
    return d


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
