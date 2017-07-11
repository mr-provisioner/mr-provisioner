from mr_provisioner.bmc_types import register_bmc_type, BMCType, BMCError
from mr_provisioner.ipmi import get_power, set_power, set_bootdev, deactivate_sol, get_sol_command, IPMIError


class PlainBMC(BMCType):
    @property
    def name(self):
        return "plain"

    def validate_bmc_info(self, info):
        return True

    def set_bootdev(self, machine, bootdev):
        bmc = machine.bmc
        try:
            set_bootdev(bootdev, host=bmc.ip, username=bmc.username, password=bmc.password)
        except IPMIError as e:
            raise BMCError("BMC error: %s" % str(e))

    def set_power(self, machine, power_state):
        bmc = machine.bmc
        try:
            set_power(power_state, host=bmc.ip, username=bmc.username, password=bmc.password)
        except IPMIError as e:
            raise BMCError("BMC error: %s" % str(e))

    def get_power(self, machine):
        bmc = machine.bmc
        try:
            return get_power(host=bmc.ip, username=bmc.username, password=bmc.password)
        except IPMIError as e:
            raise BMCError("BMC error: %s" % str(e))

    def deactivate_sol(self, machine):
        bmc = machine.bmc
        try:
            deactivate_sol(host=bmc.ip, username=bmc.username, password=bmc.password)
        except IPMIError as e:
            raise BMCError("BMC error: %s" % str(e))

    def get_sol_command(self, machine):
        bmc = machine.bmc
        try:
            return get_sol_command(host=bmc.ip, username=bmc.username, password=bmc.password)
        except IPMIError as e:
            raise BMCError("BMC error: %s" % str(e))


register_bmc_type(PlainBMC)
