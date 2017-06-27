Deploy
======

This section will document how to properly deploy `mr-provisioner`, with sample systemd files, etc. Still needs to be written.

Systemd
-------

Service files
~~~~~~~~~~~~~

Copy the example systemd service files in `examples/systemd` into `/etc/systemd/system` and adjust the paths in them.

Reload systemd to ensure the new service files are picked up::

    systemctl daemon-reload

Start the services
~~~~~~~~~~~~~~~~~~

Enable the services so they start automatically at boot time::

    systemctl enable mr-provisioner.service
    systemctl enable mr-provisioner-ws.service
    systemctl enable mr-provisioner-tftp.service

Start the services::

    systemctl start mr-provisioner.service
    systemctl start mr-provisioner-ws.service
    systemctl start mr-provisioner-tftp.service

Optionally, if you followed :doc:`kea`, also enable and start the Kea services::

    systemctl enable kea-dhcp4.service
    systemctl start kea-dhcp4.service
