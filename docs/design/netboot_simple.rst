Netboot explained
=============================

In the first version of ``mr-provisioner`` the installation process is simple, see the following diagram:

.. image:: seqdiag/boot-flow-simple.svg
   :target: ../_images/boot-flow-simple.svg

In the diagram the `Client` is the server that is going to be reprovisioned. The `DHCP server` in this case is ``dnsmasq`` configured to serve ``bootfile-grub-aa64.efi`` as follows::

    dhcp-boot=bootfile-grub-aa64.efi,,<tftp-proxy-ip-address>

The bootfile should be placed inside the ``tftp`` folder for ``mr-provisioner`` to serve.

``mr-provisioner`` relies on the bootloader requesting for a configuration file with the MAC in its name. E.g. ``(tftp)/grub/01-${MAC}``.

``mr-provisioner`` will serve any file that it is requested by the tftp proxy if the file exists.
