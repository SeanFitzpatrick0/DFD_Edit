from flask import render_template
from App import app


@app.route('/')
def home():
    return render_template('home.html')


@app.route('/editor')
def editor():
    return render_template('editor.html')