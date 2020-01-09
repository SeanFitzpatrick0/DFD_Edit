from App.models import User, DataFlowDiagram, Invitation, Edit, Graph, GraphChildren
from App import db


def get_user_created_diagrams(user):
    created_diagrams = DataFlowDiagram.query.filter_by(author=user.id)
    return created_diagrams


def get_user_invited_diagrams(user):
    user_invites = Invitation.query.filter_by(invited_user=user.id)
    invited_diagrams = [DataFlowDiagram.query.get(
        invite.invited_to) for invite in user_invites]
    return invited_diagrams


def get_diagram_editors(diagram_id):
    diagram_invitations = Invitation.query.filter_by(invited_to=diagram_id)
    editors = [User.query.get(invitation.invited_user)
               for invitation in diagram_invitations]
    return editors


def get_diagram_edits(diagram):
    diagram_edits = Edit.query.filter_by(
        edited_diagram=diagram.id).order_by(Edit.edited_on.desc())
    return diagram_edits


def get_diagram_author(id):
    diagram = DataFlowDiagram.query.get(id)
    author = get_user(diagram.author)
    return author


def get_user_by_email(email):
    return User.query.filter_by(email=email).first()


def get_user(id):
    return User.query.get(id)


def get_diagram(id):
    return DataFlowDiagram.query.get(id)


def get_graph(id):
    return Graph.query.get(id)


def get_graph_children(id):
    return GraphChildren.query.filter_by(parent=id)


def load_hierarchy(id):
    graph = get_graph(id)
    graph_children = get_graph_children(id)
    data = {
        'title': graph.title,
        'xml_model': graph.xml_model,
        'children': [load_hierarchy(child_association.child) for child_association in graph_children]
    }
    return data


def delete_diagram_by_id(id):
    diagram = get_diagram(id)

    # Remove diagram edits
    Edit.query.filter_by(edited_diagram=id).delete()

    # Remove diagram invitations
    Invitation.query.filter_by(invited_to=id).delete()

    # Remove graphs
    delete_graph_and_children(diagram.graph)

    # Remove diagram
    db.session.delete(diagram)

    # commit delete
    db.session.commit()


def delete_graph_and_children(id):
    graph = get_graph(id)
    children = get_graph_children(id)

    # Remove children graphs
    for child in children:
        delete_graph_and_children(child.child)

    # Remove association table entries
    children.delete()

    # Remove graph
    db.session.delete(graph)
    db.session.commit()


def is_editor(user_id, diagram_id):
    editors = get_diagram_editors(diagram_id)
    return any([user_id == editor.id for editor in editors])


def is_author(user_id, diagram_id):
    diagram = get_diagram(diagram_id)
    return user_id == diagram.author


def save_graph(diagram_id, new_graph_data):
    diagram = get_diagram(diagram_id)
    old_root_graph_id = diagram.graph

    # Replace old graph data
    new_root_graph_id = create_graph_and_children(new_graph_data, 0)
    diagram.graph = new_root_graph_id
    db.session.commit()

    # Delete old graph data
    delete_graph_and_children(old_root_graph_id)


def create_graph_and_children(graph_data, level):
    # Create graph
    graph = Graph(title=graph_data['title'], level=level,
                  xml_model=graph_data['xml_model'])
    db.session.add(graph)
    db.session.commit()

    # Create children graphs
    child_graph_ids = [create_graph_and_children(child, level + 1)
                       for child in graph_data['children']]

    # Create child associations
    for child_id in child_graph_ids:
        parent_child_association = GraphChildren(
            parent=graph.id, child=child_id)
        db.session.add(parent_child_association)
        db.session.commit()

    return graph.id


def add_edit(editor_id, diagram_id, message):
    new_edit = Edit(editor=editor_id,
                    edited_diagram=diagram_id, message=message)
    db.session.add(new_edit)
    db.session.commit()
