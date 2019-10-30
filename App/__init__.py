from flask import Flask
from flask_sqlalchemy import SQLAlchemy


app = Flask(__name__)
# TODO hard coded SK for development. Remove later
app.config['SECRET_KEY'] = '214b91243903a5597c08d35bb65dacb7'

app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///site.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)

from App import routes