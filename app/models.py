from app import db
from base64 import b64encode
from os import urandom
from datetime import datetime, timedelta
from app.bmc_types import resolve_bmc_type, BMCError
from sqlalchemy import true
import binascii


class BMC(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    ip = db.Column(db.String, unique=True, nullable=False)
    name = db.Column(db.String, unique=True, nullable=False)
    username = db.Column(db.String)
    password = db.Column(db.String)
    privilege_level = db.Column(db.String)
    bmc_type = db.Column(db.String)

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


class Machine(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String, unique=True, nullable=False)
    mac = db.Column(db.String, unique=True, nullable=False)
    pdu = db.Column(db.String)
    pdu_port = db.Column(db.Integer)
    serial = db.Column(db.String)
    serial_port = db.Column(db.Integer)
    kernel_id = db.Column(db.Integer, db.ForeignKey("image.id"))
    kernel_opts = db.Column(db.String)
    preseed_id = db.Column(db.Integer, db.ForeignKey("preseed.id"))
    initrd_id = db.Column(db.Integer, db.ForeignKey("image.id"))
    netboot_enabled = db.Column(db.Boolean)
    # arch needed?
    bmc_id = db.Column(db.Integer, db.ForeignKey("BMC.id"))
    bmc_info = db.Column(db.String)

    def __init__(self, name, mac, pdu=None, pdu_port=None, serial=None, serial_port=None, kernel_id=None, kernel_opts="",
                 preseed_id=None, initrd_id=None, netboot_enabled=False, bmc_id=None, bmc_info=""):
        self.name = name
        self.mac = mac
        self.pdu = pdu
        self.pdu_port = pdu_port
        self.serial = serial
        self.serial_port = serial_port
        self.kernel_id = kernel_id
        self.kernel_opts = kernel_opts
        self.preseed_id = preseed_id
        self.initrd_id = initrd_id
        self.netboot_enabled = netboot_enabled
        self.bmc_id = bmc_id
        self.bmc_info = bmc_info

    def __repr__(self):
        return "<name: %s, mac: %s, kernel: %d, kernel_opts: %s," \
               "initrd: %d, netboot_enabled: %b, bmc_id %d>" % (self.name,
                                                                self.mac,
                                                                self.kernel_id,
                                                                self.kernel_opts,
                                                                self.initrd_id,
                                                                self.netboot_enabled,
                                                                self.bmc_id)

    @property
    def kernel(self):
        return Image.query.get(self.kernel_id) if self.kernel_id else None

    @property
    def initrd(self):
        return Image.query.get(self.initrd_id) if self.initrd_id else None

    @property
    def preseed(self):
        return Preseed.query.get(self.preseed_id) if self.preseed_id else None

    def kernel_opts_all(self, config):
        preseed_opts = self.preseed.kernel_opts(self, config) if self.preseed_id else ""
        return preseed_opts + " " + (self.kernel_opts if self.kernel_opts else "")

    @property
    def bmc(self):
        return BMC.query.get(self.bmc_id) if self.bmc_id else None

    @property
    def user(self):
        # XXX: support multiple
        machine_user = MachineUsers.query.filter_by(machine_id=self.id).first()
        return machine_user.assigned_user if machine_user else None

    @property
    def assignees(self):
        return map(lambda mu: mu.assigned_user, self.assignments)

    @property
    def assignments(self):
        return MachineUsers.query.filter_by(machine_id=self.id).all()

    @property
    def assignment(self):
        # XXX: support multiple
        machine_user = MachineUsers.query.filter_by(machine_id=self.id).first()
        return machine_user if machine_user else None

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

    @property
    def serialize(self):
        """Return object data in serialized format"""
        return {
            'name': self.name,
            'mac': self.mac,
            'bmc': self.bmc,
            'pdu': self.pdu,
            'pdu_port': self.pdu_port,
            'serial': self.serial,
            'serial_port': self.serial_port,
            'kernel': self.kernel,
            'kernel_opts': self.kernel_opts,
            'initrd': self.initrd,
            'netboot_enabled': self.netboot_enabled
        }

    @staticmethod
    def by_mac(mac):
        try:
            return db.session.query(Machine).filter_by(mac=mac).one()
        except db.NoResultsFound:
            return None


class ConsoleToken(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    token = db.Column(db.String, unique=True, nullable=False)
    created_at = db.Column(db.DateTime, nullable=False)
    command_response = db.Column(db.Text)

    def __init__(self, command_response):
        self.command_response = command_response
        self.token = ConsoleToken.gen_token()
        print("Token: %s " % self.token)
        self.created_at = datetime.utcnow()

    @staticmethod
    def cleanup():
        db.session.query(ConsoleToken).filter(
            ConsoleToken.created_at <= (datetime.utcnow() - timedelta(minutes=5))
        ).delete()
        db.session.commit()

    @staticmethod
    def gen_token():
        return binascii.hexlify(urandom(24)).decode('utf-8')


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


class Token(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, nullable=False)
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


class MachineUsers(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    machine_id = db.Column(db.Integer, db.ForeignKey("machine.id", ondelete="CASCADE"))
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"))
    permissions = db.Column(db.Integer)
    start_date = db.Column(db.DateTime, nullable=False)
    reason = db.Column(db.Text, nullable=False)

    def __init__(self, machine_id, user_id, permissions, reason):
        self.start_date = datetime.now()
        self.machine_id = machine_id
        self.user_id = user_id
        self.permissions = permissions
        self.reason = reason

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

    @property
    def assigned_user(self):
        return User.query.get(self.user_id)


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


class Image(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    filename = db.Column(db.String, unique=True, nullable=False)
    description = db.Column(db.String, nullable=False)
    file_type = db.Column(db.String, nullable=False)
    date = db.Column(db.DateTime, nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"))
    known_good = db.Column(db.Boolean, nullable=False)
    public = db.Column(db.Boolean, nullable=False)

    def __init__(self, filename, description, file_type, user_id, known_good, public):
        self.date = datetime.now()
        self.filename = filename
        self.description = description
        self.file_type = file_type
        self.user_id = user_id
        self.known_good = known_good
        self.public = public

    def __repr__(self):
        return '<filename: %s, user_id: %d, known_good: %s>' % (self.filename, self.user_id, self.known_good)

    def serialize(self):
        return {
            'filename': self.filename,
            'description': self.description,
            'file_type': self.file_type,
            'date': self.date.strftime("%Y-%m-%d %H:%M"),
            'user_id': self.user_id,
            'known_good': self.known_good,
            'public': self.public
        }

    @property
    def user(self):
        return User.query.get(self.user_id)

    @staticmethod
    def all_visible(user):
        if(user.admin):
            return db.session.query(Image).all()
        else:
            return db.session.query(Image).filter((Image.public == true()) | (Image.user_id == user.id)).all()


class Preseed(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    filename = db.Column(db.String, unique=True, nullable=False)
    description = db.Column(db.String, unique=True, nullable=False)
    file_type = db.Column(db.String, nullable=False)
    file_content = db.Column(db.Text, nullable=False)
    date = db.Column(db.DateTime, nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"))
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

    @property
    def user(self):
        return User.query.get(self.user_id)

    @staticmethod
    def all_visible(user):
        if(user.admin):
            return db.session.query(Preseed).all()
        else:
            return db.session.query(Preseed).filter((Preseed.public == true()) | (Preseed.user_id == user.id)).all()
