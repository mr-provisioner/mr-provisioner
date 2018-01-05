from mr_provisioner.models import Machine, Preseed
from mr_provisioner.preseed.controllers import get_preseed



def test_preseed_jinja_resolution(valid_fancy_machine):

    unresolved_preseed = """\
d-i netcfg/get_hostname string {{hostname}}
# kernel filename is {{kernel.filename}}
# kernel description is {{kernel.description}}
# initrd filename is {{initrd.filename}}
# initrd description is {{initrd.description}}
"""
    resolved_preseed = """\
d-i netcfg/get_hostname string fancy01
# kernel filename is apitest-admin/kernel
# kernel description is kernel
# initrd filename is apitest-admin/initrd
# initrd description is initrd
"""

    valid_fancy_machine.preseed.file_content = unresolved_preseed

    r = get_preseed(valid_fancy_machine.id)
    assert r.status_code == 200

    assert r.data.decode('utf-8').strip() == resolved_preseed.strip()


def test_preseed_jinja_resolution_unset(valid_plain_machine_with_preseed):
    """ Test jinja resolution when variables aren't set """

    unresolved_preseed = """\
d-i netcfg/get_hostname string {{hostname}}
{{kernel.name|default("none")}}
{{kernel.description|default("none")}}
{{initrd.name|default("none")}}
{{initrd.description|default("none")}}
{{kernel.name}}
"""
    resolved_preseed = """\
d-i netcfg/get_hostname string plain-w-preseed01
none
none
none
none

"""

    valid_plain_machine_with_preseed.preseed.file_content = unresolved_preseed

    r = get_preseed(valid_plain_machine_with_preseed.id)
    assert r.status_code == 200

    assert r.data.decode('utf-8').strip() == resolved_preseed.strip()
