Console Access
==============

Engineers can access the console of the server they are installing from the web app, see diagram:

.. image:: seqdiag/ws-console.svg
   :target: ../_images/ws-console.svg


The user makes a request to ``mr-provisioner``, and a token for the session is generated, then the browser of the user makes a websocket request to `ws-subprocess`_, who then has all that is needed to get the command to run the console from ``mr-provisioner``.
