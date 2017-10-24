import json
from mr_provisioner.models import Machine

def test_empty_machine_list_no_machines(client, valid_headers_nonadmin):
    r = client.get('/api/v1/machine', headers=valid_headers_nonadmin)
    assert r.status_code == 200

    data = json.loads(r.data.decode('utf-8'))
    assert data == []


def test_machine_list_nonadmin_only(client, valid_headers_nonadmin, valid_plain_machine, valid_moonshot_machine):
    r = client.get('/api/v1/machine', headers=valid_headers_nonadmin)
    assert r.status_code == 200

    data = json.loads(r.data.decode('utf-8'))
    assert len(data) == 0


def test_machine_list_query(client, valid_headers_nonadmin, machines_for_reservation):
    q = """
        (= bmc_type "moonshot")
    """

    r = client.get('/api/v1/machine?show_all=true&q=%s' % q, headers=valid_headers_nonadmin)
    assert r.status_code == 200

    data = json.loads(r.data.decode('utf-8'))
    assert set([m['name'] for m in data]) == set(['machine1', 'machine4'])


def test_machine_list_query2(client, valid_headers_nonadmin, machines_for_reservation):
    q = """
        (or (= bmc_type "moonshot")
            (= bmc_type "plain"))
    """

    r = client.get('/api/v1/machine?show_all=true&q=%s' % q, headers=valid_headers_nonadmin)
    assert r.status_code == 200

    data = json.loads(r.data.decode('utf-8'))
    assert set([m['name'] for m in data]) == set(['machine0', 'machine1', 'machine4'])


def test_machine_list_nonadmin(client, valid_headers_nonadmin, valid_plain_machine, valid_moonshot_machine):
    r = client.get('/api/v1/machine?show_all=true', headers=valid_headers_nonadmin)
    assert r.status_code == 200

    data = json.loads(r.data.decode('utf-8'))
    assert len(data) == 2


def test_machine_list_admin(client, valid_headers_nonadmin, valid_plain_machine, valid_moonshot_machine):
    r = client.get('/api/v1/machine?show_all=true', headers=valid_headers_nonadmin)
    assert r.status_code == 200

    data = json.loads(r.data.decode('utf-8'))
    assert len(data) == 2


def test_get_existing_machine(client, valid_headers_nonadmin, valid_plain_machine):
    r = client.get('/api/v1/machine/%d' % valid_plain_machine.id, headers=valid_headers_nonadmin)
    assert r.status_code == 200

    data = json.loads(r.data.decode('utf-8'))
    assert valid_plain_machine.name == data['name']
    assert valid_plain_machine.id == data['id']
    assert valid_plain_machine.hostname == data['hostname']


def test_get_non_existing_machine(client, valid_headers_nonadmin):
    r = client.get('/api/v1/machine/123', headers=valid_headers_nonadmin)
    assert r.status_code == 404


def test_list_machine_assignees_none(client, valid_headers_admin, valid_plain_machine):
    r = client.get('/api/v1/machine/%d/assignee' % valid_plain_machine.id, headers=valid_headers_admin)
    assert r.status_code == 200

    data = json.loads(r.data.decode('utf-8'))
    assert len(data) == 0


def test_list_machine_assignees_one(client, valid_headers_nonadmin, valid_assignment_nonadmin):
    r = client.get('/api/v1/machine/%d/assignee' % valid_assignment_nonadmin.machine_id, headers=valid_headers_nonadmin)
    assert r.status_code == 200

    data = json.loads(r.data.decode('utf-8'))
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

    data = json.loads(r.data.decode('utf-8'))

    assignees = valid_plain_machine.assignments

    assert len(assignees) == 1
    assert assignees[0].user.id == user_nonadmin.id
    assert assignees[0].reason == 'API testing'

    assert data['id'] == assignees[0].id
    assert data['user'] == user_nonadmin.username
    assert data['reason'] == 'API testing'


def test_remove_assignee(client, valid_headers_admin, valid_plain_machine, valid_assignment_nonadmin):
    r = client.delete('/api/v1/machine/%d/assignee/%d' % (valid_assignment_nonadmin.machine_id,
                                                          valid_assignment_nonadmin.id),
                      headers=valid_headers_admin)
    assert r.status_code == 204

    assignees = valid_plain_machine.assignments

    assert len(assignees) == 0


def test_change_assignee(client, valid_headers_admin, valid_plain_machine, valid_assignment_nonadmin):
    body = json.dumps({
        'reason': 'API testing',
    })

    r = client.put('/api/v1/machine/%d/assignee/%d' % (valid_assignment_nonadmin.machine_id,
                                                       valid_assignment_nonadmin.id),
                   headers=valid_headers_admin,
                   data=body)

    assert r.status_code == 200

    assignees = valid_plain_machine.assignments

    data = json.loads(r.data.decode('utf-8'))

    assert len(assignees) == 1
    assert assignees[0].reason == 'API testing'
    assert data['reason'] == 'API testing'


def test_remove_assignee_self(client, valid_headers_nonadmin, valid_plain_machine, valid_assignment_nonadmin):
    r = client.delete('/api/v1/machine/%d/assignee/self' % valid_plain_machine.id,
                      headers=valid_headers_nonadmin)
    assert r.status_code == 204

    assignees = valid_plain_machine.assignments

    assert len(assignees) == 0


