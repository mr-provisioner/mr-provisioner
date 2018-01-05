#!/bin/sh

set -eux

cd /work
sudo pip3 install -r requirements.txt -r requirements.dev.txt

sudo /etc/init.d/postgresql start
sudo -u postgres psql -c 'create database provisioner;'
sudo -u postgres psql -c "create role provuser with password 'provuser' login;"
sudo -u postgres psql -c 'grant all privileges on database provisioner to provuser;'
python3 run.py db upgrade
make test
make lint
make frontend-clean
make frontend-dev
make frontend-lint
make frontend-watch-dev &
python3 run.py runserver -d -r -h 0.0.0.0 -p 5000 &
