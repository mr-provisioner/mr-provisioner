Kea integration
================

Install
--------

Dependencies
~~~~~~~~~~~~~

To build Kea and the `mr-provisioner-kea plugin`_, you need some libraries in addition to standard build tools:

 - log4cplus (e.g. on Ubuntu: liblog4cplus-dev)
 - curl (e.g. on Ubuntu: libcurl4-openssl-dev or libcurl4-gnutls-dev)
 - openssl (e.g. on Ubuntu: libssl-dev)
 - boost c++ (e.g. on Ubuntu: libboost-all-dev)

Install Kea
~~~~~~~~~~~~

Download a Kea 1.2.0 source tarball from the `Kea website`_. In the Kea source directory, run::

    ./configure --prefix=/opt/kea
    make -j5
    sudo make install

Install Kea mr-provisioner hook/plugin
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

Download a mr-provisioner-kea release compatible with the Kea release (e.g. version 0.1) from the `mr-provisioner-kea releases`_ page. In the mr-provisioner-kea source directory, run::

    make KEA_SRC=/path/to/kea-1.2.0 KEA_PREFIX=/opt/kea
    sudo make KEA_SRC=/path/to/kea-1.2.0 KEA_PREFIX=/opt/kea install

This will install the plugin as `libkea-hook-mr-provisioner.so` under `$(KEA_PREFIX)/lib`.

Configure
----------

Add the following section to your Kea Dhcp4/Dhcp6 configuration (see `$(KEA_PREFIX)/etc/kea/kea.conf`) section(s), adjusting the URL to your deployment of mr-provisioner::

    "hooks-libraries": [
        {
            "library": "/opt/kea/lib/libkea-hook-mr-provisioner.so",
            "parameters": {
                "provisioner_url": "http://127.0.0.1:5000/dhcp",
                "timeout_ms": 5000
            }
        }
    ]

For additional setup information including systemd files, see :doc:`deploy`.

.. _Kea website: https://www.isc.org/kea/
.. _mr-provisioner-kea plugin: https://github.com/Linaro/mr-provisioner-kea
.. _mr-provisioner-kea releases: https://github.com/Linaro/mr-provisioner-kea/releases
