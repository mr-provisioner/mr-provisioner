import pytest
from mr_provisioner.models import Token
from werkzeug.datastructures import Headers


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
