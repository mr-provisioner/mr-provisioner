from mr_provisioner.bmc_types import register_bmc_type, BMCType, BMCError
import requests


class LibvirtBMC(BMCType):
    @property
    def name(self):
        return 'libvirt_bmc'

    def validate_bmc_info(self, info):
        # BMC is validated by admin/controllers.py, checking via API will come
        # later.
        return True

    def set_bootdev(self, machine, bootdev):
        bmc = machine.bmc
        url = 'http://' + bmc.ip + ':9001/service/' + machine.name + '/state_controller/'
        if bootdev == 'pxe':
            url += 'pxeboot'
            r = requests.get(url)
            if r.status_code != 200:
                raise BMCError("libvirt BMC error on pxeboot : %s" %
                               str(r.status_code))
        if bootdev == 'disk':
            url += 'diskboot'
            r = requests.get(url)
            if r.status_code != 200:
                raise BMCError("libvirt BMC error on diskboot : %s" %
                               str(r.status_code))
        if bootdev == 'bios':
            url += 'defaultboot'
            r = requests.get(url)
            if r.status_code != 200:
                raise BMCError("libvirt BMC error on bios/defaultboot : %s" %
                               str(r.status_code))

    def set_power(self, machine, power_state):
        bmc = machine.bmc
        url = 'http://' + bmc.ip + ':9001/service/' + machine.name + '/state_controller/'
        if power_state == 'on' or power_state == 'off':
            url += 'cyclepower'
            r = requests.get(url)
            if r.status_code != 200:
                raise BMCError("libvirt BMC error on cyclepower : %s" %
                               str(r.status_code))
        if power_state == 'reset':
            url += 'reboot'
            r = requests.get(url)
            if r.status_code != 200:
                raise BMCError("libvirt BMC error on reboot : %s" %
                               str(r.status_code))
        if power_state == 'cycle':
            url += 'force_reset'
            r = requests.get(url)
            if r.status_code != 200:
                raise BMCError("libvirt BMC error on (force_)reset : %s" %
                               str(r.status_code))

    def get_power(self, machine):
        bmc = machine.bmc
        url = 'http://' + bmc.ip + ':9001/service/' + machine.name + '/state_controller/status'
        r = requests.get(url)
        if r.status_code != 200:
            raise BMCError("libvirt BMC error on getting status : %s" %
                           str(r.status_code))
        else:
            return r.json()['state']

    def deactivate_sol(self, machine):
        pass

    def get_sol_command(self, machine):
        return 'Not Implemented'


register_bmc_type(LibvirtBMC)
