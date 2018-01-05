#!/bin/sh

# Usage: docker-dev.sh
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

DOCKER=docker
DOCKER_DEV_DIR=scripts/docker-dev
OUT_DOCKERFILE=${DOCKER_DEV_DIR}/Dockerfile.dev

if [ ! -d "mr_provisioner" ]; then
	>&2 echo "Script must be run from the mr-provisioner repository root."
	exit 1
fi

cp ${DOCKER_DEV_DIR}/Dockerfile.dev-template ${OUT_DOCKERFILE}

cat << EOF >> ${OUT_DOCKERFILE}
RUN groupadd -g $(id -g) $(id -gn)
RUN useradd -m -u $(id -u) -g $(id -g) -s /bin/bash ${USER}
RUN echo '${USER} ALL=(ALL:ALL) NOPASSWD: ALL' >> /etc/sudoers
USER ${USER}

ADD test-and-run.sh /test-and-run.sh

CMD /test-and-run.sh; bash
EOF

${DOCKER} build -t prov -f ${OUT_DOCKERFILE} ${DOCKER_DEV_DIR}
${DOCKER} run --rm -p 5000:5000 -v $(pwd):/work -it prov
