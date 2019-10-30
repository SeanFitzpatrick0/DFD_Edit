from flask_login import UserMixin
from App import db, login_manager


class User(db.Model, UserMixin):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(20), unique=True, nullable=False)
    email = db.Column(db.String(100), unique=True, nullable=False)
    password = db.Column(db.String(60), nullable=False)

    def __repr__(self):
        return 'username: {}, email {}'.format(self.username, self.email)


@login_manager.user_loader
def load_user(id):
    return User.query.get(int(id))
