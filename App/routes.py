from flask import render_template, url_for, flash, redirect
from App.forms import RegistrationForm, LoginForm
from App import app


@app.route('/')
def home():
    return render_template('home.html', title='Home')


@app.route('/editor')
def editor():
    return render_template('editor.html', title='Editor')


@app.route('/register', methods=['GET', 'POST'])
def register():
    form = RegistrationForm()

    if form.validate_on_submit():
        flash('Account created for {}.'.format(form.username.data), 'success')
        return redirect(url_for('home'))

    return render_template('register.html', title='Register', form=form)


@app.route('/login', methods=['GET', 'POST'])
def login():
    form = LoginForm()

    if form.validate_on_submit():
        return redirect(url_for('home'))

    return render_template('login.html', title='Log in', form=form)
