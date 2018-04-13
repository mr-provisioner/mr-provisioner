# CHANGELOG

## v0.3.1 (unreleased)

Docs:
 - Upgrade documentation

## v0.3.0 (2018-04-11)

Bug fixes:

 - grub.netboot.tmpl: fixing position of BOOTIF= argument to solve problems with --- in cmdline being used from UI.
 - ui: add missing "show all" button for machine events (#80)
 - ipmi: use efiboot option in ipmi pxe commands when required (#82)
 - preseeds: return HTTP 400 when a syntax or template exception is raised (#98).
 - examples: improve systemd examples for tftp, ws

## v0.2.9 (2018-02-16)

Big-ticket items:

 - Add an event log around machine events such as power state changes, DHCP/TFTP/preseed accesses, etc (#17)

Bug fixes:

 - bootloader: multiple subarchitectures feature not serving the right bootfile (#74)
 - ui: fix listing user's images when one of them has no owner (#75)

## v0.2.8 (2018-01-22)

Bug fixes:

 - api: fix bug around listing images (#68)

## v0.2.7 (2018-01-16)

Big-ticket items:

 - Add support for multiple architectures (#63)

Features:

 - ui: set `<title>` based on current route (#38)
 - preseeds: add new template variables around kernel, initrd (#51)
 - bootloader: automatically set BOOTIF= based on pxe interface (#56)
 - api: add support for reboot to bios, disk
 - ui: add support for non-PXE reboot (boot to disk)

Bug fixes:

 - ui: fix download of console logs on newer browsers (#43)
 - ui: fix uses of `Array.concat` to `Array.prototype.concat`
 - api: fix pxe_reboot support
 - api: fixes around image, preseed changes on machine_put endpoint (#46)

Misc:

 - improved documentation & examples (#52, #53, others)
 - new docker-based development environment (#64)
 - improvements to `requirements.txt` and `package.json`
