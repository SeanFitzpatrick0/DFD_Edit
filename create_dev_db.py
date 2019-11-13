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
context_diagram_xml_model = '<mxGraphModel><root><mxCell id="0"/><mxCell id="1" parent="0"/><mxCell id="2" value="Entity 1" style="" vertex="1" parent="1"><mxGeometry x="160" y="208.66668701171875" width="120" height="120" as="geometry"/></mxCell><mxCell id="3" value="Entity 2" style="" vertex="1" parent="1"><mxGeometry x="730" y="208.66668701171875" width="120" height="120" as="geometry"/></mxCell><mxCell id="4" value="System" style="shape=ellipse" vertex="1" parent="1"><mxGeometry x="439.8333740234375" y="208.83334350585938" width="120" height="120" as="geometry"/></mxCell><mxCell id="5" value="" edge="1" parent="1" source="2" target="4"><mxGeometry relative="1" as="geometry"/></mxCell><mxCell id="6" value="" edge="1" parent="1" source="4" target="3"><mxGeometry relative="1" as="geometry"/></mxCell></root></mxGraphModel>'
system_diagram_xml_model = '<mxGraphModel><root><mxCell id="0"/><mxCell id="1" parent="0"/><mxCell id="7" value="Entity 1" style="" vertex="1" parent="1"><mxGeometry x="124.66668701171875" y="248.66668701171875" width="120" height="120" as="geometry"/></mxCell><mxCell id="8" value="Entity 2" style="" vertex="1" parent="1"><mxGeometry x="730.1666870117188" y="248.66668701171875" width="120" height="120" as="geometry"/></mxCell><mxCell id="9" value="Process 1" style="shape=ellipse" vertex="1" parent="1"><mxGeometry x="408.66668701171875" y="68.66668701171875" width="120" height="120" as="geometry"/></mxCell><mxCell id="10" value="Process 2" style="shape=ellipse" vertex="1" parent="1"><mxGeometry x="408.8333740234375" y="396.66668701171875" width="120" height="120" as="geometry"/></mxCell><mxCell id="11" value="" edge="1" parent="1" source="7" target="9"><mxGeometry relative="1" as="geometry"/></mxCell><mxCell id="12" value="" edge="1" parent="1" source="7" target="10"><mxGeometry relative="1" as="geometry"/></mxCell><mxCell id="13" value="" edge="1" parent="1" source="9" target="8"><mxGeometry relative="1" as="geometry"/></mxCell><mxCell id="14" value="" edge="1" parent="1" source="10" target="8"><mxGeometry relative="1" as="geometry"/></mxCell></root></mxGraphModel>'
process1_diagram_xml_model = '<mxGraphModel><root><mxCell id="0"/><mxCell id="1" parent="0"/><mxCell id="15" value="Entity 1" style="" vertex="1" parent="1"><mxGeometry x="134.66668701171875" y="258.66668701171875" width="120" height="120" as="geometry"/></mxCell><mxCell id="16" value="Entity 2" style="" vertex="1" parent="1"><mxGeometry x="730.1666870117188" y="258.66668701171875" width="120" height="120" as="geometry"/></mxCell><mxCell id="17" value="Process 1.1" style="shape=ellipse" vertex="1" parent="1"><mxGeometry x="436" y="81.33334350585938" width="120" height="120" as="geometry"/></mxCell><mxCell id="18" value="Process 1.2" style="shape=ellipse" vertex="1" parent="1"><mxGeometry x="436" y="258.8333435058594" width="120" height="120" as="geometry"/></mxCell><mxCell id="19" value="Process 1.3" style="shape=ellipse" vertex="1" parent="1"><mxGeometry x="436" y="439.8333435058594" width="120" height="120" as="geometry"/></mxCell><mxCell id="21" value="" edge="1" parent="1" source="15" target="17"><mxGeometry relative="1" as="geometry"/></mxCell><mxCell id="22" value="" edge="1" parent="1" source="17" target="18"><mxGeometry relative="1" as="geometry"/></mxCell><mxCell id="23" value="" edge="1" parent="1" source="18" target="19"><mxGeometry relative="1" as="geometry"/></mxCell><mxCell id="24" value="" edge="1" parent="1" source="19" target="16"><mxGeometry relative="1" as="geometry"/></mxCell></root></mxGraphModel>'
process2_diagram_xml_model = '<mxGraphModel><root><mxCell id="0"/><mxCell id="1" parent="0"/><mxCell id="25" value="Entity 1" style="" vertex="1" parent="1"><mxGeometry x="120.16668701171875" y="268.66668701171875" width="120" height="120" as="geometry"/></mxCell><mxCell id="26" value="Entity 2" style="" vertex="1" parent="1"><mxGeometry x="740.1666870117188" y="268.66668701171875" width="120" height="120" as="geometry"/></mxCell><mxCell id="27" value="Process 2.1" style="shape=ellipse" vertex="1" parent="1"><mxGeometry x="448" y="268.5" width="120" height="120" as="geometry"/></mxCell><mxCell id="28" value="" edge="1" parent="1" source="25" target="27"><mxGeometry relative="1" as="geometry"/></mxCell><mxCell id="29" value="" edge="1" parent="1" source="27" target="26"><mxGeometry relative="1" as="geometry"/></mxCell></root></mxGraphModel>'
root_graph_xml_model = '<mxGraphModel><root><mxCell id="0"/><mxCell id="1" parent="0"/><mxCell id="2" value="Process" style="shape=ellipse" vertex="1" parent="1"><mxGeometry x="374.66668701171875" y="214.66668701171875" width="120" height="120" as="geometry"/></mxCell></root></mxGraphModel>'

context_diagram = Graph(title='Context diagram', level=0,
                        xml_model=context_diagram_xml_model)
system = Graph(title='System', level=1, xml_model=system_diagram_xml_model)
process1 = Graph(title='Process 1', level=2, xml_model=process1_diagram_xml_model)
process2 = Graph(title='Process 2', level=2, xml_model=process2_diagram_xml_model)
root_graph = Graph(title='Context diagram', level=0, xml_model=root_graph_xml_model)

db.session.add(context_diagram)
db.session.add(system)
db.session.add(process1)
db.session.add(process2)
db.session.add(root_graph)
db.session.commit()

# Connect graphs
child1 = GraphChildren(parent=context_diagram.id, child=system.id)
child2 = GraphChildren(parent=system.id, child=process1.id)
child3 = GraphChildren(parent=system.id, child=process2.id)

db.session.add(child1)
db.session.add(child2)
db.session.add(child3)
db.session.commit()

# Create demo DFD
dfd1 = DataFlowDiagram(
    title='Demo DFD1', graph=context_diagram.id, author=user_1.id)
dfd2 = DataFlowDiagram(
    title='Demo DFD2', graph=root_graph.id, author=user_1.id)

db.session.add(dfd1)
db.session.add(dfd2)
db.session.commit()

# Invite a user
invite = Invitation(invited_user=user_2.id, invited_to=dfd1.id)

db.session.add(invite)
db.session.commit()

# Edit diagram
Graph.query.get(dfd2.graph).xml_model = root_graph_xml_model.replace('Process', 'Edit')
edit = Edit(editor=user_2.id, edited_diagram=dfd2.id,
            message='Edited context diagram')
            
db.session.add(edit)
db.session.commit()

Graph.query.get(dfd2.graph).xml_model = root_graph_xml_model.replace('Process', 'Edit 2')
edit = Edit(editor=user_2.id, edited_diagram=dfd2.id,
            message='Edited context diagram again')

db.session.add(edit)
db.session.commit()
