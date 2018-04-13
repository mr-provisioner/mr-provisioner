Upgrade
=======

This section will document how to upgrade from one release to another.

Releases
--------
New releases of ``mr-provisioner`` are available in `mr-provisioner's github`_.

New releases are published when there are enough fixes or new features to grant them. An occasional release may be done when a critical issue is found and fixed.

Download and install
--------------------

Note these instructions will need to be contextualized to whichever way your deployment is running the different services. The recommended way to do upgrades is to set up the new version from scratch and then point the service file to the new version, or use a symlink to point to the current version's directory.

1. Download the new release ``tar.gz`` from `mr-provisioner's github`_ and extract it to a new directory.
2. Go into the new version's directory and follow the usual installation instructions::

    virtualenv --python=python3 env
    source env/bin/activate
    pip install -r requirements.txt

3. Stop the service that runs the old version.
4. Make a backup of the database before the database upgrade.
5. Upgrade the database::

    ./run.py -c /path/to/your/config.ini db upgrade

6. Start the service using the newly installed version.


.. _mr-provisioner's github: https://github.com/mr-provisioner/mr-provisioner/releases
