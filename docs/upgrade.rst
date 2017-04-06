Upgrade
=======

This section will document how to upgrade from one release to another. Still needs to be written.

Running migrations
------------------

After upgrading `mr-provisioner`, the database schema potentially needs upgrading as well. Run the database migrations by running::

    ./run.py -c /path/to/your/config.ini db upgrade
