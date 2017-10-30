import pytest
from mr_provisioner.models import Machine

@pytest.fixture(scope='function')
def valid_fancy_machine(db, valid_bmc_plain, valid_image_initrd,
        valid_image_kernel, valid_preseed):

    machine = Machine(name='fancy01', bmc_id=valid_bmc_plain.id,
                      kernel_id=valid_image_kernel.id,
                      initrd_id=valid_image_initrd.id,
                      preseed_id=valid_preseed.id)
    db.session.add(machine)
    db.session.commit()
    db.session.refresh(machine)

    return machine

@pytest.fixture(scope='function')
def valid_plain_machine_with_preseed(db, valid_preseed):

    machine = Machine(name='plain-w-preseed01',
                      preseed_id=valid_preseed.id)
    db.session.add(machine)
    db.session.commit()
    db.session.refresh(machine)

    return machine
