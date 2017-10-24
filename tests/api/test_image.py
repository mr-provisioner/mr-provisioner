import json
import io
from mr_provisioner.models import Image

def test_image_empty_list(client, valid_headers_nonadmin):
    r = client.get('/api/v1/image?show_all=true', headers=valid_headers_nonadmin)

    assert r.status_code == 200

    data = json.loads(r.data.decode('utf-8'))

    assert data == []


def test_image_list(client, valid_headers_nonadmin, valid_image_kernel, valid_image_initrd):
    r = client.get('/api/v1/image?show_all=true', headers=valid_headers_nonadmin)

    assert r.status_code == 200

    data = json.loads(r.data.decode('utf-8'))

    assert len(data) == 2
    if data[0]['type'] == 'Kernel':
        assert data[0]['name'] == valid_image_kernel.filename
        assert data[0]['description'] == valid_image_kernel.description
    else:
        assert data[0]['name'] == valid_image_initrd.filename
        assert data[0]['description'] == valid_image_initrd.description


def test_create_image(client, valid_headers_nonadmin, user_nonadmin):
    q = json.dumps({
        'description': 'Uploaded image',
        'type': 'Kernel',
        'public': True,
        'known_good': True
        })

    data = {'q': q, 'file': (io.BytesIO('hello there'.encode(encoding='utf-8')), 'hello.txt')}

    r = client.post('/api/v1/image', headers=valid_headers_nonadmin, data=data)

    assert r.status_code == 201

    data = json.loads(r.data.decode('utf-8'))

    assert data['description'] == 'Uploaded image'
    assert len(data['name']) != 0
    assert data['user'] == user_nonadmin.username

def test_get_image(client, valid_headers_nonadmin, valid_image_initrd):
    r = client.get('/api/v1/image/%d' % valid_image_initrd.id, headers=valid_headers_nonadmin)

    assert r.status_code == 200

    data = json.loads(r.data.decode('utf-8'))

    assert data['description'] == valid_image_initrd.description
    assert data['name'] == valid_image_initrd.filename
    assert data['type'] == valid_image_initrd.file_type
    assert data['known_good'] == valid_image_initrd.known_good
    assert data['public'] == valid_image_initrd.public

def test_modify_image(client, valid_headers_admin, valid_image_kernel):
    body = json.dumps({
        'public': False
        })
    r = client.put('/api/v1/image/%d' % valid_image_kernel.id, headers=valid_headers_admin,
                    data=body)

    assert r.status_code == 200

    data = json.loads(r.data.decode('utf-8'))

    assert data['public'] == False


def test_delete_image(client, valid_headers_admin, valid_image_kernel):
    r = client.delete('/api/v1/image/%d' % valid_image_kernel.id, headers=valid_headers_admin)

    assert r.status_code == 204

    assert len(Image.all()) == 0
