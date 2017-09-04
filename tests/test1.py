import pytest
import json
from mr_provisioner.models import User, Token
from werkzeug.datastructures import Headers


@pytest.fixture(scope='function')
def user(db):
    user = User('apitest', 'api@example.com', False, '', 'apitest', False)
    db.session.add(user)
    db.session.commit()
    db.session.refresh(user)

    return user

@pytest.fixture(scope='function')
def token(db, user):
    token = Token(user.id, None, 'api test token')
    db.session.add(token)
    db.session.commit()
    db.session.refresh(token)

    return token.token

@pytest.fixture(scope='function')
def valid_auth_headers(token):
    d = Headers()
    d.add('Authorization', 'Bearer %s' % token)
    return d


def test_with_invalid_token(client):
    h = Headers()
    h.add('Authorization', 'Bearer INVALID')
    r = client.get('/api/v1/machine', headers=h)
    assert r.status_code == 401


def test_with_valid_token(client, valid_auth_headers):
    r = client.get('/api/v1/machine', headers=valid_auth_headers)
    assert r.status_code == 200


def test_empty_machine_list(client, valid_auth_headers):
    r = client.get('/api/v1/machine', headers=valid_auth_headers)
    assert r.status_code == 200

    data = json.loads(r.data)
    assert data == []
