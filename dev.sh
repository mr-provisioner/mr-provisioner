#!/bin/sh

# Usage: ./dev.sh
#
# Create a standalone local development environment in an ephemeral docker
# container.
#
# The container will operate as your UID and mount in your local path to /work.
# It will install mr_provisioner, set up and start postgresql, run all database
# migrations, run tests, run linters, run mr_provisioner on localhost:5000 in
# the background, and also return a bash shell.
#
# From the docker shell, interactively run "make test", "make lint", etc while
# editing files in real-time.
#
# Log into the web interface with admin/linaro:
# http://localhost:5000/
# http://localhost:5000/api/v1/docs


set -eu

cp dev/Dockerfile.dev-template dev/Dockerfile.dev

cat << EOF >> dev/Dockerfile.dev
RUN groupadd -g $(id -g) $(id -gn)
RUN useradd -m -u $(id -u) -g $(id -g) -s /bin/bash ${USER}
RUN echo '${USER} ALL=(ALL:ALL) NOPASSWD: ALL' >> /etc/sudoers
USER ${USER}

CMD dev/test-and-run.sh; bash
EOF

docker build -t prov -f dev/Dockerfile.dev .
docker run --rm -p 5000:5000 -v $(pwd):/work -it prov
