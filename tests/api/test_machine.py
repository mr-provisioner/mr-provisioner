import json


def test_empty_machine_list_no_machines(client, valid_headers_nonadmin):
    r = client.get('/api/v1/machine', headers=valid_headers_nonadmin)
    assert r.status_code == 200

    data = json.loads(r.data)
    assert data == []


def test_machine_list_nonadmin(client, valid_headers_nonadmin, valid_plain_machine, valid_moonshot_machine):
    r = client.get('/api/v1/machine?show_all=true', headers=valid_headers_nonadmin)
    assert r.status_code == 200

    data = json.loads(r.data)
    assert len(data) == 2


def test_machine_list_admin(client, valid_headers_nonadmin, valid_plain_machine, valid_moonshot_machine):
    r = client.get('/api/v1/machine?show_all=true', headers=valid_headers_nonadmin)
    assert r.status_code == 200

    data = json.loads(r.data)
    assert len(data) == 2


def test_get_existing_machine(client, valid_headers_nonadmin, valid_plain_machine):
    r = client.get('/api/v1/machine/%d' % valid_plain_machine.id, headers=valid_headers_nonadmin)
    assert r.status_code == 200

    data = json.loads(r.data)
    assert valid_plain_machine.name == data['name']
    assert valid_plain_machine.id == data['id']
    assert valid_plain_machine.hostname == data['hostname']


def test_get_non_existing_machine(client, valid_headers_nonadmin):
    r = client.get('/api/v1/machine/123', headers=valid_headers_nonadmin)
    assert r.status_code == 404


def test_list_machine_assignees_none(client, valid_headers_admin, valid_plain_machine):
    r = client.get('/api/v1/machine/%d/assignee' % valid_plain_machine.id, headers=valid_headers_admin)
    assert r.status_code == 200

    data = json.loads(r.data)
    assert len(data) == 0


def test_list_machine_assignees_one(client, valid_headers_nonadmin, valid_assignment_nonadmin):
    r = client.get('/api/v1/machine/%d/assignee' % valid_assignment_nonadmin.machine_id, headers=valid_headers_nonadmin)
    assert r.status_code == 200

    data = json.loads(r.data)
    assert len(data) == 1
    assert data[0]['user'] == valid_assignment_nonadmin.user.username
    assert data[0]['reason'] == valid_assignment_nonadmin.reason


def test_assign_machine_user(client, valid_headers_admin, user_nonadmin, valid_plain_machine):
    body = json.dumps({
        'user': user_nonadmin.username,
        'reason': 'API testing',
    })
    r = client.post('/api/v1/machine/%d/assignee' % valid_plain_machine.id, headers=valid_headers_admin, data=body)
    assert r.status_code == 201

    data = json.loads(r.data)

    assignees = valid_plain_machine.assignments

    assert len(assignees) == 1
    assert assignees[0].user.id == user_nonadmin.id
    assert assignees[0].reason == 'API testing'

    assert data['id'] == assignees[0].id
    assert data['user'] == user_nonadmin.username
    assert data['reason'] == 'API testing'


def test_remove_assignee(client, valid_headers_admin, user_nonadmin, valid_plain_machine, valid_assignment_nonadmin):
    r = client.delete('/api/v1/machine/%d/assignee/%d' % (valid_assignment_nonadmin.machine_id,
                                                          valid_assignment_nonadmin.id),
                      headers=valid_headers_admin)
    assert r.status_code == 204

    assignees = valid_plain_machine.assignments

    assert len(assignees) == 0
