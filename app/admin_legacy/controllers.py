from flask import Blueprint, request, g, render_template, flash, url_for, \
    session, redirect, Response

import logging
import json
import os
import binascii
from passlib.hash import pbkdf2_sha256
from base64 import b64encode
from werkzeug.utils import secure_filename
from werkzeug.datastructures import CombinedMultiDict
from sqlalchemy.exc import IntegrityError

from app import db
from sqlalchemy.exc import DatabaseError
from app.models import User, Token, Machine, Image, Preseed, BMC, MachineUsers, \
    ConsoleToken, Interface
from app.bmc_types import BMCError
import app.admin_legacy.validation as validations

from flask import current_app as app

mod = Blueprint('admin-legacy', __name__, template_folder='templates', static_folder='static')
logger = logging.getLogger('admin-legacy')


@mod.context_processor
def inject_ui():
    return {
        'banner_name': app.config['BANNER_NAME']
    }


@mod.context_processor
def inject_user():
    return {
        'user': g.user
    }


@mod.before_request
def authenticate():
    logger.info("endpoint request: %s", request.endpoint)
    g.user = None

    # Skip authentication for some endpoints
    if request.endpoint == 'admin.static' or \
       request.endpoint == 'admin.get_ws_subprocess_command' or \
       request.endpoint == 'admin.login' or \
       request.endpoint == 'admin.login_post':
        pass
    else:
        try:
            user = User.query.filter_by(username=session['username']).first()
            if 'username' not in session or not user:
                return redirect(url_for('.login'))
            g.user = user
        except KeyError:
            return redirect(url_for('.login'))


@mod.route('/login', methods=['GET'])
def login():
    return render_template('login.html')


@mod.route('/login', methods=['POST'])
def login_post():
    user = User.query.filter_by(username=request.form['user']).first()
    if not (user and pbkdf2_sha256.verify(request.form['pass'], user.password)):
        flash('Incorrect username or password', 'error')
        return render_template('login.html')

    session['username'] = request.form['user']
    return redirect(url_for('.index'))


@mod.route('/logout')
def logout():
    session.pop('username', None)
    return redirect(url_for('.index'))


@mod.route('/')
def index():
    return redirect(url_for('.get_machines_admin'))


def flash_form_errors(form):
    for field in form:
        if len(field.errors) > 0:
            flash("%s: %s" % (field.label.text, ", ".join(field.errors)), 'error')


@mod.route('/user/password', methods=['GET'])
def change_password_user():
    return render_template("account-password.html")


@mod.route('/user/password', methods=['POST'])
def new_password_user():
    logger.info("Password change for user %s" % g.user.username)
    form = validations.ChangeOwnPasswordForm(request.form)
    if form.validate():
        user = User.query.filter_by(username=g.user.username).first()
        user.password = pbkdf2_sha256.hash(form.new_pass.data)
        db.session.commit()
        flash('Password changed', 'success')
    else:
        flash_form_errors(form)

    return render_template("account-password.html")


@mod.route('/user/sshkey', methods=['POST'])
def change_sshkey_user():
    logger.info("SSH Key change for user %s" % g.user.username)
    form = validations.ChangeSSHKeyForm(request.form)
    if form.validate():
        user = User.query.filter_by(username=g.user.username).first()
        user.ssh_key = form.ssh_key.data.strip()
        db.session.commit()
        flash('SSH Key saved', 'success')
    else:
        flash_form_errors(form)

    return render_template("account-password.html")


@mod.route('/password', methods=['POST'])
def new_password():

    if not g.user.admin:
        flash('Permission denied', 'error')
        return redirect(url_for('.new_password_user'))

    logger.info("Password change for user %s" % request.form['id'])
    form = validations.ChangePasswordForm(request.form)
    if form.validate():
        user = User.query.filter_by(id=form.id.data).first()
        user.password = pbkdf2_sha256.hash(form.new_pass.data)
        db.session.commit()
        flash('Password changed', 'success')
    else:
        flash_form_errors(form)

    return redirect(url_for(".get_user_admin", id=form.id.data))


