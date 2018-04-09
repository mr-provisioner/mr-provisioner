from mr_provisioner import db
from base64 import b64encode
from os import urandom
import json
from datetime import datetime, timedelta
from mr_provisioner.bmc_types import resolve_bmc_type, BMCError, list_bmc_types
from sqlalchemy import true, event, text
from sqlalchemy.dialects.postgresql import JSONB, INET, CIDR, MACADDR
from sqlalchemy.orm.exc import NoResultFound
from sqlalchemy.schema import UniqueConstraint
from sqlalchemy import func
from mr_provisioner.util.query import build_filter
import binascii
from netaddr import IPSet, IPNetwork
import itertools
import re


class BMC(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    ip = db.Column(db.String, unique=True, nullable=False)
    name = db.Column(db.String, unique=True, nullable=False)
    username = db.Column(db.String)
    password = db.Column(db.String)
    privilege_level = db.Column(db.String)
    bmc_type = db.Column(db.String)
    machines = db.relationship("Machine", back_populates="bmc", passive_deletes=True)

    def __init__(self, ip, name, username, password, privilege_level, bmc_type):
        self.ip = ip
        self.name = name
        self.username = username
        self.password = password
        self.privilege_level = privilege_level
        self.bmc_type = bmc_type

    @property
    def serialize(self):
        """Return object data in serialized format"""
        return {
            'ip': self.ip,
            'name': self.name,
            'username': self.username,
            'password': self.password,
            'privilege_level': self.privilege_level,
            'bmc_type': self.bmc_type
        }

    @property
    def type_inst(self):
        return resolve_bmc_type(self.bmc_type)

    def check_permission(self, user, min_priv_level='any'):
        if user.admin:
            return True
        elif min_priv_level == 'admin':
            return False

        return False

    @staticmethod
    def can_create(user):
        return True if user.admin else False

    @staticmethod
    def list_types():
        return [t.name for t in list_bmc_types()]


class DiscoveredMAC(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    mac = db.Column(MACADDR, unique=True, nullable=False)
    info = db.Column(JSONB)
    last_seen = db.Column(db.DateTime, nullable=False)

    def __init__(self, *, mac, info):
        self.mac = mac
        self.info = info
        self.last_seen = datetime.utcnow()

    @staticmethod
    def by_mac(mac):
        try:
            d = DiscoveredMAC.query.filter_by(mac=mac).one()
            return d
        except NoResultFound:
            return None

    @staticmethod
    def can_list(user):
        return True if user.admin else False


class Lease(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    mac = db.Column(MACADDR, unique=True, nullable=False)
    ipv4 = db.Column(INET)
    last_seen = db.Column(db.DateTime, nullable=False)

    def __init__(self, *, mac, ipv4):
        self.mac = mac
        self.ipv4 = ipv4
        self.last_seen = datetime.utcnow()

    @staticmethod
    def by_mac(mac):
        try:
            lease = Lease.query.filter_by(mac=mac).one()
            return lease
        except NoResultFound:
            return None


@event.listens_for(Lease.mac, 'set', retval=True)
def set_lease_mac(target, value, oldvalue, initiator):
    return value.lower()


class Interface(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    mac = db.Column(MACADDR, unique=True, nullable=False)
    identifier = db.Column(db.String, nullable=True)
    dhcpv4 = db.Column(db.Boolean)
    static_ipv4 = db.Column(INET, nullable=True)
    reserved_ipv4 = db.Column(INET, nullable=True)
    machine_id = db.Column(db.Integer, db.ForeignKey("machine.id", ondelete="CASCADE"))
    machine = db.relationship("Machine", passive_deletes=True)
    network_id = db.Column(db.Integer, db.ForeignKey("network.id", ondelete="SET NULL"), nullable=True)
    network = db.relationship("Network", passive_deletes=True)
    __table_args__ = (UniqueConstraint('static_ipv4', 'network_id'),
                      UniqueConstraint('reserved_ipv4', 'network_id'),)

    def __init__(self, *, mac, machine_id, network_id=None, dhcpv4=True, identifier=None,
                 static_ipv4=None, reserved_ipv4=None):
        self.mac = mac
        self.identifier = identifier
        self.dhcpv4 = dhcpv4
        self.static_ipv4 = static_ipv4
        self.reserved_ipv4 = reserved_ipv4
        self.machine_id = machine_id
        self.network_id = network_id

    @property
    def lease(self):
        return Lease.query.filter_by(mac=self.mac).first()

    @property
    def config_type_v4(self):
        if self.network and self.static_ipv4:
            return 'static'
        elif self.network and self.reserved_ipv4:
            return 'dynamic-reserved'
        else:
            return 'dynamic'

    @property
    def configured_ipv4(self):
        if self.config_type_v4 == 'static':
            return self.static_ipv4
        elif self.config_type_v4 == 'dynamic-reserved':
            return self.reserved_ipv4
        else:
            return None

    @staticmethod
    def by_mac(mac):
        try:
            interface = Interface.query.filter_by(mac=mac).one()
            return interface
        except NoResultFound:
            return None

    @staticmethod
    def update_discovery(connection, interface):
        query = DiscoveredMAC.__table__.delete().where((DiscoveredMAC.mac == interface.mac))
        connection.execute(query)


@event.listens_for(Interface.mac, 'set', retval=True)
def set_interface_mac(target, value, oldvalue, initiator):
    return value.lower()


@event.listens_for(Interface, 'after_update')
def interface_after_update(mapper, connection, target):
    Interface.update_discovery(connection, target)


@event.listens_for(Interface, 'after_insert')
def interface_after_insert(mapper, connection, target):
    Interface.update_discovery(connection, target)


class Machine(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String, unique=True, nullable=False)
    pdu = db.Column(db.String)
    pdu_port = db.Column(db.Integer)
    serial = db.Column(db.String)
    serial_port = db.Column(db.Integer)
    kernel_id = db.Column(db.Integer, db.ForeignKey("image.id"))
    kernel = db.relationship("Image", foreign_keys=[kernel_id], passive_deletes=True)
    kernel_opts = db.Column(db.String)
    preseed_id = db.Column(db.Integer, db.ForeignKey("preseed.id"))
    preseed = db.relationship("Preseed", passive_deletes=True)
    initrd_id = db.Column(db.Integer, db.ForeignKey("image.id"))
    initrd = db.relationship("Image", foreign_keys=[initrd_id], passive_deletes=True)
    netboot_enabled = db.Column(db.Boolean)
    arch_id = db.Column(db.Integer, db.ForeignKey("arch.id"), nullable=False)
    arch = db.relationship("Arch", foreign_keys=[arch_id], passive_deletes=True)
    subarch_id = db.Column(db.Integer, db.ForeignKey("subarch.id"), nullable=True)
    subarch = db.relationship("Subarch", foreign_keys=[subarch_id], passive_deletes=True)
    bmc_id = db.Column(db.Integer, db.ForeignKey("BMC.id"))
    bmc = db.relationship("BMC", passive_deletes=True)
    bmc_info = db.Column(db.String)
    state = db.Column(db.String)

    interfaces = db.relationship("Interface", back_populates="machine", passive_deletes=True)
    assignments = db.relationship("MachineUsers", back_populates="machine", passive_deletes=True)

    def __init__(self, name, arch_id, subarch_id=None, pdu=None, pdu_port=None, serial=None,
                 serial_port=None, kernel_id=None, kernel_opts="", preseed_id=None,
                 initrd_id=None, netboot_enabled=False, bmc_id=None, bmc_info=""):
        self.name = name
        self.pdu = pdu
        self.pdu_port = pdu_port
        self.serial = serial
        self.serial_port = serial_port
        self.arch_id = arch_id
        self.subarch_id = subarch_id
        self.kernel_id = kernel_id
        self.kernel_opts = kernel_opts
        self.preseed_id = preseed_id
        self.initrd_id = initrd_id
        self.netboot_enabled = netboot_enabled
        self.bmc_id = bmc_id
        self.bmc_info = bmc_info
        self.state = "unknown"

    @property
    def macs(self):
        return map(lambda i: i.mac, self.interfaces)

    def kernel_opts_all(self, config):
        preseed_opts = self.preseed.kernel_opts(self, config) if self.preseed_id else ""
        return preseed_opts + " " + (self.kernel_opts if self.kernel_opts else "")

    # XXX: get rid of it.
    @property
    def user(self):
        # XXX: support multiple
        machine_user = MachineUsers.query.filter_by(machine_id=self.id).first()
        return machine_user.user if machine_user else None

    @property
    def assignees(self):
        return [mu.user for mu in self.assignments]

    # XXX: get rid of it.
    @property
    def assignment(self):
        # XXX: support multiple
        machine_user = MachineUsers.query.filter_by(machine_id=self.id).first()
        return machine_user if machine_user else None

    @property
    def bootloader(self):
        return self.subarch.bootloader if self.subarch else None

    @property
    def hostname(self):
        return re.sub(r'[^a-zA-Z0-9]', '-', self.name)

    @property
    def power_state(self):
        bmc = self.bmc
        if not bmc:
            return "unknown"

        try:
            # XXX: consider proxying get_power in bmc so that one can do bmc.get_power instead
            return bmc.type_inst.get_power(self)
        except BMCError as e:
            return "Unknown (BMC error)"

    def reboot(self):
        bmc = self.bmc
        # XXX: raise exception if not bmc
        if self.power_state == "on":
            bmc.type_inst.set_power(self, "reset")
        else:
            bmc.type_inst.set_power(self, "on")

    def pxe_reboot(self):
        bmc = self.bmc
        # XXX: raise exception if not bmc
        bmc.type_inst.set_bootdev(self, "pxe")
        if self.power_state == "on":
            bmc.type_inst.set_power(self, "reset")
        else:
            bmc.type_inst.set_power(self, "on")

    def disk_reboot(self):
        bmc = self.bmc
        # XXX: raise exception if not bmc
        bmc.type_inst.set_bootdev(self, "disk")
        if self.power_state == "on":
            bmc.type_inst.set_power(self, "reset")
        else:
            bmc.type_inst.set_power(self, "on")

    def bios_reboot(self):
        bmc = self.bmc
        # XXX: raise exception if not bmc
        bmc.type_inst.set_bootdev(self, "bios")
        if self.power_state == "on":
            bmc.type_inst.set_power(self, "reset")
        else:
            bmc.type_inst.set_power(self, "on")

    def set_power(self, power_state):
        if power_state == 'pxe_reboot':
            self.pxe_reboot()
        elif power_state == 'disk_reboot':
            self.disk_reboot()
        elif power_state == 'bios_reboot':
            self.bios_reboot()
        else:
            power_state = 'reset' if power_state == 'reboot' else power_state
            bmc = self.bmc
            # XXX: raise exception if not bmc
            bmc.type_inst.set_power(self, power_state)

    def deactivate_sol(self):
        bmc = self.bmc
        # XXX: raise exception if not bmc
        if self.power_state == "on":
            bmc.type_inst.deactivate_sol(self)

    @property
    def sol_command(self):
        bmc = self.bmc
        return bmc.type_inst.get_sol_command(self)

    def check_permission(self, user, min_priv_level='any'):
        # XXX: min_priv_level is something like 'any', 'assignee', 'admin'
        if user.admin:
            return True
        elif min_priv_level == 'admin':
            return False

        if user in self.assignees:
            return True
        elif min_priv_level == 'assignee':
            return False

        return True

    @staticmethod
    def can_create(user):
        return True if user.admin else False

    @staticmethod
    def by_mac(mac):
        try:
            interface = Interface.query.filter_by(mac=mac).one()
            return Machine.query.get(interface.machine_id)
        except NoResultFound:
            return None

    @staticmethod
    def query_by_criteria(query_str, *, no_assignees=False):
        intf_subq = (db.session.query(Interface.machine_id,
                                      func.count(Interface.machine_id).label("interface_count"))
                     .group_by(Interface.machine_id)).subquery("interface")

        mu_subq = (db.session.query(MachineUsers.machine_id,
                                    func.count(MachineUsers.machine_id).label("assignee_count"))
                   .group_by(MachineUsers.machine_id)).subquery("assignee")

        sym_table = {
            'name': Machine.name,
            'assignee_count': func.coalesce(mu_subq.c.assignee_count, 0),
            'interface_count': func.coalesce(intf_subq.c.interface_count, 0),
            'bmc_type': func.coalesce(BMC.bmc_type, ''),
            'arch': func.coalesce(Arch.name, ''),
            'nil': None,
        }

        # Build base query, filtering out machines that have assignees already
        q = db.session.query(Machine) \
            .outerjoin(BMC, BMC.id == Machine.bmc_id) \
            .outerjoin(Arch, Arch.id == Machine.arch_id) \
            .outerjoin(intf_subq, Machine.id == intf_subq.c.machine_id) \
            .outerjoin(mu_subq, Machine.id == mu_subq.c.machine_id)

        if no_assignees:
            q = q.filter(func.coalesce(mu_subq.c.assignee_count, 0) == 0)

        # Parse the query string and further filter expression based on it
        f = build_filter(query_str, sym_table)
        if f is not None:
            q = q.filter(f)

        return q


# Architectures are AArch64/ARM/x86_64
class Arch(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String, unique=True, nullable=False)
    description = db.Column(db.String)
    subarchs = db.relationship("Subarch", back_populates="arch", passive_deletes=True)

    def __init__(self, name, description=None):
        self.name = name
        self.description = description

    def check_permission(self, user, min_priv_level='any'):
        if user.admin:
            return True
        elif min_priv_level == 'admin':
            return False

        return False

    @property
    def machines(self):
        return Machine.query.filter((Machine.arch_id == self.id)).all()

    @staticmethod
    def can_create(user):
        return True if user.admin else False


# Sub architectures are UEFI/BIOS/etc
class Subarch(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String, nullable=False)
    description = db.Column(db.String)
    arch_id = db.Column(db.Integer, db.ForeignKey("arch.id", ondelete="CASCADE"), nullable=False)
    arch = db.relationship("Arch", foreign_keys=[arch_id], passive_deletes=True)
    bootloader_id = db.Column(db.Integer, db.ForeignKey("image.id"))
    bootloader = db.relationship("Image", foreign_keys=[bootloader_id], passive_deletes=True)
    efiboot = db.Column(db.Boolean, nullable=False)

    def __init__(self, name, arch_id, description=None, bootloader_id=None, efiboot=False):
        self.name = name
        self.description = description
        self.arch_id = arch_id
        self.bootloader_id = bootloader_id
        self.efiboot = efiboot

    def check_permission(self, user, min_priv_level='any'):
        if user.admin:
            return True
        elif min_priv_level == 'admin':
            return False

        return False

    @staticmethod
    def can_create(user):
        return True if user.admin else False


# Ensure each architecture only has one of each sub architectures
# i.e. only one ARM64 - UEFI
db.Index('subarch_arch_name_uniq', Subarch.arch_id, Subarch.name, unique=True)


class ConsoleToken(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    token = db.Column(db.String, unique=True, nullable=False)
    created_at = db.Column(db.DateTime, nullable=False)
    command_response = db.Column(db.Text)
    machine_id = db.Column(db.Integer, db.ForeignKey("machine.id", ondelete="CASCADE"))
    machine = db.relationship("Machine", passive_deletes=True)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id", ondelete="CASCADE"))
    user = db.relationship("User", passive_deletes=True)

    def __init__(self, *, command_response, machine_id, user_id):
        self.command_response = command_response
        self.token = ConsoleToken.gen_token()
        print("Token: %s " % self.token)
        self.created_at = datetime.utcnow()
        self.machine_id = machine_id
        self.user_id = user_id

    @staticmethod
    def cleanup():
        db.session.query(ConsoleToken).filter(
            ConsoleToken.created_at <= (datetime.utcnow() - timedelta(minutes=5))
        ).delete()
        db.session.commit()

    @staticmethod
    def gen_token():
        return binascii.hexlify(urandom(24)).decode('utf-8')

    @staticmethod
    def create_token_for_machine(machine, user):
        if not machine.bmc:
            raise ValueError('no BMC configured')

        (cmd, args) = machine.sol_command

        command_response = {
            'command': cmd,
            'args': args,
        }

        sol_token = ConsoleToken(command_response=json.dumps(command_response),
                                 machine_id=machine.id, user_id=user.id)
        db.session.add(sol_token)
        db.session.commit()
        db.session.refresh(sol_token)

        return sol_token


class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String, unique=True, nullable=False)
    email = db.Column(db.String, nullable=False)
    ldap = db.Column(db.Boolean)
    ssh_key = db.Column(db.Text)
    password = db.Column(db.String)
    admin = db.Column(db.Boolean)

    def __init__(self, username, email, ldap, ssh_key, password, admin):
        self.username = username
        self.email = email
        self.ldap = ldap
        self.ssh_key = ssh_key
        self.password = password
        self.admin = admin

    def __repr__(self):
        return "<username: %s, email: %s, ldap: %b, ssh_key: %s, " \
               "password: %s, admin: %b>" % (self.username,
                                             self.email,
                                             self.ldap,
                                             self.ssh_key,
                                             self.password,
                                             self.admin)

    def serialize(self):
        """Return object data in serialized format"""
        return {
            'username': self.name,
            'email': self.email,
            'ldap': self.ldap,
            'ssh_key': self.ssh_key,
            'password': self.password,
            'admin': self.admin
        }

    def check_permission(self, user, min_priv_level='any'):
        if user.admin:
            return True
        elif min_priv_level == 'admin':
            return False

        return False

    @staticmethod
    def can_create(user):
        return True if user.admin else False

    @staticmethod
    def by_username(username):
        return User.query.filter_by(username=username).first()


class Token(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"))
    user = db.relationship("User", passive_deletes=True)
    token = db.Column(db.String, unique=True, nullable=False)
    desc = db.Column(db.String)

    def __init__(self, user_id, token, desc):
        if not token:
            token = b64encode(urandom(32)).decode('utf-8')
        self.user_id = user_id
        self.token = token
        self.desc = desc

    def __repr__(self):
        return ''

    def serialize(self):
        """Return object data in serialized format"""
        return {
            'id': self.id,
            'user_id': self.user_id,
            'token': self.token,
            'desc': self.desc,
        }

    def check_permission(self, user, min_priv_level='any'):
        if user.admin:
            return True
        elif min_priv_level == 'admin':
            return False

        if user.id == self.user_id:
            return True
        elif min_priv_level == 'owner':
            return False

        return False

    @staticmethod
    def by_user(user):
        return db.session.query(Token).filter_by(user_id=user.id).all()

    @staticmethod
    def by_token(token):
        return Token.query.filter_by(token=token).first()

    @staticmethod
    def can_create(user):
        return True


class MachineUsers(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    machine_id = db.Column(db.Integer, db.ForeignKey("machine.id", ondelete="CASCADE"))
    machine = db.relationship("Machine", passive_deletes=True)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"))
    user = db.relationship("User", passive_deletes=True)
    permissions = db.Column(db.Integer)
    start_date = db.Column(db.DateTime, nullable=False)
    reason = db.Column(db.Text, nullable=False)
    __table_args__ = (UniqueConstraint('machine_id', 'user_id'),)

    def __init__(self, machine_id, user_id, permissions, reason):
        self.start_date = datetime.now()
        self.machine_id = machine_id
        self.user_id = user_id
        self.permissions = permissions
        self.reason = reason if reason is not None else ""

    def __repr__(self):
        return "<machine_id: %d, user_id: %d, permissions: %d, " \
               "start_date: %s, reason: %s>" % (self.machine_id,
                                                self.user_id,
                                                self.permissions,
                                                self.start_date,
                                                self.reason)

    def serialize(self):
        return {
            'machine_id': self.machine_id,
            'user_id': self.user_id,
            'permissions': self.permissions,
            'start_date': self.start_date.strftime("%Y-%m-%d"),
            'reason': self.reason
        }


class AuditLog(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    machine_name = db.Column(db.String, nullable=False)
    user_name = db.Column(db.String, nullable=False)
    permissions = db.Column(db.Integer)
    start_date = db.Column(db.DateTime, nullable=False)
    end_date = db.Column(db.DateTime, nullable=False)

    def __repr__(self):
        return "<machine_name: %s, user_name: %s, permissions: %d, " \
               "start_date: %s, end_date: %s>" % (self.machine_name,
                                                  self.user_name,
                                                  self.permissions,
                                                  self.start_date,
                                                  self.end_date)

    def serialize(self):
        return {
            'machine_name': self.machine_name,
            'user_name': self.user_name,
            'permissions': self.permissions,
            'start_date': self.start_date,
            'end_date': self.end_date
        }


class MachineEventType:
    CONSOLE_ACCESS = 1
    # info: { }

    POWER_CHANGE = 2
    # info: { "power": string }

    PRESEED_ACCESS = 3
    # info: { "client_ip": string }

    PRESEED_ERROR = 4
    # info: { "client_ip": string, "message": string, "lineno": int }

    PHONE_HOME = 5
    # info: { "client_ip": string }

    STATE_CHANGE = 6
    # info: { "state": string, "reason": string (one of: api/phone_home) }

    DHCP_REQ = 7
    # info: { "discover": bool }

    TFTP_REQ = 8
    # info: { "filename": string }


class MachineEvent(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    machine_id = db.Column(db.Integer, db.ForeignKey("machine.id", ondelete="CASCADE"))
    machine = db.relationship("Machine", passive_deletes=True)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id", ondelete="SET NULL"), nullable=True)
    user = db.relationship("User", passive_deletes=True)
    username = db.Column(db.String, nullable=True)
    date = db.Column(db.DateTime, nullable=False)
    event_type = db.Column(db.Integer, nullable=False)
    info = db.Column(JSONB)

    def __init__(self, *, event_type, info, machine_id, user):
        self.date = datetime.now()
        self.event_type = event_type
        self.info = info
        self.machine_id = machine_id
        self.user_id = user.id if user else None
        self.username = user.username if user else None

    @staticmethod
    def by_machine_id(machine_id, limit=0):
        q = MachineEvent.query.filter_by(machine_id=machine_id).order_by(MachineEvent.date.desc())
        if limit and limit > 0:
            q = q.limit(limit)
        return q.all()

    @staticmethod
    def cleanup():
        db.session.query(MachineEvent).filter(
            MachineEvent.date <= (datetime.utcnow() - timedelta(days=30))
        ).delete()

    @staticmethod
    def console_accessed(machine_id, user):
        event = MachineEvent(event_type=MachineEventType.CONSOLE_ACCESS,
                             info={},
                             machine_id=machine_id,
                             user=user)
        db.session.add(event)
        db.session.commit()

    @staticmethod
    def power_changed(machine_id, user, power_state):
        event = MachineEvent(event_type=MachineEventType.POWER_CHANGE,
                             info={'power': power_state},
                             machine_id=machine_id,
                             user=user)
        db.session.add(event)
        db.session.commit()

    @staticmethod
    def state_changed(machine_id, user, state, reason):
        event = MachineEvent(event_type=MachineEventType.STATE_CHANGE,
                             info={'state': state, 'reason': reason},
                             machine_id=machine_id,
                             user=user)
        db.session.add(event)
        db.session.commit()

    @staticmethod
    def preseed_accessed(machine_id, user, client_ip):
        event = MachineEvent(event_type=MachineEventType.PRESEED_ACCESS,
                             info={'client_ip': client_ip},
                             machine_id=machine_id,
                             user=user)
        db.session.add(event)
        db.session.commit()

    @staticmethod
    def preseed_error(machine_id, user, client_ip, message, lineno=0):
        event = MachineEvent(event_type=MachineEventType.PRESEED_ERROR,
                             info={'client_ip': client_ip, 'message': message, 'lineno': lineno},
                             machine_id=machine_id,
                             user=user)
        db.session.add(event)
        db.session.commit()

    @staticmethod
    def dhcp_request(machine_id, user, discover):
        event = MachineEvent(event_type=MachineEventType.DHCP_REQ,
                             info={'discover': discover},
                             machine_id=machine_id,
                             user=user)
        db.session.add(event)
        db.session.commit()

    @staticmethod
    def tftp_request(machine_id, user, filename):
        event = MachineEvent(event_type=MachineEventType.TFTP_REQ,
                             info={'filename': filename},
                             machine_id=machine_id,
                             user=user)
        db.session.add(event)
        db.session.commit()


@event.listens_for(MachineEvent, 'after_insert')
def machine_event_after_insert(mapper, connection, target):
    MachineEvent.cleanup()


class Image(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    filename = db.Column(db.String, unique=True, nullable=False)
    description = db.Column(db.String)
    file_type = db.Column(db.String, nullable=False)
    arch_id = db.Column(db.Integer, db.ForeignKey("arch.id"), nullable=False)
    arch = db.relationship("Arch", foreign_keys=[arch_id], passive_deletes=True)
    date = db.Column(db.DateTime, nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"))
    user = db.relationship("User", passive_deletes=True)
    known_good = db.Column(db.Boolean, nullable=False)
    public = db.Column(db.Boolean, nullable=False)

    def __init__(self, filename, description, file_type, user_id, known_good, public, arch_id=None):
        self.date = datetime.now()
        self.filename = filename
        self.description = description
        self.file_type = file_type
        self.user_id = user_id
        self.known_good = known_good
        self.public = public
        self.arch_id = arch_id

    def __repr__(self):
        return '<filename: %s, user_id: %d, known_good: %s>' % (self.filename, self.user_id, self.known_good)

    def serialize(self):
        return {
            'filename': self.filename,
            'description': self.description,
            'file_type': self.file_type,
            'date': self.date.strftime("%Y-%m-%d %H:%M"),
            'arch_id': self.arch_id,
            'user_id': self.user_id,
            'known_good': self.known_good,
            'public': self.public
        }

    @property
    def machines(self):
        return Machine.query.filter((Machine.kernel_id == self.id) | (Machine.initrd_id == self.id)).all()

    def check_permission(self, user, min_priv_level='any'):
        if user.admin:
            return True
        elif min_priv_level == 'admin':
            return False

        if user.id == self.user_id:
            return True
        elif min_priv_level == 'owner':
            return False

        return self.public

    @staticmethod
    def can_create(user):
        return True

    @staticmethod
    def all():
        return db.session.query(Image).all()

    @staticmethod
    def all_visible(user):
        if(user.admin):
            return db.session.query(Image).all()
        else:
            return db.session.query(Image).filter((Image.public == true()) | (Image.user_id == user.id)).all()

    @staticmethod
    def list_types():
        return ['Initrd', 'Kernel', 'bootloader']


class Preseed(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    filename = db.Column(db.String, unique=True, nullable=False)
    description = db.Column(db.String)
    file_type = db.Column(db.String, nullable=False)
    file_content = db.Column(db.Text)
    date = db.Column(db.DateTime, nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"))
    user = db.relationship("User", passive_deletes=True)
    machines = db.relationship("Machine", back_populates="preseed", passive_deletes=True)
    known_good = db.Column(db.Boolean, nullable=False)
    public = db.Column(db.Boolean, nullable=False)

    def __init__(self, filename, description, file_type, file_content, user_id, known_good, public):
        self.date = datetime.now()
        self.filename = filename
        self.description = description
        self.file_type = file_type
        self.file_content = file_content
        self.user_id = user_id
        self.known_good = known_good
        self.public = public

    def __repr__(self):
        return "<filename: %s, file_type: %s, user_id: %d, known_good: %s>" % (self.filename,
                                                                               self.file_type,
                                                                               self.user_id,
                                                                               self.known_good)

    def preseed_url(self, machine, config):
        return "%s/preseed/%s" % (config['CONTROLLER_ACCESS_URI'], machine.id)

    def kernel_opts(self, machine, config):
        if self.file_type == "preseed":
            options = "auto=true priority=critical url=%s interface=auto" % (self.preseed_url(machine, config))

            if config['PRESEED_DNS']:
                options += " netcfg/get_nameservers=%s" % (config['PRESEED_DNS'])

        elif self.file_type == "kickstart":
            options = "ks=%s kssendmac" % self.preseed_url(machine, config)

            if config['PRESEED_DNS']:
                options += " dns=%s" % (config['PRESEED_DNS'])

        return options

    def serialize(self):
        return {
            'filename': self.filename,
            'file_content': self.file_content,
            'type': self.type,
            'date': self.date.strftime("%Y-%m-%d %H:%M"),
            'user_id': self.user_id,
            'known_good': self.known_good,
            'public': self.public
        }

    def check_permission(self, user, min_priv_level='any'):
        if user.admin:
            return True
        elif min_priv_level == 'admin':
            return False

        if user.id == self.user_id:
            return True
        elif min_priv_level == 'owner':
            return False

        return self.public

    @staticmethod
    def can_create(user):
        return True

    @staticmethod
    def all():
        return db.session.query(Preseed).all()

    @staticmethod
    def all_visible(user):
        if(user.admin):
            return db.session.query(Preseed).all()
        else:
            return db.session.query(Preseed).filter((Preseed.public == true()) | (Preseed.user_id == user.id)).all()

    @staticmethod
    def list_types():
        return ['preseed', 'kickstart']


class Network(db.Model):
    __tablename__ = 'network'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String, unique=True, nullable=False)
    subnet = db.Column(CIDR, unique=True, nullable=False)
    reserved_net = db.Column(CIDR, unique=True, nullable=True)
    static_net = db.Column(CIDR, unique=True, nullable=True)
    interfaces = db.relationship("Interface", back_populates="network", passive_deletes=True)

    def __init__(self, *, name, subnet, reserved_net=None, static_net=None):
        self.name = name
        self.subnet = subnet
        self.reserved_net = reserved_net
        self.static_net = static_net

    @property
    def machines(self):
        return Machine.query.join(Machine.interfaces).filter(Interface.network_id == self.id).all()

    @property
    def prefix(self):
        return IPNetwork(self.subnet).prefixlen

    @property
    def netmask(self):
        return str(IPNetwork(self.subnet).netmask)

    def check_permission(self, user, min_priv_level='any'):
        if user.admin:
            return True
        elif min_priv_level == 'admin':
            return False

        return False

    def available_ipv4s(self, limit=25):
        def _gen(ip_set):
            for ip_net in ip_set.iter_cidrs():
                for ip in ip_net.iter_hosts():
                    if ip.words[-1] not in [0, 255, 0xffff]:
                        yield ip

        interfaces = Interface.query.filter_by(network_id=self.id).all()

        static_ips = IPSet([self.static_net]) if self.static_net else IPSet()
        reserved_ips = IPSet([self.reserved_net]) if self.reserved_net else IPSet()

        for interface in interfaces:
            if interface.static_ipv4:
                static_ips.remove(interface.static_ipv4)
            if interface.reserved_ipv4:
                reserved_ips.remove(interface.reserved_ipv4)

        return (list(itertools.islice(_gen(static_ips), limit)),
                list(itertools.islice(_gen(reserved_ips), limit)))

    def ip_in_use(self, ip, *, exclude_intf=None):
        query = Interface.query.filter((Interface.network_id == self.id) &
                                       ((Interface.reserved_ipv4 == ip) |
                                       (Interface.static_ipv4 == ip)))
        if exclude_intf:
            query = query.filter((Interface.id != exclude_intf.id))

        return query.count() != 0

    @staticmethod
    def subnet_conflicts(subnet, *, exclude_network=None):
        query = Network.query.filter(
            text('network(:range) << subnet OR network(:range) >>= subnet')).\
            params(range=subnet)

        if exclude_network:
            query = query.filter((Network.id != exclude_network.id))

        return query.count() != 0

    @staticmethod
    def static_net_changed(connection, network):
        query = Interface.__table__.update().where((Interface.network_id == network.id))
        if network.static_net:
            query = query.where(text('not static_ipv4 << network(:range)'))
        query = query.values(static_ipv4=None)

        connection.execute(query, range=network.static_net)

    @staticmethod
    def reserved_net_changed(connection, network):
        query = Interface.__table__.update().where((Interface.network_id == network.id))
        if network.reserved_net:
            query = query.where(text('not reserved_ipv4 << network(:range)'))
        query = query.values(reserved_ipv4=None)

        connection.execute(query, range=network.reserved_net)

    @staticmethod
    def can_create(user):
        return True if user.admin else False


@event.listens_for(Network, 'before_update')
def network_before_update(mapper, connection, target):
    Network.static_net_changed(connection, target)
    Network.reserved_net_changed(connection, target)
