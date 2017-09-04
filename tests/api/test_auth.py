from werkzeug.datastructures import Headers


def test_with_invalid_token(client):
    h = Headers()
    h.add('Authorization', 'Bearer INVALID')
    r = client.get('/api/v1/machine', headers=h)
    assert r.status_code == 401


def test_with_valid_token(client, valid_headers_nonadmin):
    r = client.get('/api/v1/machine', headers=valid_headers_nonadmin)
    assert r.status_code == 200