@mod.route('/tokens', methods=['GET'])
def tokens():
    tokens = Token.query.filter_by(user_id=g.user.id).all()
    return render_template("account-token.html", tokens=tokens)


@mod.route('/tokens/delete', methods=['POST'])
def delete_token():
    logger.info("Deleting token")
    token = Token.query.filter_by(user_id=g.user.id, id=request.form['id']).first()
    if token:
        db.session.delete(token)
        db.session.commit()
        flash('Token deleted', 'success')
    else:
        flash('Invalid token', 'error')
    return redirect(url_for('.tokens'))


@mod.route('/tokens', methods=['POST'])
def create_token():
    logger.info("Adding token")
    token = Token(g.user.id, None, request.form['desc'])
    db.session.add(token)
    db.session.commit()
    return redirect(url_for('.tokens'))


@mod.route('/users', methods=['GET'])
def get_users_admin():

    if not g.user.admin:
        flash('Permission denied', 'error')
        return redirect(url_for('.new_password_user'))

    users = []
    users = User.query.all()
    return render_template("admin-users.html", users=users)


@mod.route('/users/create', methods=['POST'])
def create_users_admin():

    if not g.user.admin:
        flash('Permission denied', 'error')
        return redirect(url_for('.new_password_user'))

    logger.info("User added by %s" % g.user.username)
    form = validations.CreateUserForm(request.form)
    if form.validate():
        password = b64encode(os.urandom(8)).decode('utf-8')
        new = User(username=form.username.data,
                   email=form.email.data,
                   password=pbkdf2_sha256.hash(password),
                   ldap=False,
                   ssh_key="",
                   admin=form.admin.data)
        try:
            db.session.add(new)
            db.session.commit()
            flash('User added successfully', 'success')
            flash('Temporary password: %s' % password, 'success')
        except Exception as e:
            flash("Error: %s" % e, 'error')
    else:
        flash_form_errors(form)

    return redirect(url_for('.get_users_admin'))


@mod.route('/users/<id>', methods=['GET'])
def get_user_admin(id):

    if not g.user.admin:
        flash('Permission denied', 'error')
        return redirect(url_for('.new_password_user'))

    u = User.query.get(id)
    return render_template("admin-user.html", u=u)


@mod.route('/users/<id>/delete', methods=['POST'])
def delete_users(id):

    if not g.user.admin:
        flash('Permission denied', 'error')
        return redirect(url_for('.new_password_user'))

    u = User.query.get(id)
    if not u:
        flash("The user does not exist", "error")
        return redirect(url_for('.get_users_admin'))

    db.session.delete(u)
    db.session.commit()
    flash('User deleted', 'success')
    return redirect(url_for('.get_users_admin'))


@mod.route('/users/<id>/edit', methods=['POST'])
def edit_user(id):

    if not g.user.admin:
        flash('Permission denied', 'error')
        return redirect(url_for('.new_password_user'))

    logger.info("User modified by %s" % g.user.username)
    form = validations.CreateUserForm(request.form)
    if form.validate():
        u = User.query.get(id)
        if not u:
            flash("The user does not exist", "error")
            return redirect(url_for('.get_users_admin'))

        u.username = form.username.data
        u.email = form.email.data
        u.admin = form.admin.data
        try:
            db.session.commit()
            flash('User modified successfully', 'success')
        except IntegrityError as e:
            db.session.rollback()
            flash('Integrity Error: username and emails should be unique', 'error')
    else:
        flash_form_errors(form)

    return redirect(url_for('.get_user_admin', id=id))


@mod.route('/preseeds', methods=['GET'])
def get_preseeds_admin():
    form = validations.CreatePreseedForm()
    return render_template("admin-preseeds.html", form=form, preseeds=Preseed.all_visible(g.user))


