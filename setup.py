#!/usr/bin/env python

from setuptools import setup, find_packages
import sys
import uuid
import os

with open('requirements.txt', 'r') as fd:
    reqs = fd.readlines()
    reqs = [r for r in reqs if not r.strip().startswith('#')]

if (3, 0) <= sys.version_info < (3, 3):
    raise SystemExit("Python 3.0, 3.1 and 3.2 are not supported")

setup(
    name='mr-provisioner',
    version=open(os.path.join(os.path.dirname(__file__), 'VERSION')).read().strip(),
    author='mr-provisioner contributors',
    author_email='...',
    packages=find_packages(),
    include_package_data=True,
    zip_safe=False,
    url='https://github.com/mr-provisioner/mr-provisioner',
    license='MIT',
    description='lightweight provisioning tool',
    classifiers=[
        "Development Status :: 3 - Alpha",
        "Topic :: Internet",
        "Topic :: Internet :: WWW/HTTP :: HTTP Servers",
        "Topic :: Internet :: WWW/HTTP :: WSGI :: Application",
        "License :: OSI Approved :: Apache License",
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3.3",
        "Programming Language :: Python :: 3.4"
    ],
    python_requires='>=3, !=3.0.*, !=3.1.*, !=3.2.*, <4',
    install_requires=reqs,
    extras_require={
    },
    entry_points={
        'console_scripts':
            ['mr-provisioner = mr_provisioner:main'],
    }
)
