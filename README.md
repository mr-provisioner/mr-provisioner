
[![Documentation Status](https://readthedocs.org/projects/mr-provisioner/badge/?version=latest)](http://mr-provisioner.readthedocs.io/en/latest/?badge=latest)
[![CI Status](https://api.travis-ci.org/mr-provisioner/mr-provisioner.svg?branch=master)](https://travis-ci.org/mr-provisioner/mr-provisioner)

# mr-provisioner

`mr-provisioner` is a tool to provision and manage servers. It supports users and machine reservation. `mr-provisioner` is designed to allow install of upstream images without any modification or any customization to enable testing on bare metal. It is not opinionated about how images are built, other than needing a bootloader, a kernel and an initrd to netboot, preseeds are optional since manual installs can happen by connecting to the console and manually going through the installation process. Machines are controlled via IPMI, so they are assumed to have BMCs.

`mr-provisioner` has been designed to support multiple architectures defined by the administrator of the machines. The administrators are also responsible for providing the bootloader compiled for the architecture.

## UI

There is a UI to manage the machines, network configuration, reservations and for users manual testing in general. Users have access to whichever machines they have been assigned and they can install a new kernel/initrd of their choosing without requiring admin access on any infrastructure. Users are owners of the hardware they borrow and can netboot with an image of their choosing, preseed their installs, look at the console, power on/off the machine, change the subarchitecture for testing reasons.

Some screenshots of the UI:

![mr provisioner](/docs/_msc/mr-provisioner.gif?raw=true "mr-provisioner's UI")


## API

There is an API that can be used to automatically upload new images and provision machines. This has been created for test automation purposes. Users can generate tokens to be able to authenticate and use the API.

The API can be manually tried on:

    http://mr-provisioner-url/api/v1/docs

API documentation available at https://mr-provisioner.github.io/mr-provisioner/v1/

## BMC

There is support for two different types of BMCs, `plain` and `moonshot`.

## Networking

The network is managed outside `mr-provisioner`, either by using `dnsmasq` or `KEA`.

`mr-provisioner` can be integrated with `KEA` via a plugin. This configuration gives visibility of the dhcp requests/assignments to the provisioner.

# Documentation

The documentation is work in progress and growing organically as questions are raised by users. Feel free to add issues to the project asking for new documentation items or clarifications:

https://mr-provisioner.readthedocs.io/

# Contributions

Contributions are welcome in the form of issues, feature requests, pull requests, code reviews, etc.