@mod.route('/preseeds/create', methods=['POST'])
def create_preseeds_admin():
    logger.info("Preseed uploaded by %s" % g.user.username)
    form = validations.CreatePreseedForm(request.form)
    if form.validate():
        filename = secure_filename(form.filename.data)

        new_preseed = Preseed(filename=os.path.join(secure_filename(g.user.username), filename),
                              description=form.description.data,
                              file_content=form.file_content.data,
                              file_type=form.file_type.data,
                              user_id=g.user.id,
                              known_good=form.known_good.data,
                              public=form.public.data)

        db.session.add(new_preseed)
        try:
            db.session.commit()
            flash('Preseed saved successfully', 'success')
        except IntegrityError as e:
            db.session.rollback()
            flash("IntegrityError, please retry", 'info')
    else:
        flash_form_errors(form)

    return redirect(url_for('.get_preseeds_admin'))


@mod.route('/preseeds/<id>', methods=['GET'])
def get_preseed_admin(id):
    preseed = Preseed.query.get(id)
    form = validations.ChangePreseedForm()
    form.description.data = preseed.description
    form.file_type.data = preseed.file_type
    form.file_content.data = preseed.file_content
    form.known_good.data = preseed.known_good
    form.public.data = preseed.public

    return render_template("admin-preseed.html", form=form, preseed=preseed)


@mod.route('/preseeds/<id>/edit', methods=['POST'])
def edit_preseed(id):
    logger.info("Preseed modified by %s" % g.user.username)
    form = validations.ChangePreseedForm(request.form)
    if form.validate():
        preseed = Preseed.query.get(id)
        if not preseed:
            flash("Preseed does not exist", "error")
            return redirect(url_for('.get_preseeds_admin'))

        if not g.user.admin and (preseed.user_id != g.user.id):
            flash("Permission denied", "error")
            return redirect(url_for('.get_preseeds_admin'))

        preseed.description = form.description.data
        preseed.file_type = form.file_type.data
        preseed.file_content = form.file_content.data
        preseed.known_good = form.known_good.data
        preseed.public = form.public.data
        try:
            db.session.commit()
            flash('Preseed modified successfully', 'success')
        except IntegrityError as e:
            db.session.rollback()
            flash("Integrity Error: %s" % str(e), 'error')
    else:
        flash_form_errors(form)

    return redirect(url_for('.get_preseed_admin', id=id))


@mod.route('/preseeds/<id>/delete', methods=['POST'])
def delete_preseed(id):
    preseed = Preseed.query.get(id)

    if not preseed:
        flash('Invalid file', 'error')
        return redirect(url_for('.get_preseeds_admin'))

    if not g.user.admin and preseed.user_id != g.user.id:
        flash('Permission denied', 'error')
        return redirect(url_for('.get_preseeds_admin'))

    machines = Machine.query.filter_by(preseed_id=preseed.id).all()
    for m in machines:
        m.preseed_id = None
    db.session.delete(preseed)
    try:
        db.session.commit()
        flash('Preseed deleted', 'success')
    except Exception as e:
        flash("Error: %s" % str(e), 'error')

    return redirect(url_for('.get_preseeds_admin'))


@mod.route('/images', methods=['GET'])
def get_images_admin():
    form = validations.CreateImageForm()
    return render_template("admin-images.html", form=form, images=Image.all_visible(g.user))


