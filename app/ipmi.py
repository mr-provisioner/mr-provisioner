#!/usr/bin/env python

import subprocess
import re

class IPMIError(Exception):
    pass

# XXX: add this to the config (but make sure it's an absolute path (or use readlink/abspath on it)
IPMITOOL_CMD = '/usr/bin/ipmitool'
# IPMITOOL_CMD = '/usr/local/bin/ipmitool'

ALLOWED_BOOTDEVS = ['pxe', 'disk', 'bios']
ALLOWED_POWER_STATES=['on', 'off', 'cycle', 'reset', 'soft']

# chassis bootdev [pxe|disk|bios]
# chassis power status
# chassis power [on|off|cycle|reset|soft]

def build_command(cmd, *, host=None, username=None, password=None, privilege_level=None, bridge_info=[], interface='lanplus'):
    command = [IPMITOOL_CMD, "-I", interface]
    if host:
        command += ["-H", host]
    if username:
        command += ["-U", username]
    if password:
        command += ["-P", password]
    else:
        command += ["-P", ""]
    if privilege_level:
        command += ["-L", privilege_level]

    if len(bridge_info) > 1:
        info = bridge_info.pop(0)
        command += ["-B", str(info[0]), "-T", str(info[1])]

    if len(bridge_info) > 0:
        info = bridge_info.pop(0)
        command += ["-b", str(info[0]), "-t", str(info[1])]

    command += ["-R", "1"]

    command += cmd

    return command

def run_command(command):
    try:
        print("IPMI command: %s" % (" ".join(command)))

        return subprocess.check_output(command,
            stderr=subprocess.STDOUT,
            shell=False)
    except subprocess.CalledProcessError as e:
        raise IPMIError("IPMI error: %s (%s)" % (str(e), e.output))


def set_bootdev(bootdev, **kwargs):
    if not bootdev in ALLOWED_BOOTDEVS:
        raise IPMIError("IPMI error: Uknown bootdev %s" % (bootdev))

    command = build_command(["chassis", "bootdev", bootdev], **kwargs)
    return run_command(command)


def set_power(power_state, **kwargs):
    if not power_state in ALLOWED_POWER_STATES:
        raise IPMIError("IPMI error: Unknown power state %s" % (power_state))

    command = build_command(["chassis", "power", power_state], **kwargs)
    return run_command(command)


def get_power(**kwargs):
    command = build_command(["chassis", "power", "status"], **kwargs)
    output = run_command(command).decode("utf-8")
    m = re.match(r"Chassis Power is (\w+)", output)
    if m:
        return m.group(1)
    else:
        raise IPMIError("IPMI error: Unable to parse power state: %s" % (output))


def deactivate_sol(**kwargs):
    command = build_command(["sol", "deactivate"], **kwargs)
    return run_command(command)


def get_sol_command(**kwargs):
    command = build_command(["sol", "activate"], **kwargs)
    cmd = command[0]
    args = command[1:]

    return (cmd, args)


if __name__ == "__main__":
    pass
