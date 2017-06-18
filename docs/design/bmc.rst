BMC Access
==========

There are two BMC types supported by ``mr-provisioner``. Plain BMC is the most common one. Moonshot BMC exists separately because it needs to support double bridging. ``mr-provisioner`` uses `ipmitool`_ to access both BMC types.

.. _ipmitool: https://sourceforge.net/projects/ipmitool/
