from datetime import datetime
from flask_login import UserMixin
from sqlalchemy import CheckConstraint
from App import db, login_manager


@login_manager.user_loader
def load_user(id):
    return User.query.get(int(id))


class User(db.Model, UserMixin):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(20), unique=True, nullable=False)
    email = db.Column(db.String(100), unique=True, nullable=False)
    password = db.Column(db.String(60), nullable=False)

    def __repr__(self):
        return 'id: {}, username: {}, email {}'.format(self.id, self.username, self.email)


class DataFlowDiagram(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(100), nullable=False)
    graph = db.Column(db.Integer, db.ForeignKey('graph.id'), nullable=False)
    author = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    created_on = db.Column(db.DateTime, nullable=False,
                           default=datetime.utcnow)

    def __repr__(self):
        return 'id: {}, title: {}, created_on: {}'.format(self.id, self.title, self.created_on)


class Graph(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(100), nullable=False)
    level = db.Column(db.Integer, nullable=False)
    xml_model = db.Column(db.String(), nullable=False)

    __table_args__ = (CheckConstraint(
        level >= 0, name='check_level_positive'), {})

    def __repr__(self):
        return 'id: {}, title: {}, level: {}'.format(self.id, self.title, self.level)


class GraphChildren(db.Model):
    parent = db.Column(db.Integer, db.ForeignKey('graph.id'), primary_key=True)
    child = db.Column(db.Integer, db.ForeignKey('graph.id'), primary_key=True)


class Invitation(db.Model):
    invited_user = db.Column(
        db.Integer, db.ForeignKey('user.id'), primary_key=True)
    invited_to = db.Column(db.Integer, db.ForeignKey(
        'data_flow_diagram.id'), primary_key=True)
    invited_on = db.Column(db.DateTime, nullable=False,
                           default=datetime.utcnow)


class Edit(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    editor = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    edited_diagram = db.Column(db.Integer, db.ForeignKey(
        'data_flow_diagram.id'), nullable=False)
    message = db.Column(db.String(100))
    edited_on = db.Column(db.DateTime, nullable=False,
                          default=datetime.utcnow)
