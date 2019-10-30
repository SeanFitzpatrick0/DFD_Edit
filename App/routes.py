from flask import render_template, url_for, flash, redirect, request
from flask_login import login_user, logout_user, current_user, login_required
from App.forms import RegistrationForm, LoginForm
from App.models import User
from App import app, bcrypt, db


@app.route('/')
def home():
    return render_template('home.html', title='Home')


@app.route('/editor')
def editor():
    return render_template('editor.html', title='Editor')


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
    return render_template('account.html')
