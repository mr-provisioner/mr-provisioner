import importlib


class BMCType:
    pass


class BMCError(Exception):
    pass


types = []


def register_bmc_type(klass):
    inst = klass()
    types.append(inst)


def resolve_bmc_type(klass_name):
    return next(t for t in types if t.name == klass_name)


def list_bmc_types():
    return types


importlib.import_module('.plain', 'mr_provisioner.bmc_types')
importlib.import_module('.moonshot', 'mr_provisioner.bmc_types')
importlib.import_module('.libvirt_bmc', 'mr_provisioner.bmc_types')
