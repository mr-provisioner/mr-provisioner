from wtforms import Form, BooleanField, StringField, PasswordField, IntegerField, Field, TextField
from flask_wtf.file import FileField, FileRequired
from wtforms.validators import *

from wtforms.validators import ValidationError

from app.models import Image


class ValidImage(object):
    def __init__(self, image_type="Kernel", allow_empty=True, message=None):
        self.allow_empty = allow_empty
        self.image_type = image_type
        if not message:
            message = u'Field must be a valid %s.' % (image_type)
        self.message = message

    def __call__(self, form, field):
        if self.allow_empty and field.data == None:
            return
        image = Image.query.get(field.data)
        if not image or image.file_type != self.image_type:
            raise ValidationError(self.message)

class OptionalIntegerField(Field):
    def process_formdata(self, valuelist):
        if valuelist and len(valuelist) > 0:
            self.data = int(valuelist[0]) if len(valuelist[0]) > 0 else None
        else:
            self.data = None

class ChangePasswordForm(Form):
    id = IntegerField("hidden id", [InputRequired()])
    new_pass = PasswordField('Password', [InputRequired(), EqualTo('new_pass_confirm', message='Passwords must match'), Length(min=6, max=256)])
    new_pass_confirm = PasswordField('Password Confirmation')

class ChangeOwnPasswordForm(Form):
    new_pass = PasswordField('Password', [InputRequired(), EqualTo('new_pass_confirm', message='Passwords must match'), Length(min=6, max=256)])
    new_pass_confirm = PasswordField('Password Confirmation')

class ChangeSSHKeyForm(Form):
    ssh_key = TextField('SSHKey', [InputRequired(), Regexp("^ssh-rsa .*",message="This key does not start with the expected ssh-rsa format" )])

class CreateImageForm(Form):
    description = StringField("Description", [InputRequired(), Length(min=3, max=256)])
    image = FileField("Image", [FileRequired()])
    file_type = StringField("Wrong type of image", [InputRequired(), AnyOf(["Kernel","Initrd"])])
    known_good = BooleanField("Known good?", [InputRequired()], false_values=('false', '', '0'))
    public = BooleanField("Public?", [InputRequired()], false_values=('false', '', '0'))

class CreatePreseedForm(Form):
    filename = StringField("Filename", [InputRequired(), Length(min=3, max=256)])
    description = StringField("Description", [InputRequired(), Length(min=3, max=256)])
    file_content = TextField("File content", [InputRequired()])
    file_type = StringField("Wrong type of image", [InputRequired(), AnyOf(["kickstart","preseed"])])
    known_good = BooleanField("Known good?", [InputRequired()], false_values=('false', '', '0'))
    public = BooleanField("Public?", [InputRequired()], false_values=('false', '', '0'))

class ChangeMetadataImageForm(Form):
    description = StringField("Description", [InputRequired(), Length(min=3, max=256)])
    file_type = StringField("Wrong type of image", [InputRequired(), AnyOf(['Kernel','Initrd'])])
    known_good = BooleanField("Known good?", [InputRequired()], false_values=('false', '', '0'))
    public = BooleanField("Public?", [InputRequired()], false_values=('false', '', '0'))

class CreateMachineForm(Form):
    name = StringField("Name", [InputRequired(), Length(min=3, max=256)])
    mac = StringField("MAC address", [InputRequired(), MacAddress(message='Must provide a valid MAC address')])
    bmc_id = OptionalIntegerField("BMC", [Optional()])
    bmc_info = StringField("BMC info", [Optional()])
    pdu = StringField("PDU", [Length(max=256)])
    pdu_port = OptionalIntegerField("PDU port", [Optional(), NumberRange(max=256)])
    serial = StringField("Serial Console", [Length(max=256)])
    serial_port = OptionalIntegerField("Serial port", [Optional(), NumberRange(max=256)])
    kernel_id = OptionalIntegerField("Kernel", [Optional(), ValidImage(image_type="Kernel")])
    kernel_opts = StringField("Kernel opts", [Length(max=256)])
    initrd_id = OptionalIntegerField("Initrd", [Optional(), ValidImage(image_type="Initrd")])
    preseed_id =  OptionalIntegerField("Preseed", [Optional()])
    netboot_enabled = BooleanField("Is netboot enabled?", [InputRequired()], false_values=('false', '', '0'))
    reason = StringField("Reason for Assignment", [Length(max=256)])
    assignee = OptionalIntegerField("Assignee", [Optional()])

class ChangeMachineForm(Form):
    name = StringField("Name", [Optional(), Length(min=3, max=256)])
    mac = StringField("MAC address", [Optional(), MacAddress(message='Must provide a valid MAC address')])
    bmc_id = OptionalIntegerField("BMC", [Optional()])
    bmc_info = StringField("BMC info", [Optional()])
    pdu = StringField("PDU", [Length(max=256)])
    pdu_port = OptionalIntegerField("PDU port", [Optional(), NumberRange(max=256)])
    serial = StringField("Serial Console", [Length(max=256)])
    serial_port = OptionalIntegerField("Serial port", [Optional(), NumberRange(max=256)])
    kernel_id = OptionalIntegerField("Kernel", [Optional(), ValidImage(image_type="Kernel")])
    kernel_opts = StringField("Kernel opts", [Length(max=256)])
    initrd_id = OptionalIntegerField("Initrd", [Optional(), ValidImage(image_type="Initrd")])
    preseed_id =  OptionalIntegerField("Preseed", [Optional()])
    netboot_enabled = BooleanField("Is netboot enabled?", [InputRequired()], false_values=('false', '', '0'))
    reason = StringField("Reason for Assignment", [Length(max=256)])
    assignee = OptionalIntegerField("Assignee", [Optional()])

class CreateBMCForm(Form):
    name = StringField("Name", [Length(min=3, max=256)])
    ip = StringField("IP", [Optional(), IPAddress(ipv4=True, message='Must provide ipv4 address')])
    username = StringField("Username", [Length(max=256)])
    password = StringField("Password", [Length(max=256)])
    privilege_level = StringField("Wrong Privilege",[AnyOf(["user","admin"])])
    bmc_type = StringField("Wrong Type",[InputRequired(), AnyOf(["moonshot","plain"])])

class CreateUserForm(Form):
    username = StringField("Username", [InputRequired(), Length(min=3, max=256)])
    email = StringField("Email", [Email(message='Must provide valid email')])
    admin = BooleanField("Is admin?", [InputRequired()], false_values=('false', '', '0'))
