from wtforms import Form, BooleanField, StringField, PasswordField, IntegerField, Field, TextField, SelectField, \
    FormField, FieldList, TextAreaField
from flask_wtf.file import FileField, FileRequired

from wtforms.validators import ValidationError, AnyOf, Email, EqualTo, IPAddress, InputRequired, \
    Length, MacAddress, NumberRange, Optional, Regexp

from app.models import User, Token, Machine, Image, Preseed, BMC, MachineUsers, ConsoleToken

from app.bmc_types import list_bmc_types


def opt_int(s):
    return None if s == '' else int(s)


class ValidImage(object):
    def __init__(self, image_type="Kernel", allow_empty=True, message=None):
        self.allow_empty = allow_empty
        self.image_type = image_type
        if not message:
            message = u'Field must be a valid %s.' % (image_type)
        self.message = message

    def __call__(self, form, field):
        if self.allow_empty and field.data is None:
            return
        image = Image.query.get(field.data)
        if not image or image.file_type != self.image_type:
            raise ValidationError(self.message)


class OptionalIntegerField(IntegerField):
    def _value(self):
        return str(self.data) if self.data is not None else ''

    def process_formdata(self, valuelist):
        if valuelist and len(valuelist) > 0:
            self.data = int(valuelist[0]) if len(valuelist[0]) > 0 else None
        else:
            self.data = None


class ChangePasswordForm(Form):
    id = IntegerField("hidden id", [InputRequired()])
    new_pass = PasswordField('Password', [InputRequired(),
                                          EqualTo('new_pass_confirm', message='Passwords must match'),
                                          Length(min=6, max=256)])
    new_pass_confirm = PasswordField('Confirm Password')


class ChangeOwnPasswordForm(Form):
    new_pass = PasswordField('Password', [InputRequired(),
                                          EqualTo('new_pass_confirm', message='Passwords must match'),
                                          Length(min=6, max=256)])
    new_pass_confirm = PasswordField('Confirm Password')


class ChangeSSHKeyForm(Form):
    ssh_key = TextAreaField('SSHKey', [InputRequired(),
                                       Regexp("^ssh-rsa .*",
                                              message="This key does not start with the expected ssh-rsa format")])


class CreateImageForm(Form):
    description = StringField("Description", [InputRequired(),
                                              Length(min=3, max=256)])
    image = FileField("Image", [FileRequired()])
    file_type = SelectField("Type", [InputRequired(),
                                     AnyOf(['Kernel', 'Initrd'])],
                            choices=[("Kernel", "Kernel"), ("Initrd", "Initrd")])
    known_good = BooleanField("Known good?", false_values=('false', '', '0'))
    public = BooleanField("Public?", false_values=('false', '', '0'))


class ChangeMetadataImageForm(Form):
    description = StringField("Description", [InputRequired(),
                                              Length(min=3, max=256)])
    file_type = SelectField("Type", [InputRequired(),
                                     AnyOf(['Kernel', 'Initrd'])],
                            choices=[("Kernel", "Kernel"), ("Initrd", "Initrd")])
    known_good = BooleanField("Known good?", false_values=('false', '', '0'))
    public = BooleanField("Public?", false_values=('false', '', '0'))


class CreatePreseedForm(Form):
    filename = StringField("Filename", [InputRequired(),
                                        Length(min=3, max=256)])
    description = StringField("Description", [InputRequired(),
                                              Length(min=3, max=256)])
    file_content = TextAreaField("Contents", [InputRequired()])
    file_type = SelectField("Type", [InputRequired(),
                                     AnyOf(["kickstart", "preseed"])],
                            choices=[("kickstart", "kickstart"), ("preseed", "Debian Preseed")])
    known_good = BooleanField("Known good?", false_values=('false', '', '0'))
    public = BooleanField("Public?", false_values=('false', '', '0'))


class ChangePreseedForm(Form):
    description = StringField("Description", [InputRequired(),
                                              Length(min=3, max=256)])
    file_content = TextAreaField("Contents", [InputRequired()])
    file_type = SelectField("Type", [InputRequired(),
                                     AnyOf(["kickstart", "preseed"])],
                            choices=[("kickstart", "kickstart"), ("preseed", "Debian Preseed")])
    known_good = BooleanField("Known good?", false_values=('false', '', '0'))
    public = BooleanField("Public?", false_values=('false', '', '0'))


