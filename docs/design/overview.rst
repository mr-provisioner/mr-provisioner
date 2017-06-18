Design Overview
===============

``mr-provisioner`` helps you automate and provision servers, manage and assign your hardware. It can handle multiple architectures.

``mr-provisioner`` handles the entire network boot process from controlling DHCP and handling TFTP requests to providing installation configuration files. See :doc:`netboot_simple` for detailed explanation.

Hardware reservation is available and it enables assigning machines to users. Users can then manage the OS that gets installed and access the console. ``mr-provisioner`` provides users restart and PXE reboot functionality by talking to BMC (see :doc:`bmc`) and :doc:`console` via ipmi.


.. .. image:: seqdiag/boot-flow-kea.svg
   :target: ../_images/boot-flow-kea.svg

