# CHANGELOG

## v0.2.8 (unreleased)

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