class CreateMachineForm(Form):
    name = StringField("Name", [InputRequired(), Length(min=3, max=256)])
    mac = StringField("MAC address", [Optional(),
                                      MacAddress(message='Must provide a valid MAC address')])
    bmc_id = SelectField("BMC", coerce=opt_int, validators=[Optional()])
    bmc_info = StringField("BMC info", [Optional()])
    pdu = StringField("PDU", [Length(max=256)])
    pdu_port = OptionalIntegerField("PDU port", [Optional(),
                                                 NumberRange(max=256)])
    serial = StringField("Serial Console", [Length(max=256)])
    serial_port = OptionalIntegerField("Serial port", [Optional(),
                                                       NumberRange(max=256)])

    @staticmethod
    def populate_choices(form, g):
        bmcs = BMC.query.all() if g.user.admin else []
        form.bmc_id.choices = [("", "(None)")] + \
            [(bmc.id, "%s - %s - %s" % (bmc.name, bmc.ip, bmc.bmc_type)) for bmc in bmcs]


class AssigneeForm(Form):
    user_id = SelectField("Assign to", coerce=opt_int, validators=[Optional()])
    reason = StringField("Reason", [Length(max=256)])


class ChangeMachineForm(Form):
    name = StringField("Name", [Optional(), Length(min=3, max=256)])
    mac = StringField("MAC address", [Optional(),
                                      MacAddress(message='Must provide a valid MAC address')])
    bmc_id = SelectField("BMC", coerce=opt_int, validators=[Optional()])
    bmc_info = StringField("BMC info", [Optional()])
    pdu = StringField("PDU", [Length(max=256)])
    pdu_port = OptionalIntegerField("PDU port", [Optional(),
                                                 NumberRange(max=256)])
    serial = StringField("Serial Console", [Length(max=256)])
    serial_port = OptionalIntegerField("Serial port", [Optional(),
                                                       NumberRange(max=256)])
    kernel_id = SelectField("Kernel", coerce=opt_int, validators=[Optional(),
                                                                  ValidImage(image_type="Kernel")])
    kernel_opts = StringField("Kernel opts", [Length(max=256)])
    initrd_id = SelectField("Initrd", coerce=opt_int, validators=[Optional(),
                                                                  ValidImage(image_type="Initrd")])
    preseed_id = SelectField("Preseed", coerce=opt_int, validators=[Optional()])
    netboot_enabled = BooleanField("Netboot enabled?", false_values=('false', '', '0'))
    reason = StringField("Reason for Assignment", [Length(max=256)])
    assignee = FormField(AssigneeForm, [Optional()])

    @staticmethod
    def populate_choices(form, g, machine):
        bmcs = BMC.query.all() if g.user.admin else []
        images = Image.all_visible(g.user)
        preseeds = Preseed.all_visible(g.user)
        users = User.query.all()
        form.bmc_id.choices = [("", "(None)")] + \
            [(bmc.id, "%s - %s - %s" % (bmc.name, bmc.ip, bmc.bmc_type)) for bmc in bmcs]
        form.kernel_id.choices = [("", "(None)")] + \
            [(i.id, "%s - %s" % (i.description, i.filename)) for i in images if i.file_type == "Kernel"]
        form.initrd_id.choices = [("", "(None)")] + \
            [(i.id, "%s - %s" % (i.description, i.filename)) for i in images if i.file_type == "Initrd"]
        form.preseed_id.choices = [("", "(None)")] + \
            [(p.id, "%s - %s%s" % (p.description, p.filename, " (known good)" if p.known_good else "")) for p in preseeds]
        form.assignee.user_id.choices = [("", "(None)")] + \
            [(u.id, u.username) for u in User.query.all()]


class CreateBMCForm(Form):
    name = StringField("Name", [Length(min=3, max=256)])
    ip = StringField("IP", [Optional(),
                            IPAddress(ipv4=True, message='Must provide ipv4 address')])
    username = StringField("Username", [Length(max=256)])
    password = StringField("Password", [Length(max=256)])
    privilege_level = SelectField("Privilege", [AnyOf(["user", "admin"])], choices=[("user", "user"), ("admin", "admin")])
    bmc_type = SelectField("Type", [InputRequired(), AnyOf(map(lambda t: t.name, list_bmc_types()))], choices=[(t.name, t.name) for t in list_bmc_types()])


class CreateUserForm(Form):
    username = StringField("Username", [InputRequired(),
                                        Length(min=3, max=256)])
    email = StringField("Email", [Email(message='Must provide valid email')])
    admin = BooleanField("Admin?", false_values=('false', '', '0'))