@mod.route('/images/create', methods=['POST'])
def create_images_admin():
    logger.info("Image uploaded by %s" % g.user.username)
    form = validations.CreateImageForm(CombinedMultiDict((request.files, request.form)))
    logger.info("known good %s" % form.known_good.data)
    logger.info("public %s" % form.public.data)

    if form.validate():
        f = form.image.data
        random_suffix = binascii.hexlify(os.urandom(4)).decode('utf-8')
        filename = "%s.%s" % (secure_filename(f.filename), random_suffix)

        directory = os.path.join(app.config['TFTP_ROOT'], secure_filename(g.user.username))
        if not os.path.exists(directory):
            os.makedirs(directory)

        path = os.path.join(secure_filename(g.user.username), filename)
        logger.info("known good %s" % form.known_good.data)
        new_image = Image(description=form.description.data,
                          filename=path,
                          file_type=form.file_type.data,
                          known_good=form.known_good.data,
                          user_id=g.user.id,
                          public=form.public.data)
        db.session.add(new_image)
        try:
            db.session.commit()
            f.save(os.path.join(app.config['TFTP_ROOT'], path))
            flash('File uploaded successfully', 'success')
        except IntegrityError as e:
            db.session.rollback()
            flash("IntegrityError, try again.", 'info')
    else:
        flash_form_errors(form)

    return redirect(url_for('.get_images_admin'))


@mod.route('/images/<id>', methods=['GET'])
def get_image_admin(id):
    image = Image.query.get(id)
    form = validations.ChangeMetadataImageForm()
    form.description.data = image.description
    form.file_type.data = image.file_type
    form.known_good.data = image.known_good
    form.public.data = image.public

    return render_template("admin-image.html", form=form, image=image)


@mod.route('/images/<id>/edit', methods=['POST'])
def edit_image_metadata(id):
    logger.info("Image metadata modified by %s" % g.user.username)
    form = validations.ChangeMetadataImageForm(request.form)
    if form.validate():
        image = Image.query.get(id)
        if not image:
            flash("Image does not exist", "error")
            return redirect(url_for('.get_images_admin'))

        if not g.user.admin and (image.user_id != g.user.id):
            flash("Permission denied", "error")
            return redirect(url_for('.get_images_admin'))

        image.description = form.description.data
        image.file_type = form.file_type.data
        image.known_good = form.known_good.data
        image.public = form.public.data
        try:
            db.session.commit()
            flash('Image modified successfully', 'success')
        except IntegrityError as e:
            db.session.rollback()
            flash("Integrity Error: %s" % str(e), 'error')
    else:
        flash_form_errors(form)

    return redirect(url_for('.get_image_admin', id=id))


@mod.route('/images/<id>/delete', methods=['POST'])
def delete_image(id):
    image = Image.query.get(id)
    if not image:
        flash('Invalid file', 'error')
        return redirect(url_for('.get_images_admin'))

    if not g.user.admin and image.user_id != g.user.id:
        flash('Permission denied', 'error')
        return redirect(url_for('.get_images_admin'))

    machines = Machine.query.filter_by(kernel_id=image.id).all()
    for m in machines:
        m.kernel_id = None

    machines = Machine.query.filter_by(initrd_id=image.id).all()
    for m in machines:
        m.initrd_id = None

    try:
        db.session.delete(image)
        db.session.commit()
        flash('Image and metadata deleted', 'success')
    except IntegrityError as e:
        db.session.rollback()
        flash("Integrity Error: %s" % str(e), "error")
        return redirect(url_for('.get_images_admin'))

    filename = os.path.join(app.config['TFTP_ROOT'], image.filename)
    try:
        os.remove(filename)
    except OSError as e:
        # Errno 2 means the file was not there, no need to delete it
        if e.errno != 2:
            flash("Error removing file from filesystem: %s" % str(e), 'error')

    return redirect(url_for('.get_images_admin'))


@mod.route('/bmc', methods=['GET'])
def get_bmc_admin():
    if not g.user.admin:
        flash('Permission denied', 'error')
        return redirect(url_for('.get_machines_admin'))

    bmc = BMC.query.all()
    form = validations.CreateBMCForm()

    return render_template("admin-bmcs.html", bmcs=bmc, form=form)


