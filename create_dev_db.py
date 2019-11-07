''' Run this script to create DB for development and fill with demo data '''
from App import db, bcrypt
from App.models import User, DataFlowDiagram, Graph, GraphChildren, Invitation, Edit


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

db.session.add(user_1)
db.session.add(user_2)
db.session.add(user_3)
db.session.commit()

# Create graphs
xml_literal = ''  # TODO replace with real exported xml
leaf_graph_1 = Graph(title='Leaf Graph 1', level=1, xml_model=xml_literal)
leaf_graph_2 = Graph(title='Leaf Graph 2', level=1, xml_model=xml_literal)
root_graph = Graph(title='Root Graph', level=0, xml_model=xml_literal)
root_graph2 = Graph(title='Root Graph 2', level=0, xml_model=xml_literal)

db.session.add(leaf_graph_1)
db.session.add(leaf_graph_2)
db.session.add(root_graph)
db.session.add(root_graph2)
db.session.commit()

# Connect graphs
child1 = GraphChildren(parent=root_graph.id, child=leaf_graph_1.id)
child2 = GraphChildren(parent=root_graph.id, child=leaf_graph_2.id)

db.session.add(child1)
db.session.add(child2)
db.session.commit()

# Create demo DFD
dfd1 = DataFlowDiagram(
    title='Demo DFD1', graph=root_graph.id, author=user_1.id)
dfd2 = DataFlowDiagram(
    title='Demo DFD2', graph=root_graph2.id, author=user_1.id)

db.session.add(dfd1)
db.session.add(dfd2)
db.session.commit()

# Invite a user
invite = Invitation(invited_user=user_2.id, invited_to=dfd1.id)

db.session.add(invite)
db.session.commit()

# Edit diagram
Graph.query.get(dfd1.graph).xml_model = 'Edit'
edit = Edit(editor=user_2.id, edited_diagram=dfd1.id,
            message='Edited context diagram')

db.session.add(edit)
db.session.commit()

Graph.query.get(dfd1.graph).xml_model = 'Edit2'
edit = Edit(editor=user_2.id, edited_diagram=dfd1.id,
            message='Edited context diagram again')

db.session.add(edit)
db.session.commit()
