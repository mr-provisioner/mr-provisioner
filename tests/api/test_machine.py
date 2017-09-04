import json


def test_empty_machine_list(client, valid_headers_nonadmin):
    r = client.get('/api/v1/machine', headers=valid_headers_nonadmin)
    assert r.status_code == 200

    data = json.loads(r.data)
    assert data == []