@mod.route('/bmc/create', methods=['POST'])
def create_bmc_admin():
    if not g.user.admin:
        flash('Permission denied', 'error')
        return redirect(url_for('.get_machines_admin'))

    logger.info("BMC added by %s" % g.user.username)
    form = validations.CreateBMCForm(request.form)
    if form.validate():

        new_bmc = BMC(name=form.name.data,
                      ip=form.ip.data,
                      username=form.username.data,
                      password=form.password.data,
                      privilege_level=form.privilege_level.data,
                      bmc_type=form.bmc_type.data)
        db.session.add(new_bmc)
        try:
            db.session.commit()
            flash('BMC added successfully', 'success')
        except IntegrityError as e:
            db.session.rollback()
            flash('BMC already exists', 'error')
    else:
        flash_form_errors(form)

    return redirect(url_for('.get_bmc_admin'))


@mod.route('/bmc/<id>', methods=['GET'])
def bmc_admin(id):

    bmc = BMC.query.get(id)
    form = validations.CreateBMCForm()

    form.name.data = bmc.name if bmc.name else ""
    form.ip.data = bmc.ip if bmc.ip else ""
    form.username.data = bmc.username if bmc.username else ""
    form.password.data = bmc.password if bmc.password else ""
    form.privilege_level.data = bmc.privilege_level if bmc.privilege_level else "admin"
    form.bmc_type.data = bmc.bmc_type

    return render_template("admin-bmc.html", bmc=bmc, form=form)


@mod.route('/bmc/<id>/edit', methods=['POST'])
def edit_bmc(id):
    if not g.user.admin:
        flash('Permission denied', 'error')
        return redirect(url_for('.get_machines_admin'))

    logger.info("BMC modified by %s" % g.user.username)
    form = validations.CreateBMCForm(request.form)
    if form.validate():
        bmc = BMC.query.get(id)
        bmc.name = form.name.data
        bmc.ip = form.ip.data
        bmc.username = form.username.data
        bmc.password = form.password.data
        bmc.privilege_level = form.privilege_level.data
        bmc.bmc_type = form.bmc_type.data
        try:
            db.session.commit()
            flash('BMC modified successfully', 'success')
        except IntegrityError as e:
            db.session.rollback()
            flash('Integrity Error', 'error')
    else:
        flash_form_errors(form)

    return redirect(url_for('.bmc_admin', id=id))


@mod.route('/bmc/<id>/delete', methods=['POST'])
def delete_bmc(id):
    if not g.user.admin:
        flash('Permission denied', 'error')
        return redirect(url_for('.get_machines_admin'))

    bmc = BMC.query.get(id)

    if not bmc:
        flash('Invalid BMC', 'error')
        return redirect(url_for('.get_bmc_admin'))

    if not g.user.admin:
        flash('Permission denied', 'error')
        return redirect(url_for('.get_bmc_admin'))

    db.session.delete(bmc)
    db.session.commit()
    flash('BMC deleted', 'success')
    return redirect(url_for('.get_bmc_admin'))


@mod.route('/machines', methods=['GET'])
def get_machines_admin():
    machines = Machine.query.all()

    form = validations.CreateMachineForm()
    validations.CreateMachineForm.populate_choices(form, g)
    form.macs.append_entry()

    return render_template("admin-machines.html",
                           form=form,
                           machines=machines)


