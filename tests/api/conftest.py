import pytest
from mr_provisioner.models import User, Token, BMC, Machine, MachineUsers
from werkzeug.datastructures import Headers


@pytest.fixture(scope='function')
def user_nonadmin(db):
    user = User('apitest', 'api@example.com', False, '', 'apitest', False)
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

