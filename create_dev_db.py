''' Run this script to create DB for development and fill with demo data '''
from App import db, bcrypt
from App.models import User

# Create tabels
db.create_all()

# Create demo user data
hashed_password = bcrypt.generate_password_hash('test').decode('utf-8')
user_1 = User(username='test_user1',
              email='test_user1@test.com', password=hashed_password)
user_2 = User(username='test_user2',
              email='test_user2@test.com', password=hashed_password)
user_3 = User(username='test_user3',
              email='test_user3@test.com', password=hashed_password)

# Add demo users to db
db.session.add(user_1)
db.session.add(user_2)
db.session.add(user_3)
db.session.commit()