@mod.route('/machines/create', methods=['POST'])
def create_machines_admin():
    logger.info("Machine created by %s" % g.user.username)

    if not g.user.admin:
        flash('Permission denied', 'error')
        return redirect(url_for('.get_machines_admin'))

    logger.info("Machine added by %s" % g.user.username)
    form = validations.CreateMachineForm(request.form)
    validations.CreateMachineForm.populate_choices(form, g)
    if form.validate():
        # XXX: Think about adding a new object for PDU and Serial

        if form.bmc_id.data:
            bmc = BMC.query.get(form.bmc_id.data)
            if bmc is None:
                flash('BMC with id=%d does not exist' % form.bmc_id.data)
                return redirect(url_for('.get_machines_admin'))

            try:
                bmc.type_inst.validate_bmc_info(form.bmc_info.data)
            except BMCError as e:
                flash(str(e), 'error')
                return redirect(url_for('.get_machines_admin'))

        new_machine = Machine(name=form.name.data,
                              bmc_id=form.bmc_id.data,
                              bmc_info=form.bmc_info.data,
                              pdu=form.pdu.data,
                              pdu_port=form.pdu_port.data,
                              serial=form.serial.data,
                              serial_port=form.serial_port.data,
                              netboot_enabled=False)
        db.session.add(new_machine)
        try:
            db.session.commit()
            flash('Machine added successfully', 'success')
        except IntegrityError as e:
            db.session.rollback()
            flash('Integrity Error: either name or MAC are not unique', 'error')
            return redirect(url_for('.get_machines_admin'))

        db.session.refresh(new_machine)

        for mac_field in form.macs:
            mac = mac_field.data
            if mac and mac != '':
                new_interface = Interface(machine_id=new_machine.id, mac=mac)
                db.session.add(new_interface)
                try:
                    db.session.commit()
                except IntegrityError as e:
                    db.session.rollback()
                    flash('Integrity Error: failed to add mac: %s' % mac, 'error')

    else:
        flash_form_errors(form)

    return redirect(url_for('.get_machines_admin'))


@mod.route('/machines/<id>', methods=['GET', 'POST'])
def machine_admin(id):
    machine = Machine.query.get(id)
    if not machine:
        flash("Machine does not exist", "error")
        return redirect(url_for('.get_machines_admin'))

    form = validations.ChangeMachineForm(request.form)
    validations.ChangeMachineForm.populate_choices(form, g, machine)

    form_intf_new = validations.InterfaceForm()

    form_intf = {}
    for intf in machine.interfaces:
        form_intf[intf.id] = validations.InterfaceForm()
        form_intf[intf.id].identifier.data = intf.identifier
        form_intf[intf.id].mac.data = intf.mac
        form_intf[intf.id].dhcpv4.data = intf.dhcpv4
        form_intf[intf.id].reserved_ipv4.data = intf.reserved_ipv4

    if request.method == 'POST' and form.validate():
        if not g.user.admin and not (g.user.id in map(lambda u: u.id, machine.assignees)):
            flash('Permission denied', 'error')
            return redirect(url_for('.machine_admin', id=id))

        if g.user.admin:
            machine.name = form.name.data
            machine.pdu = None if not form.pdu.data else form.pdu.data
            machine.pdu_port = None if not form.pdu_port.data else form.pdu_port.data
            machine.serial = None if not form.serial.data else form.serial.data
            machine.serial_port = None if not form.serial_port.data else form.serial_port.data
            machine.bmc_id = None if not form.bmc_id.data else form.bmc_id.data
            machine.bmc_info = form.bmc_info.data

        machine.kernel_id = None if not form.kernel_id.data else form.kernel_id.data
        machine.kernel_opts = None if not form.kernel_opts.data else form.kernel_opts.data
        machine.initrd_id = None if not form.initrd_id.data else form.initrd_id.data
        machine.netboot_enabled = form.netboot_enabled.data
        machine.preseed_id = None if not form.preseed_id.data else form.preseed_id.data

        try:
            if machine.bmc:
                machine.bmc.type_inst.validate_bmc_info(machine.bmc_info)
        except BMCError as e:
            db.session.rollback()
            flash(str(e), 'error')
            return redirect(url_for('.machine_admin', id=id))

        try:
            db.session.commit()
            flash('Machine modified successfully', 'success')
        except IntegrityError as e:
            db.session.rollback()
            flash('Integrity Error: machine name and MAC should be unique', 'error')

        # XXX: Add to log table assignment
        if g.user.admin:
            if form.assignee.user_id.data:
                assignment = MachineUsers.query.filter_by(machine_id=id).first()
                if assignment:
                    assignment.user_id = form.assignee.user_id.data
                    assignment.reason = form.assignee.reason.data
                else:
                    assignment = MachineUsers(machine_id=id,
                                              user_id=form.assignee.user_id.data,
                                              permissions=0,
                                              reason=form.assignee.reason.data)
                    db.session.add(assignment)
                try:
                    db.session.commit()
                    flash('Reservation done successfully', 'success')
                except IntegrityError as e:
                    db.session.rollback()
                    flash("Integrity Error: %s" % str(e), 'error')
            else:
                # remove from the DB if it exists
                assignment = MachineUsers.query.filter_by(machine_id=id).first()
                if assignment:
                    db.session.delete(assignment)
                    db.session.commit()
                    flash('Machine unassigned', 'success')

        db.session.refresh(machine)

    elif request.method == 'POST':
        flash_form_errors(form)

    form.name.data = machine.name
    form.bmc_id.data = machine.bmc_id
    form.bmc_info.data = machine.bmc_info
    form.pdu.data = machine.pdu
    form.pdu_port.data = machine.pdu_port
    form.serial.data = machine.serial
    form.serial_port.data = machine.serial_port
    form.kernel_id.data = machine.kernel_id
    form.kernel_opts.data = machine.kernel_opts
    form.initrd_id.data = machine.initrd_id
    form.preseed_id.data = machine.preseed_id
    form.netboot_enabled.data = machine.netboot_enabled
    form.assignee.reason.data = machine.assignment.reason if machine.assignment else ""
    form.assignee.user_id.data = machine.user.id if machine.user else ""

    return render_template("admin-machine.html",
                           form=form,
                           form_intf_new=form_intf_new,
                           form_intf=form_intf,
                           m=machine)


