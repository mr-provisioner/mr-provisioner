from mr_provisioner.util.manuf import MacParser
import os
import itertools

MAC_REGEX = r"[\da-fA-F]{2}:[\da-fA-F]{2}:[\da-fA-F]{2}:[\da-fA-F]{2}:[\da-fA-F]{2}:[\da-fA-F]{2}"

# https://www.iana.org/assignments/dhcpv6-parameters/dhcpv6-parameters.xhtml#processor-architecture
DHCP_ARCH_CODES = {
    0x00: 'x86 BIOS',
    0x02: 'Itanium',
    0x06: 'x86 UEFI',
    0x07: 'x64 UEFI',
    0x09: 'EBC',
    0x0a: 'ARM 32-bit UEFI',
    0x0b: 'ARM 64-bit UEFI',
    0x0c: 'PowerPC Open Firmware',
    0x0d: 'PowerPC ePAPR',
    0x0e: 'POWER OPAL v3',
    0x0f: 'x86 uefi boot from http',
    0x10: 'x64 uefi boot from http',
    0x11: 'ebc boot from http',
    0x12: 'arm uefi 32 boot from http',
    0x13: 'arm uefi 64 boot from http',
    0x14: 'pc/at bios boot from http',
    0x15: 'arm 32 uboot',
    0x16: 'arm 64 uboot',
    0x17: 'arm uboot 32 boot from http',
    0x18: 'arm uboot 64 boot from http',
    0x19: 'RISC-V 32-bit UEFI',
    0x1a: 'RISC-V 32-bit UEFI boot from http',
    0x1b: 'RISC-V 64-bit UEFI',
    0x1c: 'RISC-V 64-bit UEFI boot from http',
    0x1d: 'RISC-V 128-bit UEFI',
    0x1e: 'RISC-V 128-bit UEFI boot from http',
}

_mac_parser = None

_basedir = os.path.abspath(os.path.dirname(__file__))


def mac_vendor(mac):
    global _mac_parser
    global _basedir

    if _mac_parser is None:
        db_file = os.path.join(_basedir, 'manuf.db')
        _mac_parser = MacParser(manuf_name=db_file, update=False)

    vendors = _mac_parser.search(mac)
    if len(vendors) > 0:
        (vendor, comment) = vendors[0]
        return comment if comment else vendor
    else:
        return "unknown"


def flatmap(func, *iterable):
    return itertools.chain.from_iterable(map(func, *iterable))


def trim_to_none(str):
    return None if str == '' else str
