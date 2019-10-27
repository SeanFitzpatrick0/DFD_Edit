from flask import Flask


app = Flask(__name__)
# TODO hard coded SK for development. Remove later
app.config['SECRET_KEY'] = '214b91243903a5597c08d35bb65dacb7'


from App import routes