@mod.route('/machines/<id>/reboot', methods=['GET', 'POST'])
def reboot_machine(id):
    machine = Machine.query.get(id)

    if not machine:
        flash('Invalid machine', 'error')
        return redirect(url_for('.get_machines_admin'))

    # XXX: use this recipe everywhere
    if not machine.check_permission(g.user, 'assignee'):
        flash('Permission denied', 'error')
        return redirect(url_for('.get_machines_admin'))

    machine.reboot()
    flash('Successfully rebooted machine', 'success')

    return redirect(url_for('.machine_admin', id=id))


@mod.route('/machines/<id>/pxe_reboot', methods=['GET', 'POST'])
def pxe_reboot_machine(id):
    machine = Machine.query.get(id)

    # XXX: use this fail/return-early recipe everywhere
    if not machine:
        flash('Invalid machine', 'error')
        return redirect(url_for('.get_machines_admin'))

    # XXX: use this recipe everywhere
    if not machine.check_permission(g.user, 'assignee'):
        flash('Permission denied', 'error')
        return redirect(url_for('.get_machines_admin'))

    machine.pxe_reboot()
    flash('Successfully PXE-rebooted machine', 'success')

    return redirect(url_for('.machine_admin', id=id))


@mod.route('/machines/<id>/delete', methods=['POST'])
def delete_machine(id):
    machine = Machine.query.get(id)

    if not machine:
        flash('Invalid machine', 'error')
        return redirect(url_for('.get_machines_admin'))

    if not machine.check_permission(g.user, 'admin'):
        flash('Permission denied', 'error')
        return redirect(url_for('.get_machines_admin'))

    db.session.delete(machine)
    db.session.commit()
    flash('Machine deleted', 'success')

    return redirect(url_for('.get_machines_admin'))


@mod.route('/machines/<id>/console', methods=['GET'])
def get_console(id):
    machine = Machine.query.get(id)
    (cmd, args) = machine.sol_command

    command_response = {
        'command': cmd,
        'args': args,
    }

    sol_token = ConsoleToken(command_response=json.dumps(command_response))
    db.session.add(sol_token)
    db.session.commit()
    return render_template("admin-console.html",
                           m=machine,
                           console=sol_token,
                           wss_ext_host=app.config['WSS_EXT_HOST'],
                           wss_ext_port=app.config['WSS_EXT_PORT'])


