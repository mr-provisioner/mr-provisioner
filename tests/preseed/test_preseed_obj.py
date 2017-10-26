from mr_provisioner.models import Machine, Preseed
from mr_provisioner.preseed.controllers import get_preseed



def test_preseed_jinja_resolution(valid_fancy_machine):

    unresolved_preseed = """\
{{hostname}}
{{kernel_name}}
{{kernel_description}}
{{initrd_name}}
{{initrd_description}}
"""
    resolved_preseed = """\
fancy01
apitest-admin/kernel
kernel
apitest-admin/initrd
initrd
"""

    valid_fancy_machine.preseed.file_content = unresolved_preseed

    r = get_preseed(valid_fancy_machine.id)
    assert r.status_code == 200

    assert r.data.decode('utf-8').strip() == resolved_preseed.strip()


def test_preseed_jinja_resolution_unset(valid_plain_machine_with_preseed):
    """ Test jinja resolution when variables aren't set """

    unresolved_preseed = """\
{{hostname}}
{{kernel_name}}
{{kernel_description}}
{{initrd_name}}
{{initrd_description}}
"""
    resolved_preseed = """\
plain-w-preseed01




"""

    valid_plain_machine_with_preseed.preseed.file_content = unresolved_preseed

    r = get_preseed(valid_plain_machine_with_preseed.id)
    assert r.status_code == 200

    assert r.data.decode('utf-8').strip() == resolved_preseed.strip()
