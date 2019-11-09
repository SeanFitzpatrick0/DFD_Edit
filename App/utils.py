from App.models import User, DataFlowDiagram, Invitation, Edit


def get_user_created_diagrams(user):
    created_diagrams = DataFlowDiagram.query.filter_by(author=user.id)
    return created_diagrams


def get_user_invited_diagrams(user):
    user_invites = Invitation.query.filter_by(invited_user=user.id)
    invited_diagrams = [DataFlowDiagram.query.get(
        invite.invited_to) for invite in user_invites]
    return invited_diagrams


def get_diagram_editors(diagram):
    diagram_invitations = Invitation.query.filter_by(invited_to=diagram.id)
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
