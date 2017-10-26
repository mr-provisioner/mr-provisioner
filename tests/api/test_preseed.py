import json
from mr_provisioner.models import Preseed


def test_preseed_empty_list(client, valid_headers_nonadmin):
    r = client.get('/api/v1/preseed?show_all=true', headers=valid_headers_nonadmin)

    assert r.status_code == 200

    data = json.loads(r.data.decode('utf-8'))

    assert data == []


def test_preseed_list(client, valid_headers_nonadmin, valid_image_kernel,
                      valid_preseed):
    r = client.get('/api/v1/preseed?show_all=true', headers=valid_headers_nonadmin)

    assert r.status_code == 200

    data = json.loads(r.data.decode('utf-8'))[0]

    assert data['user'] == 'apitest-admin'
    assert data['description'] == 'johnnys seed'
    assert data['content'] == ''
    assert data['public'] is True
    assert data['known_good'] is False
    assert data['name'] == 'someseed'
    assert data['type'] == 'preseed'


def test_create_preseed(client, valid_headers_nonadmin, user_nonadmin):
    data = json.dumps({
        "name": "test preseed",
        "description": "preseed description",
        "type": "preseed",
        "content": """\
# Localization
d-i debian-installer/locale string en_US
d-i keyboard-configuration/xkb-keymap select us
""",
        "known_good": True,
        "public": True
    })

    r = client.post('/api/v1/preseed', headers=valid_headers_nonadmin, data=data)

    assert r.status_code == 201

    data = json.loads(r.data.decode('utf-8'))
    assert data['name'] == "test preseed"
    assert data['known_good'] is True
    assert data['public'] is True
    assert data['user'] == user_nonadmin.username


def test_get_preseed(client, valid_headers_nonadmin, valid_preseed):
    r = client.get('/api/v1/preseed/%d' % valid_preseed.id,
                   headers=valid_headers_nonadmin)

    assert r.status_code == 200

    data = json.loads(r.data.decode('utf-8'))
    assert data['user'] == 'apitest-admin'
    assert data['description'] == 'johnnys seed'
    assert data['content'] == ''
    assert data['public'] is True
    assert data['known_good'] is False
    assert data['name'] == 'someseed'
    assert data['type'] == 'preseed'


def test_modify_preseed(client, valid_headers_admin, valid_preseed):
    body = json.dumps({
        'public': False,
        'known_good': False
    })
    r = client.put('/api/v1/preseed/%d' % valid_preseed.id,
                   headers=valid_headers_admin, data=body)

    assert r.status_code == 200

    data = json.loads(r.data.decode('utf-8'))

    assert data['public'] is False
    assert data['known_good'] is False


def test_delete_preseed(client, valid_headers_admin, valid_preseed):
    r = client.delete('/api/v1/preseed/%d' % valid_preseed.id,
                      headers=valid_headers_admin)

    assert r.status_code == 204

    assert len(Preseed.all()) == 0
