Getting started
===============

Install development requirements
--------------------------------

First, make sure the virtual env is activated. Then, install additional development requirements::

    pip install -r requirements.dev.txt

Run development server
----------------------

First, make sure the virtual env is activated.

Start up the development server by running::

    ./run.py -c /path/to/your/config.ini runserver -h 0.0.0.0 -p 5000 -d -r

Develop with Docker!
--------------------

Alternatively, use the standalone docker development environment.

Usage:

    ./dev.sh

dev.sh creates a standalone local development environment in an ephemeral
docker container.

The container will operate as your UID and mount in your local mr-provisioner
source path to /work. It will install mr_provisioner, set up and start
postgresql, run all database migrations, run tests, run linters (javascript and
python), run mr_provisioner on localhost:5000 in the background, and also
return a bash shell.

From the docker shell, interactively run "make test", "make lint", etc while
editing files in real-time.

Log into the web interface with username admin, password linaro @
http://localhost:5000/