def test_change_assignee_self(client, valid_headers_nonadmin, valid_plain_machine, valid_assignment_nonadmin):
    body = json.dumps({
        'reason': 'API testing',
    })

    r = client.put('/api/v1/machine/%d/assignee/self' % valid_plain_machine.id,
                   headers=valid_headers_nonadmin,
                   data=body)

    assert r.status_code == 200

    assignees = valid_plain_machine.assignments

    data = json.loads(r.data.decode('utf-8'))

    assert len(assignees) == 1
    assert assignees[0].reason == 'API testing'
    assert data['reason'] == 'API testing'


def test_set_machine_parameters(client, valid_headers_nonadmin,
        valid_plain_machine, valid_image_initrd, valid_image_kernel,
        valid_preseed):

    data = json.dumps({
        "kernel_id": valid_image_kernel.id,
        "initrd_id": valid_image_initrd.id,
        "preseed_id": valid_preseed.id,
        "kernel_opts": "",
        "netboot_enabled": True,
    })

    r = client.put('/api/v1/machine/%d' % valid_plain_machine.id,
                   headers=valid_headers_nonadmin,
                   data=data)

    assert r.status_code == 200

    data = json.loads(r.data.decode('utf-8'))

    assert data['initrd_id'] == valid_image_initrd.id
    assert data['kernel_id'] == valid_image_kernel.id
    assert data['netboot_enabled'] # is true

def test_machine_interface_empty_list(client, valid_headers_nonadmin, valid_plain_machine):
    r = client.get('/api/v1/machine/%d/interface' % valid_plain_machine.id, headers=valid_headers_nonadmin)

    assert r.status_code == 200

    data = json.loads(r.data.decode('utf-8'))

    assert data == []


def test_machine_interface_list(client, valid_headers_nonadmin, valid_interface_1, valid_plain_machine):
    r = client.get('/api/v1/machine/%d/interface' % valid_plain_machine.id, headers=valid_headers_nonadmin)

    assert r.status_code == 200

    data = json.loads(r.data.decode('utf-8'))

    assert len(data) == 1


def test_get_machine_interface(client, valid_headers_nonadmin, valid_interface_1, valid_plain_machine):
    r = client.get('/api/v1/machine/%d/interface/%d' % (valid_plain_machine.id, valid_interface_1.id),
                   headers=valid_headers_nonadmin)

    assert r.status_code == 200

    data = json.loads(r.data.decode('utf-8'))

    assert data['id'] == valid_interface_1.id
    assert data['mac'] == valid_interface_1.mac
    assert data['network_name'] == valid_interface_1.network.name


def test_reserve_machine_any(client, valid_headers_nonadmin, machines_for_reservation):
    body = json.dumps({
        'query': None,
    })

    r = client.post('/api/v1/machine/reservation',
                    headers=valid_headers_nonadmin,
                    data=body)

    assert r.status_code == 200

    data = json.loads(r.data.decode('utf-8'))

    assert data['name'] in ['machine0', 'machine3', 'machine4']


def test_reserve_machine_bmc_type_eq(client, valid_headers_nonadmin, machines_for_reservation):
    body = json.dumps({
        'query': '(= bmc_type "moonshot")',
    })

    r = client.post('/api/v1/machine/reservation',
                    headers=valid_headers_nonadmin,
                    data=body)

    assert r.status_code == 200

    data = json.loads(r.data.decode('utf-8'))

    assert data['name'] in ['machine4']
    m = Machine.query.get(data['id'])
    assert len(m.assignees) == 1


def test_reserve_machine_bmc_type_and_ne(client, valid_headers_nonadmin, machines_for_reservation):
    body = json.dumps({
        'query': """
            (and (!= bmc_type "plain")
                 (!= bmc_type "moonshot"))
        """,
    })

    r = client.post('/api/v1/machine/reservation',
                    headers=valid_headers_nonadmin,
                    data=body)

    assert r.status_code == 200

    data = json.loads(r.data.decode('utf-8'))

    assert data['name'] in ['machine3']
    m = Machine.query.get(data['id'])
    assert len(m.assignees) == 1


def test_reserve_machine_name_like(client, valid_headers_nonadmin, machines_for_reservation):
    body = json.dumps({
        'query': """
            (or (=~ name "ine2")
                (=~ name "ine3"))
        """,
    })

    r = client.post('/api/v1/machine/reservation',
                    headers=valid_headers_nonadmin,
                    data=body)

    assert r.status_code == 200

    data = json.loads(r.data.decode('utf-8'))

    assert data['name'] in ['machine3']
    m = Machine.query.get(data['id'])
    assert len(m.assignees) == 1


def test_reserve_machine_empty_result(client, valid_headers_nonadmin, machines_for_reservation):
    body = json.dumps({
        'query': """
            (and (= bmc_type "plain")
                 (= bmc_type "moonshot"))
        """,
    })

    r = client.post('/api/v1/machine/reservation',
                    headers=valid_headers_nonadmin,
                    data=body)

    assert r.status_code == 404
