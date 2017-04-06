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
