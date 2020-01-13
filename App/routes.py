from flask import render_template, url_for, flash, redirect, request, abort
from flask_login import login_user, logout_user, current_user, login_required
from App.forms import RegistrationForm, LoginForm, InviteEditorForm
from App.models import User, DataFlowDiagram, Invitation
from App.utils import (get_diagram_editors, get_user_created_diagrams,
                       get_user_invited_diagrams, get_diagram_edits,
                       get_user, get_diagram_author, get_diagram,
                       get_user_by_email, delete_diagram_by_id,
                       is_editor, is_author, load_hierarchy, save_graph,
                       add_edit, create_graph_and_children)
from App.exporter import export_dfd
from App import app, bcrypt, db


@app.route('/')
def home():
    return render_template('home.html', title='Home')


@app.route('/editor')
@app.route('/editor/<id>')
@login_required
def editor(id=None):
    if not id or not current_user:
        # New diagram
        diagram = None
        title = 'Editor'
        hierarchy_json = None

    elif not is_author(current_user.id, id) and not is_editor(current_user.id, id):
        # No edit permission
        abort(403)

    else:
        # Load diagram
        diagram = get_diagram(id)
        if diagram is not None:
            # Diagram exists
            title = diagram.title
            hierarchy_json = load_hierarchy(diagram.graph)

    return render_template('editor.html', title=title, diagram=diagram, hierarchy=hierarchy_json)


@app.route('/editor/<id>', methods=['PUT'])
@login_required
def save_diagram(id):
    # Validated user permission
    if not is_author(current_user.id, id) and not is_editor(current_user.id, id):
        abort(403)

    diagram = get_diagram(id)

    # Validate title edit
    new_title = request.json['title']
    if not new_title == diagram.title and not is_author(current_user.id, id):
        # User lacks permission to edit title
        abort(403)
    else:
        if len(new_title) == 0:
            # Empty title
            abort(500)

    # Set new graph
    save_graph(id, request.json['dfd'])

    # Set new title
    diagram.title = new_title
    db.session.commit()

    # Create edit entry
    add_edit(current_user.id, diagram.id, request.json['edit_message'])

    return {'success': True}


@app.route('/register', methods=['GET', 'POST'])
def register():
    if current_user.is_authenticated:
        flash('You must log out before registering a new account', 'info')
        return redirect(url_for('home'))

    form = RegistrationForm()
    if form.validate_on_submit():
        # Add new user
        hashed_password = bcrypt.generate_password_hash(
            form.password.data).decode('utf-8')
        new_user = User(username=form.username.data,
                        email=form.email.data, password=hashed_password)
        db.session.add(new_user)
        db.session.commit()

        flash('Account created for {}.'.format(form.username.data), 'success')
        return redirect(url_for('login'))

    return render_template('register.html', title='Register', form=form)


@app.route('/login', methods=['GET', 'POST'])
def login():
    if current_user.is_authenticated:
        flash('You must log out before you can log in again', 'info')
        return redirect(url_for('home'))

    form = LoginForm()
    if form.validate_on_submit():
        user = User.query.filter_by(email=form.email.data).first()
        if user and bcrypt.check_password_hash(user.password, form.password.data):
            # Login User
            login_user(user, remember=form.remember.data)

            # Get next page
            next_page = request.args.get('next')
            next_page = next_page if next_page else url_for('home')

            flash('{} logged in'.format(user.username), 'success')
            return redirect(next_page)
        else:
            flash('No user exists with this email and password', 'danger')
    return render_template('login.html', title='Log in', form=form)


@app.route('/logout')
def logout():
    if current_user.is_authenticated:
        flash('{} logged out'.format(current_user.username), 'info')
        logout_user()
    return redirect(url_for('home'))


@app.route('/account')
@login_required
def account():
    created_diagrams = get_user_created_diagrams(current_user)
    invited_diagrams = get_user_invited_diagrams(current_user)

    invite_editor_form = InviteEditorForm()

    return render_template('account.html',
                           created_diagrams=created_diagrams, invited_diagrams=invited_diagrams,
                           get_diagram_editors=get_diagram_editors, get_diagram_edits=get_diagram_edits,
                           get_user=get_user, invite_editor_form=invite_editor_form)


@app.route('/invite/<user_id>_<diagram_id>', methods=['POST'])
@login_required
def delete_invited_editor(user_id, diagram_id):
    author = get_diagram_author(diagram_id)
    if current_user.id != author.id:
        abort(403)

    invitation = Invitation.query.get_or_404((user_id, diagram_id))
    db.session.delete(invitation)
    db.session.commit()

    flash('{} has been removed from {}.'.format(
        get_user(user_id).username, get_diagram(diagram_id).title), 'info')
    return redirect(url_for('account'))


@app.route('/invite/<diagram_id>', methods=['POST'])
@login_required
def invite_editor(diagram_id):
    author = get_diagram_author(diagram_id)
    if current_user.id != author.id:
        abort(403)

    invite_editor_form = InviteEditorForm()
    if invite_editor_form.validate_on_submit():

        invited_user = get_user_by_email(invite_editor_form.email.data)

        if current_user.id == invited_user.id:
            flash('Unable to add youself as an editor.', 'warning')
        elif invited_user in get_diagram_editors(diagram_id):
            flash(
                f'User {invited_user.username} is already invited to diagram.', 'warning')
        else:
            invite = Invitation(invited_user=invited_user.id,
                                invited_to=diagram_id)
            db.session.add(invite)
            db.session.commit()

            flash('User {} have been invited to {}'.format(
                invited_user.username, get_diagram(diagram_id).title), 'success')
    else:
        flash('No user registered with email {}.'.format(
            invite_editor_form.email.data), 'danger')

    return redirect(url_for('account'))


@app.route('/diagram/<id>/delete', methods=['POST'])
@login_required
def delete_diagram(id):
    author = get_diagram_author(id)
    if current_user.id != author.id:
        abort(403)

    delete_diagram_by_id(id)
    return redirect(url_for('account'))


@app.route('/diagram', methods=['POST'])
@login_required
def create_diagram():

    # Validate diagram title
    if len(request.json['title']) == 0:
        # Empty title
        abort(500)

    # Create Diagram
    root = create_graph_and_children(request.json['dfd'], 0)
    new_diagram = DataFlowDiagram(
        title=request.json['title'], author=current_user.id, graph=root)
    db.session.add(new_diagram)
    db.session.commit()

    # Create edit
    add_edit(current_user.id, new_diagram.id, request.json['edit_message'])

    return {'success': True, 'diagram_url': url_for('editor', id=new_diagram.id)}


@app.route('/diagram/export', methods=['POST'])
@login_required
def export_diagram():
    rdf_export = export_dfd(request.json['dfd'])
    return {'success': True, 'rdf': rdf_export}