@mod.route('/machines/<id>/resetconsole', methods=['GET'])
def reset_console(id):
    machine = Machine.query.get(id)

    if not machine:
        flash('Invalid machine', 'error')
        return redirect(url_for('.get_machines_admin'))

    # XXX: use this recipe everywhere
    if not machine.check_permission(g.user, 'assignee'):
        flash('Permission denied', 'error')
        return redirect(url_for('.get_machines_admin'))

    machine.deactivate_sol()
    flash('Successfully deactivated console', 'success')

    return redirect(url_for('.machine_admin', id=id))


@mod.route('/interfaces/<id>', methods=['POST'])
def interface_edit(id):
    intf = Interface.query.get(id)
    if not intf:
        flash("Interface does not exist", "error")
        return redirect(url_for('.get_machines_admin'))

    machine = intf.machine

    if not machine.check_permission(g.user, 'assignee'):
        flash('Permission denied', 'error')
        return redirect(url_for('.get_machines_admin'))

    form = validations.InterfaceForm(request.form)
    if form.validate():
        intf.identifier = form.identifier.data
        intf.dhcpv4 = True
        if form.reserved_ipv4.data:
            # intf.reserved_ipv4 = form.reserved_ipv4.data
            flash('Reserved ip cannot be set currently, this is WIP', 'error')

        if machine.check_permission(g.user, 'admin'):
            intf.mac = form.mac.data

        try:
            db.session.commit()
            flash('Interface saved', 'success')
        except IntegrityError as e:
            db.session.rollback()
            flash('Integrity Error: MAC and static IP must be unique', 'error')
    else:
        flash_form_errors(form)

    return redirect(url_for('.machine_admin', id=machine.id))


@mod.route('/interfaces/<id>/delete', methods=['POST'])
def interface_delete(id):
    intf = Interface.query.get(id)
    if not intf:
        flash("Interface does not exist", "error")
        return redirect(url_for('.get_machines_admin'))

    machine = intf.machine

    if not machine.check_permission(g.user, 'admin'):
        flash('Permission denied', 'error')
        return redirect(url_for('.get_machines_admin'))

    db.session.delete(intf)
    db.session.commit()
    flash('Interface deleted', 'success')

    return redirect(url_for('.machine_admin', id=machine.id))


@mod.route('/machines/<id>/interface_create', methods=['POST'])
def machine_interface_create(id):
    machine = Machine.query.get(id)
    if not machine:
        flash("Machine does not exist", "error")
        return redirect(url_for('.get_machines_admin'))

    if not machine.check_permission(g.user, 'admin'):
        flash('Permission denied', 'error')
        return redirect(url_for('.get_machines_admin'))

    form = validations.InterfaceForm(request.form)
    if form.validate():
        new_intf = Interface(identifier=form.identifier.data,
                             mac=form.mac.data,
                             dhcpv4=True,
                             reserved_ipv4=form.reserved_ipv4.data,
                             machine_id=machine.id)
        db.session.add(new_intf)
        try:
            db.session.commit()
            flash('Interface added successfully', 'success')
        except IntegrityError as e:
            db.session.rollback()
            flash('Integrity Error: either MAC or reserved IP not unique', 'error')
            return redirect(url_for('.machine_admin', id=machine.id))
    else:
        flash_form_errors(form)

    return redirect(url_for('.machine_admin', id=machine.id))


@mod.route('/ws-subprocess', methods=['GET'])
def get_ws_subprocess_command():
    token = request.args.get('token')
    if not token or len(token) == 0:
        return "", 400

    ConsoleToken.cleanup()

    sol_token = ConsoleToken.query.filter_by(token=token).first()
    if not sol_token:
        return "", 404

    return Response(sol_token.command_response, mimetype='application/json')


@mod.errorhandler(DatabaseError)
def handle_db_error(error):
    db.session.rollback()
    raise
