from app.bmc_types import register_bmc_type, BMCType, BMCError
from app.ipmi import get_power, set_power, set_bootdev, get_sol_command, deactivate_sol, IPMIError


class MoonshotBMC(BMCType):
    @property
    def name(self):
        return "moonshot"

    def validate_bmc_info(self, info):
        try:
            cid = int(info)
            if cid < 1:
                raise BMCError("Not a valid moonshot cartridge id.")
        except Exception as e:
            raise BMCError("Not a valid moonshot cartridge id.")

        return True

    def get_bridge_info(self, machine):
        bridge_info = []
        cartridge = machine.bmc_info
        cid = int(cartridge)
        # nid = 1
        bridge_info.append((0, 0x80 + (2 * cid)))
        bridge_info.append((7, 0x72))
        return bridge_info

    def set_bootdev(self, machine, bootdev):
        bmc = machine.bmc
        try:
            set_bootdev(bootdev, host=bmc.ip, username=bmc.username, password=bmc.password,
                        bridge_info=self.get_bridge_info(machine))
        except IPMIError as e:
            raise BMCError("BMC error: %s" % str(e))

    def set_power(self, machine, power_state):
        bmc = machine.bmc
        try:
            # Moonshot reacts with error "Unknown (0x80)" to "chassis power reset" command
            # "chassis power cycle" reboots machine everytime
            if power_state == "reset":
                power_state = "cycle"
            set_power(power_state, host=bmc.ip, username=bmc.username, password=bmc.password,
                      bridge_info=self.get_bridge_info(machine))
        except IPMIError as e:
            raise BMCError("BMC error: %s" % str(e))

    def get_power(self, machine):
        bmc = machine.bmc
        try:
            return get_power(host=bmc.ip, username=bmc.username, password=bmc.password,
                             bridge_info=self.get_bridge_info(machine))
        except IPMIError as e:
            raise BMCError("BMC error: %s" % str(e))

    def deactivate_sol(self, machine):
        bmc = machine.bmc
        try:
            deactivate_sol(host=bmc.ip, username=bmc.username, password=bmc.password,
                           bridge_info=self.get_bridge_info(machine))
        except IPMIError as e:
            raise BMCError("BMC error: %s" % str(e))

    def get_sol_command(self, machine):
        bmc = machine.bmc
        try:
            return get_sol_command(host=bmc.ip, username=bmc.username, password=bmc.password,
                                   bridge_info=self.get_bridge_info(machine))
        except IPMIError as e:
            raise BMCError("BMC error: %s" % str(e))


register_bmc_type(MoonshotBMC)
