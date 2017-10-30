from mr_provisioner.models import Machine, Preseed
from mr_provisioner.preseed.controllers import get_preseed



def test_preseed_jinja_resolution(valid_fancy_machine):

    unresolved_preseed = """\
d-i netcfg/get_hostname string {{hostname}}
"""
    resolved_preseed = """\
d-i netcfg/get_hostname string fancy01
"""

    valid_fancy_machine.preseed.file_content = unresolved_preseed

    r = get_preseed(valid_fancy_machine.id)
    assert r.status_code == 200

    assert r.data.decode('utf-8').strip() == resolved_preseed.strip()
