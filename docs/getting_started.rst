Getting started
================

Install external dependencies
-----------------------------

mr-provisioner requires the following external dependencies to be installed:

 - virtualenv
            ($ sudo apt install virtualenv)
 - python-pip
           ($ sudo apt-get  install python-pip)
 - ipmitool
           ($sudo apt-get  install ipmitool)

Additionally, mr-provisioner also relies on the following external services:

 - postgresql
            ($ sudo apt-get install postgresql postgresql-contrib)
 - `tftp-http-proxy`_
            (Please visit the link and download manually)
 - `ws-subprocess`_
            (Please visit the link and download manually)

Clone mr-provisioner github
---------------------------

Clone mr-provisioner github to your local machine::

    git clone https://github.com/Linaro/mr-provisioner.git

Create a virtual env
--------------------

Set up a virtual environment to run the application::

    virtualenv --python=python3 env

NOTE: Make sure to specify python 3 if your system doesn't use it by detault
(-p PYTHON_EXE)

After that, activate the virtual env::

    source env/bin/activate

NOTE: on success, you should notice your command prompt prefixed by (env)::

    (env) your-normal-prompt-string $ 

Install requirements
--------------------

First, make sure the virtual env is activated (see above). Then, install the required python dependencies by running::

    pip install -r requirements.txt

NOTE: requirements.txt is in your local clone of mr-provisioner.

Configuration file
------------------

Copy the example configuration file from `examples/config.ini` to a location of your chosing, and adjust it according to your needs. At the least, you will have to configure the database uri and the TFTPRoot setting::

    [database]
    uri = postgresql+psycopg2://user:pass@localhost/hwserver
    [files]
    tftp_root = /var/lib/mr-provisioner/tftp

NOTE: `user:pass` shall be replaced by `<username>` and `<password>`, and `hwserver` shall be replaced by `<dbname>`, all as you define them when setting up database. See next section.

See :doc:`detailed_config` for more information.

Set up database
---------------

Create a new database and user for `mr-provisioner` if you haven't already set one up::

    sudo -u postgres -s
    psql

    CREATE DATABASE <dbname>;
    CREATE ROLE <username> WITH PASSWORD '<password>' LOGIN;
    GRANT ALL PRIVILEGES ON DATABASE <dbname> TO <username>;

Create the required tables by running the database migrations::

    ./run.py -c /path/to/your/config.ini db upgrade

After this, a first user called `admin` with password `linaro` will be available.

Run the app
-----------

First, make sure the virtual env is activated in the current shell.

Start up `ws-subprocess`_::

    /path/to/ws-subprocess -controller-url "http://localhost:5000/admin/ws-subprocess" -listen "0.0.0.0:8866"

Start up `tftp-http-proxy`_::

    /path/to/tftp-http-proxy -http-base-url "http://localhost:5000/tftp/"

And finally, start up `mr-provisioner`::

    ./run.py -c /path/to/your/config.ini tornado -h 0.0.0.0 -p 5000

Next steps
-----------

mr-provisioner can be used with any DHCP server, but works best with `Kea`_ and the mr-provisioner-kea plugin. See :doc:`kea` for more information. Some of the features that are only enabled with `Kea`_ include:

 - Showing DHCP IP lease in the UI
 - Assigning static/reserved IPs to machines

For additional deployment instructions, see :doc:`deploy`.

.. _ws-subprocess: https://github.com/bwalex/ws-subprocess
.. _tftp-http-proxy: https://github.com/bwalex/tftp-http-proxy
.. _Kea: https://www.isc.org/kea/
