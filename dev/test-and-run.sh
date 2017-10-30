#!/bin/sh

set -eux

cd /work
sudo pip3 install -r requirements.txt -r requirements.dev.txt

(cd mr_provisioner/admin/ui && yarn install && npm run build && npm run lint)

sudo /etc/init.d/postgresql start
sudo -u postgres psql -c 'create database provisioner;'
sudo -u postgres psql -c "create role provuser with password 'provuser' login;"
sudo -u postgres psql -c 'grant all privileges on database provisioner to provuser;'
python3 run.py db upgrade
make test
make lint
python3 run.py runserver -d -r -h 0.0.0.0 -p 5000 &
